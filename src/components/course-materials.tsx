"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText, Loader2 } from "lucide-react";

type Material = {
  id: string;
  title: string;
  material_type: string;
  status: "uploaded" | "processing" | "ready" | "failed";
  page_count: number | null;
  created_at: string;
};

export function CourseMaterials({ courseCode }: { courseCode: string }) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/materials?courseCode=${encodeURIComponent(courseCode)}`, {
        cache: "no-store",
      });

      if (!response.ok) return;
      const data = await response.json();
      setMaterials(Array.isArray(data.materials) ? data.materials : []);
    } finally {
      setLoading(false);
    }
  }, [courseCode]);

  useEffect(() => {
    void load();

    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ courseCode?: string }>;
      if (!custom.detail?.courseCode || custom.detail.courseCode === courseCode) void load();
    };

    window.addEventListener("academic-ai:material-uploaded", handler);
    return () => window.removeEventListener("academic-ai:material-uploaded", handler);
  }, [courseCode, load]);

  if (loading) {
    return <div className="flex items-center gap-2 py-4 text-xs text-slate-400"><Loader2 size={14} className="animate-spin" /> Loading your materials…</div>;
  }

  if (materials.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center">
        <p className="text-xs font-bold text-slate-600">No indexed PDFs yet</p>
        <p className="mt-1 text-[11px] leading-4 text-slate-400">Upload a lecture note above and it will appear here when processing finishes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {materials.map((material) => (
        <div key={material.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-red-50 text-red-500"><FileText size={14} /></span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-bold">{material.title}</p>
            <p className="mt-0.5 text-[10px] text-slate-400">
              {material.status === "ready"
                ? `${material.page_count || 0} pages · ready for tutor`
                : material.status === "failed"
                  ? "Processing failed"
                  : "Processing…"}
            </p>
          </div>
          <span className={`h-2 w-2 shrink-0 rounded-full ${material.status === "ready" ? "bg-emerald-500" : material.status === "failed" ? "bg-red-500" : "bg-amber-400"}`} />
        </div>
      ))}
    </div>
  );
}
