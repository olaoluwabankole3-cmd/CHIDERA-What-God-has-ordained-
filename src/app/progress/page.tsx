import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Flame,
  Gauge,
  Target,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getAcademicWorkspace } from "@/lib/academic";
import { getStudyAnalytics } from "@/lib/study-analytics";

function formatDate(value: string, timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(value));
}

function deltaLabel(value: number | null) {
  if (value === null) return "No comparison yet";
  if (value > 0) return `+${value} pts`;
  if (value < 0) return `${value} pts`;
  return "No change";
}

function Delta({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="text-[10px] font-semibold text-slate-400">No comparison yet</span>;
  }

  return (
    <span
      className={
        value > 0
          ? "inline-flex items-center gap-1 text-[10px] font-black text-emerald-600"
          : value < 0
            ? "inline-flex items-center gap-1 text-[10px] font-black text-rose-600"
            : "inline-flex items-center gap-1 text-[10px] font-black text-slate-400"
      }
    >
      {value > 0 ? <ArrowUpRight size={12} /> : value < 0 ? <ArrowDownRight size={12} /> : null}
      {deltaLabel(value)}
    </span>
  );
}

function TrajectorySparkline({ values }: { values: number[] }) {
  if (values.length < 2) {
    return (
      <div className="flex h-9 items-center rounded-lg bg-slate-50 px-3 text-[9px] font-semibold text-slate-400">
        First evidence point — next assessment starts the trajectory
      </div>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const points = values
    .map((value, index) => {
      const x = values.length === 1 ? 0 : (index / (values.length - 1)) * 100;
      const y = 34 - ((value - min) / range) * 28;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="rounded-lg bg-slate-50 px-2 py-1.5">
      <svg viewBox="0 0 100 38" className="h-9 w-full overflow-visible" preserveAspectRatio="none" aria-label="Mastery trajectory">
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-[#2563eb]"
        />
      </svg>
    </div>
  );
}

export default async function ProgressPage() {
  const workspace = await getAcademicWorkspace();
  if (!workspace) redirect("/auth");
  if (!workspace.academicProfile || workspace.courses.length === 0) redirect("/onboarding");

  const analytics = await getStudyAnalytics(workspace);
  const maxDailyMinutes = Math.max(1, ...analytics.weeklyActivity.map((point) => point.minutes));

  return (
    <AppShell
      studentName={workspace.name}
      studentMeta={`${workspace.academicProfile.level} · ${workspace.academicProfile.department}`}
    >
      <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 lg:px-10 lg:py-9">
        <header className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[.16em] text-[#2563eb]">
              Learning progress
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">
              See what your studying is actually producing.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
              Focused study time shows your learning effort. Assessment evidence shows what
              the system can confidently measure. This page keeps those signals separate.
            </p>
          </div>

          <Link
            href="/study-plan"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white"
          >
            Open study plan <ArrowRight size={15} />
          </Link>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            {
              label: "Focused minutes",
              value: analytics.focusedMinutes7d ? `${analytics.focusedMinutes7d}m` : "0m",
              note: "last 7 days",
              icon: Clock3,
            },
            {
              label: "Completed sessions",
              value: String(analytics.completedSessions7d),
              note: "last 7 days",
              icon: CheckCircle2,
            },
            {
              label: "Assessment average",
              value: analytics.assessmentAverage30d === null ? "—" : `${analytics.assessmentAverage30d}%`,
              note: `${analytics.assessmentAttempts30d} attempt${analytics.assessmentAttempts30d === 1 ? "" : "s"} · 30 days`,
              icon: BookOpenCheck,
            },
            {
              label: "Measured mastery",
              value: analytics.currentMastery === null ? "—" : `${analytics.currentMastery}%`,
              note: analytics.currentMastery === null ? "no assessment evidence yet" : `${analytics.trackedTopics} tracked topics`,
              icon: Gauge,
            },
            {
              label: "Study streak",
              value: `${analytics.studyStreak} day${analytics.studyStreak === 1 ? "" : "s"}`,
              note: "consecutive study days",
              icon: Flame,
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#eff6ff] text-[#2563eb]">
                  <Icon size={17} />
                </span>
                <p className="mt-5 text-3xl font-black tracking-tight">{card.value}</p>
                <p className="mt-1 text-xs font-bold">{card.label}</p>
                <p className="mt-1 text-[10px] text-slate-400">{card.note}</p>
              </div>
            );
          })}
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_.6fr]">
          <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="font-black">Last 7 days</h2>
                <p className="mt-1 text-xs text-slate-400">
                  Focused study time, completed sessions, and assessment activity.
                </p>
              </div>
              <span className="text-[10px] font-bold text-slate-400">{analytics.timezone}</span>
            </div>

            <div className="mt-7 grid grid-cols-7 gap-2 sm:gap-4">
              {analytics.weeklyActivity.map((point) => (
                <div key={point.dateKey} className="min-w-0">
                  <div className="flex h-36 items-end justify-center rounded-xl bg-slate-50 p-2">
                    <div
                      className="w-full max-w-10 rounded-lg bg-[#2563eb]"
                      style={{ height: `${Math.max(6, Math.round((point.minutes / maxDailyMinutes) * 100))}%` }}
                      title={`${point.minutes} study minutes`}
                    />
                  </div>
                  <p className="mt-2 truncate text-center text-[9px] font-bold text-slate-500">
                    {point.label.split(",")[0]}
                  </p>
                  <p className="mt-1 text-center text-[10px] font-black">{point.minutes}m</p>
                  <p className="mt-1 text-center text-[9px] text-slate-400">
                    {point.sessions} session{point.sessions === 1 ? "" : "s"}
                  </p>
                  {point.assessments > 0 && (
                    <p className="mt-1 text-center text-[9px] font-bold text-[#2563eb]">
                      {point.assessments} quiz{point.assessments === 1 ? "" : "zes"}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] bg-slate-950 p-6 text-white">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-blue-200">
                <Target size={18} />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-[.14em] text-blue-300">
                  Measurement rule
                </p>
                <h2 className="font-black">Study time is not a grade.</h2>
              </div>
            </div>
            <p className="mt-5 text-sm leading-6 text-slate-300">
              A focused session records exposure and effort. Mastery only moves when
              assessment evidence is produced, so longer study sessions cannot
              automatically inflate your score.
            </p>
            <div className="mt-6 space-y-3">
              <div className="rounded-xl bg-white/5 p-3">
                <p className="text-xs font-bold">Focused session</p>
                <p className="mt-1 text-[11px] leading-5 text-slate-400">Build understanding and create study exposure.</p>
              </div>
              <div className="rounded-xl bg-white/5 p-3">
                <p className="text-xs font-bold">Checkpoint quiz</p>
                <p className="mt-1 text-[11px] leading-5 text-slate-400">Turn that study exposure into measurable evidence.</p>
              </div>
            </div>
          </div>
        </section>

        {analytics.evidenceGapTopics.length > 0 && (
          <section className="mt-6 rounded-[24px] border border-amber-200 bg-amber-50 p-6">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-amber-600 shadow-sm">
                <Target size={16} />
              </span>
              <div>
                <h2 className="font-black text-amber-950">You have studied these topics, but the system still needs evidence.</h2>
                <p className="mt-1 text-xs leading-5 text-amber-800/80">
                  Take a focused checkpoint quiz to replace “studied” with a measurable signal.
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {analytics.evidenceGapTopics.map((topic) => (
                <Link
                  key={`${topic.courseId}-${topic.topic}`}
                  href={`/courses/${topic.courseId}/practice?focus=${encodeURIComponent(topic.topic)}`}
                  className="flex items-center justify-between rounded-xl border border-amber-200 bg-white px-4 py-3"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-black">{topic.topic}</span>
                    <span className="mt-1 block text-[10px] text-slate-400">
                      {topic.courseCode} · {topic.studyMinutes} minutes studied
                    </span>
                  </span>
                  <ArrowRight size={14} className="shrink-0 text-amber-600" />
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mt-8">
          <div>
            <h2 className="text-xl font-black tracking-tight">Topic progress</h2>
            <p className="mt-1 text-sm text-slate-400">
              Topics are sorted by current measured mastery. Recent assessment movement is shown separately.
            </p>
          </div>

          {analytics.topics.length === 0 ? (
            <div className="mt-4 rounded-[22px] border border-dashed border-slate-200 bg-white p-8 text-center">
              <Gauge size={20} className="mx-auto text-slate-300" />
              <p className="mt-3 text-sm font-bold">No topic-level progress yet</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                Complete a grounded quiz and your first topic evidence will appear here.
              </p>
            </div>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {analytics.topics.map((topic) => (
                <div key={`${topic.courseId}-${topic.topic}`} className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[.13em] text-[#2563eb]">
                        {topic.courseCode}
                      </p>
                      <h3 className="mt-1 truncate text-sm font-black">{topic.topic}</h3>
                    </div>
                    <span className="shrink-0 text-2xl font-black">{topic.masteryScore}%</span>
                  </div>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-[#2563eb]"
                      style={{ width: `${Math.min(100, Math.max(0, topic.masteryScore))}%` }}
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 text-[10px]">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-slate-400">Evidence</p>
                      <p className="mt-1 font-black">{topic.evidenceCount}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-slate-400">Study</p>
                      <p className="mt-1 font-black">{topic.studyMinutes}m</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-slate-400">Sessions</p>
                      <p className="mt-1 font-black">{topic.studySessions}</p>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-slate-100 pt-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] text-slate-400">Mastery trajectory</p>
                        <p className="mt-1 text-[10px] text-slate-400">
                          {topic.trajectory.length} assessment snapshot{topic.trajectory.length === 1 ? "" : "s"} tracked
                        </p>
                      </div>
                      <span
                        className={
                          topic.trendDirection === "improving"
                            ? "text-[10px] font-black text-emerald-600"
                            : topic.trendDirection === "declining"
                              ? "text-[10px] font-black text-rose-600"
                              : "text-[10px] font-black text-slate-400"
                        }
                      >
                        {topic.trendDirection === "improving"
                          ? `Improving · +${topic.trendDelta} pts`
                          : topic.trendDirection === "declining"
                            ? `Declining · ${topic.trendDelta} pts`
                            : topic.trendDirection === "steady"
                              ? "Steady"
                              : "New"}
                      </span>
                    </div>

                    <div className="mt-2">
                      <TrajectorySparkline values={topic.trajectory.map((point) => point.masteryScore)} />
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-[10px] text-slate-400">Recent assessment</p>
                        <p className="mt-1 text-xs font-black">
                          {topic.latestAssessmentScore === null ? "No attempt yet" : `${topic.latestAssessmentScore}%`}
                        </p>
                      </div>
                      <Delta value={topic.assessmentDelta} />
                      {topic.postStudyDelta !== null && (
                        <span className="text-[10px] font-semibold text-slate-400">
                          After latest study: <span className="font-black text-slate-600">{deltaLabel(topic.postStudyDelta)}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-2">
          <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-black">Recent study sessions</h2>
                <p className="mt-1 text-xs text-slate-400">Your latest completed focused sessions.</p>
              </div>
              <Clock3 size={18} className="text-slate-400" />
            </div>

            <div className="mt-5 space-y-2">
              {analytics.recentSessions.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-4 text-xs text-slate-400">No completed study sessions yet.</p>
              ) : (
                analytics.recentSessions.map((session) => (
                  <div key={session.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#eff6ff] text-[#2563eb]">
                      <Clock3 size={14} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold">
                        {session.topic || `Course review · ${session.courseCode}`}
                      </p>
                      <p className="mt-1 truncate text-[10px] text-slate-400">
                        {session.courseCode} · {session.minutes}m · {session.interactions} tutor interaction{session.interactions === 1 ? "" : "s"}
                      </p>
                    </div>
                    <span className="shrink-0 text-[10px] text-slate-400">
                      {formatDate(session.completedAt, analytics.timezone)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-black">Recent assessments</h2>
                <p className="mt-1 text-xs text-slate-400">The evidence currently feeding mastery.</p>
              </div>
              <BookOpenCheck size={18} className="text-slate-400" />
            </div>

            <div className="mt-5 space-y-2">
              {analytics.recentAssessments.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-4 text-xs text-slate-400">No completed assessments yet.</p>
              ) : (
                analytics.recentAssessments.map((assessment) => (
                  <Link
                    key={assessment.id}
                    href={`/courses/${assessment.courseId}/practice/${assessment.assessmentId}`}
                    className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 hover:border-[#d8d1ff] hover:bg-[#f8fbff]"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-950 text-white">
                      <BookOpenCheck size={14} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold">{assessment.title}</p>
                      <p className="mt-1 truncate text-[10px] text-slate-400">
                        {assessment.courseCode} · {assessment.assessmentType.replace("_", " ")}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-black">{assessment.score === null ? "—" : `${assessment.score}%`}</p>
                      <p className="mt-1 text-[9px] text-slate-400">{formatDate(assessment.completedAt, analytics.timezone)}</p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[20px] border border-slate-200 bg-white p-5">
            <CalendarDays size={18} className="text-[#2563eb]" />
            <p className="mt-4 text-2xl font-black">{analytics.upcomingDeadlines}</p>
            <p className="mt-1 text-xs font-bold">upcoming deadlines</p>
            <p className="mt-1 text-[10px] leading-5 text-slate-400">The study scheduler can use these to pull weak topics forward.</p>
          </div>
          <div className="rounded-[20px] border border-slate-200 bg-white p-5">
            <Flame size={18} className="text-[#2563eb]" />
            <p className="mt-4 text-2xl font-black">{analytics.studyStreak}</p>
            <p className="mt-1 text-xs font-bold">day study streak</p>
            <p className="mt-1 text-[10px] leading-5 text-slate-400">Based on completed focused sessions, not time spent with the page open.</p>
          </div>
          <div className="rounded-[20px] border border-slate-200 bg-white p-5">
            <Gauge size={18} className="text-[#2563eb]" />
            <p className="mt-4 text-2xl font-black">{analytics.trackedTopics}</p>
            <p className="mt-1 text-xs font-bold">topics tracked</p>
            <p className="mt-1 text-[10px] leading-5 text-slate-400">Mastery is evidence-driven; study exposure alone never raises it.</p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
