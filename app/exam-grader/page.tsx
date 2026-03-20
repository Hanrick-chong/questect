"use client";

import { useState } from "react";
import Navbar from "../components/Navbar";

type UploadTarget = "question" | "standard" | "student";

type ParsedFileItem = {
  success: boolean;
  fileName: string;
  mimeType: string;
  sourceType: "txt" | "docx" | "pdf" | "image" | "unknown";
  extractedText: string;
  detectedType: "teaching" | "standard" | "student" | "unknown";
  confidenceNote: "low" | "medium" | "high";
  warnings: string[];
  error?: string;
};

type ExamGradingResult = {
  score?: number;
  full_marks?: number;
  feedback?: string;
  improvement?: string;
  scoring_points?: string[];
};

export default function ExamGraderPage() {
  const [question, setQuestion] = useState("");
  const [standardAnswer, setStandardAnswer] = useState("");
  const [studentAnswer, setStudentAnswer] = useState("");

  const [result, setResult] = useState<ExamGradingResult | null>(null);
  const [loading, setLoading] = useState(false);

  const [uploadingField, setUploadingField] = useState<UploadTarget | null>(
    null
  );

  const [scanLoading, setScanLoading] = useState(false);
  const [scanMessage, setScanMessage] = useState("");

  function appendText(
    target: UploadTarget,
    text: string,
    mode: "append" | "replace" = "append"
  ) {
    if (target === "question") {
      setQuestion((prev) =>
        mode === "replace" ? text : prev ? `${prev}\n\n${text}` : text
      );
    }

    if (target === "standard") {
      setStandardAnswer((prev) =>
        mode === "replace" ? text : prev ? `${prev}\n\n${text}` : text
      );
    }

    if (target === "student") {
      setStudentAnswer((prev) =>
        mode === "replace" ? text : prev ? `${prev}\n\n${text}` : text
      );
    }
  }

  async function handleFileUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    target: UploadTarget
  ) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingField(target);
    setScanMessage("");

    try {
      const formData = new FormData();

      for (const file of Array.from(files)) {
        formData.append("files", file);
      }

      const res = await fetch("/api/parse-file", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
            if (!data.success || !data.results || !Array.isArray(data.results)) {
        alert("Failed to parse file.");
        return;
      }

      const extractedTexts = data.results
        .filter((item: ParsedFileItem) => item.success && item.extractedText)
        .map((item: ParsedFileItem) => item.extractedText.trim())
        .filter(Boolean);

      const combinedText = extractedTexts.join("\n\n").trim();

      if (!combinedText) {
        alert("No readable text was extracted.");
        return;
      }

      appendText(target, combinedText, "append");
    } catch (error) {
      console.error("File upload error:", error);
      alert("Error uploading file.");
    } finally {
      setUploadingField(null);
      e.target.value = "";
    }
  }

  async function handleSmartScan(
    e: React.ChangeEvent<HTMLInputElement>,
    target: UploadTarget
  ) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setScanLoading(true);
    setScanMessage("Scanning image...");

    try {
      const formData = new FormData();

      for (const file of Array.from(files)) {
        formData.append("files", file);
      }

      const res = await fetch("/api/parse-file", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!data.success || !data.results || !Array.isArray(data.results)) {
        setScanMessage("Failed to scan image.");
        return;
      }

      const successfulResults = data.results.filter(
        (item: ParsedFileItem) => item.success && item.extractedText
      );

      if (successfulResults.length === 0) {
        setScanMessage("No readable text found in image.");
        return;
      }

      const combinedText = successfulResults
        .map((item: ParsedFileItem) => item.extractedText.trim())
        .filter(Boolean)
        .join("\n\n")
        .trim();

      if (!combinedText) {
        setScanMessage("No readable text found in image.");
        return;
      }

      appendText(target, combinedText, "append");

      const warningCount = successfulResults.reduce(
        (count: number, item: ParsedFileItem) => count + item.warnings.length,
        0
      );

      if (warningCount > 0) {
        setScanMessage("Image scanned successfully. Please review OCR text.");
      } else {
        setScanMessage("Image scanned successfully.");
      }
    } catch (error) {
      console.error("Smart Scan error:", error);
      setScanMessage("Error scanning image.");
    } finally {
      setScanLoading(false);
      e.target.value = "";
    }
  }
    async function handleGradePaper() {
    if (!question || !standardAnswer || !studentAnswer) {
      alert("Please fill in Question, Standard Answer, and Student Answer.");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/grade-paper", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question,
          standardAnswer,
          studentAnswer,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("Grade paper API error:", data);
        alert(data.error || "Failed to grade paper.");
        return;
      }

      setResult(data);
    } catch (error) {
      console.error("Grading paper error:", error);
      alert("Something went wrong while grading the paper.");
    } finally {
      setLoading(false);
    }
  }

  function renderUploadButtons(target: UploadTarget) {
    const isUploading = uploadingField === target;

    return (
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "10px" }}>
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 12px",
            background: "#2563eb",
            color: "#fff",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: 600,
          }}
        >
          <span>{isUploading ? "⏳" : "📁"}</span>
          <span>{isUploading ? "Uploading..." : "Upload File"}</span>
          <input
            type="file"
            multiple
            onChange={(e) => handleFileUpload(e, target)}
            style={{ display: "none" }}
          />
        </label>

        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 12px",
            background: "#7c3aed",
            color: "#fff",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: 600,
          }}
        >
          <span>{scanLoading ? "⏳" : "📷"}</span>
          <span>{scanLoading ? "Scanning..." : "Smart Scan"}</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={(e) => handleSmartScan(e, target)}
            style={{ display: "none" }}
          />
        </label>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <Navbar />

      <main
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
          padding: "24px 16px 60px",
        }}
      >
        <h1 style={{ fontSize: "32px", fontWeight: 700, marginBottom: "8px" }}>
          Exam Grader
        </h1>
                <p style={{ color: "#475569", marginBottom: "24px" }}>
          Upload files or use Smart Scan to extract question and answer text from images, then grade the student answer.
        </p>

        {scanMessage && (
          <div
            style={{
              marginBottom: "20px",
              padding: "12px 14px",
              borderRadius: "10px",
              background: scanLoading ? "#fff7ed" : "#ecfeff",
              color: "#0f172a",
              border: "1px solid #cbd5e1",
            }}
          >
            {scanMessage}
          </div>
        )}

        <div style={{ display: "grid", gap: "20px" }}>
          <section
            style={{
              background: "#fff",
              borderRadius: "16px",
              padding: "20px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
            }}
          >
            <h2 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "10px" }}>
              Question
            </h2>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Paste or upload exam question here..."
              style={{
                width: "100%",
                minHeight: "180px",
                padding: "12px",
                borderRadius: "12px",
                border: "1px solid #cbd5e1",
                outline: "none",
                resize: "vertical",
              }}
            />
            {renderUploadButtons("question")}
          </section>

          <section
            style={{
              background: "#fff",
              borderRadius: "16px",
              padding: "20px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
            }}
          >
            <h2 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "10px" }}>
              Standard Answer
            </h2>
            <textarea
              value={standardAnswer}
              onChange={(e) => setStandardAnswer(e.target.value)}
              placeholder="Paste or upload standard answer here..."
              style={{
                width: "100%",
                minHeight: "180px",
                padding: "12px",
                borderRadius: "12px",
                border: "1px solid #cbd5e1",
                outline: "none",
                resize: "vertical",
              }}
            />
            {renderUploadButtons("standard")}
          </section>

          <section
            style={{
              background: "#fff",
              borderRadius: "16px",
              padding: "20px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
            }}
          >
            <h2 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "10px" }}>
              Student Answer
            </h2>
            <textarea
              value={studentAnswer}
              onChange={(e) => setStudentAnswer(e.target.value)}
              placeholder="Paste or upload student answer here..."
              style={{
                width: "100%",
                minHeight: "180px",
                padding: "12px",
                borderRadius: "12px",
                border: "1px solid #cbd5e1",
                outline: "none",
                resize: "vertical",
              }}
            />
            {renderUploadButtons("student")}
          </section>
        </div>

        <div style={{ marginTop: "24px" }}>
          <button
            onClick={handleGradePaper}
            disabled={loading}
            style={{
              padding: "12px 20px",
              borderRadius: "12px",
              border: "none",
              background: loading ? "#94a3b8" : "#16a34a",
              color: "#fff",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Grading..." : "Grade Exam Paper"}
          </button>
        </div>

        {result && (
          <section
            style={{
              marginTop: "28px",
              background: "#fff",
              borderRadius: "16px",
              padding: "20px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
            }}
          >
            <h2 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "16px" }}>
              Grading Result
            </h2>

            {typeof result.score !== "undefined" && (
              <p style={{ marginBottom: "10px" }}>
                <strong>Score:</strong> {result.score} / {result.full_marks}
              </p>
            )}

            {result.feedback && (
              <p style={{ marginBottom: "10px", whiteSpace: "pre-wrap" }}>
                <strong>Feedback:</strong> {result.feedback}
              </p>
            )}

            {result.improvement && (
              <p style={{ marginBottom: "10px", whiteSpace: "pre-wrap" }}>
                <strong>Improvement:</strong> {result.improvement}
              </p>
            )}

            {Array.isArray(result.scoring_points) && result.scoring_points.length > 0 && (
              <div style={{ marginTop: "12px" }}>
                <strong>Scoring Points:</strong>
                <ul style={{ marginTop: "8px", paddingLeft: "20px" }}>
                  {result.scoring_points.map((point, index) => (
                    <li key={index}>{point}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}