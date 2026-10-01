import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_MINUTES = 360;

function cleanText(value: unknown, max: number) {
  return String(value || "").trim().slice(0, max);
}

function clampInteger(value: unknown, min: number, max: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, Math.floor(number)));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = cleanText(body?.action, 40);
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "You must be signed in to use a study session." },
        { status: 401 },
      );
    }

    if (action === "start") {
      const courseId = cleanText(body?.courseId, 80);
      const deadlineId = cleanText(body?.deadlineId, 80) || null;
      const focusTopic = cleanText(body?.focusTopic, 120) || null;
      const scheduledMinutes = clampInteger(body?.scheduledMinutes, 5, MAX_MINUTES);

      const { data: course, error: courseError } = await supabase
        .from("courses")
        .select("id")
        .eq("id", courseId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (courseError) throw courseError;
      if (!course) {
        return NextResponse.json({ error: "Course not found." }, { status: 404 });
      }

      if (deadlineId) {
        const { data: deadline, error: deadlineError } = await supabase
          .from("academic_deadlines")
          .select("id")
          .eq("id", deadlineId)
          .eq("course_id", courseId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (deadlineError) throw deadlineError;
        if (!deadline) {
          return NextResponse.json(
            { error: "The linked deadline does not belong to this course." },
            { status: 400 },
          );
        }
      }

      const { data: existingActive } = await supabase
        .from("study_sessions")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (existingActive) {
        return NextResponse.json(
          {
            error:
              "You already have an active study session. Finish it before starting another.",
          },
          { status: 409 },
        );
      }

      const { data: session, error: sessionError } = await supabase
        .from("study_sessions")
        .insert({
          user_id: user.id,
          course_id: courseId,
          deadline_id: deadlineId,
          focus_topic: focusTopic,
          scheduled_minutes: scheduledMinutes,
        })
        .select("id, started_at")
        .single();

      if (sessionError || !session) {
        throw sessionError || new Error("Could not start the study session.");
      }

      return NextResponse.json({
        sessionId: session.id,
        startedAt: session.started_at,
      });
    }

    const sessionId = cleanText(body?.sessionId, 80);
    if (!sessionId) {
      return NextResponse.json({ error: "Study session id is required." }, { status: 400 });
    }

    if (action === "heartbeat") {
      const activeSeconds = clampInteger(body?.activeSeconds, 0, MAX_MINUTES * 60);
      const interactionCount = clampInteger(body?.interactionCount, 0, 500);

      const { error } = await supabase
        .from("study_sessions")
        .update({
          active_seconds: activeSeconds,
          interaction_count: interactionCount,
        })
        .eq("id", sessionId)
        .eq("user_id", user.id)
        .eq("status", "active");

      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (action === "complete") {
      const activeSeconds = clampInteger(body?.activeSeconds, 0, MAX_MINUTES * 60);
      const interactionCount = clampInteger(body?.interactionCount, 0, 500);
      const selfRating = Number(body?.selfRating);

      const { data, error } = await supabase.rpc("complete_study_session", {
        p_session_id: sessionId,
        p_active_seconds: activeSeconds,
        p_interaction_count: interactionCount,
        p_self_rating: Number.isInteger(selfRating) ? selfRating : null,
        p_reflection: cleanText(body?.reflection, 500) || null,
      });

      if (error) throw error;

      return NextResponse.json(data);
    }

    if (action === "abandon") {
      const { error } = await supabase
        .from("study_sessions")
        .update({ status: "abandoned", completed_at: new Date().toISOString() })
        .eq("id", sessionId)
        .eq("user_id", user.id)
        .eq("status", "active");

      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown study-session action." }, { status: 400 });
  } catch (error) {
    console.error("Study session API error", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The study session could not be updated.",
      },
      { status: 500 },
    );
  }
}
