"use client";

import ReactMarkdown from "react-markdown";

interface HistoryMessageProps {
  role: "user" | "assistant";
  content: string;
}

export default function HistoryMessage({ role, content }: HistoryMessageProps) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-2 animate-fade-in`}>
      {!isUser && (
        <span
          className="text-[0.65rem] mr-2 mt-1 shrink-0"
          style={{ color: "#6E6A62" }}
        >
          ☸
        </span>
      )}

      <div
        className="max-w-[80%] px-3 py-2 rounded-[10px] text-[0.8rem] font-body leading-[1.55]"
        style={
          isUser
            ? {
                backgroundColor: "rgba(200, 169, 110, 0.1)",
                border: "1px solid rgba(200, 169, 110, 0.2)",
                color: "#C8A96E",
              }
            : {
                backgroundColor: "#242424",
                border: "1px solid #2A2A2A",
                color: "#A8A49C",
              }
        }
      >
        {isUser ? (
          <span>{content}</span>
        ) : (
          <ReactMarkdown
            components={{
              p: ({ children }) => <p style={{ marginBottom: "0.3em" }}>{children}</p>,
              strong: ({ children }) => <strong style={{ color: "#E8D5A8" }}>{children}</strong>,
              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#C8A96E", textDecoration: "underline" }}
                >
                  {children}
                </a>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}
