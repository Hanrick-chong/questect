"use client";

import { useState } from "react";

export default function Home() {
  const [teachingContent, setTeachingContent] = useState("");
  const [standardAnswer, setStandardAnswer] = useState("");
  const [studentAnswer, setStudentAnswer] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function handleGrade() {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/grade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teachingContent,
          standardAnswer,
          studentAnswer,
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error("Grading request failed:", error);
      setResult({ error: "Failed to connect to grading API." });
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow">
        <h1 className="mb-2 text-3xl font-bold">Questect</h1>
        <p className="mb-6 text-gray-600">
          Homework Analysis and Exam Feedback Demo
        </p>

        <div className="mb-4">
          <label className="mb-2 block font-semibold">Teaching Content</label>
          <textarea
            className="w-full rounded-lg border p-3"
            rows={4}
            value={teachingContent}
            onChange={(e) => setTeachingContent(e.target.value)}
            placeholder="Paste lesson or teaching content here..."
          />
        </div>

        <div className="mb-4">
          <label className="mb-2 block font-semibold">Standard Answer</label>
          <textarea
            className="w-full rounded-lg border p-3"
            rows={3}
            value={standardAnswer}
            onChange={(e) => setStandardAnswer(e.target.value)}
            placeholder="Enter teacher's standard answer here..."
          />
        </div>

        <div className="mb-4">
          <label className="mb-2 block font-semibold">Student Answer</label>
          <textarea
            className="w-full rounded-lg border p-3"
            rows={3}
            value={studentAnswer}
            onChange={(e) => setStudentAnswer(e.target.value)}
            placeholder="Enter student's answer here..."
          />
        </div>

        <button
          onClick={handleGrade}
          disabled={loading}
          className="rounded-lg bg-black px-5 py-3 text-white disabled:opacity-50"
        >
          {loading ? "Grading..." : "Grade Answer"}
        </button>

        {result && (
          <div className="mt-8 rounded-xl border bg-gray-50 p-6">
            <h2 className="mb-4 text-2xl font-semibold">Result</h2>

            {result.error ? (
              <p className="text-red-600">{result.error}</p>
            ) : (
              <div className="space-y-3">
                <p>
                  <strong>Score:</strong> {result.score}/10
                </p>
                <p>
                  <strong>Feedback:</strong> {result.feedback}
                </p>
                <p>
                  <strong>Improvement:</strong> {result.improvement}
                </p>
                <p>
                  <strong>Exam Tip:</strong> {result.exam_tip}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}