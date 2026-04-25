"use client";

import { useState } from "react";
import NavBar from "@/components/NavBar";
import AuthGate from "@/components/auth/AuthGate";

interface PrayerCard {
  id: string;
  title: string;
  text: string;
}

const PRAYERS: PrayerCard[] = [
  {
    id: "taking-refuge",
    title: "Taking Refuge in the Three Jewels",
    text:
      "I take refuge in the Buddha,\nThe one who shows the path of awakening.\nI take refuge in the Dharma,\nThe path of understanding and compassion.\nI take refuge in the Sangha,\nThe community that lives in mindfulness.",
  },
  {
    id: "repentance",
    title: "Repentance Verse",
    text:
      "All unwholesome actions I have committed,\nArising from greed, anger, and ignorance,\nBorn of body, speech, and mind,\nI now sincerely repent them all.",
  },
  {
    id: "heart-sutra-short",
    title: "Heart Sutra (Short Recitation)",
    text:
      "When Avalokiteshvara practiced deeply the Perfection of Wisdom,\nhe clearly saw that the five aggregates are empty,\nand thus transcended all suffering.\nForm is emptiness, emptiness is form.\nThe same is true of feeling, perception, formations, and consciousness.",
  },
  {
    id: "merit-dedication",
    title: "Merit Dedication",
    text:
      "May this merit be shared with all beings.\nMay all beings be peaceful, joyful, and free from suffering.\nMay wisdom and compassion flourish everywhere.",
  },
  {
    id: "five-precepts",
    title: "The Five Precepts",
    text:
      "I undertake the training to refrain from taking life.\nI undertake the training to refrain from taking what is not given.\nI undertake the training to refrain from sexual misconduct.\nI undertake the training to refrain from false speech.\nI undertake the training to refrain from intoxicants that cloud the mind.",
  },
  {
    id: "loving-kindness",
    title: "Loving-Kindness Meditation",
    text:
      "May I be happy. May I be peaceful. May I be free from suffering.\nMay you be happy. May you be peaceful. May you be free from suffering.\nMay all beings be happy. May all beings be peaceful.\nMay all beings be free from suffering.",
  },
  {
    id: "four-bodhisattva-vows",
    title: "The Four Bodhisattva Vows",
    text:
      "Beings are numberless; I vow to save them.\nDesires are inexhaustible; I vow to put an end to them.\nThe dharmas are boundless; I vow to master them.\nThe Buddha way is unsurpassable; I vow to attain it.",
  },
];

type CompletionState = "idle" | "saving" | "saved" | "error";

export default function PrayersPage() {
  return (
    <AuthGate message="Sign in with Google to log the prayers you read and build a daily practice streak.">
      <PrayersPageInner />
    </AuthGate>
  );
}

function PrayersPageInner() {
  const [expandedId, setExpandedId] = useState<string | null>(PRAYERS[0].id);
  const [completionStates, setCompletionStates] = useState<
    Record<string, CompletionState>
  >({});
  const [completionErrors, setCompletionErrors] = useState<Record<string, string>>(
    {}
  );

  async function markCompleted(prayer: PrayerCard) {
    setCompletionStates((prev) => ({ ...prev, [prayer.id]: "saving" }));
    setCompletionErrors((prev) => {
      const next = { ...prev };
      delete next[prayer.id];
      return next;
    });
    try {
      const res = await fetch("/api/prayer-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prayerId: prayer.id,
          prayerTitle: prayer.title,
        }),
      });
      if (!res.ok) {
        let userMsg = "Couldn't save — please try again.";
        if (res.status === 401) {
          userMsg =
            "Your session isn't linked to your saved profile. Sign out, sign in with Google again, then try once more.";
        } else {
          try {
            const j = (await res.json()) as { error?: string };
            if (typeof j.error === "string") userMsg = j.error;
          } catch {
            /* ignore */
          }
        }
        setCompletionErrors((prev) => ({ ...prev, [prayer.id]: userMsg }));
        throw new Error("request failed");
      }
      setCompletionStates((prev) => ({ ...prev, [prayer.id]: "saved" }));
    } catch {
      setCompletionStates((prev) => ({ ...prev, [prayer.id]: "error" }));
    }
  }

  return (
    <div className="relative z-10 max-w-[900px] mx-auto px-4 sm:px-8 pt-8 sm:pt-[52px] pb-12 min-h-screen">
      <NavBar />

      <header className="mb-8">
        <span
          className="block font-display text-[0.85rem] mb-2"
          style={{ color: "#C8A96E" }}
        >
          ☸ Daily Prayers
        </span>
        <h1
          className="font-display text-[2.1rem] sm:text-[2.6rem] font-bold tracking-[-0.02em] leading-tight mb-2"
          style={{ color: "#F0EDE6" }}
        >
          Prayers and Chants
        </h1>
        <p
          className="font-display italic text-[1.03rem] leading-[1.6]"
          style={{ color: "#A8A49C" }}
        >
          A quiet space to return to foundational verses and cultivate daily
          practice.
        </p>
      </header>

      <div className="space-y-3">
        {PRAYERS.map((prayer) => {
          const isOpen = expandedId === prayer.id;
          const state = completionStates[prayer.id] ?? "idle";
          return (
            <article
              key={prayer.id}
              className="rounded-[12px]"
              style={{
                backgroundColor: "#242424",
                border: "1px solid #333333",
              }}
            >
              <button
                type="button"
                className="w-full px-4 py-3 text-left flex items-center justify-between"
                onClick={() =>
                  setExpandedId((prev) => (prev === prayer.id ? null : prayer.id))
                }
              >
                <span
                  className="font-display text-[1.06rem]"
                  style={{ color: "#C8A96E" }}
                >
                  {prayer.title}
                </span>
                <span style={{ color: "#8F8A81" }}>{isOpen ? "−" : "+"}</span>
              </button>
              {isOpen && (
                <div
                  className="px-4 pb-4 pt-1"
                  style={{ borderTop: "1px solid #2F2F2F" }}
                >
                  <p
                    className="font-display italic text-[1.05rem] leading-[1.9] whitespace-pre-line"
                    style={{ color: "#D4CFC7" }}
                  >
                    {prayer.text}
                  </p>
                  <div className="mt-4 flex items-center gap-3 flex-wrap">
                    <button
                      type="button"
                      disabled={state === "saving" || state === "saved"}
                      onClick={() => markCompleted(prayer)}
                      className="px-3.5 py-1.5 rounded-full text-[0.82rem] font-semibold transition-colors"
                      style={{
                        backgroundColor:
                          state === "saved"
                            ? "rgba(200, 169, 110, 0.12)"
                            : "transparent",
                        color: "#C8A96E",
                        border: "1px solid #C8A96E",
                        opacity:
                          state === "saving" || state === "saved" ? 0.75 : 1,
                        cursor:
                          state === "saving" || state === "saved"
                            ? "default"
                            : "pointer",
                      }}
                    >
                      {state === "saving"
                        ? "Logging…"
                        : state === "saved"
                          ? "🙏 Completed"
                          : "🙏 I have completed this prayer"}
                    </button>
                    {state === "saved" && (
                      <span
                        className="font-display italic text-[0.8rem]"
                        style={{ color: "#A8A49C" }}
                      >
                        Recorded. Thank you for your practice today. 🪷
                      </span>
                    )}
                    {state === "error" && (
                      <span
                        style={{ color: "#E8A0A0", fontSize: "0.78rem" }}
                      >
                        {completionErrors[prayer.id] ??
                          "Couldn't save — please try again."}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
