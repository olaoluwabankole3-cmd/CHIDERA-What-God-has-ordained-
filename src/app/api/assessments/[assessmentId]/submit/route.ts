import { NextResponse } from "next/server";
import type {
  AssessmentFeedbackItem,
  StoredAssessmentConfiguration,
} from "@/lib/assessment-types";
import { createClient } from "@/lib/supabase/server";

type SubmittedAnswer = {
  questionId?: string;
  selectedOptionIndex?: number | null;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ assessmentId: string }> },
) {
  try {
    const { assessmentId } = await params;
    const body = await request.json();
    const submitted = Array.isArray(body?.answers)
      ? (body.answers as SubmittedAnswer[])
      : [];

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "You must be signed in to submit an assessment." },
        { status: 401 },
      );
    }

    const { data: assessment, error: assessmentError } = await supabase
      .from("assessments")
      .select("id, course_id, configuration")
      .eq("id", assessmentId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (assessmentError) throw assessmentError;
    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found." }, { status: 404 });
    }

    const configuration = assessment.configuration as StoredAssessmentConfiguration;
    const questions = Array.isArray(configuration?.questions)
      ? configuration.questions
      : [];

    if (questions.length === 0) {
      return NextResponse.json(
        { error: "This assessment has no questions." },
        { status: 400 },
      );
    }

    const answerMap = new Map(
      submitted.map((answer) => [
        String(answer.questionId || ""),
        Number.isInteger(answer.selectedOptionIndex)
          ? Number(answer.selectedOptionIndex)
          : null,
      ]),
    );

    const feedback: AssessmentFeedbackItem[] = questions.map((question) => {
      const selectedOptionIndex = answerMap.has(question.id)
        ? answerMap.get(question.id) ?? null
        : null;

      const correct = selectedOptionIndex === question.correctOptionIndex;

      return {
        questionId: question.id,
        topic: question.topic,
        selectedOptionIndex,
        correctOptionIndex: question.correctOptionIndex,
        correct,
        explanation: question.explanation,
        source: question.source,
      };
    });

    const correctCount = feedback.filter((item) => item.correct).length;
    const total = feedback.length;
    const score = Number(((correctCount / total) * 100).toFixed(2));
    const completedAt = new Date().toISOString();

    const { data: attempt, error: attemptError } = await supabase
      .from("assessment_attempts")
      .insert({
        assessment_id: assessment.id,
        user_id: user.id,
        score,
        answers: submitted,
        feedback: {
          correctCount,
          total,
          items: feedback,
        },
        completed_at: completedAt,
      })
      .select("id")
      .single();

    if (attemptError || !attempt) {
      throw attemptError || new Error("Could not save the assessment attempt.");
    }

    const byTopic = new Map<string, { correct: number; total: number }>();
    for (const item of feedback) {
      const current = byTopic.get(item.topic) || { correct: 0, total: 0 };
      current.total += 1;
      if (item.correct) current.correct += 1;
      byTopic.set(item.topic, current);
    }

    const topics = [...byTopic.keys()];
    if (topics.length > 0) {
      const { data: existingRows, error: masteryReadError } = await supabase
        .from("topic_mastery")
        .select("topic, mastery_score, evidence_count")
        .eq("user_id", user.id)
        .eq("course_id", assessment.course_id)
        .in("topic", topics);

      if (masteryReadError) throw masteryReadError;

      const existingByTopic = new Map(
        (existingRows || []).map((row) => [row.topic, row]),
      );

      const updates = topics.map((topic) => {
        const result = byTopic.get(topic)!;
        const existing = existingByTopic.get(topic);
        const oldCount = Number(existing?.evidence_count || 0);
        const oldScore = Number(existing?.mastery_score || 0);
        const newEvidence = result.total;
        const assessmentScore = (result.correct / result.total) * 100;
        const evidenceCount = oldCount + newEvidence;
        const masteryScore =
          evidenceCount === 0
            ? 0
            : (oldScore * oldCount + assessmentScore * newEvidence) / evidenceCount;

        return {
          user_id: user.id,
          course_id: assessment.course_id,
          topic,
          mastery_score: Number(masteryScore.toFixed(2)),
          evidence_count: evidenceCount,
          updated_at: completedAt,
        };
      });

      const { error: masteryWriteError } = await supabase
        .from("topic_mastery")
        .upsert(updates, { onConflict: "user_id,course_id,topic" });

      if (masteryWriteError) throw masteryWriteError;
    }

    return NextResponse.json({
      attemptId: attempt.id,
      score,
      correctCount,
      total,
      feedback,
    });
  } catch (error) {
    console.error("Assessment submission failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not score the assessment." },
      { status: 500 },
    );
  }
}
