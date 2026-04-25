"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import BackLink from "@/components/BackLink";
import BellToggle from "@/components/BellToggle";
import AuthGate from "@/components/auth/AuthGate";
import type { ScriptureEntry } from "@/lib/scriptures";

interface ScriptureReaderClientProps {
  scripture: ScriptureEntry;
}

export default function ScriptureReaderClient({ scripture }: ScriptureReaderClientProps) {
  return (
    <AuthGate message="Sign in with Google to save this reading to your practice history.">
      <ScriptureReaderInner scripture={scripture} />
    </AuthGate>
  );
}

function ScriptureReaderInner({ scripture }: ScriptureReaderClientProps) {
  const router = useRouter();
  const sectionsRef = useRef<HTMLElement[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);
  const manualResumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endRevealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isProgrammaticScrollRef = useRef(false);
  const hasLoggedCompletionRef = useRef(false);
  const sessionStartedAtRef = useRef(Date.now());

  const [autoScrollSpeed, setAutoScrollSpeed] = useState(45);
  const [isAutoScrollActive, setIsAutoScrollActive] = useState(true);
  const [progress, setProgress] = useState(0);
  const [showDedication, setShowDedication] = useState(false);

  const completeReading = useCallback(() => {
    setIsAutoScrollActive(false);
    if (hasLoggedCompletionRef.current) return;
    hasLoggedCompletionRef.current = true;

    const durationSeconds = Math.max(
      1,
      Math.round((Date.now() - sessionStartedAtRef.current) / 1000)
    );

    // Persist the reading + a practice log server-side. Fire and forget:
    // a transient network error shouldn't block the dedication reveal.
    void fetch("/api/scripture-complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scriptureSlug: scripture.id,
        scriptureTitle: scripture.title,
        readingTimeSeconds: durationSeconds,
      }),
    }).catch(() => {
      // ignored
    });

    endRevealTimerRef.current = setTimeout(() => {
      setShowDedication(true);
    }, 1300);
  }, [scripture.id, scripture.title]);

  const updateProgress = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const maxScroll = Math.max(1, container.scrollHeight - container.clientHeight);
    const pct = Math.min(1, container.scrollTop / maxScroll);
    setProgress(pct);

    if (container.scrollTop + container.clientHeight >= container.scrollHeight - 3) {
      completeReading();
    }
  }, [completeReading]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.remove("scripture-section-hidden");
            entry.target.classList.add("scripture-section-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.08,
        rootMargin: "0px 0px -40px 0px",
      }
    );

    sectionsRef.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isAutoScrollActive || showDedication) return;

    const step = (timestamp: number) => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const lastTs = lastTsRef.current ?? timestamp;
      const deltaSeconds = (timestamp - lastTs) / 1000;
      lastTsRef.current = timestamp;

      if (container.scrollTop + container.clientHeight >= container.scrollHeight - 2) {
        completeReading();
        return;
      }

      isProgrammaticScrollRef.current = true;
      container.scrollTop += autoScrollSpeed * deltaSeconds;
      updateProgress();
      animationRef.current = requestAnimationFrame(step);
    };

    animationRef.current = requestAnimationFrame(step);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
      lastTsRef.current = null;
    };
  }, [autoScrollSpeed, completeReading, isAutoScrollActive, showDedication, updateProgress]);

  useEffect(() => {
    updateProgress();
  }, [updateProgress]);

  useEffect(() => {
    return () => {
      if (manualResumeTimerRef.current) clearTimeout(manualResumeTimerRef.current);
      if (endRevealTimerRef.current) clearTimeout(endRevealTimerRef.current);
    };
  }, []);

  const temporarilyPauseForManualScroll = useCallback(() => {
    if (isProgrammaticScrollRef.current) {
      isProgrammaticScrollRef.current = false;
      return;
    }

    setIsAutoScrollActive(false);
    if (manualResumeTimerRef.current) clearTimeout(manualResumeTimerRef.current);
    manualResumeTimerRef.current = setTimeout(() => {
      if (!showDedication) {
        setIsAutoScrollActive(true);
      }
    }, 2200);
    updateProgress();
  }, [showDedication, updateProgress]);

  const togglePause = useCallback(() => {
    if (showDedication) return;
    setIsAutoScrollActive((prev) => !prev);
  }, [showDedication]);

  return (
    <div className="relative z-10 min-h-screen">
      <div
        className="fixed left-0 top-0 h-[2px] z-30"
        style={{
          width: `${progress * 100}%`,
          backgroundColor: "#C8A96E",
          boxShadow: "0 0 8px rgba(200, 169, 110, 0.55)",
          transition: "width 120ms linear",
        }}
      />

      <div className="max-w-[900px] mx-auto px-4 sm:px-8 pt-8 sm:pt-[48px] pb-6 min-h-screen">
        <div className="flex items-center justify-between mb-5">
          <BackLink />
          <BellToggle />
        </div>

        <div
          ref={scrollContainerRef}
          className="h-[calc(100vh-145px)] overflow-y-auto rounded-[18px] px-4 sm:px-6 pb-24"
          style={{
            backgroundColor: "rgba(24, 24, 24, 0.72)",
            border: "1px solid #2A2A2A",
          }}
          onScroll={temporarilyPauseForManualScroll}
          onWheel={temporarilyPauseForManualScroll}
          onTouchMove={temporarilyPauseForManualScroll}
          onClick={togglePause}
        >
          <div className="mx-auto max-w-[650px] pt-6 pb-14">
            <header className="mb-10 text-center scripture-header-enter">
              <span className="block text-[2.2rem] mb-3">{scripture.icon}</span>
              <div
                className="inline-block font-body text-[0.75rem] font-bold tracking-[0.12em] uppercase px-3 py-1 rounded-full mb-4"
                style={{
                  backgroundColor: "rgba(200,169,110,0.12)",
                  color: "#C8A96E",
                  border: "1px solid rgba(200,169,110,0.25)",
                }}
              >
                {scripture.tradition}
              </div>
              <h1
                className="font-display text-[2.3rem] sm:text-[2.8rem] font-bold tracking-[-0.02em] leading-tight mb-1"
                style={{ color: "#F0EDE6" }}
              >
                {scripture.title}
              </h1>
              <p className="font-display italic text-[1rem] mb-1" style={{ color: "#C8A96E" }}>
                {scripture.vietnameseTitle}
              </p>
              <p className="font-display italic text-[0.95rem]" style={{ color: "#6E6A62" }}>
                {scripture.origin}
              </p>
              <div
                className="mx-auto mt-5"
                style={{
                  width: 60,
                  height: 2,
                  backgroundColor: "#C8A96E",
                  borderRadius: 1,
                }}
              />
            </header>

            {scripture.sections.map((section, si) => (
              <section
                key={si}
                className="mb-11 scripture-section-hidden"
                ref={(el) => {
                  if (el) sectionsRef.current[si] = el;
                }}
                style={si === 0 ? { animationDelay: "0.3s" } : {}}
              >
                <h2
                  className="font-display text-[1.15rem] font-semibold mb-5 pb-2"
                  style={{ color: "#C8A96E", borderBottom: "1px solid #2A2A2A" }}
                >
                  {section.heading}
                </h2>
                <div className="space-y-6">
                  {section.verses.map((verse, vi) => (
                    <div key={vi} className="flex gap-4">
                      {verse.number && (
                        <span
                          className="font-display text-[0.8rem] pt-[3px] shrink-0 w-8 text-right"
                          style={{ color: "#3A3A3A" }}
                        >
                          {verse.number}
                        </span>
                      )}
                      <p
                        className="font-display italic text-[1.2rem] leading-[2]"
                        style={{ color: "#E8D5A8" }}
                      >
                        {verse.text}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ))}

            <div
              className="text-center mt-12 pt-8 scripture-section-hidden"
              ref={(el) => {
                if (el) sectionsRef.current[scripture.sections.length] = el;
              }}
              style={{ borderTop: "1px solid #2A2A2A" }}
            >
              <span className="block text-[1.6rem] mb-2" style={{ opacity: 0.5 }}>
                ☸
              </span>
              <p className="font-display italic text-[0.9rem]" style={{ color: "#6E6A62" }}>
                End of {scripture.title}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 px-2 py-2 rounded-full flex items-center gap-2"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "rgba(34, 34, 34, 0.72)",
          border: "1px solid #343434",
          backdropFilter: "blur(6px)",
        }}
      >
        <button
          type="button"
          className="px-3 py-1.5 rounded-full text-[0.75rem]"
          onClick={() => setAutoScrollSpeed((speed) => Math.max(20, speed - 10))}
          style={{
            backgroundColor: "#262626",
            color: "#D4CFC7",
          }}
        >
          Slower
        </button>
        <button
          type="button"
          className="px-3 py-1.5 rounded-full text-[0.75rem] font-semibold"
          onClick={() => setIsAutoScrollActive((prev) => !prev)}
          style={{ color: "#F0EDE6" }}
        >
          {isAutoScrollActive ? "Pause" : "Resume"}
        </button>
        <button
          type="button"
          className="px-3 py-1.5 rounded-full text-[0.75rem]"
          onClick={() => setAutoScrollSpeed((speed) => Math.min(90, speed + 10))}
          style={{
            backgroundColor: "#262626",
            color: "#D4CFC7",
          }}
        >
          Faster
        </button>
      </div>

      {showDedication && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center px-4"
          style={{ backgroundColor: "rgba(12, 12, 12, 0.78)" }}
        >
          <div
            className="max-w-[620px] w-full rounded-[18px] p-7 dedication-glow"
            style={{
              backgroundColor: "#222222",
              border: "1px solid rgba(200, 169, 110, 0.35)",
              animation: "sectionReveal 1.1s ease both",
            }}
          >
            <div className="text-center">
              <div className="text-[2rem] mb-2">🪷</div>
              <h2
                className="font-display text-[2rem] mb-4"
                style={{ color: "#C8A96E" }}
              >
                Hồi Hướng Công Đức
              </h2>
              <p
                className="font-display italic text-[1.08rem] leading-[1.9] whitespace-pre-line mb-4"
                style={{ color: "#E8D5A8" }}
              >
                {"Nguyện đem công đức này\nHướng về khắp tất cả\nĐệ tử và chúng sanh\nĐều trọn thành Phật đạo."}
              </p>
              <p
                className="font-body text-[0.96rem] leading-[1.8] mb-4"
                style={{ color: "#D4CFC7" }}
              >
                May this merit be shared with all beings.
                <br />
                May all beings be happy, peaceful, and free from suffering.
              </p>
              <p
                className="font-body text-[0.9rem] leading-[1.7] mb-6"
                style={{ color: "#A8A49C" }}
              >
                Thank you for reading today&apos;s scripture. Your practice is a gift to yourself and to the world. 🙏
              </p>
              <button
                type="button"
                className="px-5 py-2.5 rounded-full font-semibold text-[0.85rem]"
                style={{ backgroundColor: "#C8A96E", color: "#1A1A1A" }}
                onClick={() => router.push("/scriptures")}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
