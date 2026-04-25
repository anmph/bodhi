"use client";

import ReactMarkdown from "react-markdown";

interface SpeechBubbleProps {
  content: string;
  isStreaming?: boolean;
}

export default function SpeechBubble({ content, isStreaming }: SpeechBubbleProps) {
  return (
    <div className="relative max-w-[340px] w-full animate-fade-in">
      <div
        className="rounded-[16px] px-5 py-4 text-[0.95rem] font-body leading-[1.7]"
        style={{
          backgroundColor: "#2A2A2A",
          border: "1px solid #3A3A3A",
          color: "#E8D5A8",
          boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
        }}
      >
        <ReactMarkdown
          components={{
            p: ({ children }) => <p style={{ marginBottom: "0.5em" }}>{children}</p>,
            strong: ({ children }) => (
              <strong style={{ color: "#F0EDE6", fontWeight: 600 }}>{children}</strong>
            ),
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
            ol: ({ children }) => (
              <ol
                style={{
                  paddingLeft: "1.2em",
                  marginBottom: "0.5em",
                  listStyleType: "decimal",
                }}
              >
                {children}
              </ol>
            ),
            ul: ({ children }) => (
              <ul
                style={{
                  paddingLeft: "1.2em",
                  marginBottom: "0.5em",
                  listStyleType: "disc",
                }}
              >
                {children}
              </ul>
            ),
            li: ({ children }) => <li style={{ marginBottom: "0.15em" }}>{children}</li>,
          }}
        >
          {content}
        </ReactMarkdown>

        {isStreaming && (
          <span
            className="inline-block w-[2px] h-[1em] ml-[2px] animate-pulse align-middle"
            style={{ backgroundColor: "#C8A96E", verticalAlign: "middle" }}
          />
        )}
      </div>

      <div
        style={{
          position: "absolute",
          bottom: -10,
          left: "50%",
          transform: "translateX(-50%)",
          width: 0,
          height: 0,
          borderLeft: "10px solid transparent",
          borderRight: "10px solid transparent",
          borderTop: "11px solid #3A3A3A",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -8,
          left: "50%",
          transform: "translateX(-50%)",
          width: 0,
          height: 0,
          borderLeft: "9px solid transparent",
          borderRight: "9px solid transparent",
          borderTop: "10px solid #2A2A2A",
        }}
      />
    </div>
  );
}
