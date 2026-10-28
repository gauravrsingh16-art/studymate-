import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Bot,
  Check,
  Copy,
  GraduationCap,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  RotateCw,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { requestStudyMateReply, type StudyMateMessage } from "@/lib/studymate";

const suggestions = [
  "Explain a topic",
  "Solve a numerical",
  "Help with code",
  "Generate exam notes",
  "Take a quiz",
  "Motivate me",
];

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const pieces = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|https?:\/\/[^\s<]+)/g);

  return pieces.map((piece, index) => {
    const key = `${keyPrefix}-${index}`;
    if (piece.startsWith("`") && piece.endsWith("`")) {
      return <code key={key} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em]">{piece.slice(1, -1)}</code>;
    }
    if (piece.startsWith("**") && piece.endsWith("**")) {
      return <strong key={key}>{piece.slice(2, -2)}</strong>;
    }
    if (piece.startsWith("*") && piece.endsWith("*")) {
      return <em key={key}>{piece.slice(1, -1)}</em>;
    }
    if (/^https?:\/\//.test(piece)) {
      return <a key={key} href={piece} target="_blank" rel="noreferrer" className="break-all text-primary underline">{piece}</a>;
    }
    return piece;
  });
}

function splitTableRow(line: string): string[] {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
}

function MarkdownMessage({ content }: { content: string }) {
  const lines = content.split(/\r?\n/);
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    if (!lines[index].trim()) {
      index += 1;
      continue;
    }

    const codeFence = lines[index].match(/^```([\w+-]*)\s*$/);
    if (codeFence) {
      const language = codeFence[1];
      index += 1;
      const codeLines: string[] = [];
      while (index < lines.length && !/^```\s*$/.test(lines[index])) {
        codeLines.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push(
        <div key={`code-${blocks.length}`} className="my-2 overflow-hidden rounded-lg border border-border bg-background">
          {language && <div className="border-b border-border px-3 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">{language}</div>}
          <pre className="max-w-full overflow-x-auto p-3 text-xs leading-relaxed"><code>{codeLines.join("\n")}</code></pre>
        </div>,
      );
      continue;
    }

    if (
      lines[index].includes("|") &&
      index + 1 < lines.length &&
      /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[index + 1]) &&
      lines[index + 1].includes("-")
    ) {
      const headers = splitTableRow(lines[index]);
      index += 2;
      const rows: string[][] = [];
      while (index < lines.length && lines[index].includes("|") && lines[index].trim()) {
        rows.push(splitTableRow(lines[index]));
        index += 1;
      }
      blocks.push(
        <div key={`table-${blocks.length}`} className="my-2 max-w-full overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead><tr>{headers.map((cell, cellIndex) => <th key={cellIndex} className="border border-border bg-muted px-2 py-1.5 font-semibold">{renderInline(cell, `th-${cellIndex}`)}</th>)}</tr></thead>
            <tbody>{rows.map((row, rowIndex) => (
              <tr key={rowIndex}>{headers.map((_, cellIndex) => <td key={cellIndex} className="border border-border px-2 py-1.5">{renderInline(row[cellIndex] ?? "", `td-${rowIndex}-${cellIndex}`)}</td>)}</tr>
            ))}</tbody>
          </table>
        </div>,
      );
      continue;
    }

    const heading = lines[index].match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const className = level === 1 ? "text-base font-bold" : level === 2 ? "text-sm font-bold" : "text-sm font-semibold";
      blocks.push(<p key={`heading-${blocks.length}`} className={`mb-1 mt-2 ${className}`}>{renderInline(heading[2], `heading-${blocks.length}`)}</p>);
      index += 1;
      continue;
    }

    if (/^\s*(?:[-*+]|\d+\.)\s+/.test(lines[index])) {
      const ordered = /^\s*\d+\.\s+/.test(lines[index]);
      const items: string[] = [];
      while (index < lines.length && /^\s*(?:[-*+]|\d+\.)\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*(?:[-*+]|\d+\.)\s+/, ""));
        index += 1;
      }
      const List = ordered ? "ol" : "ul";
      blocks.push(
        <List key={`list-${blocks.length}`} className={`my-1 space-y-1 pl-5 ${ordered ? "list-decimal" : "list-disc"}`}>
          {items.map((item, itemIndex) => <li key={itemIndex}>{renderInline(item, `list-${blocks.length}-${itemIndex}`)}</li>)}
        </List>,
      );
      continue;
    }

    const paragraph: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^```/.test(lines[index]) &&
      !/^#{1,3}\s+/.test(lines[index]) &&
      !/^\s*(?:[-*+]|\d+\.)\s+/.test(lines[index])
    ) {
      paragraph.push(lines[index]);
      index += 1;
    }
    blocks.push(
      <p key={`paragraph-${blocks.length}`} className="my-1 whitespace-pre-wrap">
        {paragraph.map((line, lineIndex) => (
          <span key={lineIndex}>{lineIndex > 0 && <br />}{renderInline(line, `paragraph-${blocks.length}-${lineIndex}`)}</span>
        ))}
      </p>,
    );
  }

  return <div className="break-words text-sm leading-relaxed">{blocks}</div>;
}

function makeMessage(role: StudyMateMessage["role"], content: string): StudyMateMessage {
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, role, content };
}

export default function StudyMateWidget() {
  const { user, session, loading: authLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [messages, setMessages] = useState<StudyMateMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [retryMessages, setRetryMessages] = useState<StudyMateMessage[] | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState("");
  const sendingRef = useRef(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollContainerRef.current?.scrollTo({ top: scrollContainerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isSending, errorMessage, isOpen]);

  useEffect(() => {
    if (isOpen && window.matchMedia("(min-width: 768px)").matches) inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setIsMaximized(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen]);

  if (authLoading || !user) return null;

  function toApiMessages(history: StudyMateMessage[]) {
    let remainingCharacters = 4_000;
    const selected: Array<{ role: StudyMateMessage["role"]; content: string }> = [];
    for (const message of [...history].reverse().slice(0, 8)) {
      if (message.content.length > 2500) continue;
      if (message.content.length > remainingCharacters) break;
      selected.unshift({ role: message.role, content: message.content });
      remainingCharacters -= message.content.length;
    }
    return selected;
  }

  async function requestReply(history: StudyMateMessage[], replaceMessageId?: string) {
    if (sendingRef.current) return;
    if (!session?.access_token) {
      setErrorMessage("Your sign-in session has expired. Sign in again to continue chatting.");
      return;
    }

    sendingRef.current = true;
    setIsSending(true);
    setErrorMessage("");
    setRetryMessages(null);

    const abortController = new AbortController();
    const safetyTimeout = window.setTimeout(() => {
      abortController.abort();
    }, 25_000);

    const targetMessageId = replaceMessageId || makeMessage("assistant", "").id;
    let hasCreatedPlaceholder = Boolean(replaceMessageId);

    const handleChunk = (chunk: string) => {
      setIsSending(false);
      setMessages((current) => {
        const exists = current.some((m) => m.id === targetMessageId);
        if (exists) {
          return current.map((m) => m.id === targetMessageId ? { ...m, content: m.content + chunk } : m);
        }
        return [...current, { id: targetMessageId, role: "assistant", content: chunk }];
      });
      hasCreatedPlaceholder = true;
    };

    try {
      const reply = await requestStudyMateReply(
        toApiMessages(history),
        session.access_token,
        {
          signal: abortController.signal,
          onChunk: handleChunk,
        },
      );

      setMessages((current) => {
        const exists = current.some((m) => m.id === targetMessageId);
        if (exists) {
          return current.map((m) => m.id === targetMessageId ? { ...m, content: reply } : m);
        }
        return [...current, { id: targetMessageId, role: "assistant", content: reply }];
      });
    } catch (error) {
      if (!hasCreatedPlaceholder) {
        const isAbort =
          (error instanceof DOMException && error.name === "AbortError") ||
          (error instanceof Error && (error.name === "TimeoutError" || /aborted|timeout/i.test(error.message)));
        setErrorMessage(
          isAbort
            ? "StudyMate took too long to respond. Please try again."
            : error instanceof Error
              ? error.message
              : "Something went wrong. Please try again.",
        );
        setRetryMessages(history);
      }
    } finally {
      window.clearTimeout(safetyTimeout);
      sendingRef.current = false;
      setIsSending(false);
    }
  }

  function sendMessage(rawMessage: string) {
    const content = rawMessage.trim();
    if (!content || sendingRef.current) return;
    if (content.length > 4000) {
      setErrorMessage("Please keep each message under 4,000 characters.");
      return;
    }
    const nextHistory = [...messages, makeMessage("user", content)];
    setMessages(nextHistory);
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "";
    setErrorMessage("");
    void requestReply(nextHistory);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendMessage(input);
  }

  function startNewChat() {
    if (messages.length > 0 && !window.confirm("Clear this conversation and start a new chat?")) return;
    setMessages([]);
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "";
    setErrorMessage("");
    setRetryMessages(null);
    inputRef.current?.focus();
  }

  async function copyAnswer(message: StudyMateMessage) {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedMessageId(message.id);
      window.setTimeout(() => setCopiedMessageId(""), 1600);
    } catch {
      setErrorMessage("Could not copy the answer. Check your browser clipboard permissions.");
    }
  }

  function regenerateAnswer(message: StudyMateMessage) {
    const messageIndex = messages.findIndex((item) => item.id === message.id);
    if (messageIndex <= 0) return;
    void requestReply(messages.slice(0, messageIndex), message.id);
  }

  const latestAssistantMessage = [...messages].reverse().find((message) => message.role === "assistant");

  return (
    <>
      {!isOpen && (
        <motion.button
          type="button"
          onClick={() => setIsOpen(true)}
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          className="fixed bottom-5 right-5 z-[70] flex h-14 items-center gap-2 rounded-full bg-primary px-5 text-primary-foreground shadow-xl transition-colors hover:bg-primary/90 max-md:bottom-[calc(env(safe-area-inset-bottom)+5rem)]"
          aria-label="Open StudyMate AI chat"
        >
          <GraduationCap className="h-5 w-5" />
          <span className="text-sm font-semibold">StudyMate AI</span>
          <Sparkles className="h-4 w-4" />
        </motion.button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="studymate-title"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className={`fixed bottom-4 right-4 z-[70] flex h-[min(700px,calc(100dvh-2rem))] w-[min(430px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl max-md:inset-0 max-md:h-[100dvh] max-md:w-full max-md:rounded-none ${isMaximized ? "!inset-4 !h-auto !w-auto max-md:!inset-0" : ""}`}
          >
            <header className="flex shrink-0 items-center justify-between border-b border-border bg-card px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 id="studymate-title" className="truncate text-sm font-bold text-foreground">StudyMate AI</h2>
                  <p className="text-xs text-muted-foreground">Your personal study companion</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center">
                <button type="button" onClick={startNewChat} disabled={isSending} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50" aria-label="Start a new chat" title="New chat">
                  <Plus className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => setIsMaximized((value) => !value)} className="hidden rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground md:block" aria-label={isMaximized ? "Restore chat size" : "Maximize chat"} title={isMaximized ? "Restore" : "Maximize"}>
                  {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>
                <button type="button" onClick={() => setIsOpen(false)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Minimize chat" title="Minimize">
                  <Minus className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => { setIsOpen(false); setIsMaximized(false); }} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close chat" title="Close">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </header>

            {messages.length > 0 && (
              <div className="flex shrink-0 justify-end border-b border-border px-4 py-1.5">
                <button type="button" onClick={startNewChat} disabled={isSending} className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs text-muted-foreground hover:text-destructive disabled:opacity-50">
                  <Trash2 className="h-3.5 w-3.5" /> Clear chat
                </button>
              </div>
            )}

            <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
              {messages.length === 0 ? (
                <div className="flex min-h-full flex-col justify-center">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Bot className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">Hello, student! 👋</h3>
                  <p className="mt-1 text-sm font-semibold text-foreground">I&apos;m StudyMate AI, your personal study companion.</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Ask me an academic question, get help with difficult topics, prepare for exams, or get motivated when studying feels difficult.
                  </p>
                  <p className="mb-4 mt-2 text-sm text-muted-foreground">What would you like to learn today?</p>
                  <div className="grid grid-cols-2 gap-2">
                    {suggestions.map((suggestion) => (
                      <button key={suggestion} type="button" onClick={() => sendMessage(suggestion)} disabled={isSending} className="rounded-xl border border-border bg-background px-3 py-2.5 text-left text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:opacity-50">
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <article key={message.id} className={`flex gap-2.5 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                      {message.role === "assistant" && (
                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Bot className="h-4 w-4" />
                        </div>
                      )}
                      <div className={`min-w-0 max-w-[86%] rounded-2xl px-3.5 py-2.5 ${message.role === "user" ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-muted/70 text-foreground"}`}>
                        <MarkdownMessage content={message.content} />
                        {message.role === "assistant" && (
                          <div className="mt-2 flex items-center gap-1 border-t border-border/70 pt-1.5">
                            <button type="button" onClick={() => void copyAnswer(message)} className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-[11px] text-muted-foreground hover:bg-background hover:text-foreground" aria-label="Copy answer">
                              {copiedMessageId === message.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                              {copiedMessageId === message.id ? "Copied" : "Copy"}
                            </button>
                            {latestAssistantMessage?.id === message.id && (
                              <button type="button" onClick={() => regenerateAnswer(message)} disabled={isSending} className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-[11px] text-muted-foreground hover:bg-background hover:text-foreground disabled:opacity-50" aria-label="Regenerate answer">
                                <RotateCw className="h-3 w-3" /> Regenerate
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </article>
                  ))}

                  {isSending && (
                    <div className="flex items-center gap-2.5" role="status" aria-label="StudyMate is thinking">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary"><Bot className="h-4 w-4" /></div>
                      <div className="flex items-center gap-1 rounded-2xl bg-muted/70 px-4 py-3">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.2s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.1s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
                      </div>
                    </div>
                  )}
                  {errorMessage && (
                    <div role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-foreground">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                        <p className="min-w-0 flex-1">{errorMessage}</p>
                      </div>
                      {retryMessages && (
                        <button type="button" onClick={() => void requestReply(retryMessages)} disabled={isSending} className="ml-6 mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline disabled:opacity-50">
                          <RotateCw className="h-3 w-3" /> Try again
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="shrink-0 border-t border-border bg-card px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3">
              <div className="flex items-end gap-2 rounded-2xl border border-input bg-background p-2 focus-within:ring-2 focus-within:ring-ring/40">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(event) => {
                    setInput(event.target.value);
                    event.target.style.height = "auto";
                    event.target.style.height = `${Math.min(event.target.scrollHeight, 112)}px`;
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                  maxLength={4000}
                  rows={1}
                  placeholder="Ask a study question..."
                  aria-label="Message StudyMate AI"
                  className="max-h-28 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  disabled={isSending}
                />
                <button type="submit" disabled={isSending || !input.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50" aria-label="Send message">
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1.5 text-center text-[10px] text-muted-foreground">StudyMate can make mistakes. Check important answers with your course materials.</p>
            </form>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}
