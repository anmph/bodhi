"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import ToolActivityBanner from "./ToolActivityBanner";

interface Message {
  role: "user" | "assistant";
  content: string;
  toolsUsed?: string[];
}

const GREETING: Message = {
  role: "assistant",
  content:
    "Welcome. I\u2019m Bodhi, your companion on the path. Ask me anything about Buddhist teachings, meditation, or finding peace in daily life. \uD83E\uDEB7",
};

export default function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTools, setActiveTools] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async (content: string) => {
    const userMessage: Message = { role: "user", content };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);
    setActiveTools([]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!res.ok) throw new Error("API request failed");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader available");

      const decoder = new TextDecoder();
      let buffer = "";
      let preambleParsed = false;
      let toolsUsedForThisMessage: string[] = [];
      let assistantContent = "";

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "", toolsUsed: [] },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        if (!preambleParsed) {
          const separatorIndex = buffer.indexOf("---STREAM---\n");
          if (separatorIndex !== -1) {
            const preamble = buffer.slice(0, separatorIndex).trim();
            try {
              const meta = JSON.parse(preamble);
              toolsUsedForThisMessage = meta.tools ?? [];
              setActiveTools(meta.tools ?? []);
            } catch {
              /* preamble parse failed — continue gracefully */
            }
            buffer = buffer.slice(separatorIndex + "---STREAM---\n".length);
            preambleParsed = true;
          } else {
            continue;
          }
        }

        assistantContent += buffer;
        buffer = "";
        const snapshot = assistantContent;

        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: "assistant",
            content: snapshot,
            toolsUsed: toolsUsedForThisMessage,
          };
          return next;
        });
        scrollToBottom();
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I\u2019m sorry, I wasn\u2019t able to respond just now. Please try again in a moment.",
        },
      ]);
    } finally {
      setIsLoading(false);
      setActiveTools([]);
    }
  };

  return (
    <div className="flex flex-col min-h-[60vh]">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto py-4 space-y-1 scroll-smooth"
      >
        {messages.map((msg, i) => (
          <MessageBubble
            key={i}
            role={msg.role}
            content={msg.content}
            toolsUsed={msg.toolsUsed}
          />
        ))}
      </div>

      <div
        className="sticky bottom-0 backdrop-blur-sm pb-2 pt-1"
        style={{ backgroundColor: "rgba(26, 26, 26, 0.8)" }}
      >
        {isLoading && <ToolActivityBanner activeTools={activeTools} />}
        <ChatInput onSend={handleSend} isLoading={isLoading} />
      </div>
    </div>
  );
}
