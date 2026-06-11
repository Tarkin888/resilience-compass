import { useCallback, useEffect, useRef, useState } from "react";
import { MessageSquare, X, Send, Info, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { ChatContext } from "@/hooks/useChatContext";

type Role = "user" | "assistant" | "error";
type ChatMessage = { role: Role; content: string; dataAsAt?: string | null };

interface Props {
  context: ChatContext;
  loading: boolean;
}

const STARTERS_AMBER_STEADY = [
  "Why is our Human Capital score sitting at Amber?",
  "Which metric is most at risk right now?",
  "What does the forecast say about the next three months?",
];

function getStarters(ctx: ChatContext): string[] {
  // Conditional variants could expand later; Amber/Steady is the current state.
  if (ctx.ragBand === "Red") {
    return [
      "Why is our Human Capital score in the Red band?",
      "Which metric is dragging the score down most?",
      "What does the forecast say about the next three months?",
    ];
  }
  if (ctx.ragBand === "Green") {
    return [
      "Why is our Human Capital score sitting at Green?",
      "Which metric is closest to slipping?",
      "What does the forecast say about the next three months?",
    ];
  }
  return STARTERS_AMBER_STEADY;
}

export const ResilienceChatPanel = ({ context, loading: contextLoading }: Props) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return;
      const nextHistory: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
      setMessages(nextHistory);
      setInput("");
      setSending(true);

      try {
        const apiMessages = nextHistory
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({ role: m.role, content: m.content }));
        const { data, error } = await supabase.functions.invoke("resc-chat", {
          body: { messages: apiMessages, context },
        });
        if (error || !data || data.error || !data.reply) {
          setMessages((m) => [
            ...m,
            { role: "error", content: "I'm unable to answer right now — please try again." },
          ]);
        } else {
          setMessages((m) => [
            ...m,
            { role: "assistant", content: String(data.reply), dataAsAt: context.dataAsAt },
          ]);
        }
      } catch {
        setMessages((m) => [
          ...m,
          { role: "error", content: "I'm unable to answer right now — please try again." },
        ]);
      } finally {
        setSending(false);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    },
    [messages, sending, context],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void send(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  };

  const clear = () => {
    setMessages([]);
    setInput("");
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-brand px-4 py-3 text-sm font-semibold text-white shadow-lg hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand"
        aria-label="Open data assistant"
      >
        <MessageSquare size={18} aria-hidden />
        Ask about your data
      </button>
    );
  }

  const starters = getStarters(context);
  const showStarters = messages.length === 0;
  const inputDisabled = sending || contextLoading;

  return (
    <aside
      className="fixed bottom-0 right-0 top-0 z-40 flex w-full max-w-[380px] flex-col border-l border-slate-200 bg-white shadow-2xl"
      role="complementary"
      aria-label="Resilience data assistant"
    >
      {/* Header */}
      <div className="border-b border-slate-200 px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900">Ask about your data</h2>
            <p className="mt-0.5 text-[11px] italic text-slate-500">
              AI-generated · Not a substitute for professional judgement
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setShowHowItWorks((v) => !v)}
              className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              aria-label="How this works"
            >
              <Info size={16} aria-hidden />
            </button>
            <button
              type="button"
              onClick={clear}
              className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              aria-label="Clear conversation"
              title="Clear"
            >
              <RotateCcw size={16} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              aria-label="Close panel"
            >
              <X size={16} aria-hidden />
            </button>
          </div>
        </div>
        {showHowItWorks && (
          <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-2 text-[11px] leading-relaxed text-slate-600">
            Answers are generated by AI using your live metric values, scores, and trend data. They are a starting point for discussion — not a substitute for professional judgement or local context.
          </div>
        )}
      </div>

      {/* Thread */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
        {showStarters ? (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">Try one of these to get started:</p>
            <ul className="space-y-2">
              {starters.map((q) => (
                <li key={q}>
                  <button
                    type="button"
                    onClick={() => void send(q)}
                    disabled={inputDisabled}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm text-slate-700 hover:border-brand hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
                  >
                    {q}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <ul className="space-y-3">
            {messages.map((m, i) => {
              if (m.role === "user") {
                return (
                  <li key={i} className="flex justify-end">
                    <div className="max-w-[85%] rounded-lg bg-brand px-3 py-2 text-sm text-white">
                      {m.content}
                    </div>
                  </li>
                );
              }
              if (m.role === "error") {
                return (
                  <li key={i} className="flex justify-start">
                    <div className="max-w-[90%] rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                      {m.content}
                    </div>
                  </li>
                );
              }
              return (
                <li key={i} className="flex flex-col items-start">
                  <div className="max-w-[90%] whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-relaxed text-slate-800">
                    {m.content}
                  </div>
                  {m.dataAsAt && (
                    <span className="mt-1 text-[10px] italic text-slate-500">
                      Based on data as at {m.dataAsAt}
                    </span>
                  )}
                </li>
              );
            })}
            {sending && (
              <li className="flex justify-start">
                <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
                </div>
              </li>
            )}
          </ul>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-slate-200 px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your resilience data…"
            rows={2}
            disabled={inputDisabled}
            className="min-h-[40px] flex-1 resize-none rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:bg-slate-50"
          />
          <button
            type="submit"
            disabled={inputDisabled || !input.trim()}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand text-white hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand disabled:opacity-40"
            aria-label="Send"
          >
            <Send size={16} aria-hidden />
          </button>
        </div>
        <p className="mt-2 text-[10px] text-slate-500">
          This assistant covers the Human Capital pillar only.
        </p>
      </form>
    </aside>
  );
};
