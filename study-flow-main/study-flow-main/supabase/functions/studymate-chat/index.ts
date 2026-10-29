declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (request: Request) => Promise<Response> | Response): void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

const maxBodyBytes = 64 * 1024;
const maxMessages = 20;
const maxMessageCharacters = 4000;
const maxConversationCharacters = 12000;
const rateLimitWindowMs = 60_000;
const requestsPerWindow = 12;
const requestTimesByUser = new Map<string, number[]>();

const systemPrompt = `You are StudyMate AI, a friendly, careful academic tutor and study coach.
Be concise, clear, and direct. Explain concepts in simple language without conversational filler or introductory preamble.
For straightforward or conceptual questions, provide a focused explanation in 2–3 brief paragraphs or key bullet points.
For numerical questions, state known values, formula, substitutions, and answer with units.
For code questions, provide corrected code and brief explanations.
Provide longer step-by-step breakdowns only when the student asks for detail.
Do not invent facts; state when uncertain.`;

type ChatMessage = { role: "user" | "assistant"; content: string };

function determineMaxTokens(messages: ChatMessage[], requestedTokens?: unknown): number {
  if (typeof requestedTokens === "number" && requestedTokens >= 100 && requestedTokens <= 1500) {
    return requestedTokens;
  }
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content.toLowerCase() ?? "";
  const wantsDetailed =
    lastUserMsg.includes("detail") ||
    lastUserMsg.includes("essay") ||
    lastUserMsg.includes("notes") ||
    lastUserMsg.includes("comprehensive") ||
    lastUserMsg.includes("step by step") ||
    lastUserMsg.includes("syllabus") ||
    lastUserMsg.includes("in-depth") ||
    lastUserMsg.includes("exam answer") ||
    lastUserMsg.length > 350;
  return wantsDetailed ? 800 : 380;
}

function jsonResponse(status: number, body: unknown, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, ...extraHeaders },
  });
}

function errorResponse(
  status: number,
  code: string,
  message: string,
  stage: string,
  upstreamStatus?: number,
  extraHeaders: Record<string, string> = {},
) {
  console.error(JSON.stringify({ stage, status, ...(upstreamStatus ? { upstreamStatus } : {}), code }));
  return jsonResponse(status, { error: { code, message } }, extraHeaders);
}

function getVerifiedUserId(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+([A-Za-z0-9_.-]+)$/i);
  if (!match) return null;

  // The Edge Function gateway verifies this token because verify_jwt is enabled in config.toml.
  try {
    const payload = match[1].split(".")[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const claims = JSON.parse(new TextDecoder().decode(bytes));
    return typeof claims.sub === "string" ? claims.sub : null;
  } catch {
    return null;
  }
}

function validateMessages(value: unknown): string | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > maxMessages) {
    return "Send between 1 and 20 conversation messages.";
  }

  let totalCharacters = 0;
  for (const message of value) {
    if (
      !message ||
      typeof message !== "object" ||
      !["user", "assistant"].includes(message.role) ||
      typeof message.content !== "string"
    ) {
      return "Each message must have a user or assistant role and text content.";
    }
    const content = message.content.trim();
    const limit = message.role === "user" ? maxMessageCharacters : 8000;
    if (!content || content.length > limit) {
      return "User messages must be 1 to 4,000 characters and assistant messages 1 to 8,000 characters.";
    }
    totalCharacters += content.length;
  }

  if (totalCharacters > maxConversationCharacters) {
    return "The conversation is too long. Start a new chat and try again.";
  }
  if (value[value.length - 1].role !== "user") {
    return "The latest conversation message must be from the student.";
  }
  return null;
}

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const recent = (requestTimesByUser.get(userId) ?? []).filter((time) => now - time < rateLimitWindowMs);
  if (recent.length >= requestsPerWindow) {
    requestTimesByUser.set(userId, recent);
    return true;
  }
  recent.push(now);
  requestTimesByUser.set(userId, recent);
  if (requestTimesByUser.size > 1000) {
    requestTimesByUser.forEach((times, id) => {
      if (times.every((time) => now - time >= rateLimitWindowMs)) requestTimesByUser.delete(id);
    });
  }
  return false;
}

function formatGeminiContents(messages: ChatMessage[]) {
  const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];

  for (const message of messages) {
    const role: "user" | "model" = message.role === "assistant" ? "model" : "user";
    const text = message.content.trim();
    if (!text) continue;

    if (contents.length > 0 && contents[contents.length - 1].role === role) {
      contents[contents.length - 1].parts.push({ text });
    } else {
      contents.push({ role, parts: [{ text }] });
    }
  }

  while (contents.length > 0 && contents[0].role !== "user") {
    contents.shift();
  }

  return contents;
}

