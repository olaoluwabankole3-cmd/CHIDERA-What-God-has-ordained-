import Link from "next/link";
import { ArrowRight, BookOpen, BrainCircuit, CalendarClock, FileUp, Flame, Play, Plus, Sparkles, Video } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { courses, profile } from "@/lib/mock-data";

export default function DashboardPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-[1420px] px-5 py-6 sm:px-8 lg:px-10 lg:py-9">
        <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-slate-400">{profile.department} · {profile.level}</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight">Good evening, {profile.name}.</h1>
          </div>
          <div className="flex gap-2">
            <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm"><FileUp size={16}/> Upload material</button>
            <button className="inline-flex items-center gap-2 rounded-xl bg-[#5b46e8] px-4 py-2.5 text-sm font-semibold text-white brand-shadow"><Plus size={16}/> Add course</button>
          </div>
        </header>

        <section className="mt-8 grid gap-4 xl:grid-cols-[1.6fr_.8fr]">
          <div className="overflow-hidden rounded-[26px] bg-slate-950 p-6 text-white sm:p-8">
            <div className="flex h-full flex-col justify-between gap-8 sm:flex-row sm:items-center">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-violet-200"><Sparkles size={13}/> Recommended next</div>
                <p className="mt-5 text-xs font-bold uppercase tracking-[.18em] text-violet-300">MTH 211 · Engineering Mathematics III</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Continue Laplace Transforms</h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">You completed the fundamentals. Continue with inverse transforms and two exam-style problems.</p>
                <Link href="/courses/mth-211" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-950"><Play size={15} fill="currentColor"/> Continue lesson</Link>
              </div>
              <div className="grid h-32 w-32 shrink-0 place-items-center rounded-full border-[10px] border-white/10 bg-white/5">
                <div className="text-center"><p className="text-3xl font-black">72%</p><p className="text-[10px] text-slate-400">mastery</p></div>
              </div>
            </div>
          </div>

          <div className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between"><h2 className="font-bold">Study momentum</h2><Flame size={18} className="text-orange-500"/></div>
            <div className="mt-6 flex items-end gap-3"><span className="text-4xl font-black tracking-tight">5</span><span className="pb-1 text-sm text-slate-400">day streak</span></div>
            <div className="mt-5 grid grid-cols-7 gap-2">
              {[1,1,1,1,1,0,0].map((active,i)=><div key={i} className={`h-9 rounded-lg ${active ? "bg-[#5b46e8]" : "bg-slate-100"}`}/>)}
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-400">42 minutes studied today · 3 topics reviewed</p>
          </div>
        </section>

        <section className="mt-9">
          <div className="flex items-center justify-between">
            <div><h2 className="text-xl font-black tracking-tight">Your courses</h2><p className="mt-1 text-sm text-slate-400">{profile.semester} · {profile.university}</p></div>
            <button className="text-sm font-semibold text-[#5b46e8]">View all</button>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {courses.map((course, index) => (
              <Link key={course.id} href={`/courses/${course.id}`} className="group rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-start justify-between">
                  <span className={`grid h-10 w-10 place-items-center rounded-xl text-xs font-black ${index===0?"bg-[#f0edff] text-[#5b46e8]":index===1?"bg-amber-50 text-amber-700":index===2?"bg-sky-50 text-sky-700":"bg-emerald-50 text-emerald-700"}`}>{course.code.split(" ")[0]}</span>
                  <ArrowRight size={16} className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#5b46e8]"/>
                </div>
                <p className="mt-5 text-xs font-bold text-[#5b46e8]">{course.code}</p>
                <h3 className="mt-1 min-h-12 font-bold leading-5">{course.title}</h3>
                <div className="mt-5 flex items-center justify-between text-[11px] text-slate-400"><span>{course.progress}% mastery</span><span>{course.materials} materials</span></div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#5b46e8]" style={{width:`${course.progress}%`}}/></div>
                <p className="mt-4 truncate text-xs text-slate-500">Next: <span className="font-semibold text-slate-700">{course.nextTopic}</span></p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-9 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-bold">Quick actions</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                [BrainCircuit,"Ask your AI tutor","Start a course-aware learning session"],
                [FileUp,"Upload notes","Add PDFs, slides and course material"],
                [BookOpen,"Practice exam","Generate questions from your courses"],
                [Video,"Create lesson video","Turn notes into a visual lesson"],
              ].map(([Icon,title,text]) => {
                const I = Icon as typeof BrainCircuit;
                return <button key={String(title)} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left hover:border-[#d8d1ff] hover:bg-[#faf9ff]"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-[#5b46e8] shadow-sm"><I size={17}/></span><span><span className="block text-sm font-bold">{String(title)}</span><span className="mt-1 block text-xs leading-5 text-slate-400">{String(text)}</span></span></button>
              })}
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between"><h2 className="font-bold">Upcoming</h2><CalendarClock size={18} className="text-slate-400"/></div>
            <div className="mt-5 space-y-3">
              {[
                ["08","OCT","MTH 211 Test","Laplace Transforms + Fourier Series"],
                ["10","OCT","MCE 213 Assignment","Entropy problem set"],
                ["14","OCT","EEE 211 Quiz","AC circuit analysis"],
              ].map(([day,month,title,text]) => <div key={title} className="flex items-center gap-4 rounded-2xl border border-slate-100 p-3"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-slate-950 text-center text-white"><span><b className="block text-sm leading-4">{day}</b><small className="text-[9px] text-slate-400">{month}</small></span></div><div><p className="text-sm font-bold">{title}</p><p className="mt-1 text-xs text-slate-400">{text}</p></div></div>)}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
