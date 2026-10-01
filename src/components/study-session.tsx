"use client";

import {
  BrainCircuit,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  MessageCircle,
  Pause,
  Play,
  RotateCcw,
  Send,
  Sparkles,
  Target,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";

type TutorSource = {
  number: number;
  title: string;
  pageNumber: number | null;
  similarity: number;
};

type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: TutorSource[];
};

type Completion = {
  studyMinutes: number;
  activeSeconds: number;
  interactionCount: number;
};

function formatTimer(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function StudySession({
  courseId,
  courseCode,
  courseTitle,
  focusTopic,
  scheduledMinutes,
  deadlineTitle,
  masteryScore,
}: {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  focusTopic: string | null;
  scheduledMinutes: number;
  deadlineTitle: string | null;
  masteryScore: number | null;
}) {
  const targetSeconds = scheduledMinutes * 60;
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [activeSeconds, setActiveSeconds] = useState(0);
  const [interactionCount, setInteractionCount] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<"learn" | "check" | "reflect">("learn");
  const [loading, setLoading] = useState<"start" | "tutor" | "complete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selfRating, setSelfRating] = useState<number | null>(null);
  const [reflection, setReflection] = useState("");
  const [completion, setCompletion] = useState<Completion | null>(null);
  const completedRef = useRef(false);
  const activeSecondsRef = useRef(0);
  const interactionCountRef = useRef(0);

  const progress = Math.min(100, Math.round((activeSeconds / Math.max(1, targetSeconds)) * 100));
  const remainingSeconds = Math.max(0, targetSeconds - activeSeconds);

  useEffect(() => {
    activeSecondsRef.current = activeSeconds;
  }, [activeSeconds]);

  useEffect(() => {
    interactionCountRef.current = interactionCount;
  }, [interactionCount]);

  const phaseCopy = useMemo(
    () => ({
      learn: {
        label: "Learn",
        title: "Build the mental model",
        description:
          "Ask the tutor to explain the topic, connect it to prerequisites, and work through an example.",
      },
      check: {
        label: "Check",
        title: "Prove you can use it",
        description:
          "Ask for a checkpoint question. Explain your reasoning before looking for the answer.",
      },
      reflect: {
        label: "Reflect",
        title: "Lock in the learning",
        description:
          "Summarize what changed in your understanding, then rate your confidence.",
      },
    }),
    [],
  );

  async function callTutor(message: string, nextPhase?: typeof phase) {
    const text = message.trim();
    if (!text || loading === "tutor") return;

    const nextMessages = [...messages, { role: "user" as const, content: text }];
    setMessages(nextMessages);
    setInput("");
    setLoading("tutor");
    setError(null);
    setInteractionCount((current) => current + 1);
    if (nextPhase) setPhase(nextPhase);

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
      if (!response.ok) throw new Error(data.error || "The tutor could not respond.");

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: String(data.answer || "I couldn't generate a response."),
          sources: Array.isArray(data.sources) ? data.sources : [],
        },
      ]);
    } catch (tutorError) {
      setError(
        tutorError instanceof Error
          ? tutorError.message
          : "The tutor could not respond.",
      );
    } finally {
      setLoading(null);
    }
  }

  async function startSession() {
    setLoading("start");
    setError(null);

    try {
      const params = new URLSearchParams(window.location.search);
      const deadlineId = params.get("deadlineId");

      const response = await fetch("/api/study-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          courseId,
          deadlineId,
          focusTopic,
          scheduledMinutes,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not start the study session.");

      setSessionId(data.sessionId);
      setMessages([
        {
          role: "assistant",
          content: `You're in a focused ${scheduledMinutes}-minute session for ${focusTopic || courseCode}. I’ll keep the session centered on one learning goal. Start by asking me anything you find unclear, or use the guided checkpoint below.`,
        },
      ]);

      const openingPrompt = focusTopic
        ? `Start my focused study session on "${focusTopic}". Teach me the core idea in a concise, university-level explanation using my ${courseCode} material where available. Then give me one short example and stop so I can ask questions.`
        : `Start a focused study session for ${courseCode}. Help me identify one important concept from my course material, explain it clearly, give one worked example, and then ask me a short check question.`;

      await callTutor(openingPrompt);
    } catch (startError) {
      setError(
        startError instanceof Error
          ? startError.message
          : "Could not start the study session.",
      );
    } finally {
      setLoading(null);
    }
  }

  async function completeSession() {
    if (!sessionId || completion) return;

    setLoading("complete");
    setError(null);

    try {
      const response = await fetch("/api/study-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete",
          sessionId,
          activeSeconds,
          interactionCount,
          selfRating,
          reflection,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not complete the session.");

      completedRef.current = true;
      setCompletion({
        studyMinutes: Number(data.studyMinutes || Math.floor(activeSeconds / 60)),
        activeSeconds: Number(data.activeSeconds || activeSeconds),
        interactionCount: Number(data.interactionCount || interactionCount),
      });
    } catch (completionError) {
      setError(
        completionError instanceof Error
          ? completionError.message
          : "Could not complete the study session.",
      );
    } finally {
      setLoading(null);
    }
  }

  useEffect(() => {
    if (!sessionId || completion) return;

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        setActiveSeconds((current) => Math.min(targetSeconds, current + 1));
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [sessionId, completion, targetSeconds]);

  useEffect(() => {
    if (!sessionId || completion) return;

    const heartbeat = window.setInterval(() => {
      void fetch("/api/study-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "heartbeat",
          sessionId,
          activeSeconds: activeSecondsRef.current,
          interactionCount: interactionCountRef.current,
        }),
      });
    }, 30_000);

    return () => window.clearInterval(heartbeat);
  }, [sessionId, completion]);

  useEffect(() => {
    if (!sessionId || completion) return;

    const handleBeforeUnload = () => {
      void fetch("/api/study-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "heartbeat",
          sessionId,
          activeSeconds: activeSecondsRef.current,
          interactionCount: interactionCountRef.current,
        }),
        keepalive: true,
      });
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [sessionId, completion]);

  useEffect(() => {
    if (!sessionId) return;

    return () => {
      if (completedRef.current) return;

      void fetch("/api/study-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "abandon",
          sessionId,
        }),
        keepalive: true,
      });
    };
  }, [sessionId]);

  function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void callTutor(input);
  }

  const guidedPrompts = {
    learn: focusTopic
      ? `Explain ${focusTopic} using a simple mental model, then show me one worked example.`
      : `Teach me one important concept from ${courseCode} with a worked example.`,
    check: focusTopic
      ? `Give me one checkpoint question on ${focusTopic}. Do not reveal the answer until I respond.`
      : `Give me one checkpoint question from this course. Do not reveal the answer until I respond.`,
    reflect:
      "Ask me to explain the key idea back in my own words, then tell me what part of my explanation needs tightening.",
  };

  if (completion) {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={28} />
          </span>
          <p className="mt-5 text-xs font-black uppercase tracking-[.16em] text-emerald-600">
            Session complete
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">
            You put in {completion.studyMinutes} focused minute{completion.studyMinutes === 1 ? "" : "s"}.
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Your study exposure for {focusTopic || courseCode} has been recorded.
            Your mastery score itself remains assessment-driven, so time spent studying is not treated as proof of correctness.
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-2xl font-black">{formatTimer(completion.activeSeconds)}</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                focused time
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-2xl font-black">{completion.interactionCount}</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                tutor interactions
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-2xl font-black">
                {selfRating ? `${selfRating}/5` : "—"}
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                confidence
              </p>
            </div>
          </div>

          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/study-plan"
              className="rounded-xl bg-[#5b46e8] px-5 py-3 text-sm font-bold text-white"
            >
              Back to study plan
            </Link>
            <Link
              href={`/courses/${courseId}/practice${focusTopic ? `?focus=${encodeURIComponent(focusTopic)}` : ""}`}
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700"
            >
              Take a checkpoint quiz
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f0edff] text-[#5b46e8]">
              <Target size={22} />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[.15em] text-[#5b46e8]">
                Focused study session
              </p>
              <h1 className="mt-1 text-2xl font-black">{focusTopic || courseTitle}</h1>
            </div>
          </div>

          <p className="mt-5 text-sm leading-6 text-slate-500">
            This is a distraction-light session built around one learning goal.
            The tutor will explain, check your understanding, and help you close gaps before you finish.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <BrainCircuit size={17} className="text-[#5b46e8]" />
              <p className="mt-3 text-xs font-black">AI explanation</p>
              <p className="mt-1 text-[11px] leading-5 text-slate-400">Grounded in your course material when available.</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <MessageCircle size={17} className="text-[#5b46e8]" />
              <p className="mt-3 text-xs font-black">Checkpoint</p>
              <p className="mt-1 text-[11px] leading-5 text-slate-400">Ask for a question and reason it out before the answer.</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <Clock3 size={17} className="text-[#5b46e8]" />
              <p className="mt-3 text-xs font-black">{scheduledMinutes} minutes</p>
              <p className="mt-1 text-[11px] leading-5 text-slate-400">Only visible time counts toward the session.</p>
            </div>
          </div>

          {deadlineTitle && (
            <p className="mt-5 rounded-xl bg-[#f7f5ff] px-4 py-3 text-xs font-semibold text-slate-600">
              Scheduled because of: <span className="font-black">{deadlineTitle}</span>
            </p>
          )}

          {masteryScore !== null && (
            <p className="mt-3 text-xs text-slate-400">
              Current recorded mastery for this topic: <span className="font-black text-slate-700">{masteryScore}%</span>
            </p>
          )}

          {error && (
            <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-xs text-red-700">{error}</p>
          )}

          <button
            type="button"
            disabled={loading === "start"}
            onClick={() => void startSession()}
            className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-black text-white disabled:opacity-60"
          >
            {loading === "start" ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            Start focused session
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="sticky top-3 z-10 rounded-[22px] border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#f0edff] text-[#5b46e8]">
                <Target size={15} />
              </span>
              <p className="truncate text-sm font-black">{focusTopic || courseCode}</p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-[#5b46e8] transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="font-mono text-2xl font-black">{formatTimer(activeSeconds)}</p>
              <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                {remainingSeconds > 0 ? `${formatTimer(remainingSeconds)} remaining` : "target reached"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void completeSession()}
              disabled={loading === "complete"}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white disabled:opacity-60"
            >
              {loading === "complete" ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Finish
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {(Object.keys(phaseCopy) as Array<keyof typeof phaseCopy>).map((key, index) => {
          const active = phase === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setPhase(key)}
              className={`rounded-2xl border p-4 text-left transition ${
                active
                  ? "border-[#bdb5ff] bg-[#f7f5ff]"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <p className="text-[10px] font-black uppercase tracking-[.13em] text-slate-400">
                {index + 1} · {phaseCopy[key].label}
              </p>
              <p className="mt-2 text-sm font-black">{phaseCopy[key].title}</p>
              <p className="mt-1 text-[11px] leading-5 text-slate-400">
                {phaseCopy[key].description}
              </p>
            </button>
          );
        })}
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="rounded-[24px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-[#5b46e8]" />
              <p className="text-sm font-black">Session tutor</p>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Keep your questions centered on {focusTopic || courseCode}.
            </p>
          </div>

          <div className="max-h-[540px] space-y-4 overflow-y-auto p-5">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                    message.role === "user"
                      ? "bg-slate-950 text-white"
                      : "bg-[#f7f5ff] text-slate-700"
                  }`}
                >
                  {message.role === "assistant" && (
                    <p className="mb-2 text-[9px] font-black uppercase tracking-[.14em] text-[#5b46e8]">
                      Academic AI
                    </p>
                  )}
                  <p className="whitespace-pre-wrap">{message.content}</p>

                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-3 space-y-1 border-t border-black/5 pt-3">
                      {message.sources.slice(0, 3).map((source) => (
                        <p key={source.number} className="inline-flex items-center gap-1.5 text-[9px] font-semibold text-slate-500">
                          <FileText size={10} />
                          [Source {source.number}] {source.title}
                          {source.pageNumber ? ` · p. ${source.pageNumber}` : ""}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading === "tutor" && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-[#f7f5ff] px-4 py-3">
                  <Loader2 size={16} className="animate-spin text-[#5b46e8]" />
                </div>
              </div>
            )}
          </div>

          <form onSubmit={submitMessage} className="border-t border-slate-100 p-4">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask about the concept, example, or step you don't understand..."
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#a79cff]"
                disabled={loading === "tutor"}
              />
              <button
                type="submit"
                disabled={!input.trim() || loading === "tutor"}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#5b46e8] text-white disabled:opacity-50"
                aria-label="Send question"
              >
                <Send size={16} />
              </button>
            </div>
          </form>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[.13em] text-[#5b46e8]">
              Guided action
            </p>
            <h2 className="mt-2 text-lg font-black">{phaseCopy[phase].title}</h2>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              {phaseCopy[phase].description}
            </p>

            <button
              type="button"
              disabled={loading === "tutor"}
              onClick={() => void callTutor(guidedPrompts[phase], phase === "learn" ? "learn" : phase)}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-xs font-black text-white disabled:opacity-60"
            >
              {loading === "tutor" ? <Loader2 size={14} className="animate-spin" /> : <BrainCircuit size={14} />}
              {phase === "check" ? "Give me a checkpoint" : phase === "reflect" ? "Start reflection" : "Teach me this"}
            </button>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[.13em] text-slate-400">
              Confidence
            </p>
            <p className="mt-2 text-sm font-black">How well do you understand this now?</p>
            <div className="mt-3 grid grid-cols-5 gap-1.5">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => setSelfRating(rating)}
                  className={`rounded-lg py-2 text-xs font-black ${
                    selfRating === rating
                      ? "bg-[#5b46e8] text-white"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  {rating}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[.13em] text-slate-400">
              Reflection
            </p>
            <textarea
              value={reflection}
              onChange={(event) => setReflection(event.target.value)}
              maxLength={500}
              rows={4}
              placeholder="What finally clicked? What still feels unclear?"
              className="mt-3 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 outline-none focus:border-[#a79cff]"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-xs leading-5 text-red-700">
              {error}
            </div>
          )}

          <button
            type="button"
            disabled={loading === "complete"}
            onClick={() => void completeSession()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <CheckCircle2 size={14} />
            Finish and record session
          </button>
        </aside>
      </section>
    </div>
  );
}
