"use client";

import { FormEvent, useState } from "react";
import { ArrowUp, BrainCircuit, Loader2, Sparkles } from "lucide-react";

type ChatMessage = { role: "user" | "assistant"; content: string };

export function CourseTutor({ courseCode, courseTitle }: { courseCode: string; courseTitle: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: `I’m your ${courseCode} tutor. We can learn ${courseTitle} step by step, work through examples, or revise for an exam. What would you like to study?`,
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
          history: nextMessages.slice(-8),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Tutor request failed");
      setMessages((current) => [...current, { role: "assistant", content: data.answer }]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: "I couldn’t reach the tutor service. Add your OPENAI_API_KEY in .env.local, then try again. The rest of the workspace still works without it.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[600px] flex-col rounded-[24px] border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#f0edff] text-[#5b46e8]"><BrainCircuit size={18}/></span>
          <div><p className="text-sm font-bold">AI Tutor</p><p className="text-[11px] text-slate-400">Course-aware learning session</p></div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500"/> Ready</span>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === "user" ? "bg-slate-950 text-white" : "bg-[#f7f5ff] text-slate-700"}`}>
              {message.role === "assistant" && <div className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[.12em] text-[#5b46e8]"><Sparkles size={11}/> Academic AI</div>}
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl bg-[#f7f5ff] px-4 py-3 text-sm text-slate-500"><Loader2 size={15} className="animate-spin"/> Thinking through your course...</div>
          </div>
        )}
      </div>

      <form onSubmit={sendMessage} className="border-t border-slate-100 p-4">
        <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 focus-within:border-[#b8adff] focus-within:bg-white">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={2}
            placeholder={`Ask anything about ${courseCode}...`}
            className="min-h-12 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-slate-400"
          />
          <button disabled={loading || !input.trim()} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#5b46e8] text-white disabled:cursor-not-allowed disabled:opacity-40" aria-label="Send message"><ArrowUp size={17}/></button>
        </div>
        <p className="mt-2 px-1 text-[10px] text-slate-400">Tutor answers should be checked against your lecturer’s materials when accuracy is critical.</p>
      </form>
    </div>
  );
}
