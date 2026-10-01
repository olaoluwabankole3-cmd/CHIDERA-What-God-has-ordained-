import OpenAI from "openai";
import { NextResponse } from "next/server";

type ChatMessage = { role: "user" | "assistant"; content: string };

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message = String(body?.message ?? "").trim();
    const course = body?.course ?? {};
    const history: ChatMessage[] = Array.isArray(body?.history) ? body.history : [];

    if (!message) {
      return NextResponse.json({ error: "A message is required." }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        answer: `Demo tutor mode: I received your question about ${course.code || "this course"}: “${message}”\n\nOnce OPENAI_API_KEY is added, this endpoint will use the live AI tutor. The next implementation step is to retrieve relevant chunks from your uploaded course materials before generating this answer.`,
      });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.OPENAI_TUTOR_MODEL || "gpt-5";

    const transcript = history
      .slice(-8)
      .map((item) => `${item.role === "user" ? "Student" : "Tutor"}: ${item.content}`)
      .join("\n\n");

    const response = await client.responses.create({
      model,
      instructions: [
        `You are a university-level AI tutor for ${course.code || "the student's course"}: ${course.title || "their current subject"}.`,
        "Teach interactively rather than dumping a long answer. Explain concepts clearly, use worked examples when useful, and check the student's understanding.",
        "Do not invent facts from course notes that you have not been given. When retrieved course material is later supplied, prioritize it and cite it precisely.",
        "For exam practice, encourage reasoning and learning. You may explain solutions, but distinguish practice help from completing active graded assessments for the student.",
      ].join("\n"),
      input: transcript || message,
    });

    return NextResponse.json({ answer: response.output_text });
  } catch (error) {
    console.error("Tutor API error", error);
    return NextResponse.json({ error: "The AI tutor could not respond." }, { status: 500 });
  }
}
