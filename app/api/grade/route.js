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
    const { teachingContent, standardAnswer, studentAnswer } = await req.json();
    // ✅ 输入验证
    if (!teachingContent || !standardAnswer || !studentAnswer) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (
      teachingContent.length > 6000 ||
      standardAnswer.length > 6000 ||
      studentAnswer.length > 6000
    ) {
      return NextResponse.json({ error: "Input too long" }, { status: 413 });
    }
    const prompt = `
You are an educational AI grading assistant.
Follow these rules and output ONLY valid JSON.
The user will provide:
1. Teaching Content
2. Standard Answer
3. Student Answer
Your job:
- Detect subquestions (like 1(a), 1(b), 1(c)).
- Detect each subquestion's mark value.
- Grade each subquestion separately.
- Give detailed feedback and improvement advice.
Output strictly in:
{
  "total_score": 11,
  "total_full_marks": 15,
  "questions": [
    {
      "question_number": "1(a)",
      "full_marks": 2,
      "score": 1,
      "feedback": "...",
      "improvement": "...",
      "scoring_points": ["...","..."]
    }
  ]
}
Teaching Content:
${teachingContent}
Standard Answer:
${standardAnswer}
Student Answer:
${studentAnswer}
`;
    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 1200,
    });
    const raw = completion.choices[0]?.message?.content || "{}";
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    console.log(`[Questect|Grade] Done in ${Date.now() - start}ms`);
    return NextResponse.json(parsed);
  } catch (error) {
    console.error("[Questect|Grade Error]", error);
    return NextResponse.json({ error: "Failed to grade answer." }, { status: 500 });
  }
}