"use client";

interface ToolActivityBannerProps {
  activeTools: string[];
}

const TOOL_LABELS: Record<string, { icon: string; label: string }> = {
  retrieve_scripture: { icon: "☸", label: "Searching scriptures\u2026" },
  search_web: { icon: "\uD83D\uDD0D", label: "Searching the web\u2026" },
  suggest_learning_path: { icon: "\uD83D\uDDFA", label: "Building your path\u2026" },
};

export default function ToolActivityBanner({
  activeTools,
}: ToolActivityBannerProps) {
  const isThinking = activeTools.length === 0;

  return (
    <div className="flex items-center gap-3 px-1 py-2">
      <span
        className="inline-block w-2 h-2 rounded-full animate-pulse"
        style={{ backgroundColor: "#C8A96E" }}
      />
      {isThinking ? (
        <span className="text-sm italic" style={{ color: "#6E6A62" }}>
          Bodhi is reflecting&hellip;
        </span>
      ) : (
        <div className="flex items-center gap-3">
          {activeTools.map((tool) => {
            const config = TOOL_LABELS[tool] ?? {
              icon: "\u2699",
              label: "Working\u2026",
            };
            return (
              <span
                key={tool}
                className="text-sm italic"
                style={{ color: "#C8A96E" }}
              >
                {config.icon} {config.label}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
