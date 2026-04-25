"use client";

export default function ThinkingBubble() {
  return (
    <div className="relative animate-fade-in">
      <div
        className="rounded-[16px] px-5 py-4 flex items-center gap-2"
        style={{
          backgroundColor: "#2A2A2A",
          border: "1px solid #3A3A3A",
          boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
        }}
      >
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="inline-block w-2 h-2 rounded-full animate-bounce"
            style={{
              backgroundColor: "#C8A96E",
              animationDelay: `${delay}ms`,
              animationDuration: "0.8s",
            }}
          />
        ))}
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
