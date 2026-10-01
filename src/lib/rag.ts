import OpenAI from "openai";

export type PageText = {
  pageNumber: number;
  text: string;
};

export type MaterialChunk = {
  chunkIndex: number;
  pageNumber: number;
  content: string;
};

const CHUNK_SIZE = 1200;
const CHUNK_OVERLAP = 180;

export function normalizeText(value: string) {
  return value
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitLongText(text: string) {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const hardEnd = Math.min(start + CHUNK_SIZE, text.length);
    let end = hardEnd;

    if (hardEnd < text.length) {
      const candidates = [
        text.lastIndexOf("\n\n", hardEnd),
        text.lastIndexOf(". ", hardEnd),
        text.lastIndexOf(" ", hardEnd),
      ].filter((index) => index > start + Math.floor(CHUNK_SIZE * 0.55));

      if (candidates.length > 0) {
        end = Math.max(...candidates) + 1;
      }
    }

    const chunk = text.slice(start, end).trim();
    if (chunk) chunks.push(chunk);

    if (end >= text.length) break;
    start = Math.max(end - CHUNK_OVERLAP, start + 1);
  }

  return chunks;
}

export function chunkPages(pages: PageText[]): MaterialChunk[] {
  const result: MaterialChunk[] = [];
  let chunkIndex = 0;

  for (const page of pages) {
    const text = normalizeText(page.text);
    if (!text) continue;

    for (const chunk of splitLongText(text)) {
      result.push({
        chunkIndex,
        pageNumber: page.pageNumber,
        content: chunk,
      });
      chunkIndex += 1;
    }
  }

  return result;
}

export async function embedTexts(texts: string[]) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required to generate embeddings.");
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
  const vectors: number[][] = [];

  for (let start = 0; start < texts.length; start += 64) {
    const batch = texts.slice(start, start + 64);
    const response = await client.embeddings.create({
      model,
      input: batch,
      dimensions: 1536,
      encoding_format: "float",
    });

    const ordered = [...response.data]
      .sort((a, b) => a.index - b.index)
      .map((item) => item.embedding);

    vectors.push(...ordered);
  }

  return vectors;
}

export async function embedQuery(text: string) {
  const [embedding] = await embedTexts([text]);
  return embedding;
}
