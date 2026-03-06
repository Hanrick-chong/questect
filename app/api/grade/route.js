import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { studentAnswer, standardAnswer, teachingContent } = await req.json();

    let score = 0;
    let feedback = "";
    let improvement = "";
    let exam_tip = "";

    const answer = studentAnswer.toLowerCase();

    if (
      answer.includes("photosynthesis") &&
      answer.includes("leaves")
    ) {
      score = 6;
      feedback =
        "Your answer is partially correct because you identified where photosynthesis happens, but it is still incomplete.";
      improvement =
        "You should mention chloroplast and explain that glucose is produced during photosynthesis.";
      exam_tip =
        "In exam questions, markers usually expect both the location and the product of photosynthesis.";
    } else if (answer.includes("chloroplast") || answer.includes("glucose")) {
      score = 8;
      feedback =
        "Your answer shows good understanding and includes some important scientific keywords.";
      improvement =
        "To get full marks, explain the full process more clearly and connect the points together.";
      exam_tip =
        "Examiners often reward answers that include correct scientific terms and a complete explanation.";
    } else {
      score = 3;
      feedback =
        "Your answer shows limited understanding of the topic and misses key scientific details.";
      improvement =
        "Review the teaching content and include the correct process, location, and product of photosynthesis.";
      exam_tip =
        "For biology questions, examiners usually reward clear keywords taken from the syllabus.";
    }

    return NextResponse.json({
      score,
      feedback,
      improvement,
      exam_tip,
      studentAnswer,
      standardAnswer,
      teachingContent,
    });
  } catch (error) {
    console.error("Mock grading error:", error);
    return NextResponse.json(
      { error: "Mock grading failed" },
      { status: 500 }
    );
  }
}