import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  FileQuestion,
  History,
} from "lucide-react";
import { redirect, notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AssessmentGenerator } from "@/components/assessment-generator";
import { getCourseWorkspace } from "@/lib/academic";
import { createClient } from "@/lib/supabase/server";

type AssessmentRow = {
  id: string;
  title: string;
  assessment_type: string;
  created_at: string;
};

type AttemptRow = {
  assessment_id: string;
  score: number | string | null;
  completed_at: string | null;
};

export default async function PracticePage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ focus?: string | string[] }>;
}) {
  const { courseId } = await params;
  const resolvedSearchParams = await searchParams;
  const rawFocus = Array.isArray(resolvedSearchParams.focus)
    ? resolvedSearchParams.focus[0]
    : resolvedSearchParams.focus;
  const focusTopic = String(rawFocus || "").trim().slice(0, 120) || null;
  const workspace = await getCourseWorkspace(courseId);

  if (!workspace) redirect("/auth");
  if (!workspace.academicProfile) redirect("/onboarding");
  if (!workspace.course) notFound();

  const course = workspace.course;
  const profile = workspace.academicProfile;
  const supabase = await createClient();

  const { data: assessmentsData } = await supabase
    .from("assessments")
    .select("id, title, assessment_type, created_at")
    .eq("user_id", workspace.user.id)
    .eq("course_id", course.id)
    .order("created_at", { ascending: false })
    .limit(12);

  const assessments = (assessmentsData || []) as AssessmentRow[];
  const assessmentIds = assessments.map((assessment) => assessment.id);

  let attempts: AttemptRow[] = [];
  if (assessmentIds.length > 0) {
    const { data: attemptsData } = await supabase
      .from("assessment_attempts")
      .select("assessment_id, score, completed_at")
      .eq("user_id", workspace.user.id)
      .in("assessment_id", assessmentIds)
      .order("completed_at", { ascending: false });

    attempts = (attemptsData || []) as AttemptRow[];
  }

  const latestScoreByAssessment = new Map<string, number>();
  for (const attempt of attempts) {
    if (
      !latestScoreByAssessment.has(attempt.assessment_id) &&
      attempt.score !== null
    ) {
      latestScoreByAssessment.set(
        attempt.assessment_id,
        Number(attempt.score),
      );
    }
  }

  const meta = `${profile.level} · ${profile.department}`;

  return (
    <AppShell studentName={workspace.name} studentMeta={meta}>
      <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8 lg:px-10 lg:py-9">
        <Link
          href={`/courses/${course.id}`}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-700"
        >
          <ArrowLeft size={14} /> Back to {course.code}
        </Link>

        <header className="mt-5">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-[#eff6ff] px-2.5 py-1 text-xs font-black text-[#2563eb]">
              {course.code}
            </span>
            <span className="text-xs font-semibold text-slate-400">
              Practice Center
            </span>
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight">
            {focusTopic
              ? `Targeted practice: ${focusTopic}`
              : "Practice from your course materials"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            {focusTopic
              ? "Academic AI will retrieve the most relevant indexed pages for this weak topic before generating questions."
              : "Generate grounded quizzes and mock exams from your indexed PDFs. Completed attempts automatically contribute evidence to topic mastery."}
          </p>
        </header>

        <section className="mt-8 rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-black">Generate a new assessment</h2>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                {course.readyMaterials} indexed PDF
                {course.readyMaterials === 1 ? "" : "s"} available as source material.
              </p>
            </div>
          </div>

          <div className="mt-5">
            <AssessmentGenerator
              courseId={course.id}
              readyMaterials={course.readyMaterials}
              focusTopic={focusTopic}
            />
          </div>
        </section>

        <section className="mt-8">
          <div className="flex items-center gap-2">
            <History size={17} className="text-slate-400" />
            <h2 className="text-lg font-black tracking-tight">
              Recent assessments
            </h2>
          </div>

          {assessments.length === 0 ? (
            <div className="mt-4 rounded-[22px] border border-dashed border-slate-200 bg-white p-8 text-center">
              <p className="text-sm font-bold">No assessments yet</p>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                Generate your first quiz or mock exam above.
              </p>
            </div>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {assessments.map((assessment) => {
                const score = latestScoreByAssessment.get(assessment.id);
                const isMock = assessment.assessment_type === "mock_exam";

                return (
                  <Link
                    key={assessment.id}
                    href={`/courses/${course.id}/practice/${assessment.id}`}
                    className="group flex items-center gap-4 rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#cfc7ff] hover:shadow-md"
                  >
                    <span
                      className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${
                        isMock
                          ? "bg-slate-950 text-white"
                          : "bg-[#eff6ff] text-[#2563eb]"
                      }`}
                    >
                      {isMock ? (
                        <BookOpenCheck size={18} />
                      ) : (
                        <FileQuestion size={18} />
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">
                        {assessment.title}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {isMock ? "Mock exam" : "Practice quiz"}
                        {typeof score === "number"
                          ? ` · latest score ${score}%`
                          : " · not attempted yet"}
                      </p>
                    </div>

                    <ArrowRight
                      size={16}
                      className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#2563eb]"
                    />
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
