"use client";

const QUOTES = [
  {
    text: "Peace comes from within. Do not seek it without.",
    source: "Siddhartha Gautama",
  },
  {
    text: "In the end, only three things matter: how much you loved, how gently you lived, and how gracefully you let go of things not meant for you.",
    source: "Attributed to the Buddha",
  },
  {
    text: "The mind is everything. What you think, you become.",
    source: "Dhammapada",
  },
  {
    text: "Do not dwell in the past, do not dream of the future, concentrate the mind on the present moment.",
    source: "The Buddha",
  },
  {
    text: "Holding onto anger is like drinking poison and expecting the other person to die.",
    source: "Attributed to the Buddha",
  },
  {
    text: "You yourself must strive. The Buddhas only point the way.",
    source: "Dhammapada 276",
  },
  {
    text: "There is no path to happiness: happiness is the path.",
    source: "Attributed to the Buddha",
  },
];

function getTodaysQuote() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return QUOTES[dayOfYear % QUOTES.length];
}

export default function DailyWisdom() {
  const quote = getTodaysQuote();

  return (
    <div
      className="rounded-[10px] px-6 py-5 mb-6 transition-colors duration-300"
      style={{
        backgroundColor: "#2A2A2A",
        border: "1px solid #3A3A3A",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.borderColor = "#C8A96E")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.borderColor = "#3A3A3A")
      }
    >
      <span
        className="block font-display text-[0.85rem] mb-2"
        style={{ color: "#C8A96E" }}
      >
        ☸ Today&apos;s Teaching
      </span>
      <p
        className="font-display italic text-[1.05rem] leading-[1.6] mb-2"
        style={{ color: "#E8D5A8" }}
      >
        &ldquo;{quote.text}&rdquo;
      </p>
      <span className="text-[0.8rem]" style={{ color: "#6E6A62" }}>
        — {quote.source}
      </span>
    </div>
  );
}
