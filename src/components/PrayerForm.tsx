"use client";

import { useState } from "react";

interface PrayerFormProps {
  onSubmit: (text: string, name: string) => Promise<void>;
  justSent: boolean;
}

export default function PrayerForm({ onSubmit, justSent }: PrayerFormProps) {
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [isSending, setIsSending] = useState(false);

  const maxChars = 500;
  const canSend = text.trim().length > 0 && !isSending;

  const handleSubmit = async () => {
    if (!canSend) return;
    setIsSending(true);
    await onSubmit(text.trim(), name.trim());
    setText("");
    setName("");
    setIsSending(false);
  };

  if (justSent) {
    return (
      <div
        className="rounded-[12px] p-6 text-center animate-fade-in"
        style={{
          backgroundColor: "rgba(200,169,110,0.08)",
          border: "1px solid rgba(200,169,110,0.3)",
        }}
      >
        <span className="block text-[1.6rem] mb-2">🪷</span>
        <p
          className="font-display italic text-[1.05rem]"
          style={{ color: "#E8D5A8" }}
        >
          Your prayer has been offered.
        </p>
        <p
          className="font-body text-[0.82rem] mt-1"
          style={{ color: "#6E6A62" }}
        >
          May it be carried on the wind.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-[12px] p-6"
      style={{ backgroundColor: "#2A2A2A", border: "1px solid #3A3A3A" }}
    >
      <p
        className="font-display italic text-[0.9rem] mb-4"
        style={{ color: "#6E6A62" }}
      >
        Share your prayer, intention, or wish. All are welcome here.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, maxChars))}
        placeholder="May all beings be free from suffering\u2026"
        rows={4}
        className="w-full rounded-[10px] px-4 py-3 text-[0.95rem] font-body resize-none outline-none transition-colors duration-300 mb-3"
        style={{
          backgroundColor: "#242424",
          border: "1px solid #3A3A3A",
          color: "#F0EDE6",
          lineHeight: "1.7",
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = "#C8A96E")}
        onBlur={(e) => (e.currentTarget.style.borderColor = "#3A3A3A")}
      />

      <div className="flex justify-end mb-3">
        <span
          className="font-body text-[0.72rem]"
          style={{ color: "#3A3A3A" }}
        >
          {text.length} / {maxChars}
        </span>
      </div>

      <div className="flex gap-3 items-center">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name (optional)"
          className="flex-1 rounded-[10px] px-4 py-[11px] text-[0.88rem] font-body outline-none transition-colors duration-300"
          style={{
            backgroundColor: "#242424",
            border: "1px solid #3A3A3A",
            color: "#F0EDE6",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#C8A96E")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#3A3A3A")}
        />
        <button
          onClick={handleSubmit}
          disabled={!canSend}
          className="rounded-[10px] px-5 py-[11px] font-body text-[0.88rem] font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          style={{ backgroundColor: "#C8A96E", color: "#1A1A1A" }}
        >
          {isSending ? "Sending\u2026" : "\uD83D\uDE4F Offer prayer"}
        </button>
      </div>
    </div>
  );
}
