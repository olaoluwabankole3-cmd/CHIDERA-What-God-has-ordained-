import {
  BookOpenCheck,
  CalendarClock,
  Gauge,
  Target,
} from "lucide-react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { StudyPlanBoard } from "@/components/study-plan-board";
import { getAcademicWorkspace } from "@/lib/academic";
import { buildStudyPlan, getStudyPlanData } from "@/lib/study-calendar";
import { getStudyIntelligence } from "@/lib/study-intelligence";

export default async function StudyPlanPage() {
  const workspace = await getAcademicWorkspace();
  if (!workspace) redirect("/auth");
  if (!workspace.academicProfile || workspace.courses.length === 0) {
    redirect("/onboarding");
  }

  const [intelligence, calendarData] = await Promise.all([
    getStudyIntelligence(workspace),
    getStudyPlanData(workspace),
  ]);

  const plan = buildStudyPlan({
    deadlines: calendarData.deadlines,
    priorityTopics: intelligence.priorityTopics,
    dailyMinutes: calendarData.preferences.dailyMinutes,
    timezone: calendarData.preferences.timezone,
  });

  const profile = workspace.academicProfile;
  const meta = `${profile.level} · ${profile.department}`;

  return (
    <AppShell studentName={workspace.name} studentMeta={meta}>
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-8 sm:py-6 lg:px-10 lg:py-9">
        <header>
          <p className="text-xs font-black uppercase tracking-[.16em] text-[#2563eb]">
            Personalized study intelligence
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
            Your study calendar
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
            Tell Academic AI when your assessments happen and how much time you
            can study each day. The scheduler then works backward from those
            deadlines using your existing mastery evidence.
          </p>
        </header>

        <section className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-2 md:grid-cols-4">
          <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <Gauge size={19} className="text-[#2563eb]" />
            <p className="mt-4 text-3xl font-black">{workspace.totalTrackedTopics}</p>
            <p className="mt-1 text-xs text-slate-400">topics with mastery evidence</p>
          </div>
          <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
            <BookOpenCheck size={19} className="text-[#2563eb]" />
            <p className="mt-4 text-3xl font-black">
              {intelligence.coursePerformance.reduce(
                (sum, course) => sum + course.attempts,
                0,
              )}
            </p>
            <p className="mt-1 text-xs text-slate-400">completed assessment attempts</p>
          </div>
          <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
            <CalendarClock size={19} className="text-[#2563eb]" />
            <p className="mt-4 text-3xl font-black">
              {calendarData.deadlines.filter((deadline) => !deadline.completed).length}
            </p>
            <p className="mt-1 text-xs text-slate-400">upcoming deadlines</p>
          </div>
          <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
            <Target size={19} className="text-[#2563eb]" />
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

        <StudyPlanBoard
          courses={workspace.courses.map((course) => ({
            id: course.id,
            code: course.code,
            title: course.title,
          }))}
          deadlines={calendarData.deadlines}
          preferences={calendarData.preferences}
          plan={plan}
        />

        <section className="mt-10">
          <div>
            <h2 className="text-xl font-black tracking-tight">
              Why these sessions are selected
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              The scheduler prioritizes weak topics, limited evidence, recency,
              and deadline urgency. It does not invent a grade prediction.
            </p>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-[20px] border border-slate-200 bg-white p-5">
              <p className="text-sm font-black">1. Weakness first</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Lower mastery scores receive more study weight.
              </p>
            </div>
            <div className="rounded-[20px] border border-slate-200 bg-white p-5">
              <p className="text-sm font-black">2. Evidence matters</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Topics with little assessment evidence receive baseline practice
                so the system can learn more about them.
              </p>
            </div>
            <div className="rounded-[20px] border border-slate-200 bg-white p-5">
              <p className="text-sm font-black">3. Deadlines pull forward</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Sessions become more urgent as an assessment approaches, while
                repeated topics are spaced when possible.
              </p>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
