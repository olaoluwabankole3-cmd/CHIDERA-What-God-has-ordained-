"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

type CourseDraft = {
  key: string;
  code: string;
  title: string;
  lecturer: string;
};

type InitialData = {
  university: string;
  faculty: string;
  department: string;
  level: string;
  semester: string;
  courses: Array<{
    code: string;
    title: string;
    lecturer: string | null;
  }>;
};

function newCourse(): CourseDraft {
  return { key: crypto.randomUUID(), code: "", title: "", lecturer: "" };
}

export function OnboardingForm({ initialData }: { initialData?: InitialData }) {
  const router = useRouter();
  const [university, setUniversity] = useState(initialData?.university || "");
  const [faculty, setFaculty] = useState(initialData?.faculty || "");
  const [department, setDepartment] = useState(initialData?.department || "");
  const [level, setLevel] = useState(initialData?.level || "100 Level");
  const [semester, setSemester] = useState(initialData?.semester || "Semester 1");
  const [courses, setCourses] = useState<CourseDraft[]>(
    initialData?.courses?.length
      ? initialData.courses.map((course) => ({
          key: crypto.randomUUID(),
          code: course.code,
          title: course.title,
          lecturer: course.lecturer || "",
        }))
      : [newCourse()],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateCourse(key: string, field: "code" | "title" | "lecturer", value: string) {
    setCourses((current) =>
      current.map((course) => (course.key === key ? { ...course, [field]: value } : course)),
    );
  }

  function removeCourse(key: string) {
    setCourses((current) => {
      if (current.length === 1) return current;
      return current.filter((course) => course.key !== key);
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          university,
          faculty,
          department,
          level,
          semester,
          courses: courses.map(({ code, title, lecturer }) => ({ code, title, lecturer })),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save your academic workspace.");

      router.replace("/dashboard");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not save your academic workspace.");
    } finally {
      setLoading(false);
    }
  }

  const fieldClass =
    "min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none transition focus:border-[#3b82f6] focus:ring-2 focus:ring-[#bfdbfe]/60 sm:text-sm";

  return (
    <form onSubmit={submit} className="mt-7 sm:mt-8">
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
        <label className="sm:col-span-2">
          <span className="mb-2 block text-xs font-bold text-slate-600">University</span>
          <input required value={university} onChange={(event) => setUniversity(event.target.value)} placeholder="e.g. University of Lagos" className={fieldClass} />
        </label>

        <label>
          <span className="mb-2 block text-xs font-bold text-slate-600">Faculty / College</span>
          <input value={faculty} onChange={(event) => setFaculty(event.target.value)} placeholder="e.g. Engineering" className={fieldClass} />
        </label>

        <label>
          <span className="mb-2 block text-xs font-bold text-slate-600">Department</span>
          <input required value={department} onChange={(event) => setDepartment(event.target.value)} placeholder="e.g. Computer Science" className={fieldClass} />
        </label>

        <label>
          <span className="mb-2 block text-xs font-bold text-slate-600">Level / Year</span>
          <select value={level} onChange={(event) => setLevel(event.target.value)} className={fieldClass}>
            <option>100 Level</option><option>200 Level</option><option>300 Level</option><option>400 Level</option><option>500 Level</option><option>Postgraduate</option>
          </select>
        </label>

        <label>
          <span className="mb-2 block text-xs font-bold text-slate-600">Current semester</span>
          <select value={semester} onChange={(event) => setSemester(event.target.value)} className={fieldClass}>
            <option>Semester 1</option><option>Semester 2</option><option>Semester 3</option>
          </select>
        </label>
      </div>

      <div className="mt-7 border-t border-slate-100 pt-6 sm:mt-8 sm:pt-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-sm font-black">Your current courses</h2>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              These become separate AI tutor workspaces. You can add more later.
            </p>
          </div>
          <button type="button" onClick={() => setCourses((current) => [...current, newCourse()])} className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-[#2563eb] sm:w-auto">
            <Plus size={15} /> Add course
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {courses.map((course, index) => (
            <div key={course.key} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-black uppercase tracking-[.15em] text-slate-400">Course {index + 1}</p>
                <button type="button" disabled={courses.length === 1} onClick={() => removeCourse(course.key)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-400 hover:bg-white hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30" aria-label={`Remove course ${index + 1}`}>
                  <Trash2 size={15} />
                </button>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-[.7fr_1.5fr_1fr]">
                <input required value={course.code} onChange={(event) => updateCourse(course.key, "code", event.target.value)} placeholder="Course code" className={fieldClass} />
                <input required value={course.title} onChange={(event) => updateCourse(course.key, "title", event.target.value)} placeholder="Course title" className={fieldClass} />
                <input value={course.lecturer} onChange={(event) => updateCourse(course.key, "lecturer", event.target.value)} placeholder="Lecturer (optional)" className={fieldClass} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-xs leading-5 text-red-700">{error}</p>}

      <div className="mt-7 sm:mt-8">
        <button disabled={loading} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2563eb] px-5 py-3 text-sm font-bold text-white brand-shadow disabled:opacity-60 sm:w-auto">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
          {initialData ? "Save academic workspace" : "Create academic workspace"}
        </button>
      </div>
    </form>
  );
}
