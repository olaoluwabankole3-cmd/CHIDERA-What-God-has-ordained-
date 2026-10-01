import { NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import { chunkPages, embedTexts, type PageText } from "@/lib/rag";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type ProcessRequest = {
  courseCode?: string;
  courseTitle?: string;
  lecturer?: string;
  storagePath?: string;
  title?: string;
  mimeType?: string;
  materialType?: string;
};

export async function POST(request: Request) {
  let materialId: string | null = null;

  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
      return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY is required to process course materials." }, { status: 503 });
    }

    const body = (await request.json()) as ProcessRequest;
    const courseCode = String(body.courseCode || "").trim();
    const courseTitle = String(body.courseTitle || "").trim();
    const storagePath = String(body.storagePath || "").trim();
    const title = String(body.title || "").trim();
    const mimeType = String(body.mimeType || "application/pdf");
    const materialType = String(body.materialType || "lecture_note");

    if (!courseCode || !courseTitle || !storagePath || !title) {
      return NextResponse.json({ error: "Course, file path and title are required." }, { status: 400 });
    }

    if (mimeType !== "application/pdf" || !storagePath.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF material is supported in this MVP." }, { status: 415 });
    }

    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    const user = authData.user;

    if (authError || !user) {
      return NextResponse.json({ error: "You must be signed in to process course materials." }, { status: 401 });
    }

    if (!storagePath.startsWith(`${user.id}/`)) {
      return NextResponse.json({ error: "That file does not belong to the signed-in user." }, { status: 403 });
    }

    await supabase.from("profiles").upsert(
      {
        id: user.id,
        display_name: user.user_metadata?.display_name || user.email?.split("@")[0] || "Student",
      },
      { onConflict: "id" },
    );

    const { data: course, error: courseError } = await supabase
      .from("courses")
      .upsert(
        {
          user_id: user.id,
          code: courseCode,
          title: courseTitle,
          lecturer: body.lecturer || null,
        },
        { onConflict: "user_id,code" },
      )
      .select("id, code, title")
      .single();

    if (courseError || !course) {
      throw courseError || new Error("Could not create or find the course.");
    }

    const { data: material, error: materialError } = await supabase
      .from("materials")
      .insert({
        user_id: user.id,
        course_id: course.id,
        title,
        material_type: materialType,
        storage_path: storagePath,
        mime_type: mimeType,
        status: "processing",
      })
      .select("id")
      .single();

    if (materialError || !material) {
      throw materialError || new Error("Could not create the material record.");
    }

    materialId = material.id;

    const { data: file, error: downloadError } = await supabase.storage
      .from("course-materials")
      .download(storagePath);

    if (downloadError || !file) {
      throw downloadError || new Error("Could not download the uploaded PDF.");
    }

    if (file.size > 20 * 1024 * 1024) {
      throw new Error("PDF exceeds the 20 MB processing limit.");
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const parser = new PDFParse({ data: bytes });
    const pages: PageText[] = [];

    try {
      const info = await parser.getInfo({ parsePageInfo: false });
      const totalPages = Number(info.total || 0);

      if (!totalPages) throw new Error("The PDF has no readable pages.");
      if (totalPages > 120) throw new Error("PDF exceeds the current 120-page MVP limit.");

      for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
        const page = await parser.getText({ partial: [pageNumber] });
        pages.push({ pageNumber, text: page.text || "" });
      }
    } finally {
      await parser.destroy();
    }

    const chunks = chunkPages(pages);
    if (chunks.length === 0) {
      throw new Error("No extractable text was found in this PDF.");
    }

    const embeddings = await embedTexts(chunks.map((chunk) => chunk.content));

    const rows = chunks.map((chunk, index) => ({
      material_id: material.id,
      course_id: course.id,
      user_id: user.id,
      chunk_index: chunk.chunkIndex,
      content: chunk.content,
      page_number: chunk.pageNumber,
      section_title: null,
      embedding: embeddings[index],
    }));

    for (let start = 0; start < rows.length; start += 100) {
      const { error: chunkError } = await supabase
        .from("material_chunks")
        .insert(rows.slice(start, start + 100));

      if (chunkError) throw chunkError;
    }

    const { error: readyError } = await supabase
      .from("materials")
      .update({
        status: "ready",
        page_count: pages.length,
      })
      .eq("id", material.id)
      .eq("user_id", user.id);

    if (readyError) throw readyError;

    return NextResponse.json({
      material: {
        id: material.id,
        title,
        pageCount: pages.length,
        chunkCount: chunks.length,
        status: "ready",
      },
    });
  } catch (error) {
    console.error("Material processing failed", error);

    if (materialId && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
      try {
        const supabase = await createClient();
        await supabase.from("materials").update({ status: "failed" }).eq("id", materialId);
      } catch {
        // The original processing error is more useful than a cleanup error.
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not process the PDF." },
      { status: 500 },
    );
  }
}
