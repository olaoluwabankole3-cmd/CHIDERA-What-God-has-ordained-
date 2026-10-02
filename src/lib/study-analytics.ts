import type { AcademicWorkspace } from "@/lib/academic";
import { createClient } from "@/lib/supabase/server";

export type WeeklyStudyPoint = {
  dateKey: string;
  label: string;
  minutes: number;
  sessions: number;
  assessments: number;
};

export type TopicProgress = {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  topic: string;
  masteryScore: number;
  evidenceCount: number;
  studyMinutes: number;
  studySessions: number;
  lastStudiedAt: string | null;
  latestAssessmentScore: number | null;
  previousAssessmentScore: number | null;
  assessmentDelta: number | null;
  postStudyDelta: number | null;
};

export type RecentStudySession = {
  id: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  topic: string | null;
  minutes: number;
  interactions: number;
  rating: number | null;
  completedAt: string;
};

export type RecentAssessment = {
  id: string;
  assessmentId: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  title: string;
  assessmentType: string;
  score: number | null;
  completedAt: string;
};

export type StudyAnalytics = {
  timezone: string;
  focusedMinutes7d: number;
  completedSessions7d: number;
  assessmentAverage30d: number | null;
  assessmentAttempts30d: number;
  currentMastery: number | null;
  trackedTopics: number;
  studyStreak: number;
  upcomingDeadlines: number;
  weeklyActivity: WeeklyStudyPoint[];
  topics: TopicProgress[];
  evidenceGapTopics: TopicProgress[];
  recentSessions: RecentStudySession[];
  recentAssessments: RecentAssessment[];
};

type TopicAttempt = { score: number; completedAt: string };

function timezoneOrUtc(value?: string | null) {
  try {
    const timezone = value || "UTC";
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
    return timezone;
  } catch {
    return "UTC";
  }
}

