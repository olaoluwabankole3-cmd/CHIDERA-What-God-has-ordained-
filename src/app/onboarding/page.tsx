import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, GraduationCap, Sparkles } from "lucide-react";

const steps = ["Academic profile", "Your courses", "Ready to learn"];
const suggestedCourses = [
  ["MTH 211", "Engineering Mathematics III"],
  ["MCE 213", "Thermodynamics I"],
  ["EEE 211", "Electrical Engineering Fundamentals"],
  ["GST 211", "Entrepreneurship"],
];

export default function OnboardingPage() {
  return (
    <main className="gradient-shell min-h-screen px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 font-bold tracking-tight">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#5b46e8] text-white brand-shadow"><GraduationCap size={21}/></span>
            Academic AI
          </Link>
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-slate-500"><ArrowLeft size={16}/> Back</Link>
        </div>

        <div className="mx-auto mt-12 max-w-3xl">
          <div className="mb-7 flex items-center justify-between gap-2">
            {steps.map((step, i) => (
              <div key={step} className="flex flex-1 items-center gap-2">
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${i === 0 ? "bg-[#5b46e8] text-white" : "bg-white text-slate-400 ring-1 ring-slate-200"}`}>{i === 0 ? <Check size={14}/> : i + 1}</span>
                <span className={`hidden text-xs font-semibold sm:block ${i === 0 ? "text-slate-900" : "text-slate-400"}`}>{step}</span>
                {i < steps.length - 1 && <span className="h-px flex-1 bg-slate-200"/>}
              </div>
            ))}
          </div>

          <section className="rounded-[28px] border border-white bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur sm:p-9">
            <div className="flex items-start gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#f0edff] text-[#5b46e8]"><Sparkles size={20}/></span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[.18em] text-[#5b46e8]">Step 1 of 3</p>
                <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Set up your academic profile</h1>
                <p className="mt-2 text-sm leading-6 text-slate-500">This gives your AI tutor the academic context it needs to organize your workspace.</p>
              </div>
            </div>

            <form className="mt-8 grid gap-5 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="mb-2 block text-xs font-bold text-slate-600">University</span>
                <select defaultValue="Covenant University" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#7968ee]">
                  <option>Covenant University</option>
                  <option>University of Lagos</option>
                  <option>University of Ibadan</option>
                  <option>Other university</option>
                </select>
              </label>
              <label>
                <span className="mb-2 block text-xs font-bold text-slate-600">Faculty / College</span>
                <input defaultValue="Engineering" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#7968ee]"/>
              </label>
              <label>
                <span className="mb-2 block text-xs font-bold text-slate-600">Department</span>
                <input defaultValue="Mechanical Engineering" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#7968ee]"/>
              </label>
              <label>
                <span className="mb-2 block text-xs font-bold text-slate-600">Level / Year</span>
                <select defaultValue="200 Level" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#7968ee]">
                  <option>100 Level</option><option>200 Level</option><option>300 Level</option><option>400 Level</option><option>500 Level</option>
                </select>
              </label>
              <label>
                <span className="mb-2 block text-xs font-bold text-slate-600">Current semester</span>
                <select defaultValue="Semester 1" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#7968ee]">
                  <option>Semester 1</option><option>Semester 2</option>
                </select>
              </label>
            </form>

            <div className="mt-8 border-t border-slate-100 pt-7">
              <p className="text-xs font-bold text-slate-600">Suggested courses for this demo</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {suggestedCourses.map(([code, title]) => (
                  <div key={code} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-[10px] font-black text-[#5b46e8] shadow-sm">{code.split(" ")[0]}</span>
                    <div className="min-w-0"><p className="text-xs font-bold">{code}</p><p className="truncate text-[11px] text-slate-400">{title}</p></div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-xl bg-[#5b46e8] px-5 py-3 text-sm font-bold text-white brand-shadow">Create workspace <ArrowRight size={16}/></Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
