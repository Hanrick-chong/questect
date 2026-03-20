"use client";

import { useState } from "react";
import Navbar from "../components/Navbar";

type UploadTarget = "teaching" | "standard" | "student";

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

type GradeResult = {
  score?: number;
  full_marks?: number;
  feedback?: string;
  improvement?: string;
  scoring_points?: string[];
  subquestions?: {
    question_number: string;
    full_marks: number;
    score: number;
    feedback: string;
    improvement: string;
    scoring_points?: string[];
  }[];
};

export default function QuickGradingPage() {
  const [teachingContent, setTeachingContent] = useState("");
  const [standardAnswer, setStandardAnswer] = useState("");
  const [studentAnswer, setStudentAnswer] = useState("");

  const [result, setResult] = useState<GradeResult | null>(null);
  const [loading, setLoading] = useState(false);

  const [uploadingField, setUploadingField] = useState<UploadTarget | null>(
    null
  );
  const [scanLoading, setScanLoading] = useState(false);
  const [scanMessage, setScanMessage] = useState("");

  const [lastDetected, setLastDetected] = useState<{
    type: "teaching" | "standard" | "student" | "unknown";
    confidence: "low" | "medium" | "high";
    text: string;
    warnings: string[];
    fileName: string;
  } | null>(null);

  function appendText(target: UploadTarget, text: string) {
    if (!text.trim()) return;

    if (target === "teaching") {
      setTeachingContent((prev) => (prev ? `${prev}\n\n${text}` : text));
    }

    if (target === "standard") {
      setStandardAnswer((prev) => (prev ? `${prev}\n\n${text}` : text));
    }

    if (target === "student") {
      setStudentAnswer((prev) => (prev ? `${prev}\n\n${text}` : text));
    }
  }

  function replaceLastDetectedInto(target: UploadTarget) {
    if (!lastDetected?.text?.trim()) return;
    appendText(target, lastDetected.text);
    setScanMessage(`Last scan added to ${target}.`);
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

      appendText(target, combinedText);
    } catch (error) {
      console.error("File upload error:", error);
      alert("Error uploading file.");
    } finally {
      setUploadingField(null);
      e.target.value = "";
    }
  }

  async function handleImageUpload(
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

      appendText(target, combinedText);
      setScanMessage("Image scanned successfully.");
    } catch (error) {
      console.error("Image upload error:", error);
      setScanMessage("Error scanning image.");
    } finally {
      setScanLoading(false);
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
    setScanMessage("Running smart scan...");

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
        setScanMessage("Smart scan failed.");
        return;
      }

      const successfulResults = data.results.filter(
        (item: ParsedFileItem) => item.success && item.extractedText
      );

      if (successfulResults.length === 0) {
        setScanMessage("No readable text found.");
        return;
      }

      const combinedText = successfulResults
        .map((item: ParsedFileItem) => item.extractedText.trim())
        .filter(Boolean)
        .join("\n\n")
        .trim();

      if (!combinedText) {
        setScanMessage("No readable text found.");
        return;
      }

      appendText(target, combinedText);

      const firstItem = successfulResults[0] as ParsedFileItem;
      setLastDetected({
        type: firstItem.detectedType,
        confidence: firstItem.confidenceNote,
        text: combinedText,
        warnings: firstItem.warnings || [],
        fileName: firstItem.fileName,
      });

      setScanMessage("Smart scan completed. Please review the extracted text.");
    } catch (error) {
      console.error("Smart scan error:", error);
      setScanMessage("Error during smart scan.");
    } finally {
      setScanLoading(false);
      e.target.value = "";
    }
  }

  async function handleGrade() {
    if (!teachingContent || !standardAnswer || !studentAnswer) {
      alert(
        "Please fill in Teaching Content, Standard Answer, and Student Answer."
      );
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/grade", {
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

      const data = await res.json();

      if (!res.ok) {
        console.error("Grade API error:", data);
        alert(data.error || "Failed to grade answer.");
        return;
      }

      setResult(data);
    } catch (error) {
      console.error("Grading error:", error);
      alert("Something went wrong while grading.");
    } finally {
      setLoading(false);
    }
  }
    function renderActionButtons(target: UploadTarget) {
  const isUploading = uploadingField === target;

  return (
    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "12px" }}>
      {/* Upload File */}
      <label
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "9px 14px",
          background: "#2563eb",
          color: "#fff",
          borderRadius: "10px",
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

      {/* Smart Scan（拍照 + OCR + 智能识别） */}
      <label
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "9px 14px",
          background: "#7c3aed",
          color: "#fff",
          borderRadius: "10px",
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
  function renderSection(
    title: string,
    placeholder: string,
    value: string,
    onChange: (value: string) => void,
    target: UploadTarget
  ) {
    return (
      <section
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          padding: "20px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
        }}
      >
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "10px" }}>
          {title}
        </h2>

        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: "100%",
            minHeight: "180px",
            padding: "12px",
            borderRadius: "12px",
            border: "1px solid #cbd5e1",
            outline: "none",
            resize: "vertical",
            fontSize: "15px",
            lineHeight: 1.5,
          }}
        />

        {renderActionButtons(target)}
      </section>
    );
  }
    return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <Navbar />

      <main
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "24px 16px 60px",
        }}
      >
        <h1 style={{ fontSize: "32px", fontWeight: 800, marginBottom: "8px" }}>
          Quick Grading
        </h1>

        <p style={{ color: "#475569", marginBottom: "22px" }}>
          Upload lesson materials, sample answers, and student responses. Then use AI to grade the student answer and generate feedback.
        </p>

        {scanMessage && (
          <div
            style={{
              marginBottom: "16px",
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

        {lastDetected && (
          <div
            style={{
              marginBottom: "20px",
              padding: "14px",
              borderRadius: "12px",
              background: "#ffffff",
              border: "1px solid #e2e8f0",
            }}
          >
            <p style={{ marginBottom: "8px" }}>
              <strong>Last Smart Scan:</strong> {lastDetected.fileName}
            </p>
            <p style={{ marginBottom: "8px" }}>
              <strong>Detected as:</strong> {lastDetected.type} ({lastDetected.confidence})
            </p>

            {lastDetected.warnings?.length > 0 && (
              <div style={{ marginBottom: "10px", color: "#9a3412" }}>
                {lastDetected.warnings.map((warning, index) => (
                  <div key={index}>⚠ {warning}</div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                onClick={() => replaceLastDetectedInto("teaching")}
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                Add to Teaching Notes
              </button>

              <button
                onClick={() => replaceLastDetectedInto("standard")}
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                Add to Sample Answer
              </button>

              <button
                onClick={() => replaceLastDetectedInto("student")}
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                Add to Student Response
              </button>
            </div>
          </div>
        )}

        <div style={{ display: "grid", gap: "20px" }}>
          {renderSection(
            "Teaching Notes / Marking Context",
            "Paste or upload lesson notes, marking context, or teaching content here...",
            teachingContent,
            setTeachingContent,
            "teaching"
          )}

          {renderSection(
            "Sample Answer / Marking Scheme",
            "Paste or upload the standard answer or marking scheme here...",
            standardAnswer,
            setStandardAnswer,
            "standard"
          )}

          {renderSection(
            "Student Response",
            "Paste or upload the student answer here...",
            studentAnswer,
            setStudentAnswer,
            "student"
          )}
        </div>

        <div style={{ marginTop: "26px" }}>
          <button
            onClick={handleGrade}
            disabled={loading}
            style={{
              padding: "13px 22px",
              borderRadius: "12px",
              border: "none",
              background: loading ? "#94a3b8" : "#16a34a",
              color: "#fff",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: "15px",
            }}
          >
            {loading ? "Grading..." : "Grade Answer"}
          </button>
        </div>

        {result && (
          <section
            style={{
              marginTop: "28px",
              background: "#ffffff",
              borderRadius: "16px",
              padding: "20px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
            }}
          >
            <h2 style={{ fontSize: "22px", fontWeight: 800, marginBottom: "16px" }}>
              AI Grading Result
            </h2>

            {typeof result.score !== "undefined" && (
              <p style={{ marginBottom: "10px" }}>
                <strong>Score:</strong> {result.score} / {result.full_marks}
              </p>
            )}

            {result.feedback && (
              <p style={{ marginBottom: "10px", whiteSpace: "pre-wrap" }}>
                <strong>Evaluation:</strong> {result.feedback}
              </p>
            )}

            {result.improvement && (
              <p style={{ marginBottom: "10px", whiteSpace: "pre-wrap" }}>
                <strong>Suggested Improvement:</strong> {result.improvement}
              </p>
            )}

            {Array.isArray(result.scoring_points) &&
              result.scoring_points.length > 0 && (
                <div style={{ marginTop: "12px" }}>
                  <strong>Key Scoring Points:</strong>
                  <ul style={{ marginTop: "8px", paddingLeft: "20px" }}>
                    {result.scoring_points.map((point, index) => (
                      <li key={index}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}

            {Array.isArray(result.subquestions) &&
              result.subquestions.length > 0 && (
                <div style={{ marginTop: "20px" }}>
                  <strong>Subquestion Results:</strong>
                  <div style={{ marginTop: "12px", display: "grid", gap: "12px" }}>
                    {result.subquestions.map((item, index) => (
                      <div
                        key={index}
                        style={{
                          border: "1px solid #e2e8f0",
                          borderRadius: "12px",
                          padding: "14px",
                        }}
                      >
                        <p>
                          <strong>Question:</strong> {item.question_number}
                        </p>
                        <p>
                          <strong>Score:</strong> {item.score} / {item.full_marks}
                        </p>
                        <p style={{ whiteSpace: "pre-wrap" }}>
                          <strong>Evaluation:</strong> {item.feedback}
                        </p>
                        <p style={{ whiteSpace: "pre-wrap" }}>
                          <strong>Suggested Improvement:</strong> {item.improvement}
                        </p>

                        {Array.isArray(item.scoring_points) &&
                          item.scoring_points.length > 0 && (
                            <ul style={{ marginTop: "8px", paddingLeft: "20px" }}>
                              {item.scoring_points.map((point, i) => (
                                <li key={i}>{point}</li>
                              ))}
                            </ul>
                          )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </section>
        )}
      </main>
    </div>
  );
}