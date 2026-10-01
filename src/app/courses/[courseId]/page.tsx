import Link from "next/link";
import { ArrowLeft, BookOpen, FileQuestion, MoreHorizontal, PlayCircle, Sparkles, Target, Video } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { CourseMaterials } from "@/components/course-materials";
import { CourseTutor } from "@/components/course-tutor";
import { MaterialUploader } from "@/components/material-uploader";
import { courses } from "@/lib/mock-data";

export default async function CoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const course = courses.find((item) => item.id === courseId) ?? courses[0];

  return (
    <AppShell>
      <div className="mx-auto max-w-[1420px] px-5 py-6 sm:px-8 lg:px-10 lg:py-9">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-700">
          <ArrowLeft size={14} /> Back to dashboard
        </Link>

        <div className="mt-5 flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-[#f0edff] px-2.5 py-1 text-xs font-black text-[#5b46e8]">{course.code}</span>
              {course.upcoming && <span className="text-xs font-semibold text-amber-600">{course.upcoming}</span>}
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight">{course.title}</h1>
            <p className="mt-2 text-sm text-slate-400">
              {course.lecturer ? `${course.lecturer} · ` : ""}AI tutor, course materials and exam preparation
            </p>
          </div>

          <div className="flex gap-2">
            <MaterialUploader courseCode={course.code} courseTitle={course.title} lecturer={course.lecturer} />
            <button className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500" aria-label="More course options">
              <MoreHorizontal size={18} />
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-5 xl:grid-cols-[1.45fr_.65fr]">
          <CourseTutor courseCode={course.code} courseTitle={course.title} />

          <aside className="space-y-5">
            <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="font-bold">Course mastery</h2>
                <Target size={17} className="text-[#5b46e8]" />
              </div>
              <div className="mt-5 flex items-end gap-2">
                <span className="text-4xl font-black">{course.progress}%</span>
                <span className="pb-1 text-xs font-semibold text-slate-400">overall</span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-[#5b46e8]" style={{ width: `${course.progress}%` }} />
              </div>
              <div className="mt-5 space-y-3 text-xs">
                {[
                  ["Foundations", 92],
                  ["Current topic", 64],
                  ["Exam readiness", 58],
                ].map(([label, value]) => (
                  <div key={String(label)} className="flex items-center justify-between">
                    <span className="text-slate-500">{label}</span>
                    <b>{value}%</b>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="font-bold">Study tools</h2>
                <Sparkles size={17} className="text-[#5b46e8]" />
              </div>
              <div className="mt-4 space-y-2">
                {[
                  [PlayCircle, "Start guided lesson", "Learn the next topic interactively"],
                  [FileQuestion, "Practice questions", "Generate course-specific questions"],
                  [BookOpen, "Mock exam", "Test yourself under exam conditions"],
                  [Video, "Create video lesson", "Turn your notes into a lesson"],
                ].map(([Icon, title, text]) => {
                  const I = Icon as typeof PlayCircle;
                  return (
                    <button key={String(title)} className="flex w-full items-start gap-3 rounded-2xl p-3 text-left hover:bg-slate-50">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#f7f5ff] text-[#5b46e8]">
                        <I size={16} />
                      </span>
                      <span>
                        <span className="block text-xs font-bold">{String(title)}</span>
                        <span className="mt-1 block text-[11px] leading-4 text-slate-400">{String(text)}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold">Course materials</h2>
                  <p className="mt-1 text-[10px] text-slate-400">Private PDFs indexed for this tutor</p>
                </div>
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