function safeProviderMessage(value: unknown, apiKey: string): string {
  if (typeof value !== "string") return "";
  const sanitized = apiKey ? value.split(apiKey).join("[redacted]") : value;
  return sanitized.replace(/[\r\n\t]+/g, " ").slice(0, 300);
}

function classifyProviderError(status: number, providerMessage: string) {
  if (providerMessage.toLowerCase().includes("api key") || providerMessage.toLowerCase().includes("apikey")) {
    return { status: 503, code: "GEMINI_AUTH_ERROR", message: "Gemini rejected the server API key or this project does not have access." };
  }
  if (status === 401 || status === 403) {
    return { status: 503, code: "GEMINI_AUTH_ERROR", message: "Gemini rejected the server API key or this project does not have access." };
  }
  if (status === 404) {
    return { status: 503, code: "GEMINI_MODEL_NOT_FOUND", message: "The configured Gemini model is unavailable. Check GEMINI_MODEL." };
  }
  if (status === 429) {
    return { status: 429, code: "GEMINI_RATE_LIMIT_OR_QUOTA", message: providerMessage || "Gemini rate limit or free-tier quota reached. Wait and try again." };
  }
  if (status === 503 || status >= 500) {
    return { status: 503, code: "GEMINI_UNAVAILABLE", message: providerMessage || "Gemini is temporarily unavailable. Please try again shortly." };
  }
  if (status === 400) {
    return { status: 502, code: "GEMINI_INVALID_REQUEST", message: providerMessage || "Gemini rejected the request. Check the model and request settings." };
  }
  return { status: 502, code: "GEMINI_PROVIDER_ERROR", message: providerMessage || "Gemini could not complete the request. Please try again." };
}

