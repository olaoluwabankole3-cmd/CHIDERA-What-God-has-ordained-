import { ArrowLeft, CalendarClock, Clock3 } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { StudySession } from "@/components/study-session";
import { getCourseWorkspace } from "@/lib/academic";
import { createClient } from "@/lib/supabase/server";

function cleanParam(value: string | string[] | undefined, max = 160) {
  const first = Array.isArray(value) ? value[0] : value;
  return String(first || "").trim().slice(0, max);
}

export default async function StudySessionPage({
  searchParams,
}: {
  searchParams: Promise<{
    courseId?: string | string[];
    topic?: string | string[];
    minutes?: string | string[];
    deadlineId?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const courseId = cleanParam(params.courseId, 80);
  const focusTopic = cleanParam(params.topic, 120) || null;
  const deadlineId = cleanParam(params.deadlineId, 80) || null;
  const parsedMinutes = Number(cleanParam(params.minutes, 8));
  const scheduledMinutes = Number.isFinite(parsedMinutes)
    ? Math.min(180, Math.max(5, Math.floor(parsedMinutes)))
    : 25;

  if (!courseId) redirect("/study-plan");

  const workspace = await getCourseWorkspace(courseId);
  if (!workspace) redirect("/auth");
  if (!workspace.academicProfile) redirect("/onboarding");
  if (!workspace.course) redirect("/study-plan");

  const supabase = await createClient();

  const [{ data: deadline }, { data: mastery }] = await Promise.all([
    deadlineId
      ? supabase
          .from("academic_deadlines")
          .select("id, title")
          .eq("id", deadlineId)
          .eq("course_id", workspace.course.id)
          .eq("user_id", workspace.user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    focusTopic
      ? supabase
          .from("topic_mastery")
          .select("mastery_score")
          .eq("course_id", workspace.course.id)
          .eq("user_id", workspace.user.id)
          .eq("topic", focusTopic)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const profile = workspace.academicProfile;
  const meta = `${profile.level} · ${profile.department}`;

  return (
    <AppShell studentName={workspace.name} studentMeta={meta}>
      <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8 lg:px-10 lg:py-9">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/study-plan"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-700"
          >
            <ArrowLeft size={14} /> Back to study plan
          </Link>

          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.12em] text-slate-400">
            <Clock3 size={13} />
            {scheduledMinutes} minute session
            {deadline && (
              <>
                <span>·</span>
                <CalendarClock size={13} />
                {deadline.title}
              </>
            )}
          </div>
        </div>

        <header className="mt-6">
          <p className="text-xs font-black uppercase tracking-[.16em] text-[#5b46e8]">
            {workspace.course.code} · focused learning
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">
            {focusTopic || workspace.course.title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            One topic, one timer, one feedback loop. Your AI tutor stays focused on
            the scheduled learning goal, while the session record feeds study exposure
            back into your academic profile.
          </p>
        </header>

        <div className="mt-8">
          <StudySession
            courseId={workspace.course.id}
            courseCode={workspace.course.code}
            courseTitle={workspace.course.title}
            focusTopic={focusTopic}
            scheduledMinutes={scheduledMinutes}
            deadlineTitle={deadline?.title || null}
            masteryScore={
              mastery?.mastery_score === null || mastery?.mastery_score === undefined
                ? null
                : Math.round(Number(mastery.mastery_score))
            }
          />
        </div>
      </div>
    </AppShell>
  );
}
