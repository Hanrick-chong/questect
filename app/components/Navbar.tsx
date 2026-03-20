"use client";

import Link from "next/link";

export default function Navbar() {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <Link href="/front-page" className="text-xl font-bold">
        Questect
      </Link>

      <div className="flex gap-3">
        <Link
          href="/quick-grading"
          className="rounded-lg bg-black px-4 py-2 text-white hover:bg-gray-800"
        >
          Quick Grading
        </Link>

        <Link
          href="/exam-grader"
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Exam Grader
        </Link>
      </div>
    </div>
  );
}