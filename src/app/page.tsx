"use client";

import Link from "next/link";
import { MessageCircle, BookOpen, Timer, HandHeart, Eye, Compass } from "lucide-react";
import AuthButton from "@/components/auth/AuthButton";

const QUOTES = [
  { text: "Peace comes from within. Do not seek it without.", source: "Siddhartha Gautama" },
  {
    text: "In the end, only three things matter: how much you loved, how gently you lived, and how gracefully you let go.",
    source: "Attributed to the Buddha",
  },
  { text: "The mind is everything. What you think, you become.", source: "Dhammapada" },
  {
    text: "Do not dwell in the past, do not dream of the future, concentrate the mind on the present moment.",
    source: "The Buddha",
  },
  {
    text: "Holding onto anger is like drinking poison and expecting the other person to die.",
    source: "Attributed to the Buddha",
  },
  { text: "You yourself must strive. The Buddhas only point the way.", source: "Dhammapada 276" },
  { text: "There is no path to happiness: happiness is the path.", source: "Attributed to the Buddha" },
];

type PathKey = "chat" | "read" | "meditate" | "pray" | "identify" | "reflect";

const CARD_PATHS: {
  href: string;
  title: string;
  key: PathKey;
  accent: string;
  description: string;
}[] = [
  {
    href: "/chat",
    title: "Converse",
    key: "chat",
    accent: "#D4A574",
    description: "Seek guidance through conversation",
  },
  {
    href: "/scriptures",
    title: "Read",
    key: "read",
    accent: "#C4956A",
    description: "Explore sacred Buddhist texts",
  },
  {
    href: "/meditate",
    title: "Meditate",
    key: "meditate",
    accent: "#B8A06E",
    description: "Practice mindfulness with a guided timer",
  },
  {
    href: "/prayers",
    title: "Pray",
    key: "pray",
    accent: "#D1A05D",
    description: "Daily prayers and chanting",
  },
  {
    href: "/identify",
    title: "Identify",
    key: "identify",
    accent: "#C18A6D",
    description: "Discover Buddhist art and figures",
  },
  {
    href: "/dashboard",
    title: "Reflect",
    key: "reflect",
    accent: "#C8A96E",
    description: "Track your practice journey",
  },
];

function LotusMark() {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden="true"
      className="w-[104px] h-[104px] sm:w-[118px] sm:h-[118px] drop-shadow-[0_8px_20px_rgba(0,0,0,0.28)]"
    >
      <path d="M60 26C68 34 70 48 60 62C50 48 52 34 60 26Z" fill="#C8A96E" opacity="0.9" />
      <path d="M44 34C54 39 58 50 52 62C42 57 36 45 44 34Z" fill="#B8962E" opacity="0.9" />
      <path d="M76 34C84 45 78 57 68 62C62 50 66 39 76 34Z" fill="#B8962E" opacity="0.9" />
      <path d="M30 50C41 50 50 57 50 68C38 70 28 63 30 50Z" fill="#8F8A81" opacity="0.3" />
      <path d="M90 50C92 63 82 70 70 68C70 57 79 50 90 50Z" fill="#8F8A81" opacity="0.3" />
      <path d="M36 72C43 64 53 61 60 67C67 61 77 64 84 72C72 81 48 81 36 72Z" fill="#C8A96E" opacity="0.92" />
      <path d="M46 82H74" stroke="#C8A96E" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
      <circle cx="60" cy="64" r="2.4" fill="#E8D5A8" opacity="0.9" />
    </svg>
  );
}

function PathIllustration({ pathKey, accent }: { pathKey: PathKey; accent: string }) {
  const size = 36;
  const props = { size, color: accent, strokeWidth: 1.5 };
  switch (pathKey) {
    case "chat":
      return <MessageCircle {...props} />;
    case "read":
      return <BookOpen {...props} />;
    case "meditate":
      return <Timer {...props} />;
    case "pray":
      return <HandHeart {...props} />;
    case "identify":
      return <Eye {...props} />;
    case "reflect":
      return <Compass {...props} />;
  }
}

function getTodaysQuote() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return QUOTES[dayOfYear % QUOTES.length];
}

export default function LandingPage() {
  const quote = getTodaysQuote();

  return (
    <div className="relative z-10 min-h-screen overflow-hidden sacred-home">
      <div className="sacred-mountains" aria-hidden="true" />

      <main className="relative max-w-[1080px] mx-auto px-4 sm:px-8 pt-5 pb-12">
        <header className="sacred-reveal sacred-delay-1 flex items-center justify-between mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-[#C8A96E]">
            <span className="text-[1.05rem]">☸</span>
            <span className="font-display text-[1.65rem]">Bodhi</span>
          </Link>
          <div className="text-[#C8A96E] text-[50px] sacred-wheel-spin leading-none">☸</div>
          <AuthButton />
        </header>

        <section className="sacred-reveal sacred-delay-2 mb-10">
          <div className="mx-auto max-w-[760px] text-center px-2">
            <div className="flex justify-center mb-3">
              <div className="monk-idle">
                <LotusMark />
              </div>
            </div>
            <h1 className="font-display text-[3rem] leading-none mb-2" style={{ color: "#F0EDE6" }}>
              Bodhi
            </h1>
            <p className="font-display italic text-[1.25rem] mb-4" style={{ color: "#C8A96E" }}>
              Your Buddhist Practice Companion
            </p>
            <p className="text-[0.96rem] leading-[1.7]" style={{ color: "#8F8A81" }}>
              &ldquo;{quote.text}&rdquo;
            </p>
            <p className="text-[0.86rem] mt-1" style={{ color: "#8F8A81" }}>
              — {quote.source}
            </p>
          </div>
        </section>

        <section className="sacred-reveal sacred-delay-3 relative mb-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 max-w-[980px] mx-auto">
            {CARD_PATHS.map((path) => (
              <Link key={path.href} href={path.href} className="group block h-full">
                <article
                  className={`path-card path-card--${path.key} h-full p-4 sm:p-[1.1rem]`}
                  style={{ "--path-accent": path.accent } as React.CSSProperties}
                >
                  <div className="path-card-inner relative z-[2] flex items-center gap-3 sm:gap-4 h-full">
                    <div className="flex justify-center pt-0.5">
                      <PathIllustration pathKey={path.key} accent={path.accent} />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <h3
                        className="font-display text-[1.2rem] sm:text-[1.25rem] mb-1 tracking-tight"
                        style={{ color: "#F0EDE6" }}
                      >
                        {path.title}
                      </h3>
                      <p className="text-[0.84rem] sm:text-[0.88rem] leading-relaxed" style={{ color: "#8F8A81" }}>
                        {path.description}
                      </p>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </section>

        <footer className="sacred-reveal sacred-delay-4 text-center pb-1">
          <p className="text-[0.82rem]" style={{ color: "#8F8A81" }}>
            Built with mindfulness ☸ Bodhi
          </p>
        </footer>
      </main>
    </div>
  );
}
