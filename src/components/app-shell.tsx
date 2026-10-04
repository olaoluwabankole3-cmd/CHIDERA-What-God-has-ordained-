import Link from "next/link";
import {
  BookOpen, BrainCircuit, BarChart3, CalendarDays, GraduationCap, Home, Library, Settings,
} from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";

const nav = [
  { href: "/dashboard", label: "Overview", icon: Home },
  { href: "/dashboard", label: "My courses", icon: BookOpen },
  { href: "/dashboard", label: "AI tutor", icon: BrainCircuit },
  { href: "/dashboard", label: "Library", icon: Library },
  { href: "/study-plan", label: "Study plan", icon: CalendarDays },
  { href: "/progress", label: "Progress", icon: BarChart3 },
];

type Props = { children: React.ReactNode; studentName: string; studentMeta: string };

export function AppShell({ children, studentName, studentMeta }: Props) {
  const initial = studentName.trim().charAt(0).toUpperCase() || "S";

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-slate-900 lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="hidden min-h-screen border-r border-slate-200 bg-white px-5 py-7 lg:flex lg:flex-col">
        <Link href="/" className="flex items-center gap-3 px-2">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#2563eb] text-white brand-shadow"><GraduationCap size={21} /></span>
          <div><p className="text-[17px] font-bold tracking-tight">Academic AI</p><p className="text-[11px] text-slate-400">Study smarter</p></div>
        </Link>
        <nav className="mt-10 space-y-1.5">
          {nav.map((item, index) => { const Icon = item.icon; return (
            <Link key={item.label} href={item.href} className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition ${index === 0 ? "bg-[#eff6ff] text-[#1d4ed8]" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}>
              <Icon size={18} />{item.label}
            </Link>
          );})}
        </nav>
        <div className="mt-auto">
          <Link href="/onboarding" className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900"><Settings size={18} /> Academic settings</Link>
          <SignOutButton />
          <div className="mt-4 flex items-center gap-3 border-t border-slate-100 px-2 pt-5">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-900 text-sm font-semibold text-white">{initial}</div>
            <div className="min-w-0"><p className="truncate text-sm font-semibold">{studentName}</p><p className="truncate text-xs text-slate-400">{studentMeta}</p></div>
          </div>
        </div>
      </aside>

      <main className="min-w-0 pb-20 lg:pb-0">
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#2563eb] text-white"><GraduationCap size={18} /></span>
            <span className="truncate text-sm font-bold">Academic AI</span>
          </Link>
          <Link href="/onboarding" className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-50" aria-label="Academic settings"><Settings size={18} /></Link>
        </div>
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-slate-200 bg-white/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] backdrop-blur lg:hidden">
        {[
          { href: "/dashboard", label: "Home", icon: Home },
          { href: "/dashboard", label: "Courses", icon: BookOpen },
          { href: "/dashboard", label: "AI Tutor", icon: BrainCircuit },
          { href: "/progress", label: "Progress", icon: BarChart3 },
        ].map((item, index) => { const Icon = item.icon; return (
          <Link key={item.label} href={item.href} className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-semibold ${index === 0 ? "text-[#2563eb]" : "text-slate-400"}`}>
            <Icon size={18} />{item.label}
          </Link>
        );})}
      </nav>
    </div>
  );
}
