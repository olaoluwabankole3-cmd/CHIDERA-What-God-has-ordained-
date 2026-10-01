import OpenAI from "openai";
import { NextResponse } from "next/server";
import { embedQuery } from "@/lib/rag";
import { createClient } from "@/lib/supabase/server";

type ChatMessage = { role: "user" | "assistant"; content: string };

type RetrievedChunk = {
  id: number;
  material_id: string;
  content: string;
  page_number: number | null;
  section_title: string | null;
  similarity: number;
};

type TutorSource = {
  number: number;
  materialId: string;
  title: string;
  pageNumber: number | null;
  similarity: number;
};

async function retrieveCourseContext(message: string, courseCode: string) {
  const empty = { context: "", sources: [] as TutorSource[] };

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return empty;
  }

  try {
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return empty;

    const { data: course } = await supabase
      .from("courses")
      .select("id")
      .eq("user_id", authData.user.id)
      .eq("code", courseCode)
      .maybeSingle();

    if (!course) return empty;

    const queryEmbedding = await embedQuery(message);
    const { data: matches, error: matchError } = await supabase.rpc("match_material_chunks", {
      query_embedding: queryEmbedding,
      match_course_id: course.id,
      match_count: 6,
      similarity_threshold: 0.62,
    });

    if (matchError || !matches?.length) return empty;

    const chunks = matches as RetrievedChunk[];
    const materialIds = [...new Set(chunks.map((chunk) => chunk.material_id))];

    const { data: materials } = await supabase
      .from("materials")
      .select("id, title")
      .eq("user_id", authData.user.id)
      .in("id", materialIds);

    const titles = new Map((materials || []).map((material) => [material.id, material.title]));

    const sources: TutorSource[] = chunks.map((chunk, index) => ({
      number: index + 1,
      materialId: chunk.material_id,
      title: titles.get(chunk.material_id) || "Course material",
      pageNumber: chunk.page_number,
      similarity: Number(chunk.similarity || 0),
    }));

    const context = chunks
      .map((chunk, index) => {
        const source = sources[index];
        const page = source.pageNumber ? `, page ${source.pageNumber}` : "";
        return `[Source ${source.number}: ${source.title}${page}]\n${chunk.content}`;
      })
      .join("\n\n---\n\n");

    return { context, sources };
  } catch (error) {
    console.warn("Course retrieval unavailable; continuing without RAG context.", error);
    return empty;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message = String(body?.message ?? "").trim();
    const course = body?.course ?? {};
    const courseCode = String(course.code || "").trim();
    const history: ChatMessage[] = Array.isArray(body?.history) ? body.history : [];

    if (!message) {
      return NextResponse.json({ error: "A message is required." }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        answer: `Demo tutor mode: I received your question about ${courseCode || "this course"}: “${message}”\n\nAdd OPENAI_API_KEY to enable grounded tutoring over uploaded course PDFs.`,
        sources: [],
      });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.OPENAI_TUTOR_MODEL || "gpt-5";
    const retrieved = courseCode ? await retrieveCourseContext(message, courseCode) : { context: "", sources: [] as TutorSource[] };

    const transcript = history
      .slice(-8)
      .map((item) => `${item.role === "user" ? "Student" : "Tutor"}: ${item.content}`)
      .join("\n\n");

    const sourceInstructions = retrieved.context
      ? [
          "COURSE MATERIAL EXCERPTS are provided below.",
          "Prioritize these excerpts when they answer the student's question.",
          "When you use a course excerpt, cite it inline as [Source 1], [Source 2], and so on. Never invent source numbers.",
          "If the uploaded material does not contain enough information, say that clearly before supplementing with general subject knowledge.",
        ].join("\n")
      : "No relevant uploaded course excerpt was retrieved for this question. You may teach from general subject knowledge, but do not imply that your explanation came from the student's notes.";

    const input = [
      retrieved.context ? `COURSE MATERIAL EXCERPTS\n\n${retrieved.context}` : "",
      `CONVERSATION\n\n${transcript || `Student: ${message}`}`,
    ]
      .filter(Boolean)
      .join("\n\n====================\n\n");

    const response = await client.responses.create({
      model,
      instructions: [
        `You are a university-level AI tutor for ${courseCode || "the student's course"}: ${course.title || "their current subject"}.`,
        "Teach interactively rather than dumping a long answer. Explain concepts clearly, use worked examples when useful, and check the student's understanding.",
        sourceInstructions,
        "For exam practice, encourage reasoning and learning. You may explain solutions, but distinguish practice help from completing an active graded assessment for the student.",
      ].join("\n"),
      input,
    });

    return NextResponse.json({
      answer: response.output_text,
      sources: retrieved.sources,
    });
  } catch (error) {
    console.error("Tutor API error", error);
    return NextResponse.json({ error: "The AI tutor could not respond." }, { status: 500 });
  }
}
