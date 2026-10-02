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
    <main className="gradient-shell min-h-screen px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 font-bold tracking-tight">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#2563eb] text-white brand-shadow">
              <GraduationCap size={21} />
            </span>
            Academic AI
          </Link>

          <Link
            href={workspace.academicProfile ? "/dashboard" : "/"}
            className="flex items-center gap-2 text-sm font-semibold text-slate-500"
          >
            <ArrowLeft size={16} />
            {workspace.academicProfile ? "Dashboard" : "Back"}
          </Link>
        </div>

        <div className="mx-auto mt-12 max-w-4xl">
          <section className="rounded-[28px] border border-white bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur sm:p-9">
            <div className="flex items-start gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#eff6ff] text-[#2563eb]">
                <Sparkles size={20} />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[.18em] text-[#2563eb]">
                  Academic setup
                </p>
                <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
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
