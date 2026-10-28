import { supabase } from "@/integrations/supabase/client";

export interface StudyMateMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ApiMessage {
  role: StudyMateMessage["role"];
  content: string;
}

export interface RequestStudyMateOptions {
  signal?: AbortSignal;
  onChunk?: (chunk: string) => void;
  maxTokens?: number;
}

function parseSseText(rawEvent: string): string {
  let text = "";
  const lines = rawEvent.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("data:")) {
      const jsonStr = trimmed.slice(5).trim();
      if (!jsonStr || jsonStr === "[DONE]") continue;
      try {
        const parsed = JSON.parse(jsonStr);
        const chunkText = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
        if (typeof chunkText === "string") {
          text += chunkText;
        }
      } catch {
        // partial line
      }
    }
  }
  return text;
}

export async function requestStudyMateReply(
  messages: ApiMessage[],
  accessToken: string,
  options?: RequestStudyMateOptions,
): Promise<string> {
  const wantsStream = typeof options?.onChunk === "function";

  let data: {
    reply?: unknown;
    error?: string | { code?: unknown; message?: unknown };
  } | Response | null;
  let error: { name?: string; message?: string; context?: unknown } | null;
  try {
    ({ data, error } = await supabase.functions.invoke("studymate-chat", {
      body: {
        messages,
        ...(wantsStream ? { stream: true } : {}),
        ...(options?.maxTokens ? { maxTokens: options.maxTokens } : {}),
      },
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 30_000,
      signal: options?.signal,
    }));
  } catch (invokeError) {
    const isTimeout =
      (invokeError instanceof DOMException && invokeError.name === "AbortError") ||
      (invokeError instanceof Error && (invokeError.name === "TimeoutError" || /aborted|timeout/i.test(invokeError.message)));
    if (isTimeout) {
      throw new Error("StudyMate took too long to respond. Please try again.");
    }
    throw new Error("Could not reach the StudyMate Edge Function. Check your Supabase connection and try again.");
  }

  if (error) {
    const context = error.context;
    const isResponseLike = context && typeof (context as { json?: unknown }).json === "function";
    if (context instanceof Response || isResponseLike) {
      const response = context as Response;
      let result: {
        code?: unknown;
        message?: unknown;
        error?: string | { code?: unknown; message?: unknown };
      } | null = null;
      try {
        result = await response.clone().json();
      } catch {
        try {
          result = await response.json();
        } catch {
          result = null;
        }
      }
      if (!result) {
        throw new Error(messageForStatus(response.status));
      }
      const providerError = result.error;
      const code = typeof providerError === "object" && providerError && typeof providerError.code === "string"
        ? providerError.code
        : typeof result.code === "string" ? result.code : undefined;
      const detail = typeof providerError === "string"
        ? providerError
        : providerError && typeof providerError.message === "string"
          ? providerError.message
          : typeof result.message === "string" ? result.message : undefined;
      const message = detail || messageForStatus(response.status);
      throw new Error(`${code ? `[${code}] ` : `[HTTP ${response.status}] `}${message}`);
    }
    if (error.name === "FunctionsFetchError") {
      const fetchFailure = context as { name?: string; message?: string } | undefined;
      const isTimeout =
        fetchFailure?.name === "TimeoutError" ||
        fetchFailure?.name === "AbortError" ||
        /aborted|timeout/i.test(fetchFailure?.message || "") ||
        /aborted|timeout/i.test(error.message || "");
      if (isTimeout) {
        throw new Error("StudyMate took too long to respond. Please try again.");
      }
      throw new Error(
        "Could not connect to Supabase. Check VITE_SUPABASE_URL, confirm `studymate-chat` is deployed to that project, and review the browser Network panel for CORS or DNS errors.",
      );
    }
    throw new Error(error.message || "StudyMate could not complete that request. Please try again.");
  }

  if (!data) {
    throw new Error("StudyMate returned an empty response. Please try again.");
  }

  // Handle SSE streaming response
  if (wantsStream && options?.onChunk && (data instanceof Response || (typeof (data as Response).body?.getReader === "function"))) {
    const streamResponse = data as Response;
    if (streamResponse.body) {
      const reader = streamResponse.body.getReader();
      const decoder = new TextDecoder();
      let fullReply = "";
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split(/\r?\n\r?\n/);
          buffer = parts.pop() || "";

          for (const event of parts) {
            const piece = parseSseText(event);
            if (piece) {
              fullReply += piece;
              options.onChunk(piece);
            }
          }
        }

        if (buffer.trim()) {
          const piece = parseSseText(buffer);
          if (piece) {
            fullReply += piece;
            options.onChunk(piece);
          }
        }
      } finally {
        reader.releaseLock();
      }

      if (fullReply.trim()) {
        return fullReply.trim();
      }
    }
  }

  const json = data as {
    reply?: unknown;
    error?: string | { code?: unknown; message?: unknown };
  };

  if (json.error) {
    const message = typeof json.error === "string"
      ? json.error
      : typeof json.error.message === "string"
        ? `${typeof json.error.code === "string" ? `[${json.error.code}] ` : ""}${json.error.message}`
        : "StudyMate could not complete that request. Please try again.";
    throw new Error(message);
  }

  if (typeof json.reply !== "string" || !json.reply.trim()) {
    throw new Error("StudyMate returned an empty answer. Please try again.");
  }

  return json.reply.trim();
}

function messageForStatus(status: number): string {
  switch (status) {
    case 401: return "Supabase rejected the sign-in token. Sign in again and retry.";
    case 403: return "This project denied access to the StudyMate function. Check function authentication and project access.";
    case 404: return "The `studymate-chat` function was not found in the configured Supabase project. Deploy it to that project.";
    case 429: return "StudyMate or Gemini is rate limited or out of quota. Wait and try again.";
    case 500: return "The StudyMate Edge Function failed. Check its Supabase function logs.";
    case 502: return "The Edge Function could not complete its Gemini request. Check the function logs and Gemini settings.";
    case 503: return "The StudyMate function or Gemini service is unavailable. Check its configuration and logs.";
    default: return `StudyMate could not answer (HTTP ${status}). Please try again.`;
  }
}
