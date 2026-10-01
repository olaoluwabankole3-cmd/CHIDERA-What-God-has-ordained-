import type { AcademicWorkspace } from "@/lib/academic";
import { createClient } from "@/lib/supabase/server";

export type TopicPriority = {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  topic: string;
  masteryScore: number;
  evidenceCount: number;
  updatedAt: string;
  priorityScore: number;
  confidence: "low" | "medium" | "high";
  recommendedMinutes: number;
};

export type CoursePerformance = {
  courseId: string;
  attempts: number;
  recentAverage: number | null;
  latestScore: number | null;
};

export type StudySessionRecommendation = {
  key: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  title: string;
  reason: string;
  action: "targeted_practice" | "baseline_quiz" | "upload_material";
  topic: string | null;
  minutes: number;
  priorityScore: number;
};

export type StudyIntelligence = {
  priorityTopics: TopicPriority[];
  coursePerformance: CoursePerformance[];
  sessions: StudySessionRecommendation[];
  weakestTopic: TopicPriority | null;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function daysSince(iso: string) {
  const time = new Date(iso).getTime();
  if (!Number.isFinite(time)) return 0;
  return Math.max(0, Math.floor((Date.now() - time) / 86_400_000));
}

function confidenceFromEvidence(evidenceCount: number): TopicPriority["confidence"] {
  if (evidenceCount >= 6) return "high";
  if (evidenceCount >= 3) return "medium";
  return "low";
}

export async function getStudyIntelligence(
  workspace: AcademicWorkspace,
): Promise<StudyIntelligence> {
  const courseIds = workspace.courses.map((course) => course.id);

  if (courseIds.length === 0) {
    return {
      priorityTopics: [],
      coursePerformance: [],
      sessions: [],
      weakestTopic: null,
    };
  }

  const supabase = await createClient();

  const [{ data: masteryRows }, { data: assessmentRows }] = await Promise.all([
    supabase
      .from("topic_mastery")
      .select("course_id, topic, mastery_score, evidence_count, updated_at")
      .eq("user_id", workspace.user.id)
      .in("course_id", courseIds),
    supabase
      .from("assessments")
      .select("id, course_id")
      .eq("user_id", workspace.user.id)
      .in("course_id", courseIds),
  ]);

  const courseById = new Map(workspace.courses.map((course) => [course.id, course]));
  const assessments = assessmentRows || [];
  const assessmentIds = assessments.map((assessment) => assessment.id);
  const courseByAssessmentId = new Map(
    assessments.map((assessment) => [assessment.id, assessment.course_id]),
  );

  let attempts: Array<{
    assessment_id: string;
    score: number | string | null;
    completed_at: string | null;
  }> = [];

  if (assessmentIds.length > 0) {
    const { data } = await supabase
      .from("assessment_attempts")
      .select("assessment_id, score, completed_at")
      .eq("user_id", workspace.user.id)
      .in("assessment_id", assessmentIds)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(60);

    attempts = data || [];
  }

  const priorityTopics: TopicPriority[] = (masteryRows || [])
    .map((row) => {
      const course = courseById.get(row.course_id);
      if (!course) return null;

      const masteryScore = clamp(Number(row.mastery_score || 0), 0, 100);
      const evidenceCount = Math.max(0, Number(row.evidence_count || 0));
      const staleDays = clamp(daysSince(row.updated_at), 0, 21);

      const masteryGap = 100 - masteryScore;
      const lowEvidenceBonus = Math.max(0, 4 - evidenceCount) * 6;
      const staleBonus = staleDays * 0.6;

      const priorityScore = Math.round(
        masteryGap * 0.72 + lowEvidenceBonus + staleBonus,
      );

      return {
        courseId: course.id,
        courseCode: course.code,
        courseTitle: course.title,
        topic: row.topic,
        masteryScore: Math.round(masteryScore),
        evidenceCount,
        updatedAt: row.updated_at,
        priorityScore,
        confidence: confidenceFromEvidence(evidenceCount),
        recommendedMinutes:
          masteryScore < 45 ? 35 : masteryScore < 70 ? 25 : 20,
      } satisfies TopicPriority;
    })
    .filter((item): item is TopicPriority => Boolean(item))
    .sort((a, b) => b.priorityScore - a.priorityScore);

  const attemptsByCourse = new Map<
    string,
    Array<{ score: number; completedAt: string }>
  >();

  for (const attempt of attempts) {
    const courseId = courseByAssessmentId.get(attempt.assessment_id);
    if (!courseId || attempt.score === null || !attempt.completed_at) continue;

    const current = attemptsByCourse.get(courseId) || [];
    current.push({
      score: Number(attempt.score),
      completedAt: attempt.completed_at,
    });
    attemptsByCourse.set(courseId, current);
  }

  const coursePerformance: CoursePerformance[] = workspace.courses.map((course) => {
    const courseAttempts = attemptsByCourse.get(course.id) || [];
    const recent = courseAttempts.slice(0, 5);
    const recentAverage =
      recent.length > 0
        ? Math.round(
            recent.reduce((sum, item) => sum + item.score, 0) / recent.length,
          )
        : null;

    return {
      courseId: course.id,
      attempts: courseAttempts.length,
      recentAverage,
      latestScore: courseAttempts[0]?.score ?? null,
    };
  });

  const sessions: StudySessionRecommendation[] = [];

  for (const topic of priorityTopics.slice(0, 5)) {
    sessions.push({
      key: `topic-${topic.courseId}-${topic.topic}`,
      courseId: topic.courseId,
      courseCode: topic.courseCode,
      courseTitle: topic.courseTitle,
      title: `Strengthen ${topic.topic}`,
      reason:
        topic.evidenceCount < 2
          ? `Only ${topic.evidenceCount} evidence point${topic.evidenceCount === 1 ? "" : "s"} so far; a focused quiz will make the estimate more reliable.`
          : `Current mastery is ${topic.masteryScore}%, making this one of your highest-priority weak areas.`,
      action: "targeted_practice",
      topic: topic.topic,
      minutes: topic.recommendedMinutes,
      priorityScore: topic.priorityScore,
    });
  }

  const courseIdsWithTopicSessions = new Set(
    sessions.map((session) => session.courseId),
  );

  for (const course of workspace.courses) {
    if (sessions.length >= 7) break;
    if (courseIdsWithTopicSessions.has(course.id)) continue;

    if (course.trackedTopics === 0 && course.readyMaterials > 0) {
      sessions.push({
        key: `baseline-${course.id}`,
        courseId: course.id,
        courseCode: course.code,
        courseTitle: course.title,
        title: "Establish a mastery baseline",
        reason:
          "This course has indexed material but no topic-level mastery evidence yet.",
        action: "baseline_quiz",
        topic: null,
        minutes: 20,
        priorityScore: 55,
      });
    } else if (course.readyMaterials === 0) {
      sessions.push({
        key: `upload-${course.id}`,
        courseId: course.id,
        courseCode: course.code,
        courseTitle: course.title,
        title: "Add course material",
        reason:
          "Upload a lecturer PDF so the tutor and practice engine can ground recommendations in this course.",
        action: "upload_material",
        topic: null,
        minutes: 10,
        priorityScore: 45,
      });
    }
  }

  sessions.sort((a, b) => b.priorityScore - a.priorityScore);

  return {
    priorityTopics,
    coursePerformance,
    sessions,
    weakestTopic: priorityTopics[0] || null,
  };
}
