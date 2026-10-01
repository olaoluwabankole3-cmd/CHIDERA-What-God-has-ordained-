import { createClient } from "@/lib/supabase/server";

export type AcademicProfileRecord = {
  university: string;
  faculty: string | null;
  department: string;
  level: string;
  semester: string;
};

export type CourseRecord = {
  id: string;
  code: string;
  title: string;
  lecturer: string | null;
  semester: string | null;
  progress: number;
  materials: number;
  readyMaterials: number;
  trackedTopics: number;
};

export type AcademicWorkspace = {
  user: {
    id: string;
    email: string | null;
  };
  name: string;
  academicProfile: AcademicProfileRecord | null;
  courses: CourseRecord[];
  totalMaterials: number;
  totalTrackedTopics: number;
};

function average(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export async function getAcademicWorkspace(): Promise<AcademicWorkspace | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return null;

  const [{ data: profileRow }, { data: academicProfile }, { data: courseRows }] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
    supabase
      .from("academic_profiles")
      .select("university, faculty, department, level, semester")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("courses")
      .select("id, code, title, lecturer, semester, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
  ]);

  const rawCourses = courseRows || [];
  const courseIds = rawCourses.map((course) => course.id);

  let materialRows: Array<{ course_id: string; status: string }> = [];
  let masteryRows: Array<{ course_id: string; mastery_score: number | string }> = [];

  if (courseIds.length > 0) {
    const [{ data: materials }, { data: mastery }] = await Promise.all([
      supabase
        .from("materials")
        .select("course_id, status")
        .eq("user_id", user.id)
        .in("course_id", courseIds),
      supabase
        .from("topic_mastery")
        .select("course_id, mastery_score")
        .eq("user_id", user.id)
        .in("course_id", courseIds),
    ]);

    materialRows = materials || [];
    masteryRows = mastery || [];
  }

  const courses: CourseRecord[] = rawCourses.map((course) => {
    const courseMaterials = materialRows.filter((material) => material.course_id === course.id);
    const courseMastery = masteryRows
      .filter((row) => row.course_id === course.id)
      .map((row) => Number(row.mastery_score || 0));

    return {
      id: course.id,
      code: course.code,
      title: course.title,
      lecturer: course.lecturer,
      semester: course.semester,
      progress: average(courseMastery),
      materials: courseMaterials.length,
      readyMaterials: courseMaterials.filter((material) => material.status === "ready").length,
      trackedTopics: courseMastery.length,
    };
  });

  return {
    user: {
      id: user.id,
      email: user.email ?? null,
    },
    name:
      profileRow?.display_name ||
      user.user_metadata?.display_name ||
      user.email?.split("@")[0] ||
      "Student",
    academicProfile: academicProfile || null,
    courses,
    totalMaterials: materialRows.length,
    totalTrackedTopics: masteryRows.length,
  };
}

export async function getCourseWorkspace(courseId: string) {
  const workspace = await getAcademicWorkspace();
  if (!workspace) return null;

  const course = workspace.courses.find((item) => item.id === courseId);
  if (!course) {
    return {
      ...workspace,
      course: null,
    };
  }

  return {
    ...workspace,
    course,
  };
}
