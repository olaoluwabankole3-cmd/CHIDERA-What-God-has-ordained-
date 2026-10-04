"use client";

import {
  CalendarClock,
  Check,
  Clock3,
  Loader2,
  Plus,
  Trash2,
  Target,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import type {
  AcademicDeadline,
  DeadlineType,
  StudyPlan,
  StudyPreferences,
} from "@/lib/study-calendar";

type CourseOption = {
  id: string;
  code: string;
  title: string;
};

function localDateKey(offsetDays = 0) {
  const now = new Date();
  now.setDate(now.getDate() + offsetDays);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDeadline(date: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function daysUntil(date: string) {
  const diff = new Date(date).getTime() - Date.now();
  return Math.ceil(diff / 86_400_000);
}

const deadlineTypes: Array<{ value: DeadlineType; label: string }> = [
  { value: "exam", label: "Exam" },
  { value: "quiz", label: "Quiz" },
  { value: "assignment", label: "Assignment" },
  { value: "presentation", label: "Presentation" },
  { value: "project", label: "Project" },
  { value: "other", label: "Other" },
];

export function StudyPlanBoard({
  courses,
  deadlines,
  preferences,
  plan,
}: {
  courses: CourseOption[];
  deadlines: AcademicDeadline[];
  preferences: StudyPreferences;
  plan: StudyPlan;
}) {
  const [dailyMinutes, setDailyMinutes] = useState(String(preferences.dailyMinutes));
  const [title, setTitle] = useState("");
  const [courseId, setCourseId] = useState(courses[0]?.id || "");
  const [assessmentType, setAssessmentType] = useState<DeadlineType>("exam");
  const [dueDate, setDueDate] = useState(localDateKey(7));
  const [dueTime, setDueTime] = useState("09:00");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    [],
  );

  async function mutate(action: string, payload: Record<string, unknown> = {}) {
    setLoading(action);
    setError(null);

    try {
      const response = await fetch("/api/study-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, timezone, ...payload }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Could not update the study plan.");
      }

      window.location.reload();
    } catch (mutationError) {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "Could not update the study plan.",
      );
    } finally {
      setLoading(null);
    }
  }

  async function handleDeadlineSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!courseId || !title.trim()) {
      setError("Choose a course and give the deadline a title.");
      return;
    }

    await mutate("create_deadline", {
      courseId,
      title: title.trim(),
      assessmentType,
      dueAt: new Date(`${dueDate}T${dueTime}:00`).toISOString(),
    });
  }

  return (
    <div className="mt-6 sm:mt-8">
      <section className="grid gap-4 xl:grid-cols-[.85fr_1.15fr]">
        <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eff6ff] text-[#2563eb]">
              <Clock3 size={18} />
            </span>
            <div>
              <h2 className="font-black">Daily study capacity</h2>
              <p className="text-xs text-slate-400">
                The scheduler will not plan beyond this amount.
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="number"
              min={15}
              max={360}
              step={15}
              value={dailyMinutes}
              onChange={(event) => setDailyMinutes(event.target.value)}
              className="w-full rounded-xl border sm:w-28 border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold outline-none focus:border-[#a79cff]"
              aria-label="Daily study minutes"
            />
            <span className="self-center text-sm text-slate-500">minutes / day</span>
            <button
              type="button"
              disabled={loading === "save_preferences"}
              onClick={() =>
                mutate("save_preferences", {
                  dailyMinutes: Number(dailyMinutes),
                })
              }
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 sm:ml-auto sm:w-auto rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60"
            >
              {loading === "save_preferences" && (
                <Loader2 size={14} className="animate-spin" />
              )}
              Save
            </button>
          </div>

          <p className="mt-4 text-[11px] leading-5 text-slate-400">
            Timezone detected as <span className="font-bold text-slate-600">{timezone}</span>.
            Dates are stored as UTC instants and displayed in your local timezone.
          </p>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-950 text-white">
              <CalendarClock size={18} />
            </span>
            <div>
              <h2 className="font-black">Add an assessment deadline</h2>
              <p className="text-xs text-slate-400">
                The scheduler uses this date to work backward from the deadline.
              </p>
            </div>
          </div>

          <form onSubmit={handleDeadlineSubmit} className="mt-5 grid gap-3 sm:grid-cols-2">
            <input
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. MTH 211 final exam"
              className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#a79cff]"
            />

            <select
              value={courseId}
              onChange={(event) => setCourseId(event.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#a79cff]"
            >
              {courses.length === 0 ? (
                <option value="">No courses yet</option>
              ) : (
                courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code} · {course.title}
                  </option>
                ))
              )}
            </select>

            <select
              value={assessmentType}
              onChange={(event) => setAssessmentType(event.target.value as DeadlineType)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#a79cff]"
            >
              {deadlineTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>

            <input
              required
              type="date"
              min={localDateKey()}
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#a79cff]"
            />

            <input
              required
              type="time"
              value={dueTime}
              onChange={(event) => setDueTime(event.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#a79cff]"
            />

            <button
              type="submit"
              disabled={!courses.length || Boolean(loading)}
              className="sm:col-span-2 inline-flex items-center justify-center gap-2 rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
            >
              {loading === "create_deadline" ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Plus size={15} />
              )}
              Add to study calendar
            </button>
          </form>
        </div>
      </section>

      {error && (
        <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
          {error}
        </div>
      )}

      <section className="mt-6 sm:mt-8">
        <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-end sm:gap-4">
          <div>
            <h2 className="text-xl font-black tracking-tight">Upcoming deadlines</h2>
            <p className="mt-1 text-sm text-slate-400">
              Mark an assessment complete when it is finished so it leaves future planning.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {deadlines.filter((deadline) => !deadline.completed).length === 0 ? (
            <div className="md:col-span-2 rounded-[22px] border border-dashed border-slate-200 bg-white p-7 text-center">
              <CalendarClock size={20} className="mx-auto text-slate-300" />
              <p className="mt-3 text-sm font-bold">No upcoming deadlines</p>
              <p className="mt-1 text-xs text-slate-400">
                Add your next exam or assignment above and the calendar will plan backward from it.
              </p>
            </div>
          ) : (
            deadlines
              .filter((deadline) => !deadline.completed)
              .map((deadline) => {
                const remaining = daysUntil(deadline.dueAt);

                return (
                  <div
                    key={deadline.id}
                    className="flex items-start gap-3 rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eff6ff] text-[#2563eb]">
                      <Target size={17} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-[.12em] text-[#2563eb]">
                          {deadline.courseCode}
                        </span>
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-[9px] font-bold uppercase text-slate-500">
                          {deadline.assessmentType}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm font-bold">{deadline.title}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {formatDeadline(deadline.dueAt)}
                        {remaining >= 0
                          ? ` · ${remaining === 0 ? "today" : `${remaining}d left`}`
                          : " · overdue"}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1 pt-0.5">
                      <button
                        type="button"
                        title="Mark complete"
                        disabled={Boolean(loading)}
                        onClick={() =>
                          mutate("complete_deadline", { deadlineId: deadline.id })
                        }
                        className="grid h-9 w-9 place-items-center rounded-lg text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
                      >
                        <Check size={15} />
                      </button>
                      <button
                        type="button"
                        title="Delete deadline"
                        disabled={Boolean(loading)}
                        onClick={() =>
                          mutate("delete_deadline", { deadlineId: deadline.id })
                        }
                        className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </section>

      <section className="mt-8">
        <div className="flex flex-col gap-4 rounded-[24px] bg-slate-950 p-4 sm:p-6 text-white sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[.14em] text-blue-300">
              Next 6 weeks
            </p>
            <h2 className="mt-1 text-xl font-black">Your calendar is built around your deadlines</h2>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              {plan.scheduledMinutes} of {plan.availableMinutes} available study minutes are currently assigned.
            </p>
          </div>
          <div className="rounded-xl bg-white/10 px-4 py-3 text-right">
            <p className="text-2xl font-black">{plan.coveragePercent}%</p>
            <p className="text-[10px] text-slate-400">capacity planned</p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {plan.days.slice(0, 14).map((day) => (
            <div
              key={day.dateKey}
              className={`rounded-[22px] border bg-white p-5 shadow-sm ${
                day.isToday ? "border-[#bdb5ff]" : "border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black">{day.label}</h3>
                    {day.isToday && (
                      <span className="rounded-full bg-[#eff6ff] px-2 py-1 text-[9px] font-black uppercase tracking-wide text-[#2563eb]">
                        Today
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {day.minutes} minutes planned
                  </p>
                </div>
                <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-[#2563eb]"
                    style={{
                      width: `${Math.min(100, Math.round((day.minutes / Math.max(1, preferences.dailyMinutes)) * 100))}%`,
                    }}
                  />
                </div>
              </div>

              {day.sessions.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {day.sessions.map((session, index) => (
                    <Link
                      key={`${day.dateKey}-${session.deadlineId}-${index}`}
                      href={session.href}
                      className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 hover:border-[#d8d1ff] hover:bg-[#f8fbff]"
                    >
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-[#2563eb]">
                        <Target size={14} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-bold">{session.title}</span>
                        <span className="mt-1 block truncate text-[10px] text-slate-400">
                          {session.courseCode} · {session.deadlineTitle} · {session.reason}
                        </span>
                      </span>
                      <span className="shrink-0 text-[10px] font-black text-slate-500">
                        {session.minutes}m
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="mt-4 rounded-xl bg-slate-50 px-3 py-3 text-xs text-slate-400">
                  No session scheduled for this day.
                </p>
              )}
            </div>
          ))}

          {plan.days.length > 14 && (
            <p className="pt-2 text-center text-xs text-slate-400">
              Showing the next 14 days. The scheduler has planned up to the next six weeks.
            </p>
          )}

          {plan.days.length === 0 && (
            <div className="rounded-[22px] border border-dashed border-slate-200 bg-white p-8 text-center">
              <p className="text-sm font-bold">Add an upcoming deadline to generate your calendar.</p>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                The engine will use your weak-topic priorities and daily capacity to work backward from the assessment date.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
