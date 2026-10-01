import OpenAI from "openai";
import { NextResponse } from "next/server";
import type {
  AssessmentType,
  StoredAssessmentConfiguration,
  StoredAssessmentQuestion,
} from "@/lib/assessment-types";
import { embedQuery } from "@/lib/rag";
import { createClient } from "@/lib/supabase/server";

type SourceChunk = {
  material_id: string;
  content: string;
  page_number: number | null;
  chunk_index?: number;
};

type GeneratedQuestion = {
  topic: string;
  prompt: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  sourceNumber: number;
};

function evenlySample<T>(items: T[], count: number) {
  if (items.length <= count) return items;
  const sampled: T[] = [];
  const step = items.length / count;

  for (let index = 0; index < count; index += 1) {
    sampled.push(items[Math.floor(index * step)]);
  }

  return sampled;
}

function normalizeQuestions(
  generated: GeneratedQuestion[],
  sourceMeta: Array<{ title: string; pageNumber: number | null }>,
  questionCount: number,
  focusTopic: string | null,
) {
  const questions: StoredAssessmentQuestion[] = [];

  for (const question of generated) {
    if (questions.length >= questionCount) break;

    const options = Array.isArray(question.options)
      ? question.options.map((option) => String(option).trim()).filter(Boolean)
      : [];

    const correctOptionIndex = Number(question.correctOptionIndex);
    const sourceIndex = Number(question.sourceNumber) - 1;

    if (
      !question.prompt?.trim() ||
      !question.explanation?.trim() ||
      options.length !== 4 ||
      !Number.isInteger(correctOptionIndex) ||
      correctOptionIndex < 0 ||
      correctOptionIndex > 3
    ) {
      continue;
    }

    const topic = focusTopic || question.topic?.trim();
    if (!topic) continue;

    questions.push({
      id: crypto.randomUUID(),
      topic: topic.slice(0, 120),
      prompt: question.prompt.trim(),
      options,
      correctOptionIndex,
      explanation: question.explanation.trim(),
      source:
        sourceIndex >= 0 && sourceIndex < sourceMeta.length
          ? sourceMeta[sourceIndex]
          : null,
    });
  }

  return questions;
}

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is required to generate assessments." },
        { status: 503 },
      );
    }

    const body = await request.json();
    const courseId = String(body?.courseId || "").trim();
    const type = String(body?.type || "") as AssessmentType;
    const focusTopic = String(body?.focusTopic || "").trim().slice(0, 120) || null;

    if (!courseId || !["quiz", "mock_exam"].includes(type)) {
      return NextResponse.json(
        { error: "A valid course and assessment type are required." },
        { status: 400 },
      );
    }

    const questionCount = type === "mock_exam" ? 10 : 5;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "You must be signed in to generate an assessment." },
        { status: 401 },
      );
    }

    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id, code, title")
      .eq("id", courseId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (courseError) throw courseError;
    if (!course) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }

    const { data: readyMaterials, error: materialsError } = await supabase
      .from("materials")
      .select("id, title")
      .eq("course_id", course.id)
      .eq("user_id", user.id)
      .eq("status", "ready");

    if (materialsError) throw materialsError;
    if (!readyMaterials?.length) {
      return NextResponse.json(
        { error: "Upload and index at least one course PDF before generating practice." },
        { status: 400 },
      );
    }

    const materialIds = readyMaterials.map((material) => material.id);
    const materialIdSet = new Set(materialIds);
    const titleById = new Map(
      readyMaterials.map((material) => [material.id, material.title]),
    );

    let chunks: SourceChunk[] = [];

    if (focusTopic) {
      const queryEmbedding = await embedQuery(
        `${course.code} ${course.title} ${focusTopic}`,
      );

      const { data: matches, error: matchError } = await supabase.rpc(
        "match_material_chunks",
        {
          query_embedding: queryEmbedding,
          match_course_id: course.id,
          match_count: type === "mock_exam" ? 32 : 22,
          similarity_threshold: 0.4,
        },
      );

      if (matchError) throw matchError;

      chunks = ((matches || []) as SourceChunk[]).filter((chunk) =>
        materialIdSet.has(chunk.material_id),
      );
    }

    if (chunks.length < 3) {
      const { data: chunkRows, error: chunksError } = await supabase
        .from("material_chunks")
        .select("material_id, content, page_number, chunk_index")
        .eq("course_id", course.id)
        .eq("user_id", user.id)
        .in("material_id", materialIds)
        .order("material_id", { ascending: true })
        .order("chunk_index", { ascending: true })
        .limit(180);

      if (chunksError) throw chunksError;
      chunks = (chunkRows || []) as SourceChunk[];
    }

    if (chunks.length < 3) {
      return NextResponse.json(
        { error: "There is not enough indexed course text to generate a useful assessment yet." },
        { status: 400 },
      );
    }

    const sampled = focusTopic
      ? chunks.slice(0, type === "mock_exam" ? 28 : 18)
      : evenlySample(chunks, type === "mock_exam" ? 28 : 18);

    const sourceMeta = sampled.map((chunk) => ({
      title: titleById.get(chunk.material_id) || "Course material",
      pageNumber: chunk.page_number,
    }));

    const sourceText = sampled
      .map((chunk, index) => {
        const title = titleById.get(chunk.material_id) || "Course material";
        const page = chunk.page_number ? ` · page ${chunk.page_number}` : "";
        return `[Source ${index + 1}: ${title}${page}]\n${chunk.content}`;
      })
      .join("\n\n---\n\n")
      .slice(0, 42000);

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.OPENAI_TUTOR_MODEL || "gpt-5";

    const focusInstructions = focusTopic
      ? [
          `Concentrate every question on the topic "${focusTopic}" or directly supporting prerequisite/adjacent concepts found in the excerpts.`,
          `Use exactly "${focusTopic}" as the topic label for every question so progress updates the same mastery record.`,
          "Prefer application, discrimination, calculation, and explanation-style multiple-choice questions over simple recall when the material supports them.",
        ].join("\n")
      : "Spread questions across distinct concepts where the excerpts allow it.";

    const response = await client.responses.create({
      model,
      instructions: [
        `Create a university-level ${type === "mock_exam" ? "mock exam" : "practice quiz"} for ${course.code}: ${course.title}.`,
        `Return exactly ${questionCount} multiple-choice questions.`,
        "Ground every question in the supplied course-material excerpts. Do not test facts absent from those excerpts.",
        "Each question must have exactly four plausible options, one correct answer, a concise explanation, a short topic label, and the source number that best supports it.",
        focusInstructions,
        "Avoid trivial wording-only questions.",
        "For numerical or technical subjects, include reasoning/application questions when supported by the material.",
      ].join("\n"),
      input: `COURSE MATERIAL EXCERPTS\n\n${sourceText}`,
      text: {
        format: {
          type: "json_schema",
          name: "course_assessment",
          strict: true,
          schema: {
            type: "object",
            properties: {
              questions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    topic: { type: "string" },
                    prompt: { type: "string" },
                    options: {
                      type: "array",
                      items: { type: "string" },
                    },
                    correctOptionIndex: {
                      type: "integer",
                      minimum: 0,
                      maximum: 3,
                    },
                    explanation: { type: "string" },
                    sourceNumber: {
                      type: "integer",
                      minimum: 1,
                      maximum: sampled.length,
                    },
                  },
                  required: [
                    "topic",
                    "prompt",
                    "options",
                    "correctOptionIndex",
                    "explanation",
                    "sourceNumber",
                  ],
                  additionalProperties: false,
                },
              },
            },
            required: ["questions"],
            additionalProperties: false,
          },
        },
      },
    });

    const parsed = JSON.parse(response.output_text) as {
      questions?: GeneratedQuestion[];
    };

    const questions = normalizeQuestions(
      Array.isArray(parsed.questions) ? parsed.questions : [],
      sourceMeta,
      questionCount,
      focusTopic,
    );

    if (questions.length !== questionCount) {
      return NextResponse.json(
        { error: "The assessment generator returned an incomplete question set. Please try again." },
        { status: 502 },
      );
    }

    const configuration: StoredAssessmentConfiguration = {
      version: 1,
      generatedFrom: "course_materials",
      questionCount,
      focusTopic,
      questions,
    };

    const title = focusTopic
      ? `${course.code} · ${focusTopic} ${type === "mock_exam" ? "Targeted Mock Exam" : "Targeted Quiz"}`
      : type === "mock_exam"
        ? `${course.code} Mock Exam`
        : `${course.code} Practice Quiz`;

    const { data: assessment, error: assessmentError } = await supabase
      .from("assessments")
      .insert({
        user_id: user.id,
        course_id: course.id,
        title,
        assessment_type: type,
        configuration,
      })
      .select("id")
      .single();

    if (assessmentError || !assessment) {
      throw assessmentError || new Error("Could not save the generated assessment.");
    }

    return NextResponse.json({
      assessmentId: assessment.id,
      questionCount,
      title,
      focusTopic,
    });
  } catch (error) {
    console.error("Assessment generation failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not generate the assessment." },
      { status: 500 },
    );
  }
}
