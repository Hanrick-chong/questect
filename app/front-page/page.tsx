"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="max-w-5xl w-full text-center">
        
        {/* LOGO / TITLE */}
        <h1 className="text-5xl font-bold mb-4">Questect</h1>
        <p className="text-gray-600 text-lg mb-10">
          AI-powered grading assistant for teachers & students
        </p>

        {/* MAIN ACTIONS */}
        <div className="grid gap-6 md:grid-cols-2">
          
          <Link
            href="/quick-grading"
            className="rounded-2xl bg-black text-white p-8 hover:scale-105 transition shadow-lg"
          >
            <h2 className="text-2xl font-semibold mb-2">⚡ Quick Grading</h2>
            <p className="text-sm text-gray-300">
              Grade structured questions with sub-parts like 1(a), 1(b)
            </p>
          </Link>

          <Link
            href="/exam-grader"
            className="rounded-2xl bg-blue-600 text-white p-8 hover:scale-105 transition shadow-lg"
          >
            <h2 className="text-2xl font-semibold mb-2">📄 Exam Question Marking</h2>
            <p className="text-sm text-blue-100">
              Detect marks and evaluate full exam answers automatically
            </p>
          </Link>

        </div>

        {/* FEATURES */}
        <div className="mt-16 grid gap-6 md:grid-cols-3 text-left">
          
          <div className="bg-white p-5 rounded-xl shadow">
            <h3 className="font-semibold mb-2">📂 Multi-file Upload</h3>
            <p className="text-sm text-gray-600">
              Upload PDFs, images, or documents. AI extracts everything.
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl shadow">
            <h3 className="font-semibold mb-2">🧠 AI Feedback</h3>
            <p className="text-sm text-gray-600">
              Get detailed marking, feedback, and improvement suggestions.
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl shadow">
            <h3 className="font-semibold mb-2">📸 OCR Support</h3>
            <p className="text-sm text-gray-600">
              Upload handwritten or printed answers via image.
            </p>
          </div>

        </div>

      </div>
    </main>
  );
}