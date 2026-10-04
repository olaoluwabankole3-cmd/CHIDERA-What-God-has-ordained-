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

    // Supabase creates the base student profile automatically when the account is
    // created. Onboarding should only persist the academic workspace and courses.
    // Use the server-only client for these trusted, user-scoped mutations so the
    // flow does not depend on browser RLS state.
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const db = createAdminClient();

    const { error: academicError } = await db.from("academic_profiles").upsert(
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

    if (academicError) {
      console.error("Academic onboarding academic profile write failed", academicError);
      return NextResponse.json(
        { error: "Could not save your academic profile.", code: academicError.code ?? null },
        { status: 500 },
      );
    }

    const { error: courseError } = await db.from("courses").upsert(
      courses.map((course) => ({
        user_id: user.id,
        code: course.code,
        title: course.title,
        lecturer: course.lecturer,
        semester,
      })),
      { onConflict: "user_id,code" },
    );

    if (courseError) {
      console.error("Academic onboarding course write failed", courseError);
      return NextResponse.json(
        { error: "Could not save your courses.", code: courseError.code ?? null },
        { status: 500 },
      );
    }

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
