"use client";

import { ChangeEvent, useRef, useState } from "react";
import { CheckCircle2, FileUp, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  courseCode: string;
  courseTitle: string;
  lecturer?: string;
};

function safeFileName(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(-120);
}

export function MaterialUploader({ courseCode, courseTitle, lecturer }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<"idle" | "uploading" | "processing" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ title: string; pageCount: number; chunkCount: number } | null>(null);

  const busy = stage === "uploading" || stage === "processing";

  function reset() {
    setStage("idle");
    setError(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function close() {
    if (busy) return;
    setOpen(false);
    setTimeout(reset, 150);
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setResult(null);

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please choose a PDF file.");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setError("This PDF is larger than the current 20 MB limit.");
      return;
    }

    let storagePath: string | null = null;

    try {
      const supabase = createClient();
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError || !authData.user) {
        throw new Error("Please sign in before uploading course material.");
      }

      setStage("uploading");

      const courseFolder = courseCode.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const filename = safeFileName(file.name) || "material.pdf";
      storagePath = `${authData.user.id}/${courseFolder}/${crypto.randomUUID()}-${filename}`;

      const { error: uploadError } = await supabase.storage
        .from("course-materials")
        .upload(storagePath, file, {
          contentType: "application/pdf",
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      setStage("processing");

      const response = await fetch("/api/materials/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseCode,
          courseTitle,
          lecturer,
          storagePath,
          title: file.name,
          mimeType: "application/pdf",
          materialType: "lecture_note",
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The PDF could not be processed.");

      setResult(data.material);
      setStage("done");
      window.dispatchEvent(new CustomEvent("academic-ai:material-uploaded", { detail: { courseCode } }));
      router.refresh();
    } catch (uploadError) {
      setStage("idle");
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");

      if (storagePath) {
        try {
          const supabase = createClient();
          await supabase.storage.from("course-materials").remove([storagePath]);
        } catch {
          // Best-effort cleanup only.
        }
      }
    }
  }

  return (
    <>
      <button
        onClick={() => {
          reset();
          setOpen(true);
        }}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:border-[#cfc7ff]"
      >
        <FileUp size={16} /> Upload PDF
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[26px] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[.16em] text-[#5b46e8]">{courseCode}</p>
                <h2 className="mt-1 text-xl font-black tracking-tight">Add course material</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Upload a PDF and Academic AI will index its text page-by-page for grounded tutoring.
                </p>
              </div>
              <button
                onClick={close}
                disabled={busy}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500 disabled:opacity-40"
                aria-label="Close uploader"
              >
                <X size={17} />
              </button>
            </div>

            {stage === "done" && result ? (
              <div className="mt-7 rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
                <div className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={21} />
                  <div>
                    <p className="text-sm font-bold text-emerald-900">Material is ready for the tutor</p>
                    <p className="mt-1 break-words text-xs leading-5 text-emerald-800">{result.title}</p>
                    <p className="mt-2 text-[11px] font-semibold text-emerald-700">
                      {result.pageCount} pages · {result.chunkCount} searchable chunks
                    </p>
                  </div>
                </div>
                <button onClick={close} className="mt-5 w-full rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white">
                  Done
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => inputRef.current?.click()}
                  className="mt-7 flex min-h-44 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 text-center transition hover:border-[#9c8ff5] hover:bg-[#faf9ff] disabled:cursor-wait"
                >
                  {busy ? (
                    <>
                      <Loader2 size={28} className="animate-spin text-[#5b46e8]" />
                      <p className="mt-4 text-sm font-bold">{stage === "uploading" ? "Uploading securely…" : "Reading and indexing your PDF…"}</p>
                      <p className="mt-2 text-xs leading-5 text-slate-400">
                        {stage === "processing"
                          ? "Extracting pages, chunking text and creating semantic embeddings."
                          : "Your file is going into your private course storage."}
                      </p>
                    </>
                  ) : (
                    <>
                      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f0edff] text-[#5b46e8]"><FileUp size={21} /></span>
                      <p className="mt-4 text-sm font-bold">Choose a PDF</p>
                      <p className="mt-2 text-xs text-slate-400">Up to 20 MB · maximum 120 pages for this MVP</p>
                    </>
                  )}
                </button>

                <input ref={inputRef} onChange={handleFile} type="file" accept="application/pdf,.pdf" className="hidden" />

                {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-xs leading-5 text-red-700">{error}</p>}

                <p className="mt-5 text-[10px] leading-4 text-slate-400">
                  Uploaded course documents stay in a private Supabase bucket and are restricted by the signed-in user’s storage policy.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
