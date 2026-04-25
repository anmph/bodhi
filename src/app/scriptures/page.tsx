"use client";

import Link from "next/link";
import BodhiLeafIcon from "@/components/icons/BodhiLeafIcon";
import { CURATED_SCRIPTURES } from "@/lib/scriptures";
import NavBar from "@/components/NavBar";
import AuthGate from "@/components/auth/AuthGate";

const TRADITION_COLORS: Record<string, string> = {
  Theravada: "#C8A96E",
  Mahayana: "#7BA886",
};

export default function ScripturesPage() {
  return (
    <AuthGate message="Sign in with Google to track the scriptures you've read and build a daily reading streak.">
      <ScripturesPageInner />
    </AuthGate>
  );
}

function ScripturesPageInner() {
  return (
    <div className="relative z-10 max-w-[880px] mx-auto px-4 sm:px-8 pt-8 sm:pt-[60px] pb-12 min-h-screen">
      <NavBar />

      <header className="mb-10">
        <span
          className="block font-display text-[0.85rem] mb-2"
          style={{ color: "#C8A96E" }}
        >
          ☸ Scriptures / Kinh Điển
        </span>
        <h1
          className="font-display text-[2.4rem] sm:text-[3rem] font-bold tracking-[-0.02em] leading-tight mb-3"
          style={{ color: "#F0EDE6" }}
        >
          Scripture Library
        </h1>
        <p
          className="font-display italic text-[1.1rem]"
          style={{ color: "#A8A49C" }}
        >
          Choose a scripture and enter an immersive reading flow.
        </p>
        <div
          className="mt-4 rounded-sm"
          style={{ width: 60, height: 2, backgroundColor: "#C8A96E" }}
        />
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {CURATED_SCRIPTURES.map((scripture) => {
          const color = TRADITION_COLORS[scripture.tradition] ?? "#C8A96E";
          return (
            <Link
              key={scripture.id}
              href={`/scriptures/${scripture.id}`}
              className="group block"
            >
              <article
                className="rounded-[12px] p-5 transition-all duration-300 h-full"
                style={{
                  backgroundColor: "#2A2A2A",
                  border: "1px solid #3A3A3A",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.borderColor = color;
                  el.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.borderColor = "#3A3A3A";
                  el.style.transform = "translateY(0)";
                }}
              >
                <div className="flex items-start gap-3 mb-3">
                  <BodhiLeafIcon color={color} size={30} />
                  <div>
                    <h3
                      className="font-display text-[1.2rem] font-semibold leading-tight"
                      style={{ color: "#F0EDE6" }}
                    >
                      {scripture.title}
                    </h3>
                    <p
                      className="font-display italic text-[0.9rem]"
                      style={{ color: "#C8A96E" }}
                    >
                      {scripture.vietnameseTitle}
                    </p>
                  </div>
                </div>
                <div
                  className="flex flex-wrap gap-x-3 gap-y-1 text-[0.74rem] mb-3"
                  style={{ color: "#8F8A81" }}
                >
                  <span>{scripture.tradition}</span>
                  <span>•</span>
                  <span>{scripture.readingTimeMinutes} min read</span>
                </div>
                <p
                  className="font-body text-[0.84rem] leading-[1.65]"
                  style={{ color: "#C9C3B9" }}
                >
                  {scripture.description}
                </p>
                <div
                  className="mt-4 text-[0.82rem] font-semibold inline-flex items-center gap-1"
                  style={{ color }}
                >
                  Enter reading mode
                  <span className="group-hover:translate-x-1 transition-transform inline-block">
                    &rarr;
                  </span>
                </div>
              </article>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
