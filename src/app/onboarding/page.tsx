import Link from "next/link";
import { ArrowLeft, GraduationCap, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/onboarding-form";
import { getAcademicWorkspace } from "@/lib/academic";

export default async function OnboardingPage() {
  const workspace = await getAcademicWorkspace();
  if (!workspace) redirect("/auth");

  const initialData = workspace.academicProfile
    ? {
        university: workspace.academicProfile.university,
        faculty: workspace.academicProfile.faculty || "",
        department: workspace.academicProfile.department,
        level: workspace.academicProfile.level,
        semester: workspace.academicProfile.semester,
        courses: workspace.courses.map((course) => ({
          code: course.code,
          title: course.title,
          lecturer: course.lecturer,
        })),
      }
    : undefined;

  return (
    <main className="gradient-shell min-h-screen px-4 py-5 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="flex min-w-0 items-center gap-2.5 font-bold tracking-tight">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#2563eb] text-white brand-shadow sm:h-10 sm:w-10 sm:rounded-2xl">
              <GraduationCap size={19} />
            </span>
            <span className="truncate">Academic AI</span>
          </Link>

          <Link
            href={workspace.academicProfile ? "/dashboard" : "/"}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-500 hover:bg-white/70 sm:px-3 sm:text-sm"
          >
            <ArrowLeft size={15} />
            <span>{workspace.academicProfile ? "Dashboard" : "Back"}</span>
          </Link>
        </div>

        <div className="mx-auto mt-7 max-w-4xl sm:mt-12">
          <section className="rounded-[24px] border border-white bg-white/90 p-4 shadow-xl shadow-slate-200/60 backdrop-blur sm:rounded-[28px] sm:p-9">
            <div className="flex items-start gap-3 sm:gap-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eff6ff] text-[#2563eb] sm:h-11 sm:w-11 sm:rounded-2xl">
                <Sparkles size={19} />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#2563eb] sm:text-xs sm:tracking-[.18em]">
                  Academic setup
                </p>
                <h1 className="mt-1 text-[22px] font-black leading-tight tracking-tight sm:text-3xl">
                  {workspace.academicProfile
                    ? "Update your academic workspace"
                    : "Build your academic workspace"}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  Your university, department, level and current courses are stored in your account
                  and used to organize your tutors, materials and exam preparation.
                </p>
              </div>
            </div>

            <OnboardingForm initialData={initialData} />
          </section>
        </div>
      </div>
    </main>
  );
}
