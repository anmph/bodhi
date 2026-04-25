"use client";

import ReactMarkdown from "react-markdown";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  toolsUsed?: string[];
}

const TOOL_CHIP_LABELS: Record<string, { icon: string; label: string }> = {
  retrieve_scripture: { icon: "☸", label: "Scripture" },
  search_web: { icon: "🔍", label: "Web search" },
  suggest_learning_path: { icon: "🗺", label: "Learning path" },
};

export default function MessageBubble({
  role,
  content,
  toolsUsed,
}: MessageBubbleProps) {
  const isUser = role === "user";

  const bubbleStyle = isUser
    ? {
        backgroundColor: "rgba(200, 169, 110, 0.12)",
        border: "1px solid rgba(200, 169, 110, 0.25)",
        borderRadius: "12px 0 12px 12px",
        color: "#F0EDE6",
      }
    : {
        backgroundColor: "#2A2A2A",
        border: "1px solid #3A3A3A",
        borderRadius: "0 12px 12px 12px",
        color: "#A8A49C",
      };

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3 animate-fade-in`}
    >
      <div className="max-w-[85%]">
        {!isUser && (
          <span
            className="block text-[0.75rem] mb-1 ml-1"
            style={{ color: "#6E6A62" }}
          >
            ☸ Bodhi
          </span>
        )}

        <div
          className="px-[18px] py-[14px] text-[0.95rem] font-body leading-[1.7]"
          style={bubbleStyle}
        >
          {isUser ? (
            <span className="whitespace-pre-wrap">{content}</span>
          ) : (
            <ReactMarkdown
              components={{
                p: ({ children }) => (
                  <p style={{ marginBottom: "0.6em" }}>{children}</p>
                ),
                strong: ({ children }) => (
                  <strong style={{ color: "#F0EDE6", fontWeight: 600 }}>
                    {children}
                  </strong>
                ),
                em: ({ children }) => (
                  <em style={{ color: "#C8A96E" }}>{children}</em>
                ),
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "#C8A96E",
                      textDecoration: "underline",
                      wordBreak: "break-all",
                    }}
                  >
                    {children}
                  </a>
                ),
                ol: ({ children }) => (
                  <ol
                    style={{
                      paddingLeft: "1.2em",
                      marginBottom: "0.6em",
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
                      marginBottom: "0.6em",
                      listStyleType: "disc",
                    }}
                  >
                    {children}
                  </ul>
                ),
                li: ({ children }) => (
                  <li style={{ marginBottom: "0.2em" }}>{children}</li>
                ),
                h3: ({ children }) => (
                  <h3
                    style={{
                      color: "#F0EDE6",
                      fontWeight: 600,
                      marginBottom: "0.4em",
                    }}
                  >
                    {children}
                  </h3>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          )}
        </div>

        {/* Tool source chips */}
        {!isUser && toolsUsed && toolsUsed.length > 0 && (
          <div className="flex items-center gap-2 mt-2 ml-1 flex-wrap">
            {toolsUsed.map((tool) => {
              const chip = TOOL_CHIP_LABELS[tool] ?? { icon: "⚙", label: tool };
              return (
                <span
                  key={tool}
                  className="inline-flex items-center gap-1 px-2 py-[3px] rounded-full text-[0.72rem] font-body"
                  style={{
                    backgroundColor: "rgba(200, 169, 110, 0.1)",
                    border: "1px solid rgba(200, 169, 110, 0.25)",
                    color: "#C8A96E",
                  }}
                >
                  {chip.icon} {chip.label}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
