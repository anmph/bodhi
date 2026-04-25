"use client";

import { useCallback, useRef, useState } from "react";
import NavBar from "@/components/NavBar";
import AuthGate from "@/components/auth/AuthGate";

interface IdentifyResult {
  name: string;
  tradition: string;
  clues: string;
  significance: string;
  fullResponse: string;
}

function dataUrlToPayload(dataUrl: string): { image: string; mediaType: string } | null {
  const m = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!m) return null;
  return { mediaType: m[1], image: m[2] };
}

export default function IdentifyPage() {
  return (
    <AuthGate message="Sign in with Google to use Buddhist image identification.">
      <IdentifyPageInner />
    </AuthGate>
  );
}

function IdentifyPageInner() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [payload, setPayload] = useState<{ image: string; mediaType: string } | null>(
    null
  );
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IdentifyResult | null>(null);
  const [followUp, setFollowUp] = useState("");

  const clearImage = useCallback(() => {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setPayload(null);
    setResult(null);
    setError(null);
  }, []);

  const setFile = useCallback((file: File | null) => {
    if (!file || !file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    setError(null);
    setResult(null);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== "string") return;
      const parsed = dataUrlToPayload(dataUrl);
      if (!parsed) {
        setError("Could not read image.");
        return;
      }
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
      setPayload(parsed);
    };
    reader.readAsDataURL(file);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      const f = e.dataTransfer.files?.[0];
      if (f) setFile(f);
    },
    [setFile]
  );

  const onIdentify = async (question?: string) => {
    if (!payload) {
      setError("Add an image first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: payload.image,
          mediaType: payload.mediaType,
          ...(question?.trim() ? { question: question.trim() } : {}),
        }),
      });
      const data = (await res.json()) as IdentifyResult & { error?: string };
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Request failed.");
        return;
      }
      setResult({
        name: data.name ?? "",
        tradition: data.tradition ?? "",
        clues: data.clues ?? "",
        significance: data.significance ?? "",
        fullResponse: data.fullResponse ?? "",
      });
      if (question !== undefined) setFollowUp("");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative z-10 min-h-screen font-body"
      style={{ backgroundColor: "#1A1A1A", color: "#F0EDE6" }}
    >
      <div className="max-w-[720px] mx-auto px-4 sm:px-6 pt-6 pb-14">
        <NavBar />

        <header className="mb-8">
          <p className="font-display text-[0.85rem] mb-1" style={{ color: "#C8A96E" }}>
            Practice tools
          </p>
          <h1 className="font-display text-[1.85rem] sm:text-[2.1rem] font-semibold tracking-tight">
            Buddhist image identification
          </h1>
          <p className="mt-2 text-[0.92rem] leading-relaxed" style={{ color: "#A8A49C" }}>
            Upload a photo of a statue, thangka, or symbol. Bodhi will suggest who or what
            it may represent and why — not as definitive religious authority, but as a
            scholarly starting point.
          </p>
        </header>

        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragActive(false);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className="rounded-[14px] border-2 border-dashed px-5 py-10 text-center cursor-pointer transition-colors mb-6"
          style={{
            backgroundColor: "#242424",
            borderColor: dragActive ? "#C8A96E" : "#3A3A3A",
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setFile(f ?? null);
              e.target.value = "";
            }}
          />
          <p className="font-display text-[1.05rem] mb-1" style={{ color: "#C8A96E" }}>
            Drop an image here
          </p>
          <p className="text-[0.85rem]" style={{ color: "#8F8A81" }}>
            or click to select · images only
          </p>
        </div>

        {previewUrl && (
          <div className="mb-6">
            <div
              className="rounded-[14px] overflow-hidden mb-3"
              style={{ backgroundColor: "#242424", border: "1px solid #333333" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Selected upload preview"
                className="w-full max-h-[320px] object-contain"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={loading || !payload}
                onClick={(e) => {
                  e.stopPropagation();
                  void onIdentify();
                }}
                className="px-4 py-2 rounded-full font-semibold text-[0.9rem] disabled:opacity-50"
                style={{ backgroundColor: "#C8A96E", color: "#1A1A1A" }}
              >
                {loading ? "Identifying…" : "Identify"}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  clearImage();
                }}
                className="px-4 py-2 rounded-full text-[0.88rem]"
                style={{
                  backgroundColor: "transparent",
                  border: "1px solid #3A3A3A",
                  color: "#A8A49C",
                }}
              >
                Clear image
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className="mb-4 text-[0.88rem]" style={{ color: "#E8A0A0" }}>
            {error}
          </p>
        )}

        {result && (
          <div className="space-y-6">
            <article
              className="rounded-[14px] p-5 sm:p-6"
              style={{
                backgroundColor: "#242424",
                border: "1px solid #333333",
                boxShadow: "0 0 28px rgba(200, 169, 110, 0.06)",
              }}
            >
              <h2 className="font-display text-[1.35rem] mb-4" style={{ color: "#C8A96E" }}>
                {result.name || "Identification"}
              </h2>
              <dl className="space-y-4 text-[0.92rem] leading-relaxed">
                <div>
                  <dt className="font-display text-[0.78rem] uppercase tracking-wide mb-1" style={{ color: "#8F8A81" }}>
                    Tradition
                  </dt>
                  <dd style={{ color: "#F0EDE6" }}>{result.tradition || "—"}</dd>
                </div>
                <div>
                  <dt className="font-display text-[0.78rem] uppercase tracking-wide mb-1" style={{ color: "#8F8A81" }}>
                    Iconographic clues
                  </dt>
                  <dd className="whitespace-pre-wrap" style={{ color: "#D4CFC7" }}>
                    {result.clues || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="font-display text-[0.78rem] uppercase tracking-wide mb-1" style={{ color: "#8F8A81" }}>
                    Historical &amp; spiritual context
                  </dt>
                  <dd className="whitespace-pre-wrap" style={{ color: "#D4CFC7" }}>
                    {result.significance || "—"}
                  </dd>
                </div>
              </dl>
            </article>

            <div
              className="rounded-[14px] p-4"
              style={{ backgroundColor: "#242424", border: "1px solid #2F2F2F" }}
            >
              <p className="font-display text-[0.8rem] mb-2" style={{ color: "#8F8A81" }}>
                Follow-up (same image)
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={followUp}
                  onChange={(e) => setFollowUp(e.target.value)}
                  placeholder="e.g. What does the lotus usually mean here?"
                  className="flex-1 rounded-[10px] px-3 py-2 text-[0.88rem] outline-none focus:ring-1 focus:ring-[#C8A96E]"
                  style={{
                    backgroundColor: "#1A1A1A",
                    border: "1px solid #3A3A3A",
                    color: "#F0EDE6",
                  }}
                />
                <button
                  type="button"
                  disabled={loading || !followUp.trim()}
                  onClick={() => void onIdentify(followUp)}
                  className="shrink-0 px-4 py-2 rounded-full font-semibold text-[0.88rem] disabled:opacity-45"
                  style={{ backgroundColor: "#C8A96E", color: "#1A1A1A" }}
                >
                  Ask
                </button>
              </div>
            </div>

            {result.fullResponse && (
              <details className="text-[0.8rem]" style={{ color: "#6E6A62" }}>
                <summary className="cursor-pointer font-display" style={{ color: "#8F8A81" }}>
                  Raw model response
                </summary>
                <pre className="mt-2 whitespace-pre-wrap break-words p-3 rounded-[10px] overflow-x-auto" style={{ backgroundColor: "#1A1A1A" }}>
                  {result.fullResponse}
                </pre>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
