"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowRight, GraduationCap, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const supabase = createClient();
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: name.trim() || email.split("@")[0] } },
        });
        if (error) throw error;
        if (!data.session) {
          setMessage("Account created. Check your email to confirm your address, then sign in.");
          setMode("signin");
        } else {
          router.push("/onboarding");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/dashboard");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed. Check your configuration and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="gradient-shell grid min-h-screen place-items-center px-5 py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="mx-auto flex w-fit items-center gap-3 font-bold tracking-tight">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#5b46e8] text-white brand-shadow"><GraduationCap size={21}/></span>
          Academic AI
        </Link>

        <section className="mt-8 rounded-[28px] border border-white bg-white/90 p-6 shadow-xl shadow-slate-200/70 backdrop-blur sm:p-8">
          <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1">
            <button onClick={() => { setMode("signup"); setMessage(null); }} className={`rounded-lg px-3 py-2.5 text-xs font-bold ${mode === "signup" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"}`}>Create account</button>
            <button onClick={() => { setMode("signin"); setMessage(null); }} className={`rounded-lg px-3 py-2.5 text-xs font-bold ${mode === "signin" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"}`}>Sign in</button>
          </div>

          <div className="mt-7">
            <p className="text-xs font-bold uppercase tracking-[.17em] text-[#5b46e8]">{mode === "signup" ? "Start learning" : "Welcome back"}</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight">{mode === "signup" ? "Create your academic workspace" : "Sign in to Academic AI"}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">{mode === "signup" ? "Set up your courses, upload your materials and get a tutor built around your university work." : "Continue your courses and study sessions."}</p>
          </div>

          <form onSubmit={submit} className="mt-7 space-y-4">
            {mode === "signup" && (
              <label className="block"><span className="mb-2 block text-xs font-bold text-slate-600">Your name</span><input required value={name} onChange={(e)=>setName(e.target.value)} placeholder="e.g. Tobi" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#7968ee]"/></label>
            )}
            <label className="block"><span className="mb-2 block text-xs font-bold text-slate-600">Email address</span><input required type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@university.edu" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#7968ee]"/></label>
            <label className="block"><span className="mb-2 block text-xs font-bold text-slate-600">Password</span><input required minLength={8} type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="At least 8 characters" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#7968ee]"/></label>
            {message && <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-800">{message}</p>}
            <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#5b46e8] px-5 py-3 text-sm font-bold text-white brand-shadow disabled:opacity-60">
              {loading ? <Loader2 size={16} className="animate-spin"/> : <ArrowRight size={16}/>} {mode === "signup" ? "Create account" : "Sign in"}
            </button>
          </form>

          <p className="mt-5 text-center text-[10px] leading-4 text-slate-400">By continuing, you agree to the platform terms and privacy policy that will be added before public launch.</p>
        </section>
      </div>
    </main>
  );
}
