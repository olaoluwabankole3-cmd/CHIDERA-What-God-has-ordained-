"use client";

import { FormEvent, useState } from "react";
import { ArrowUp, BrainCircuit, FileText, Loader2, Sparkles } from "lucide-react";

type TutorSource = {
  number: number;
  materialId: string;
  title: string;
  pageNumber: number | null;
  similarity: number;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  sources?: TutorSource[];
};

export function CourseTutor({ courseCode, courseTitle }: { courseCode: string; courseTitle: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: `I’m your ${courseCode} tutor. Upload a course PDF and I can teach directly from it, or ask me any question about ${courseTitle}.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const nextMessages = [...messages, { role: "user" as const, content: text }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          course: { code: courseCode, title: courseTitle },
          history: nextMessages.slice(-8).map(({ role, content }) => ({ role, content })),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Tutor request failed");

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: data.answer,
          sources: Array.isArray(data.sources) ? data.sources : [],
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: "I couldn’t reach the tutor service. Check your OpenAI and Supabase environment configuration, then try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[520px] flex-col rounded-[24px] sm:min-h-[600px] border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:items-center sm:px-5 sm:py-4">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#eff6ff] text-[#2563eb]"><BrainCircuit size={18} /></span>
          <div>
            <p className="text-sm font-bold">AI Tutor</p>
            <p className="hidden text-[11px] text-slate-400 sm:block">Grounded in your indexed course materials</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Ready
        </span>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3.5 sm:space-y-5 sm:p-6">
        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[94%] rounded-2xl px-3.5 py-3 text-sm leading-6 sm:max-w-[88%] sm:px-4 ${message.role === "user" ? "bg-slate-950 text-white" : "bg-[#eff6ff] text-slate-700"}`}>
              {message.role === "assistant" && (
                <div className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[.12em] text-[#2563eb]">
                  <Sparkles size={11} /> Academic AI
                </div>
              )}
              <p className="whitespace-pre-wrap">{message.content}</p>

              {message.role === "assistant" && message.sources && message.sources.length > 0 && (
                <div className="mt-4 border-t border-[#e6e1ff] pt-3">
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[.12em] text-slate-400">Retrieved course sources</p>
                  <div className="flex flex-wrap gap-2">
                    {message.sources.slice(0, 6).map((source) => (
                      <span key={`${source.number}-${source.materialId}-${source.pageNumber}`} className="inline-flex items-center gap-1.5 rounded-lg border border-[#dbeafe] bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-600">
                        <FileText size={11} className="text-[#2563eb]" />
                        [{source.number}] {source.title}{source.pageNumber ? ` · p. ${source.pageNumber}` : ""}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl bg-[#eff6ff] px-4 py-3 text-sm text-slate-500">
              <Loader2 size={15} className="animate-spin" /> Searching your materials and thinking…
            </div>
          </div>
        )}
      </div>

      <form onSubmit={sendMessage} className="border-t border-slate-100 p-3 sm:p-4">
        <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 focus-within:border-[#b8adff] focus-within:bg-white">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={2}
            placeholder={`Ask anything about ${courseCode}...`}
            className="min-h-12 flex-1 resize-none bg-transparent px-2 py-2 text-[16px] leading-6 outline-none sm:text-sm placeholder:text-slate-400"
          />
          <button disabled={loading || !input.trim()} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#2563eb] text-white disabled:cursor-not-allowed disabled:opacity-40" aria-label="Send message">
            <ArrowUp size={17} />
          </button>
        </div>
        <p className="mt-2 hidden px-1 text-[10px] text-slate-400 sm:block">When relevant indexed notes are found, the tutor retrieves and labels the supporting pages below its answer.</p>
      </form>
    </div>
  );
}
