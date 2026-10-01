import Link from "next/link";
import { BookOpen, BrainCircuit, CalendarDays, GraduationCap, Home, Library, Settings } from "lucide-react";

const nav = [
  { href: "/dashboard", label: "Overview", icon: Home },
  { href: "/dashboard", label: "My courses", icon: BookOpen },
  { href: "/dashboard", label: "AI tutor", icon: BrainCircuit },
  { href: "/dashboard", label: "Library", icon: Library },
  { href: "/dashboard", label: "Study plan", icon: CalendarDays },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f6f7fb] text-slate-900 lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="hidden min-h-screen border-r border-slate-200 bg-white px-5 py-7 lg:flex lg:flex-col">
        <Link href="/" className="flex items-center gap-3 px-2">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#5b46e8] text-white brand-shadow">
            <GraduationCap size={21} />
          </span>
          <div>
            <p className="text-[17px] font-bold tracking-tight">Academic AI</p>
            <p className="text-[11px] text-slate-400">Study smarter</p>
          </div>
        </Link>

        <nav className="mt-10 space-y-1.5">
          {nav.map((item, index) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition ${index === 0 ? "bg-[#f0edff] text-[#523dd7]" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto">
          <Link href="/dashboard" className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-slate-500 hover:bg-slate-50">
            <Settings size={18} /> Settings
          </Link>
          <div className="mt-4 flex items-center gap-3 border-t border-slate-100 px-2 pt-5">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-900 text-sm font-semibold text-white">S</div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Samuel</p>
              <p className="truncate text-xs text-slate-400">200 Level · Engineering</p>
            </div>
          </div>
        </div>
      </aside>
      <main className="min-w-0">{children}</main>
    </div>
  );
}
