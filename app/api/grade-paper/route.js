// app/api/grade-paper/route.js
import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

export async function POST(req) {
  const start = Date.now();

  try {
    const { question, standardAnswer, studentAnswer } = await req.json();

    if (!question || !standardAnswer || !studentAnswer) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (
      question.length > 10000 ||
      standardAnswer.length > 8000 ||
      studentAnswer.length > 10000
    ) {
      return NextResponse.json({ error: "Input too long" }, { status: 413 });
    }

    const prompt = `
You are an educational AI exam grading assistant.

Tasks:
1. Detect full marks from Question text.
2. Compare Student Answer vs. Standard Answer.
3. If marks not found, estimate reasonably.
4. Return scoring strictly in JSON.

Format:
{
  "full_marks": 20,
  "score": 15,
  "feedback": "...",
  "improvement": "...",
  "exam_tip": "..."
}

Question:
${question}

Standard Answer:
${standardAnswer}

Student Answer:
${studentAnswer}
`;

    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 1000,
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    console.log(`[Questect|ExamGrade] Completed in ${Date.now() - start}ms`);

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("[Questect|ExamGrade Error]", error);
    return NextResponse.json(
      { error: "Failed to grade exam question." },
      { status: 500 }
    );
  }
}
