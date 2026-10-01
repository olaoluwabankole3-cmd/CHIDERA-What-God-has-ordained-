import type { AcademicWorkspace } from "@/lib/academic";
import type { TopicPriority } from "@/lib/study-intelligence";
import { createClient } from "@/lib/supabase/server";

export type DeadlineType =
  | "exam"
  | "quiz"
  | "assignment"
  | "presentation"
  | "project"
  | "other";

export type AcademicDeadline = {
  id: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  title: string;
  assessmentType: DeadlineType;
  dueAt: string;
  completed: boolean;
};

export type StudyPreferences = {
  dailyMinutes: number;
  timezone: string;
};

export type StudyPlanSession = {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  topic: string | null;
  title: string;
  minutes: number;
  deadlineId: string;
  deadlineTitle: string;
  reason: string;
  href: string;
};

export type StudyPlanDay = {
  dateKey: string;
  label: string;
  isToday: boolean;
  minutes: number;
  sessions: StudyPlanSession[];
};

export type StudyPlan = {
  days: StudyPlanDay[];
  scheduledMinutes: number;
  availableMinutes: number;
  coveragePercent: number;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function dateKeyFromParts(parts: Intl.DateTimeFormatPart[]) {
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("Could not determine calendar date for timezone.");
  }

  return `${year}-${month}-${day}`;
}

export function dateKeyInTimezone(
  date: Date,
  timezone: string,
): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return dateKeyFromParts(formatter.formatToParts(date));
}

function dateFromKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(dateKey: string, days: number) {
  const date = dateFromKey(dateKey);
  date.setUTCDate(date.getUTCDate() + days);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(
    date.getUTCDate(),
  )}`;
}

function dayDistance(fromKey: string, toKey: string) {
  return Math.round(
    (dateFromKey(toKey).getTime() - dateFromKey(fromKey).getTime()) /
      86_400_000,
  );
}

function formatDay(dateKey: string, timezone: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: timezone,
  }).format(date);
}

function safeTimezone(timezone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
    return timezone;
  } catch {
    return "UTC";
  }
}

export async function getStudyPlanData(workspace: AcademicWorkspace) {
  const supabase = await createClient();

  const [{ data: preferenceRow }, { data: deadlineRows }] = await Promise.all([
    supabase
      .from("study_preferences")
      .select("daily_minutes, timezone")
      .eq("user_id", workspace.user.id)
      .maybeSingle(),
    supabase
      .from("academic_deadlines")
      .select(
        "id, course_id, title, assessment_type, due_at, completed",
      )
      .eq("user_id", workspace.user.id)
      .order("due_at", { ascending: true }),
  ]);

  const courseById = new Map(
    workspace.courses.map((course) => [course.id, course]),
  );

  const deadlines: AcademicDeadline[] = (deadlineRows || [])
    .map((row) => {
      const course = courseById.get(row.course_id);
      if (!course) return null;

      return {
        id: row.id,
        courseId: course.id,
        courseCode: course.code,
        courseTitle: course.title,
        title: row.title,
        assessmentType: row.assessment_type as DeadlineType,
        dueAt: row.due_at,
        completed: row.completed,
      };
    })
    .filter((item): item is AcademicDeadline => Boolean(item));

  const preferences: StudyPreferences = {
    dailyMinutes: Math.min(
      360,
      Math.max(15, Number(preferenceRow?.daily_minutes || 60)),
    ),
    timezone: safeTimezone(preferenceRow?.timezone || "UTC"),
  };

  return { deadlines, preferences };
}

export function buildStudyPlan({
  deadlines,
  priorityTopics,
  dailyMinutes,
  timezone,
  horizonDays = 42,
}: {
  deadlines: AcademicDeadline[];
  priorityTopics: TopicPriority[];
  dailyMinutes: number;
  timezone: string;
  horizonDays?: number;
}): StudyPlan {
  const safeZone = safeTimezone(timezone);
  const todayKey = dateKeyInTimezone(new Date(), safeZone);
  const futureDeadlines = deadlines
    .filter((deadline) => !deadline.completed)
    .map((deadline) => ({
      ...deadline,
      dueDateKey: dateKeyInTimezone(new Date(deadline.dueAt), safeZone),
    }))
    .filter((deadline) => deadline.dueDateKey >= todayKey)
    .sort((a, b) => a.dueDateKey.localeCompare(b.dueDateKey));

  if (futureDeadlines.length === 0) {
    return {
      days: [],
      scheduledMinutes: 0,
      availableMinutes: 0,
      coveragePercent: 0,
    };
  }

  const lastDeadlineKey = futureDeadlines
    .map((deadline) => deadline.dueDateKey)
    .sort()
    .at(-1)!;

  const distanceToLast = dayDistance(todayKey, lastDeadlineKey);
  const dayCount = Math.min(horizonDays, Math.max(1, distanceToLast));
  const days: StudyPlanDay[] = [];
  const lastScheduledByTopic = new Map<string, number>();
  let scheduledMinutes = 0;
  let availableMinutes = 0;

  for (let dayIndex = 0; dayIndex < dayCount; dayIndex += 1) {
    const dateKey = addDays(todayKey, dayIndex);
    const candidates = futureDeadlines
      .filter((deadline) => deadline.dueDateKey > dateKey)
      .map((deadline) => {
        const daysUntil = Math.max(1, dayDistance(dateKey, deadline.dueDateKey));
        const topics = priorityTopics
          .filter((topic) => topic.courseId === deadline.courseId)
          .slice(0, 8);

        return {
          deadline,
          daysUntil,
          topics:
            topics.length > 0
              ? topics
              : [
                  {
                    courseId: deadline.courseId,
                    courseCode: deadline.courseCode,
                    courseTitle: deadline.courseTitle,
                    topic: "",
                    masteryScore: 0,
                    evidenceCount: 0,
                    updatedAt: "",
                    priorityScore: 48,
                    confidence: "low" as const,
                    studyMinutes: 0,
                    studySessions: 0,
                    lastStudiedAt: null,
                    recommendedMinutes: 25,
                  },
                ],
        };
      });

    let remaining = dailyMinutes;
    const sessions: StudyPlanSession[] = [];
    const usedToday = new Set<string>();

    const topicCandidates = candidates.flatMap((candidate) =>
      candidate.topics.map((topic) => {
        const topicKey = `${candidate.deadline.id}::${topic.topic || "baseline"}`;
        const lastDay = lastScheduledByTopic.get(topicKey);
        const spacingFactor =
          lastDay === undefined
            ? 1
            : dayIndex - lastDay >= 2
              ? 1
              : 0.58;
        const urgencyFactor = 1 + Math.min(2.5, 10 / candidate.daysUntil);
        const priorityFactor = candidate.deadline.assessmentType === "exam" ? 1.18 : 1;

        return {
          candidate,
          topic,
          topicKey,
          score:
            candidate.daysUntil <= 2
              ? topic.priorityScore * urgencyFactor * spacingFactor * priorityFactor
              : topic.priorityScore * (0.7 + urgencyFactor * 0.3) * spacingFactor * priorityFactor,
        };
      }),
    );

    topicCandidates.sort((a, b) => b.score - a.score);

    for (const item of topicCandidates) {
      if (remaining < 20 || sessions.length >= 3) break;
      if (usedToday.has(item.topicKey)) continue;

      const requested = Math.min(
        item.topic.recommendedMinutes || 25,
        item.candidate.daysUntil <= 2 ? 35 : 30,
        remaining,
      );
      const minutes = Math.max(20, requested);
      if (minutes > remaining) continue;

      const topic = item.topic.topic || null;
      const needsCheckpoint = Boolean(topic) &&
        item.topic.studySessions > 0 &&
        item.topic.evidenceCount === 0;
      const href = topic
        ? needsCheckpoint
          ? `/courses/${item.candidate.deadline.courseId}/practice?focus=${encodeURIComponent(topic)}`
          : `/study-session?courseId=${encodeURIComponent(item.candidate.deadline.courseId)}&topic=${encodeURIComponent(topic)}&minutes=${minutes}&deadlineId=${encodeURIComponent(item.candidate.deadline.id)}`
        : `/courses/${item.candidate.deadline.courseId}/practice`;

      sessions.push({
        courseId: item.candidate.deadline.courseId,
        courseCode: item.candidate.deadline.courseCode,
        courseTitle: item.candidate.deadline.courseTitle,
        topic,
        title: topic
          ? needsCheckpoint
            ? `Checkpoint ${topic}`
            : `Study ${topic}`
          : `Baseline practice for ${item.candidate.deadline.courseCode}`,
        minutes,
        deadlineId: item.candidate.deadline.id,
        deadlineTitle: item.candidate.deadline.title,
        reason:
          item.candidate.daysUntil <= 2
            ? `Due in ${item.candidate.daysUntil} day${item.candidate.daysUntil === 1 ? "" : "s"} — prioritize this before the assessment.`
            : topic
              ? `Spaced practice for a ${item.topic.masteryScore}% mastery topic.`
              : "Build a baseline before the assessment so the tutor can identify weak areas.",
        href,
      });

      remaining -= minutes;
      usedToday.add(item.topicKey);
      lastScheduledByTopic.set(item.topicKey, dayIndex);
    }

    const dayMinutes = dailyMinutes - remaining;
    availableMinutes += dailyMinutes;
    scheduledMinutes += dayMinutes;

    days.push({
      dateKey,
      label: formatDay(dateKey, safeZone),
      isToday: dateKey === todayKey,
      minutes: dayMinutes,
      sessions,
    });
  }

  return {
    days,
    scheduledMinutes,
    availableMinutes,
    coveragePercent:
      availableMinutes > 0
        ? Math.round((scheduledMinutes / availableMinutes) * 100)
        : 0,
  };
}