Deno.serve(async (request) => {
  const t0 = performance.now();
  if (request.method === "OPTIONS") return jsonResponse(200, { ok: true });
  if (request.method !== "POST") {
    return errorResponse(405, "METHOD_NOT_ALLOWED", "Use POST to send a chat message.", "request.method", undefined, { Allow: "POST, OPTIONS" });
  }

  const userId = getVerifiedUserId(request);
  if (!userId) {
    return errorResponse(401, "AUTH_REQUIRED", "Sign in to use StudyMate AI.", "auth.verify");
  }

  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") {
    return errorResponse(415, "INVALID_CONTENT_TYPE", "Send the chat request as JSON.", "request.content_type");
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return errorResponse(400, "INVALID_BODY", "Could not read the chat request.", "request.body");
  }
  if (new TextEncoder().encode(rawBody).length > maxBodyBytes) {
    return errorResponse(413, "REQUEST_TOO_LARGE", "Request body is too large.", "request.body");
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    return errorResponse(400, "INVALID_JSON", "Request body must be valid JSON.", "request.parse");
  }
  if (!parsedBody || typeof parsedBody !== "object" || Array.isArray(parsedBody)) {
    return errorResponse(400, "INVALID_REQUEST", "Request body must be a JSON object.", "request.validate");
  }
  const body = parsedBody as { messages?: unknown };
  const validationError = validateMessages(body.messages);
  if (validationError) return errorResponse(400, "INVALID_MESSAGES", validationError, "request.validate");

  if (isRateLimited(userId)) {
    return errorResponse(429, "USER_RATE_LIMITED", "You've sent several messages recently. Wait a minute before trying again.", "rate_limit.user", undefined, { "Retry-After": "60" });
  }

  const rawApiKey = Deno.env.get("GEMINI_API_KEY");
  const apiKey = rawApiKey ? rawApiKey.replace(/^["']+|["']+$/g, "").trim() : "";
  if (!apiKey) {
    return errorResponse(503, "GEMINI_API_KEY_MISSING", "StudyMate AI is not configured. Set GEMINI_API_KEY for this Supabase Edge Function.", "gemini.config");
  }

  const rawModel = Deno.env.get("GEMINI_MODEL");
  const cleanModel = rawModel ? rawModel.replace(/^["']+|["']+$/g, "").trim() : "";
  const model = (cleanModel || "gemini-1.5-flash").replace(/^models\//, "");

  const chatMessages = body.messages as ChatMessage[];
  const contents = formatGeminiContents(chatMessages);
  if (contents.length === 0) {
    return errorResponse(400, "INVALID_MESSAGES", "Send at least one valid message.", "request.validate");
  }

  const maxOutputTokens = determineMaxTokens(chatMessages, (body as { maxTokens?: unknown }).maxTokens);
  const wantsStream = (body as { stream?: unknown }).stream === true;
  let activeModel = model;
  const modelsToTry = Array.from(new Set([activeModel, "gemini-1.5-flash", "gemini-2.0-flash", "gemini-2.5-flash"]));

  if (wantsStream) {
    for (const candidateModel of modelsToTry) {
      activeModel = candidateModel;
      const streamEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(activeModel)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;
      try {
        const streamResp = await fetch(streamEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents,
            generationConfig: { maxOutputTokens },
          }),
          signal: AbortSignal.timeout(15_000),
        });

        if (streamResp.status === 200 && streamResp.body) {
          return new Response(streamResp.body, {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "text/event-stream; charset=utf-8",
            },
          });
        }
        if (streamResp.status !== 404 && streamResp.status !== 503) break;
      } catch {
        // stream failed, fall back to json
      }
    }
  }

  let providerResponse: Response | null = null;
  const tAuth = performance.now();
  let tGeminiStart = 0;
  let tGeminiEnd = 0;

  for (const candidateModel of modelsToTry) {
    activeModel = candidateModel;
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(activeModel)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    try {
      tGeminiStart = performance.now();
      const resp = await fetch(
        endpoint,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents,
            generationConfig: { maxOutputTokens },
          }),
          signal: AbortSignal.timeout(12_000),
        },
      );
      tGeminiEnd = performance.now();
      providerResponse = resp;
      if (resp.status === 200 || (resp.status !== 404 && resp.status !== 503)) break;
    } catch {
      tGeminiEnd = performance.now();
    }
  }

  if (!providerResponse) {
    return errorResponse(504, "GEMINI_TIMEOUT", "StudyMate AI took too long to respond. Please try again.", "gemini.fetch");
  }

  let providerBody: { error?: { message?: unknown; status?: unknown }; candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> }; finishReason?: string }>; promptFeedback?: { blockReason?: string } };
  try {
    providerBody = await providerResponse.json();
  } catch {
    return errorResponse(502, "GEMINI_INVALID_RESPONSE", "Gemini returned an invalid response. Please try again.", "gemini.parse", providerResponse.status);
  }
  const tParseEnd = performance.now();

  if (!providerResponse.ok) {
    const rawError = providerBody.error?.message;
    console.error("Provider error:", providerResponse.status, safeProviderMessage(rawError, apiKey));
    const providerMessage = safeProviderMessage(rawError, apiKey);

    if (providerResponse.status === 404) {
      try {
        const listResp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
          { signal: AbortSignal.timeout(5_000) }
        );
        const listBody = await listResp.json() as {
          models?: Array<{ name?: string; supportedGenerationMethods?: string[] }>;
          error?: { message?: string };
        };
        const available = listBody.models
          ?.filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
          ?.map((m) => (m.name ?? "").replace(/^models\//, ""))
          ?.slice(0, 8)
          ?.join(", ");
        return errorResponse(
          503,
          "GEMINI_MODEL_NOT_FOUND",
          `Gemini model '${model}' was not found (HTTP 404). Available models: ${available || "none"}. Error: ${providerMessage}`,
          "gemini.models",
          providerResponse.status
        );
      } catch {
        // proceed with default classification
      }
    }

    const failure = classifyProviderError(providerResponse.status, providerMessage);
    return errorResponse(failure.status, failure.code, failure.message, "gemini.generate", providerResponse.status);
  }

  const candidate = providerBody.candidates?.[0];
  const reply = candidate?.content?.parts
    ?.map((part) => typeof part.text === "string" ? part.text : "")
    .join("")
    .trim();
  if (!reply) {
    const finishReason = candidate?.finishReason;
    const blocked = Boolean(providerBody.promptFeedback?.blockReason) ||
      ["SAFETY", "BLOCKLIST", "PROHIBITED_CONTENT", "SPII", "RECITATION"].includes(finishReason ?? "");
    const blockReason = providerBody.promptFeedback?.blockReason ?? (blocked ? finishReason : undefined);
    return errorResponse(
      blocked ? 400 : 502,
      blocked ? "GEMINI_RESPONSE_BLOCKED" : "GEMINI_EMPTY_RESPONSE",
      blockReason ? `Gemini blocked this response (${blockReason}). Rephrase the question and try again.` : "Gemini returned no text answer. Please try again.",
      "gemini.response",
    );
  }

  const totalMs = Math.round(performance.now() - t0);
  const authMs = Math.round(tAuth - t0);
  const geminiMs = Math.round(tGeminiEnd - tGeminiStart);
  const parseMs = Math.round(tParseEnd - tGeminiEnd);

  return jsonResponse(200, {
    reply,
    model: activeModel,
    timings: { authMs, geminiMs, parseMs, totalMs },
  });
});
