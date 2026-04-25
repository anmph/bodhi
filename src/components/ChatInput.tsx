"use client";

import { useEffect, useState, KeyboardEvent } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  initialValue?: string;
}

export default function ChatInput({ onSend, isLoading, initialValue = "" }: ChatInputProps) {
  const [input, setInput] = useState("");

  useEffect(() => {
    if (initialValue.trim().length > 0) {
      setInput(initialValue);
    }
  }, [initialValue]);

  const canSend = input.trim().length > 0 && !isLoading;

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setInput("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex gap-3 pt-2">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask Bodhi anything..."
        disabled={isLoading}
        className="flex-1 rounded-[10px] px-[18px] py-[14px] text-[0.95rem] font-body outline-none transition-colors duration-300 disabled:opacity-60"
        style={{
          backgroundColor: "#242424",
          border: "1px solid #3A3A3A",
          color: "#F0EDE6",
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = "#C8A96E")}
        onBlur={(e) => (e.currentTarget.style.borderColor = "#3A3A3A")}
      />
      <button
        onClick={handleSend}
        disabled={!canSend}
        className="w-12 h-12 rounded-[10px] flex items-center justify-center text-lg font-bold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        style={{ backgroundColor: "#C8A96E", color: "#1A1A1A" }}
      >
        →
      </button>
    </div>
  );
}
