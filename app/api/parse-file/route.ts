import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import { createWorker } from "tesseract.js";

export const runtime = "nodejs";

type DetectedType = "teaching" | "standard" | "student" | "unknown";
type SourceType = "txt" | "md" | "docx" | "pdf" | "image" | "unknown";

type ParsedFileResult = {
  fileName: string;
  sourceType: SourceType;
  detectedType: DetectedType;
  extractedText: string;
  confidenceNote: "low" | "medium" | "high";
  success: boolean;
  error?: string;
};

function getSourceType(file: File): SourceType {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();

  if (name.endsWith(".txt")) return "txt";
  if (name.endsWith(".md")) return "md";
  if (
    name.endsWith(".docx") ||
    type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "docx";
  }
  if (name.endsWith(".pdf") || type === "application/pdf") return "pdf";
  if (type.startsWith("image/")) return "image";

  return "unknown";
}

function cleanExtractedText(text: string): string {
  return text
    .replace(/\r/g, "")
    .replace(/\t/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function detectTargetField(text: string): {
  detectedType: DetectedType;
  confidenceNote: "low" | "medium" | "high";
} {
  const lower = text.toLowerCase();

  let teachingScore = 0;
  let standardScore = 0;
  let studentScore = 0;

  // Standard answer hints
  if (lower.includes("standard answer")) standardScore += 3;
  if (lower.includes("model answer")) standardScore += 3;
  if (lower.includes("suggested answer")) standardScore += 3;
  if (lower.includes("marking scheme")) standardScore += 4;
  if (lower.includes("answer scheme")) standardScore += 3;
  if (lower.includes("skema jawapan")) standardScore += 4;
  if (lower.includes("scheme of work")) standardScore += 1;

  // Student answer hints
  if (lower.includes("student answer")) studentScore += 4;
  if (lower.includes("candidate answer")) studentScore += 4;
  if (lower.includes("my answer")) studentScore += 2;
  if (lower.includes("i think")) studentScore += 1;
  if (lower.includes("in my opinion")) studentScore += 1;

  // Teaching/question hints
  if (lower.includes("teaching content")) teachingScore += 4;
  if (lower.includes("lesson notes")) teachingScore += 3;
  if (lower.includes("notes")) teachingScore += 1;
  if (lower.includes("chapter")) teachingScore += 2;
  if (lower.includes("topic")) teachingScore += 2;
  if (lower.includes("question 1")) teachingScore += 2;
  if (lower.includes("question 2")) teachingScore += 2;
  if (lower.includes("explain")) teachingScore += 1;
  if (lower.includes("discuss")) teachingScore += 1;
  if (lower.includes("state")) teachingScore += 1;

  // Structure-based guesses
  const hasQuestionPattern =
    /question\s*\d+/i.test(text) ||
    /q\s*\d+/i.test(text) ||
    /\(\d+\)/.test(text);

  const hasMarksPattern =
    /\[\d+\s*marks?\]/i.test(text) ||
    /\(\d+\s*marks?\)/i.test(text) ||
    /\d+\s*marks?/i.test(text);

  if (hasQuestionPattern) teachingScore += 2;
  if (hasMarksPattern) teachingScore += 1;

  const scores = [
    { type: "teaching" as DetectedType, score: teachingScore },
    { type: "standard" as DetectedType, score: standardScore },
    { type: "student" as DetectedType, score: studentScore },
  ].sort((a, b) => b.score - a.score);

  const top = scores[0];
  const second = scores[1];

  if (top.score <= 0) {
    return { detectedType: "unknown", confidenceNote: "low" };
  }

  const gap = top.score - second.score;

  if (top.score >= 4 && gap >= 2) {
    return { detectedType: top.type, confidenceNote: "high" };
  }

  if (top.score >= 2) {
    return { detectedType: top.type, confidenceNote: "medium" };
  }

  return { detectedType: "unknown", confidenceNote: "low" };
}

async function extractTextFromTxt(buffer: Buffer) {
  return buffer.toString("utf-8");
}

async function extractTextFromDocx(buffer: Buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return result.value || "";
}

async function extractTextFromPdf(buffer: Buffer) {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loadingTask.promise;

  let text = "";
  const maxPages = Math.min(pdf.numPages, 20);

  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => ("str" in item ? item.str : ""))
      .join(" ");

    text += pageText + "\n\n";
  }

  return text;
}

async function extractTextFromImage(buffer: Buffer) {
  const worker = await createWorker("eng");
  try {
    const ret = await worker.recognize(buffer);
    return ret.data.text || "";
  } finally {
    await worker.terminate();
  }
}
async function parseSingleFile(file: File): Promise<ParsedFileResult> {
  const sourceType = getSourceType(file);

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let extractedText = "";

    if (sourceType === "txt" || sourceType === "md") {
      extractedText = await extractTextFromTxt(buffer);
    } else if (sourceType === "docx") {
      extractedText = await extractTextFromDocx(buffer);
    } else if (sourceType === "pdf") {
      extractedText = await extractTextFromPdf(buffer);
    } else if (sourceType === "image") {
      extractedText = await extractTextFromImage(buffer);
    } else {
      return {
        fileName: file.name,
        sourceType: "unknown",
        detectedType: "unknown",
        extractedText: "",
        confidenceNote: "low",
        success: false,
        error: "Unsupported file format.",
      };
    }

    const cleanedText = cleanExtractedText(extractedText);

    if (!cleanedText) {
      return {
        fileName: file.name,
        sourceType,
        detectedType: "unknown",
        extractedText: "",
        confidenceNote: "low",
        success: false,
        error: "No readable text could be extracted from this file.",
      };
    }

    const { detectedType, confidenceNote } = detectTargetField(cleanedText);

    return {
      fileName: file.name,
      sourceType,
      detectedType,
      extractedText: cleanedText,
      confidenceNote,
      success: true,
    };
  } catch (error: any) {
    return {
      fileName: file.name,
      sourceType,
      detectedType: "unknown",
      extractedText: "",
      confidenceNote: "low",
      success: false,
      error: error?.message || "Failed to parse file.",
    };
  }
}

function combineResults(results: ParsedFileResult[]) {
  const teachingTexts: string[] = [];
  const standardTexts: string[] = [];
  const studentTexts: string[] = [];
  const unknownTexts: string[] = [];

  for (const item of results) {
    if (!item.success || !item.extractedText) continue;

    if (item.detectedType === "teaching") {
      teachingTexts.push(item.extractedText);
    } else if (item.detectedType === "standard") {
      standardTexts.push(item.extractedText);
    } else if (item.detectedType === "student") {
      studentTexts.push(item.extractedText);
    } else {
      unknownTexts.push(item.extractedText);
    }
  }

  return {
    teachingContent: teachingTexts.join("\n\n---\n\n"),
    standardAnswer: standardTexts.join("\n\n---\n\n"),
    studentAnswer: studentTexts.join("\n\n---\n\n"),
    unknownContent: unknownTexts.join("\n\n---\n\n"),
  };
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: "No files uploaded." },
        { status: 400 }
      );
    }

    const parsedResults = await Promise.all(files.map(parseSingleFile));
    const combined = combineResults(parsedResults);

    return NextResponse.json({
      success: true,
      files: parsedResults,
      ...combined,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to process uploaded files.",
      },
      { status: 500 }
    );
  }
}