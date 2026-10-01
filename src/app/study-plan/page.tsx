import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  BrainCircuit,
  FileUp,
  Gauge,
  Target,
} from "lucide-react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getAcademicWorkspace } from "@/lib/academic";
import { getStudyIntelligence } from "@/lib/study-intelligence";

function actionHref(
  courseId: string,
  action: "targeted_practice" | "baseline_quiz" | "upload_material",
  topic: string | null,
) {
  if (action === "targeted_practice" && topic) {
    return `/courses/${courseId}/practice?focus=${encodeURIComponent(topic)}`;
  }

  if (action === "baseline_quiz") {
    return `/courses/${courseId}/practice`;
  }

  return `/courses/${courseId}`;
}

export default async function StudyPlanPage() {
  const workspace = await getAcademicWorkspace();
  if (!workspace) redirect("/auth");
  if (!workspace.academicProfile || workspace.courses.length === 0) {
    redirect("/onboarding");
  }

  const intelligence = await getStudyIntelligence(workspace);
  const profile = workspace.academicProfile;
  const meta = `${profile.level} · ${profile.department}`;

  return (
    <AppShell studentName={workspace.name} studentMeta={meta}>
      <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8 lg:px-10 lg:py-9">
        <header>
          <p className="text-xs font-black uppercase tracking-[.16em] text-[#5b46e8]">
            Personalized study intelligence
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">
            Your next best study sessions
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
            Priorities are calculated from your topic mastery, amount of evidence,
            recency, assessment history, and whether each course has indexed material.
          </p>
        </header>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
            <Gauge size={19} className="text-[#5b46e8]" />
            <p className="mt-4 text-3xl font-black">{workspace.totalTrackedTopics}</p>
            <p className="mt-1 text-xs text-slate-400">topics with mastery evidence</p>
          </div>
          <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
            <BookOpenCheck size={19} className="text-[#5b46e8]" />
            <p className="mt-4 text-3xl font-black">
              {intelligence.coursePerformance.reduce(
                (sum, course) => sum + course.attempts,
                0,
              )}
            </p>
            <p className="mt-1 text-xs text-slate-400">completed assessment attempts</p>
          </div>
          <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
            <Target size={19} className="text-[#5b46e8]" />
            <p className="mt-4 text-3xl font-black">
              {intelligence.weakestTopic
                ? `${intelligence.weakestTopic.masteryScore}%`
                : "—"}
            </p>
            <p className="mt-1 truncate text-xs text-slate-400">
              {intelligence.weakestTopic
                ? `${intelligence.weakestTopic.courseCode} · ${intelligence.weakestTopic.topic}`
                : "complete a quiz to establish a weak-topic signal"}
            </p>
          </div>
        </section>

        <section className="mt-9">
          <div>
            <h2 className="text-xl font-black tracking-tight">Recommended sequence</h2>
            <p className="mt-1 text-sm text-slate-400">
              Work from the top down; priorities automatically change as new evidence arrives.
            </p>
          </div>

          <div className="mt-5 space-y-3">
            {intelligence.sessions.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-white p-8 text-center">
                <p className="text-sm font-bold">No study recommendation yet</p>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  Add courses and course materials, then complete a quiz to create mastery evidence.
                </p>
              </div>
            ) : (
              intelligence.sessions.map((session, index) => {
                const href = actionHref(
                  session.courseId,
                  session.action,
                  session.topic,
                );

                return (
                  <article
                    key={session.key}
                    className="flex flex-col gap-4 rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-950 text-sm font-black text-white">
                      {index + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg bg-[#f0edff] px-2 py-1 text-[10px] font-black text-[#5b46e8]">
                          {session.courseCode}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          ~{session.minutes} min
                        </span>
                      </div>
                      <h3 className="mt-2 font-black">{session.title}</h3>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {session.reason}
                      </p>
                    </div>

                    <Link
                      href={href}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#5b46e8] px-4 py-2.5 text-xs font-bold text-white"
                    >
                      {session.action === "upload_material" ? (
                        <FileUp size={14} />
                      ) : session.action === "targeted_practice" ? (
                        <Target size={14} />
                      ) : (
                        <BrainCircuit size={14} />
                      )}
                      {session.action === "upload_material"
                        ? "Add material"
                        : session.action === "targeted_practice"
                          ? "Practice topic"
                          : "Start baseline quiz"}
                      <ArrowRight size={13} />
                    </Link>
                  </article>
                );
              })
            )}
          </div>
        </section>

        {intelligence.priorityTopics.length > 0 && (
          <section className="mt-9 rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-black">Weak-topic map</h2>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              Lower mastery and limited evidence both increase priority.
            </p>

            <div className="mt-5 space-y-3">
              {intelligence.priorityTopics.slice(0, 8).map((topic) => (
                <div
                  key={`${topic.courseId}-${topic.topic}`}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[.13em] text-[#5b46e8]">
                        {topic.courseCode}
                      </p>
                      <p className="mt-1 truncate text-sm font-bold">{topic.topic}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black">{topic.masteryScore}%</p>
                      <p className="text-[10px] text-slate-400">
                        {topic.evidenceCount} evidence · {topic.confidence} confidence
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white">
                    <div
                      className="h-full rounded-full bg-[#5b46e8]"
                      style={{ width: `${topic.masteryScore}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
