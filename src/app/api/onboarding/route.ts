import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type CourseInput = {
  code?: string;
  title?: string;
  lecturer?: string;
};

type OnboardingInput = {
  university?: string;
  faculty?: string;
  department?: string;
  level?: string;
  semester?: string;
  courses?: CourseInput[];
};

function clean(value: unknown, maxLength = 120) {
  return String(value ?? "").trim().slice(0, maxLength);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as OnboardingInput;

    const university = clean(body.university);
    const faculty = clean(body.faculty);
    const department = clean(body.department);
    const level = clean(body.level, 40);
    const semester = clean(body.semester, 40);

    const courses = (Array.isArray(body.courses) ? body.courses : [])
      .map((course) => ({
        code: clean(course.code, 30).toUpperCase(),
        title: clean(course.title, 160),
        lecturer: clean(course.lecturer, 120) || null,
      }))
      .filter((course) => course.code && course.title)
      .slice(0, 16);

    if (!university || !department || !level || !semester) {
      return NextResponse.json(
        { error: "University, department, level and semester are required." },
        { status: 400 },
      );
    }

    if (courses.length === 0) {
      return NextResponse.json(
        { error: "Add at least one course before creating your workspace." },
        { status: 400 },
      );
    }

    const uniqueCodes = new Set(courses.map((course) => course.code));
    if (uniqueCodes.size !== courses.length) {
      return NextResponse.json(
        { error: "Each course code should only appear once." },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "You must be signed in to create an academic workspace." },
        { status: 401 },
      );
    }

    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        display_name:
          user.user_metadata?.display_name ||
          user.email?.split("@")[0] ||
          "Student",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

    if (profileError) throw profileError;

    const { error: academicError } = await supabase.from("academic_profiles").upsert(
      {
        user_id: user.id,
        university,
        faculty: faculty || null,
        department,
        level,
        semester,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (academicError) throw academicError;

    const { error: courseError } = await supabase.from("courses").upsert(
      courses.map((course) => ({
        user_id: user.id,
        code: course.code,
        title: course.title,
        lecturer: course.lecturer,
        semester,
      })),
      { onConflict: "user_id,code" },
    );

    if (courseError) throw courseError;

    return NextResponse.json({
      ok: true,
      courseCount: courses.length,
    });
  } catch (error) {
    console.error("Academic onboarding failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save your academic workspace." },
      { status: 500 },
    );
  }
}