function localDateKey(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

function addDays(key: string, amount: number) {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + amount));
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function dayLabel(key: string, timezone: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short", month: "short", day: "numeric", timeZone: timezone,
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

function average(values: number[]) {
  if (!values.length) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function parseTopicResults(feedback: unknown) {
  const items = feedback && typeof feedback === "object"
    ? (feedback as { items?: unknown }).items
    : null;
  if (!Array.isArray(items)) return [] as Array<{ topic: string; score: number }>;

  const grouped = new Map<string, { correct: number; total: number }>();
  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as { topic?: unknown; correct?: unknown };
    const topic = typeof item.topic === "string" ? item.topic.trim() : "";
    if (!topic) continue;
    const current = grouped.get(topic) || { correct: 0, total: 0 };
    current.total += 1;
    if (item.correct === true) current.correct += 1;
    grouped.set(topic, current);
  }

  return [...grouped.entries()].map(([topic, result]) => ({
    topic,
    score: (result.correct / result.total) * 100,
  }));
}

export async function getStudyAnalytics(workspace: AcademicWorkspace): Promise<StudyAnalytics> {
  const supabase = await createClient();
  const courseIds = workspace.courses.map((course) => course.id);
  const now = new Date();
  const since7d = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  const since30d = new Date(now.getTime() - 30 * 86_400_000).toISOString();
  const since60d = new Date(now.getTime() - 60 * 86_400_000).toISOString();

  const [
    preferenceResult,
    sessionsResult,
    masteryResult,
    assessmentsResult,
    deadlinesResult,
  ] = await Promise.all([
    supabase.from("study_preferences").select("timezone").eq("user_id", workspace.user.id).maybeSingle(),
    supabase
      .from("study_sessions")
      .select("id, course_id, focus_topic, active_seconds, interaction_count, self_rating, started_at, completed_at")
      .eq("user_id", workspace.user.id)
      .eq("status", "completed")
      .gte("started_at", since60d)
      .order("started_at", { ascending: false })
      .limit(500),
    supabase
      .from("topic_mastery")
      .select("course_id, topic, mastery_score, evidence_count, study_minutes, study_sessions, last_studied_at, updated_at")
      .eq("user_id", workspace.user.id)
      .in("course_id", courseIds),
    supabase
      .from("assessments")
      .select("id, course_id, title, assessment_type")
      .eq("user_id", workspace.user.id)
      .in("course_id", courseIds),
    supabase
      .from("academic_deadlines")
      .select("id")
      .eq("user_id", workspace.user.id)
      .eq("completed", false)
      .gte("due_at", now.toISOString()),
  ]);

  for (const result of [
    preferenceResult, sessionsResult, masteryResult, assessmentsResult, deadlinesResult,
  ]) {
    if (result.error) throw result.error;
  }

  const timezone = timezoneOrUtc(preferenceResult.data?.timezone);
  const courseById = new Map(workspace.courses.map((course) => [course.id, course]));
  const sessions = sessionsResult.data || [];
  const masteryRows = masteryResult.data || [];
  const assessments = assessmentsResult.data || [];
  const assessmentIds = assessments.map((assessment) => assessment.id);

  const attemptResult = assessmentIds.length
    ? await supabase
        .from("assessment_attempts")
        .select("id, assessment_id, score, feedback, completed_at")
        .eq("user_id", workspace.user.id)
        .in("assessment_id", assessmentIds)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(200)
    : { data: [], error: null };

  if (attemptResult.error) throw attemptResult.error;

  const attempts = (attemptResult.data || []).filter((attempt) => Boolean(attempt.completed_at));
  const assessmentById = new Map(assessments.map((assessment) => [assessment.id, assessment]));
  const topicAttempts = new Map<string, TopicAttempt[]>();

  for (const attempt of attempts) {
    const assessment = assessmentById.get(attempt.assessment_id);
    if (!assessment || !attempt.completed_at) continue;
    for (const result of parseTopicResults(attempt.feedback)) {
      const key = `${assessment.course_id}::${result.topic}`;
      const history = topicAttempts.get(key) || [];
      history.push({ score: result.score, completedAt: attempt.completed_at });
      topicAttempts.set(key, history);
    }
  }

  const todayKey = localDateKey(now, timezone);
  const weeklyActivity = Array.from({ length: 7 }, (_, index) => {
    const key = addDays(todayKey, index - 6);
    return { dateKey: key, label: dayLabel(key, timezone), minutes: 0, sessions: 0, assessments: 0 };
  });
  const weeklyByKey = new Map(weeklyActivity.map((point) => [point.dateKey, point]));

  for (const session of sessions) {
    if (!session.completed_at) continue;
    const point = weeklyByKey.get(localDateKey(new Date(session.completed_at), timezone));
    if (!point) continue;
    point.minutes += Math.floor(Math.max(0, Number(session.active_seconds || 0)) / 60);
    point.sessions += 1;
  }

  for (const attempt of attempts) {
    if (!attempt.completed_at) continue;
    const point = weeklyByKey.get(localDateKey(new Date(attempt.completed_at), timezone));
    if (point) point.assessments += 1;
  }

  const recentAttempts = attempts.filter((attempt) => attempt.completed_at! >= since30d);
  const assessmentAverage30d = average(
    recentAttempts.map((attempt) => Number(attempt.score)).filter(Number.isFinite),
  );
  const currentMastery = average(
    masteryRows.map((row) => Number(row.mastery_score || 0)).filter(Number.isFinite),
  );

  const studyDates = new Set(
    sessions.filter((session) => session.completed_at)
      .map((session) => localDateKey(new Date(session.completed_at!), timezone)),
  );
  let studyStreak = 0;
  let cursor = studyDates.has(todayKey) ? todayKey : addDays(todayKey, -1);
  while (studyDates.has(cursor)) {
    studyStreak += 1;
    cursor = addDays(cursor, -1);
  }

  const topics = masteryRows
    .map((row) => {
      const course = courseById.get(row.course_id);
      if (!course) return null;
      const history = [...(topicAttempts.get(`${row.course_id}::${row.topic}`) || [])]
        .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
      const latest = history[0]?.score ?? null;
      const previous = history[1]?.score ?? null;
      let postStudyDelta: number | null = null;

      if (row.last_studied_at) {
        const before = history.filter((item) => item.completedAt <= row.last_studied_at!).map((item) => item.score);
        const after = history.filter((item) => item.completedAt > row.last_studied_at!).map((item) => item.score);
        const beforeAverage = average(before);
        const afterAverage = average(after);
        if (beforeAverage !== null && afterAverage !== null) {
          postStudyDelta = Math.round((afterAverage - beforeAverage) * 10) / 10;
        }
      }

      return {
        courseId: row.course_id,
        courseCode: course.code,
        courseTitle: course.title,
        topic: row.topic,
        masteryScore: Math.round(Number(row.mastery_score || 0) * 10) / 10,
        evidenceCount: Math.max(0, Number(row.evidence_count || 0)),
        studyMinutes: Math.max(0, Number(row.study_minutes || 0)),
        studySessions: Math.max(0, Number(row.study_sessions || 0)),
        lastStudiedAt: row.last_studied_at || null,
        latestAssessmentScore: latest === null ? null : Math.round(latest * 10) / 10,
        previousAssessmentScore: previous === null ? null : Math.round(previous * 10) / 10,
        assessmentDelta: latest !== null && previous !== null
          ? Math.round((latest - previous) * 10) / 10
          : null,
        postStudyDelta,
      } satisfies TopicProgress;
    })
    .filter((topic): topic is TopicProgress => Boolean(topic))
    .sort((a, b) => a.masteryScore - b.masteryScore);

  const recentSessions: RecentStudySession[] = sessions.slice(0, 10).flatMap((session) => {
    const course = courseById.get(session.course_id);
    if (!course || !session.completed_at) return [];
    return [{
      id: session.id,
      courseId: course.id,
      courseCode: course.code,
      courseTitle: course.title,
      topic: session.focus_topic || null,
      minutes: Math.floor(Math.max(0, Number(session.active_seconds || 0)) / 60),
      interactions: Math.max(0, Number(session.interaction_count || 0)),
      rating: session.self_rating ? Number(session.self_rating) : null,
      completedAt: session.completed_at,
    }];
  });

  const recentAssessments: RecentAssessment[] = attempts.slice(0, 10).flatMap((attempt) => {
    const assessment = assessmentById.get(attempt.assessment_id);
    const course = assessment ? courseById.get(assessment.course_id) : null;
    if (!assessment || !course || !attempt.completed_at) return [];
    return [{
      id: attempt.id,
      assessmentId: assessment.id,
      courseId: course.id,
      courseCode: course.code,
      courseTitle: course.title,
      title: assessment.title,
      assessmentType: assessment.assessment_type,
      score: attempt.score === null ? null : Math.round(Number(attempt.score) * 10) / 10,
      completedAt: attempt.completed_at,
    }];
  });

  const evidenceGapTopics = topics
    .filter((topic) => topic.studySessions > 0 && topic.evidenceCount === 0)
    .slice(0, 5);

  return {
    timezone,
    focusedMinutes7d: weeklyActivity.reduce((sum, point) => sum + point.minutes, 0),
    completedSessions7d: weeklyActivity.reduce((sum, point) => sum + point.sessions, 0),
    assessmentAverage30d,
    assessmentAttempts30d: recentAttempts.length,
    currentMastery,
    trackedTopics: topics.length,
    studyStreak,
    upcomingDeadlines: (deadlinesResult.data || []).length,
    weeklyActivity,
    topics: topics.slice(0, 12),
    evidenceGapTopics,
    recentSessions,
    recentAssessments,
  };
}
