"use client";

import { CheckCircle2, FileText, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type {
  AssessmentFeedbackItem,
  PublicAssessmentQuestion,
} from "@/lib/assessment-types";

type SubmissionResult = {
  score: number;
  correctCount: number;
  total: number;
  feedback: AssessmentFeedbackItem[];
};

export function AssessmentSession({
  assessmentId,
  courseId,
  title,
  assessmentType,
  questions,
}: {
  assessmentId: string;
  courseId: string;
  title: string;
  assessmentType: string;
  questions: PublicAssessmentQuestion[];
}) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const answeredCount = Object.keys(answers).length;
  const feedbackByQuestion = useMemo(
    () => new Map((result?.feedback || []).map((item) => [item.questionId, item])),
    [result],
  );

  async function submit() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/assessments/${assessmentId}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            answers: questions.map((question) => ({
              questionId: question.id,
              selectedOptionIndex:
                typeof answers[question.id] === "number"
                  ? answers[question.id]
                  : null,
            })),
          }),
        },
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not submit assessment.");

      setResult(data);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not submit assessment.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {result && (
        <section className="rounded-[24px] bg-slate-950 p-6 text-white sm:p-8">
          <p className="text-xs font-black uppercase tracking-[.16em] text-violet-300">
            Assessment complete
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <p className="text-5xl font-black">{result.score}%</p>
            <p className="pb-1 text-sm text-slate-300">
              {result.correctCount} of {result.total} correct
            </p>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
            This attempt has been saved and its topic-level results have been added to your course mastery evidence.
          </p>
          <Link
            href={`/courses/${courseId}/practice`}
            className="mt-5 inline-flex rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-950"
          >
            Back to practice
          </Link>
        </section>
      )}

      <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <p className="text-xs font-black uppercase tracking-[.15em] text-[#5b46e8]">
              {assessmentType === "mock_exam" ? "Mock exam" : "Practice quiz"}
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight">{title}</h1>
            <p className="mt-2 text-sm text-slate-400">
              {result
                ? "Review your answers and explanations below."
                : `${answeredCount} of ${questions.length} questions answered`}
            </p>
          </div>

          {!result && (
            <button
              type="button"
              disabled={loading}
              onClick={submit}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#5b46e8] px-5 py-3 text-sm font-bold text-white brand-shadow disabled:opacity-60"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              Submit assessment
            </button>
          )}
        </div>

        {error && (
          <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-xs leading-5 text-red-700">
            {error}
          </p>
        )}
      </section>

      {questions.map((question, questionIndex) => {
        const feedback = feedbackByQuestion.get(question.id);

        return (
          <section
            key={question.id}
            className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
          >
            <div className="flex items-start gap-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#f0edff] text-xs font-black text-[#5b46e8]">
                {questionIndex + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[.13em] text-slate-400">
                  {question.topic}
                </p>
                <h2 className="mt-2 text-base font-bold leading-7 text-slate-900">
                  {question.prompt}
                </h2>

                <div className="mt-5 space-y-2.5">
                  {question.options.map((option, optionIndex) => {
                    const selected = answers[question.id] === optionIndex;
                    const isCorrectAnswer =
                      Boolean(result) &&
                      feedback?.correctOptionIndex === optionIndex;
                    const isWrongSelection =
                      Boolean(result) &&
                      selected &&
                      feedback?.correctOptionIndex !== optionIndex;

                    return (
                      <button
                        type="button"
                        key={`${question.id}-${optionIndex}`}
                        disabled={Boolean(result)}
                        onClick={() =>
                          setAnswers((current) => ({
                            ...current,
                            [question.id]: optionIndex,
                          }))
                        }
                        className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm leading-6 transition ${
                          isCorrectAnswer
                            ? "border-emerald-300 bg-emerald-50"
                            : isWrongSelection
                              ? "border-red-300 bg-red-50"
                              : selected
                                ? "border-[#9588ef] bg-[#f7f5ff]"
                                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-current text-[10px] font-black">
                          {String.fromCharCode(65 + optionIndex)}
                        </span>
                        <span>{option}</span>
                      </button>
                    );
                  })}
                </div>

                {feedback && (
                  <div
                    className={`mt-5 rounded-2xl border p-4 ${
                      feedback.correct
                        ? "border-emerald-100 bg-emerald-50"
                        : "border-amber-100 bg-amber-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {feedback.correct ? (
                        <CheckCircle2 size={17} className="text-emerald-600" />
                      ) : (
                        <XCircle size={17} className="text-amber-600" />
                      )}
                      <p className="text-xs font-black">
                        {feedback.correct ? "Correct" : "Review this concept"}
                      </p>
                    </div>

                    <p className="mt-3 text-xs leading-5 text-slate-700">
                      {feedback.explanation}
                    </p>

                    {feedback.source && (
                      <p className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                        <FileText size={11} />
                        {feedback.source.title}
                        {feedback.source.pageNumber
                          ? ` · page ${feedback.source.pageNumber}`
                          : ""}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
        );
      })}

      {!result && (
        <div className="flex justify-end">
          <button
            type="button"
            disabled={loading}
            onClick={submit}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#5b46e8] px-5 py-3 text-sm font-bold text-white brand-shadow disabled:opacity-60"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Submit assessment
          </button>
        </div>
      )}
    </div>
  );
}
