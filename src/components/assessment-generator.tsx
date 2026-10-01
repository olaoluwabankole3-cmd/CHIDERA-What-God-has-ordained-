"use client";

import { BookOpenCheck, FileQuestion, Loader2, Target } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type AssessmentType = "quiz" | "mock_exam";

export function AssessmentGenerator({
  courseId,
  readyMaterials,
  focusTopic,
}: {
  courseId: string;
  readyMaterials: number;
  focusTopic?: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<AssessmentType | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate(type: AssessmentType) {
    setLoading(type);
    setError(null);

    try {
      const response = await fetch("/api/assessments/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          type,
          focusTopic: focusTopic || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not generate assessment.");

      router.push(`/courses/${courseId}/practice/${data.assessmentId}`);
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Could not generate assessment.",
      );
    } finally {
      setLoading(null);
    }
  }

  if (readyMaterials === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5">
        <p className="text-sm font-bold">Upload a course PDF first</p>
        <p className="mt-2 text-xs leading-5 text-slate-400">
          Practice questions are generated from your indexed course materials, so the engine needs at least one ready PDF.
        </p>
      </div>
    );
  }

  return (
    <div>
      {focusTopic && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-[#ded8ff] bg-[#f7f5ff] p-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-[#5b46e8] shadow-sm">
            <Target size={16} />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[.12em] text-[#5b46e8]">
              Targeted practice
            </p>
            <p className="mt-1 text-sm font-bold">{focusTopic}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              The generator will retrieve the most relevant indexed pages for this topic before creating questions.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={Boolean(loading)}
          onClick={() => generate("quiz")}
          className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-[#cfc7ff] hover:bg-[#faf9ff] disabled:opacity-60"
        >
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f0edff] text-[#5b46e8]">
            {loading === "quiz" ? <Loader2 size={18} className="animate-spin" /> : <FileQuestion size={18} />}
          </span>
          <p className="mt-4 text-sm font-black">
            {focusTopic ? "Targeted quiz" : "Quick quiz"}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            {focusTopic
              ? "5 questions concentrated on this weak topic and closely related concepts."
              : "5 multiple-choice questions for focused practice and fast feedback."}
          </p>
        </button>

        <button
          type="button"
          disabled={Boolean(loading)}
          onClick={() => generate("mock_exam")}
          className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-[#cfc7ff] hover:bg-[#faf9ff] disabled:opacity-60"
        >
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-950 text-white">
            {loading === "mock_exam" ? <Loader2 size={18} className="animate-spin" /> : <BookOpenCheck size={18} />}
          </span>
          <p className="mt-4 text-sm font-black">
            {focusTopic ? "Targeted mock exam" : "Mock exam"}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            {focusTopic
              ? "10 questions that stress-test the topic at broader depth."
              : "10 broader questions sampled across your indexed course material."}
          </p>
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-xs leading-5 text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
