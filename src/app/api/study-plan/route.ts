import { NextResponse } from "next/server";
import type { DeadlineType } from "@/lib/study-calendar";
import { createClient } from "@/lib/supabase/server";

const deadlineTypes: DeadlineType[] = [
  "exam",
  "quiz",
  "assignment",
  "presentation",
  "project",
  "other",
];

function cleanTimezone(value: unknown) {
  const timezone = String(value || "UTC").trim().slice(0, 80);
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
    return timezone;
  } catch {
    return "UTC";
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = String(body?.action || "").trim();
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
    }

    if (action === "save_preferences") {
      const dailyMinutes = Number(body?.dailyMinutes);
      if (!Number.isInteger(dailyMinutes) || dailyMinutes < 15 || dailyMinutes > 360) {
        return NextResponse.json(
          { error: "Daily study time must be between 15 and 360 minutes." },
          { status: 400 },
        );
      }

      const { error } = await supabase
        .from("study_preferences")
        .upsert(
          {
            user_id: user.id,
            daily_minutes: dailyMinutes,
            timezone: cleanTimezone(body?.timezone),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );

      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (action === "create_deadline") {
      const courseId = String(body?.courseId || "").trim();
      const title = String(body?.title || "").trim().slice(0, 160);
      const assessmentType = String(body?.assessmentType || "exam") as DeadlineType;
      const dueAt = String(body?.dueAt || "").trim();

      if (!courseId || !title || !dueAt || !deadlineTypes.includes(assessmentType)) {
        return NextResponse.json(
          { error: "Course, title, assessment type and due date are required." },
          { status: 400 },
        );
      }

      const parsedDueAt = new Date(dueAt);
      if (!Number.isFinite(parsedDueAt.getTime())) {
        return NextResponse.json({ error: "The deadline date is invalid." }, { status: 400 });
      }

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

      const { data: existingPreferences } = await supabase
        .from("study_preferences")
        .select("daily_minutes")
        .eq("user_id", user.id)
        .maybeSingle();

      const { error: timezoneError } = await supabase
        .from("study_preferences")
        .upsert(
          {
            user_id: user.id,
            daily_minutes: existingPreferences?.daily_minutes || 60,
            timezone: cleanTimezone(body?.timezone),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );

      if (timezoneError) throw timezoneError;

      const { data, error } = await supabase
        .from("academic_deadlines")
        .insert({
          user_id: user.id,
          course_id: courseId,
          title,
          assessment_type: assessmentType,
          due_at: parsedDueAt.toISOString(),
        })
        .select("id")
        .single();

      if (error) throw error;

      return NextResponse.json({ ok: true, deadlineId: data.id });
    }

    if (action === "delete_deadline") {
      const deadlineId = String(body?.deadlineId || "").trim();
      if (!deadlineId) {
        return NextResponse.json({ error: "Deadline id is required." }, { status: 400 });
      }

      const { error } = await supabase
        .from("academic_deadlines")
        .delete()
        .eq("id", deadlineId)
        .eq("user_id", user.id);

      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (action === "complete_deadline") {
      const deadlineId = String(body?.deadlineId || "").trim();
      if (!deadlineId) {
        return NextResponse.json({ error: "Deadline id is required." }, { status: 400 });
      }

      const { error } = await supabase
        .from("academic_deadlines")
        .update({ completed: true, updated_at: new Date().toISOString() })
        .eq("id", deadlineId)
        .eq("user_id", user.id);

      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown study-plan action." }, { status: 400 });
  } catch (error) {
    console.error("Study plan mutation failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update study plan." },
      { status: 500 },
    );
  }
}
