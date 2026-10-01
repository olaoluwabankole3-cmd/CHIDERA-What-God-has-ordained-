import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Building2,
  FileUp,
  Layers3,
  Play,
  Plus,
  Sparkles,
  Video,
} from "lucide-react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getAcademicWorkspace } from "@/lib/academic";

const courseColorClasses = [
  "bg-[#f0edff] text-[#5b46e8]",
  "bg-amber-50 text-amber-700",
  "bg-sky-50 text-sky-700",
  "bg-emerald-50 text-emerald-700",
  "bg-rose-50 text-rose-700",
  "bg-cyan-50 text-cyan-700",
];

export default async function DashboardPage() {
  const workspace = await getAcademicWorkspace();
  if (!workspace) redirect("/auth");
  if (!workspace.academicProfile || workspace.courses.length === 0) redirect("/onboarding");

  const profile = workspace.academicProfile;
  const primaryCourse =
    [...workspace.courses].sort((a, b) => {
      if (a.trackedTopics === 0 && b.trackedTopics > 0) return -1;
      if (a.trackedTopics > 0 && b.trackedTopics === 0) return 1;
      return a.progress - b.progress;
    })[0] || workspace.courses[0];

  const meta = `${profile.level} · ${profile.department}`;

  return (
    <AppShell studentName={workspace.name} studentMeta={meta}>
      <div className="mx-auto max-w-[1420px] px-5 py-6 sm:px-8 lg:px-10 lg:py-9">
        <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-slate-400">
              {profile.department} · {profile.level}
            </p>
            <h1 className="mt-1 text-3xl font-black tracking-tight">
              Welcome back, {workspace.name}.
            </h1>
          </div>

          <div className="flex gap-2">
            <Link
              href={`/courses/${primaryCourse.id}`}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm"
            >
              <FileUp size={16} /> Upload material
            </Link>
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 rounded-xl bg-[#5b46e8] px-4 py-2.5 text-sm font-semibold text-white brand-shadow"
            >
              <Plus size={16} /> Add course
            </Link>
          </div>
        </header>

        <section className="mt-8 grid gap-4 xl:grid-cols-[1.6fr_.8fr]">
          <div className="overflow-hidden rounded-[26px] bg-slate-950 p-6 text-white sm:p-8">
            <div className="flex h-full flex-col justify-between gap-8 sm:flex-row sm:items-center">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-violet-200">
                  <Sparkles size={13} /> Your next study session
                </div>
                <p className="mt-5 text-xs font-bold uppercase tracking-[.18em] text-violet-300">
                  {primaryCourse.code} · {primaryCourse.title}
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                  {primaryCourse.trackedTopics > 0
                    ? "Keep building course mastery"
                    : "Start learning with your AI tutor"}
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
                  {primaryCourse.readyMaterials > 0
                    ? `Your tutor can already search ${primaryCourse.readyMaterials} indexed material${primaryCourse.readyMaterials === 1 ? "" : "s"} for this course.`
                    : "Open the course workspace, upload your lecturer's PDF notes, or begin with a guided explanation."}
                </p>
                <Link
                  href={`/courses/${primaryCourse.id}`}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-950"
                >
                  <Play size={15} fill="currentColor" /> Open course
                </Link>
              </div>

              <div className="grid h-32 w-32 shrink-0 place-items-center rounded-full border-[10px] border-white/10 bg-white/5">
                <div className="text-center">
                  <p className="text-3xl font-black">{primaryCourse.progress}%</p>
                  <p className="text-[10px] text-slate-400">
                    {primaryCourse.trackedTopics > 0 ? "mastery" : "not tracked yet"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Workspace snapshot</h2>
              <Layers3 size={18} className="text-[#5b46e8]" />
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              <div>
                <p className="text-3xl font-black tracking-tight">{workspace.courses.length}</p>
                <p className="mt-1 text-[11px] text-slate-400">courses</p>
              </div>
              <div>
                <p className="text-3xl font-black tracking-tight">{workspace.totalMaterials}</p>
                <p className="mt-1 text-[11px] text-slate-400">materials</p>
              </div>
              <div>
                <p className="text-3xl font-black tracking-tight">{workspace.totalTrackedTopics}</p>
                <p className="mt-1 text-[11px] text-slate-400">topics tracked</p>
              </div>
            </div>

            <p className="mt-6 text-xs leading-5 text-slate-400">
              Mastery begins updating as assessment and topic-tracking features collect real evidence from your study sessions.
            </p>
          </div>
        </section>

        <section className="mt-9">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black tracking-tight">Your courses</h2>
              <p className="mt-1 text-sm text-slate-400">
                {profile.semester} · {profile.university}
              </p>
            </div>
            <Link href="/onboarding" className="text-sm font-semibold text-[#5b46e8]">
              Manage courses
            </Link>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {workspace.courses.map((course, index) => (
              <Link
                key={course.id}
                href={`/courses/${course.id}`}
                className="group rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <span
                    className={`grid h-10 w-10 place-items-center rounded-xl text-xs font-black ${
                      courseColorClasses[index % courseColorClasses.length]
                    }`}
                  >
                    {course.code.split(" ")[0].slice(0, 4)}
                  </span>
                  <ArrowRight
                    size={16}
                    className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#5b46e8]"
                  />
                </div>

                <p className="mt-5 text-xs font-bold text-[#5b46e8]">{course.code}</p>
                <h3 className="mt-1 min-h-12 font-bold leading-5">{course.title}</h3>

                <div className="mt-5 flex items-center justify-between text-[11px] text-slate-400">
                  <span>
                    {course.trackedTopics > 0 ? `${course.progress}% mastery` : "New course"}
                  </span>
                  <span>{course.materials} materials</span>
                </div>

                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-[#5b46e8]"
                    style={{ width: `${course.progress}%` }}
                  />
                </div>

                <p className="mt-4 truncate text-xs text-slate-500">
                  {course.lecturer ? (
                    <>
                      Lecturer: <span className="font-semibold text-slate-700">{course.lecturer}</span>
                    </>
                  ) : (
                    <span className="text-slate-400">No lecturer added</span>
                  )}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-9 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-bold">Quick actions</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Link
                href={`/courses/${primaryCourse.id}`}
                className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left hover:border-[#d8d1ff] hover:bg-[#faf9ff]"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-[#5b46e8] shadow-sm">
                  <BrainCircuit size={17} />
                </span>
                <span>
                  <span className="block text-sm font-bold">Ask your AI tutor</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-400">
                    Open a course-aware learning session
                  </span>
                </span>
              </Link>

              <Link
                href={`/courses/${primaryCourse.id}`}
                className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left hover:border-[#d8d1ff] hover:bg-[#faf9ff]"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-[#5b46e8] shadow-sm">
                  <FileUp size={17} />
                </span>
                <span>
                  <span className="block text-sm font-bold">Upload notes</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-400">
                    Index a PDF for grounded tutoring
                  </span>
                </span>
              </Link>

              <Link
                href={`/courses/${primaryCourse.id}/practice`}
                className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left hover:border-[#d8d1ff] hover:bg-[#faf9ff]"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-[#5b46e8] shadow-sm">
                  <BookOpen size={17} />
                </span>
                <span>
                  <span className="block text-sm font-bold">Practice exam</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-400">
                    Generate quizzes and mock exams from your materials
                  </span>
                </span>
              </Link>

              <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 opacity-70">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-[#5b46e8] shadow-sm">
                  <Video size={17} />
                </span>
                <span>
                  <span className="block text-sm font-bold">Create lesson video</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-400">
                    Planned after the core study loop is complete
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Academic profile</h2>
              <Building2 size={18} className="text-slate-400" />
            </div>

            <div className="mt-5 space-y-4 text-sm">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.13em] text-slate-400">
                  University
                </p>
                <p className="mt-1 font-semibold">{profile.university}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[.13em] text-slate-400">
                    Department
                  </p>
                  <p className="mt-1 font-semibold">{profile.department}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[.13em] text-slate-400">
                    Level
                  </p>
                  <p className="mt-1 font-semibold">{profile.level}</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[.13em] text-slate-400">
                    Faculty
                  </p>
                  <p className="mt-1 font-semibold">{profile.faculty || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[.13em] text-slate-400">
                    Semester
                  </p>
                  <p className="mt-1 font-semibold">{profile.semester}</p>
                </div>
              </div>
            </div>

            <Link
              href="/onboarding"
              className="mt-6 inline-flex items-center gap-2 text-xs font-bold text-[#5b46e8]"
            >
              Edit academic profile <ArrowRight size={13} />
            </Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
