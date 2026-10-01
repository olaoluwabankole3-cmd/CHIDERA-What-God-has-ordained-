import Link from "next/link";
import { ArrowRight, BookOpen, BrainCircuit, FileText, GraduationCap, Sparkles, Video } from "lucide-react";

const features = [
  { icon: BrainCircuit, title: "Course-aware AI tutor", text: "Learn through real conversations with an AI that understands your course context and materials." },
  { icon: FileText, title: "Your notes become knowledge", text: "Upload lecture notes, slides, past questions and course outlines to build a private course knowledge base." },
  { icon: BookOpen, title: "Exam preparation", text: "Generate revision sessions, quizzes, mock exams and focused practice based on your weak areas." },
  { icon: Video, title: "Lecture video generation", text: "Turn course notes into structured teaching videos, summaries and visual explanations." },
];

export default function HomePage() {
  return (
    <main className="gradient-shell min-h-screen overflow-hidden">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 font-bold tracking-tight">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#5b46e8] text-white brand-shadow"><GraduationCap size={21} /></span>
          Academic AI
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/auth" className="hidden rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 sm:block">Sign in</Link>
          <Link href="/auth" className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white">Get started</Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-14 px-6 pb-24 pt-14 lg:grid-cols-[1.03fr_.97fr] lg:px-8 lg:pb-32 lg:pt-24">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#dad4ff] bg-white/70 px-3 py-1.5 text-xs font-semibold text-[#523dd7]">
            <Sparkles size={14} /> Built for university learning
          </div>
          <h1 className="max-w-3xl text-5xl font-black leading-[1.04] tracking-[-0.045em] text-slate-950 sm:text-6xl lg:text-7xl">
            Your university courses, with an <span className="text-[#5b46e8]">AI tutor</span> beside you.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-600">
            Academic AI learns your degree, courses and lecture materials, then helps you understand difficult topics, revise intelligently and prepare for exams.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/auth" className="inline-flex items-center gap-2 rounded-2xl bg-[#5b46e8] px-6 py-3.5 text-sm font-bold text-white brand-shadow">
              Create your academic workspace <ArrowRight size={17} />
            </Link>
            <Link href="/dashboard" className="rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-slate-700 shadow-sm">View demo</Link>
          </div>
          <p className="mt-5 text-xs text-slate-400">MVP preview · No credit card required</p>
        </div>

        <div className="relative">
          <div className="absolute -left-6 top-16 h-40 w-40 rounded-full bg-[#8b7cf6]/20 blur-3xl" />
          <div className="glass relative rounded-[30px] p-4 sm:p-6">
            <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <p className="text-xs font-semibold text-[#5b46e8]">MTH 211</p>
                  <h3 className="mt-1 font-bold">Engineering Mathematics III</h3>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">72% mastery</span>
              </div>
              <div className="mt-5 rounded-2xl bg-[#f7f5ff] p-4">
                <p className="text-xs font-semibold text-[#5b46e8]">AI TUTOR</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-800">Let’s continue Laplace Transforms. Would you like a quick recap or should we solve an exam-style problem?</p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <button className="rounded-xl border border-[#ded8ff] bg-white px-3 py-2.5 text-left text-xs font-semibold text-[#523dd7]">Give me a recap</button>
                  <button className="rounded-xl border border-[#ded8ff] bg-white px-3 py-2.5 text-left text-xs font-semibold text-[#523dd7]">Start a problem</button>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[['8','Materials'],['23','Questions'],['6 days','Next test']].map(([value,label]) => (
                  <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-sm font-bold">{value}</p><p className="mt-1 text-[11px] text-slate-400">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200/80 bg-white/70">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <p className="text-center text-sm font-bold uppercase tracking-[.2em] text-slate-400">One academic workspace</p>
          <h2 className="mx-auto mt-4 max-w-2xl text-center text-3xl font-black tracking-tight sm:text-4xl">From lecture notes to exam confidence.</h2>
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {features.map(({icon: Icon,title,text}) => (
              <article key={title} className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f0edff] text-[#5b46e8]"><Icon size={19}/></span>
                <h3 className="mt-5 font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
