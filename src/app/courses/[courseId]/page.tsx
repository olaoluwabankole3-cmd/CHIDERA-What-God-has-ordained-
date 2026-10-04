import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  FileQuestion,
  MoreHorizontal,
  PlayCircle,
  Sparkles,
  Target,
  Video,
} from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CourseMaterials } from "@/components/course-materials";
import { CourseTutor } from "@/components/course-tutor";
import { MaterialUploader } from "@/components/material-uploader";
import { getCourseWorkspace } from "@/lib/academic";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const workspace = await getCourseWorkspace(courseId);

  if (!workspace) redirect("/auth");
  if (!workspace.academicProfile) redirect("/onboarding");
  if (!workspace.course) notFound();

  const course = workspace.course;
  const profile = workspace.academicProfile;
  const meta = `${profile.level} · ${profile.department}`;

  return (
    <AppShell studentName={workspace.name} studentMeta={meta}>
      <div className="mx-auto max-w-[1420px] px-4 py-5 sm:px-8 sm:py-6 lg:px-10 lg:py-9">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-700"
        >
          <ArrowLeft size={14} /> Back to dashboard
        </Link>

        <div className="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-start sm:gap-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-[#eff6ff] px-2.5 py-1 text-xs font-black text-[#2563eb]">
                {course.code}
              </span>
              <span className="text-xs font-semibold text-slate-400">{profile.semester}</span>
            </div>
            <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">{course.title}</h1>
            <p className="mt-2 text-sm text-slate-400">
              {course.lecturer ? `${course.lecturer} · ` : ""}
              {course.materials} material{course.materials === 1 ? "" : "s"} · AI tutor and exam preparation
            </p>
          </div>

          <div className="flex w-full gap-2 sm:w-auto">
            <MaterialUploader
              courseCode={course.code}
              courseTitle={course.title}
              lecturer={course.lecturer || undefined}
            />
            <button
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500"
              aria-label="More course options"
            >
              <MoreHorizontal size={18} />
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:mt-8 sm:gap-5 xl:grid-cols-[1.45fr_.65fr]">
          <CourseTutor courseCode={course.code} courseTitle={course.title} />

          <aside className="space-y-5">
            <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-bold">Course mastery</h2>
                <Target size={17} className="text-[#2563eb]" />
              </div>

              <div className="mt-5 flex items-end gap-2">
                <span className="text-4xl font-black">{course.progress}%</span>
                <span className="pb-1 text-xs font-semibold text-slate-400">overall</span>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-[#2563eb]"
                  style={{ width: `${course.progress}%` }}
                />
              </div>

              <div className="mt-5 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Tracked topics</span>
                  <b>{course.trackedTopics}</b>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Indexed PDFs</span>
                  <b>{course.readyMaterials}</b>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">All materials</span>
                  <b>{course.materials}</b>
                </div>
              </div>

              {course.trackedTopics === 0 && (
                <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2.5 text-[10px] leading-4 text-slate-400">
                  Mastery will become meaningful after practice and assessment features begin recording topic-level evidence.
                </p>
              )}
            </section>

            <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="font-bold">Study tools</h2>
                <Sparkles size={17} className="text-[#2563eb]" />
              </div>

              <div className="mt-4 space-y-2">
                <button className="flex w-full items-start gap-3 rounded-2xl p-3 text-left hover:bg-slate-50">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#eff6ff] text-[#2563eb]">
                    <PlayCircle size={16} />
                  </span>
                  <span>
                    <span className="block text-xs font-bold">Start guided lesson</span>
                    <span className="mt-1 block text-[11px] leading-4 text-slate-400">
                      Ask the tutor to teach any topic step by step
                    </span>
                  </span>
                </button>

                <Link
                  href={`/courses/${course.id}/practice`}
                  className="flex w-full items-start gap-3 rounded-2xl p-3 text-left hover:bg-slate-50"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#eff6ff] text-[#2563eb]">
                    <FileQuestion size={16} />
                  </span>
                  <span>
                    <span className="block text-xs font-bold">Practice questions</span>
                    <span className="mt-1 block text-[11px] leading-4 text-slate-400">
                      Generate a grounded quiz from your indexed PDFs
                    </span>
                  </span>
                </Link>

                <Link
                  href={`/courses/${course.id}/practice`}
                  className="flex w-full items-start gap-3 rounded-2xl p-3 text-left hover:bg-slate-50"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-950 text-white">
                    <BookOpen size={16} />
                  </span>
                  <span>
                    <span className="block text-xs font-bold">Mock exam</span>
                    <span className="mt-1 block text-[11px] leading-4 text-slate-400">
                      Create a 10-question exam and update topic mastery
                    </span>
                  </span>
                </Link>

                <div className="flex w-full items-start gap-3 rounded-2xl p-3 text-left opacity-65">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#eff6ff] text-[#2563eb]">
                    <Video size={16} />
                  </span>
                  <span>
                    <span className="block text-xs font-bold">Create video lesson</span>
                    <span className="mt-1 block text-[11px] leading-4 text-slate-400">
                      Planned after the core study and exam workflow
                    </span>
                  </span>
                </div>
              </div>
            </section>

            <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <div>
                <h2 className="font-bold">Course materials</h2>
                <p className="mt-1 text-[10px] text-slate-400">
                  Private PDFs indexed for this tutor
                </p>
              </div>
              <div className="mt-4">
                <CourseMaterials courseCode={course.code} />
              </div>
            </section>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
