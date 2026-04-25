"use client";

import Link from "next/link";
import MonkCharacter from "@/components/monk/MonkCharacter";
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

const TOPIC_TAGS = [
  "Beginner Questions",
  "Buddhist Practice",
  "Mental Health & Wellbeing",
  "Meditation Practice",
  "Buddhist Philosophy",
  "Book Recommendations",
];

const CARD_PATHS = [
  {
    href: "/chat",
    title: "Converse",
    key: "chat",
    description: "Seek guidance from wise teachers through conversation",
  },
  {
    href: "/scriptures",
    title: "Read",
    key: "read",
    description: "Explore sacred texts from all Buddhist traditions",
  },
  {
    href: "/prayers",
    title: "Pray",
    key: "pray",
    description: "Practice daily prayers and cultivate devotion",
  },
  {
    href: "/dashboard",
    title: "Reflect",
    key: "reflect",
    description: "See your journey and watch your practice grow",
  },
];

function PathIcon({ iconKey }: { iconKey: string }) {
  if (iconKey === "chat") {
    return (
      <svg width="32" height="32" viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <path d="M7 9h26v17H15l-6 5v-5H7V9Z" stroke="#C8A96E" strokeWidth="1.6" />
        <circle cx="14" cy="17.5" r="1.1" fill="#C8A96E" />
        <circle cx="20" cy="17.5" r="1.1" fill="#C8A96E" />
        <circle cx="26" cy="17.5" r="1.1" fill="#C8A96E" />
      </svg>
    );
  }
  if (iconKey === "read") {
    return (
      <svg width="32" height="32" viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <path d="M8 10h10c3 0 5 2 5 5v15c0-3-2-5-5-5H8V10Z" stroke="#C8A96E" strokeWidth="1.6" />
        <path d="M32 10H22c-3 0-5 2-5 5v15c0-3 2-5 5-5h10V10Z" stroke="#C8A96E" strokeWidth="1.6" />
      </svg>
    );
  }
  if (iconKey === "pray") {
    return (
      <svg width="32" height="32" viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <path d="M20 31c6-4 9-8 9-12a6 6 0 0 0-9 0 6 6 0 0 0-9 0c0 4 3 8 9 12Z" stroke="#C8A96E" strokeWidth="1.6" />
        <path d="M20 31c1-4 3-7 6-9" stroke="#C8A96E" strokeWidth="1.4" />
        <path d="M20 31c-1-4-3-7-6-9" stroke="#C8A96E" strokeWidth="1.4" />
      </svg>
    );
  }
  return (
    <svg width="32" height="32" viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path d="M7 22c7-2 12-8 13-15 2 7 7 13 13 15-6 2-11 8-13 15-1-7-6-13-13-15Z" stroke="#C8A96E" strokeWidth="1.6" />
    </svg>
  );
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
  const leftTags = TOPIC_TAGS.slice(0, 3);
  const rightTags = TOPIC_TAGS.slice(3);

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

        <section className="sacred-reveal sacred-delay-2 mb-8">
          <div
            className="mx-auto max-w-[700px] rounded-[18px] p-5 sm:p-6 sacred-teaching-card"
            style={{ boxShadow: "0 0 40px rgba(200, 169, 110, 0.08)" }}
          >
            <p className="text-[0.86rem] mb-2" style={{ color: "#C8A96E" }}>
              ☸ Today&apos;s Teaching
            </p>
            <p className="font-display italic text-[1.2rem] leading-[1.7]" style={{ color: "#E8D5A8" }}>
              &ldquo;{quote.text}&rdquo;
            </p>
            <p className="mt-2" style={{ color: "#8F8A81" }}>
              — {quote.source}
            </p>
          </div>
        </section>

        <section className="sacred-reveal sacred-delay-3 mb-10">
          <div className="relative mx-auto max-w-[1000px] text-center">
            <div className="flex justify-center py-4">
              <div className="monk-idle">
                <MonkCharacter mood="happy" size={70} />
              </div>
            </div>

            <div className="hidden md:grid md:grid-cols-2 gap-3 mt-6 max-w-[860px] mx-auto relative z-10">
              <div className="flex flex-wrap justify-end gap-2">
                {leftTags.map((tag) => (
                  <Link key={tag} href="/chat" className="sacred-tag-inline">
                    {tag}
                  </Link>
                ))}
              </div>
              <div className="flex flex-wrap justify-start gap-2">
                {rightTags.map((tag) => (
                  <Link key={tag} href="/chat" className="sacred-tag-inline">
                    {tag}
                  </Link>
                ))}
              </div>
            </div>

            <div className="md:hidden mt-3 flex gap-2 overflow-x-auto pb-2">
              {TOPIC_TAGS.map((tag) => (
                <Link key={tag} href="/chat" className="sacred-tag-mobile shrink-0">
                  {tag}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="sacred-reveal sacred-delay-4 relative">
          <h2 className="font-display text-[1.8rem] text-center mb-6" style={{ color: "#F0EDE6" }}>
            Choose Your Path
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-[920px] mx-auto">
            {CARD_PATHS.map((path) => (
              <Link key={path.href} href={path.href} className="group block">
                <article className="sacred-path-card h-full rounded-[12px] p-4 relative overflow-hidden">
                  <div className="sacred-path-card-inner relative h-full">
                    <div className="mb-2">
                      <PathIcon iconKey={path.key} />
                    </div>
                    <h3 className="font-display text-[1.2rem] mb-1" style={{ color: "#F0EDE6" }}>
                      {path.title}
                    </h3>
                    <p className="text-[0.8rem] leading-[1.7]" style={{ color: "#6E6A62" }}>
                      {path.description}
                    </p>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
