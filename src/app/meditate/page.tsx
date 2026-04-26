"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AuthGate from "@/components/auth/AuthGate";
import MonkCharacter from "@/components/monk/MonkCharacter";
import NavBar from "@/components/NavBar";

type MeditationType = "Silent" | "Breathing Focus" | "Loving-Kindness";

const PRESET_MINUTES = [5, 10, 15, 20, 30] as const;
const METTA_PHRASES = [
  "May I be happy.",
  "May I be peaceful.",
  "May I be healthy.",
  "May all beings be safe.",
  "May all beings be peaceful.",
  "May all beings live with ease.",
];

type AmbientSoundCategory = "ambient" | "mantra";

type AmbientSoundEntry = {
  id: string;
  label: string;
  icon: string;
  file: string | null;
  category: AmbientSoundCategory;
};

const AMBIENT_SOUNDS: AmbientSoundEntry[] = [
  { id: "silence", label: "Silence", icon: "🔇", file: null, category: "ambient" },
  { id: "rain", label: "Rain", icon: "🌧️", file: "/sounds/rain.mp3", category: "ambient" },
  { id: "ocean", label: "Ocean Waves", icon: "🌊", file: "/sounds/ocean.mp3", category: "ambient" },
  { id: "forest", label: "Forest", icon: "🌿", file: "/sounds/forest.mp3", category: "ambient" },
  { id: "birds", label: "Birds", icon: "🐦", file: "/sounds/birds.mp3", category: "ambient" },
  { id: "campfire", label: "Campfire", icon: "🔥", file: "/sounds/campfire.mp3", category: "ambient" },
  { id: "wind", label: "Wind", icon: "💨", file: "/sounds/wind.mp3", category: "ambient" },
  { id: "singing-bowl", label: "Singing Bowl", icon: "🔔", file: "/sounds/singing-bowl.mp3", category: "ambient" },
  { id: "om-mani-padme-hum", label: "Om Mani Padme Hum", icon: "🕉️", file: "/sounds/om-mani-padme-hum.mp3", category: "mantra" },
  { id: "great-compassion", label: "Great Compassion Mantra", icon: "📿", file: "/sounds/great-compassion-mantra.mp3", category: "mantra" },
  { id: "medicine-buddha", label: "Medicine Buddha Mantra", icon: "💊", file: "/sounds/medicine-buddha-mantra.mp3", category: "mantra" },
  { id: "amitabha", label: "Amitabha Mantra", icon: "☸", file: "/sounds/amitabha-mantra.mp3", category: "mantra" },
  { id: "cundi", label: "Cundi Bodhisattva Mantra", icon: "🪷", file: "/sounds/cundi-mantra.mp3", category: "mantra" },
];

function formatTime(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (safe % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export default function MeditatePage() {
  const [durationMinutes, setDurationMinutes] = useState<number>(10);
  const [customDuration, setCustomDuration] = useState<string>("");
  const [meditationType, setMeditationType] = useState<MeditationType>("Silent");

  const [totalSeconds, setTotalSeconds] = useState<number>(10 * 60);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(10 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string>("");
  const [selectedSoundId, setSelectedSoundId] = useState<string>("silence");
  const [ambientVolume, setAmbientVolume] = useState(0.65);

  const endTimeRef = useRef<number | null>(null);
  const startTimestampRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const ambientAudioRef = useRef<HTMLAudioElement | null>(null);

  const elapsedSeconds = useMemo(() => Math.max(0, totalSeconds - remainingSeconds), [remainingSeconds, totalSeconds]);

  const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
  const radius = 124;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  const breathingPhrase = useMemo(() => {
    const phase = Math.floor((elapsedSeconds % 12) / 4);
    if (phase === 0) return "Breathe in...";
    if (phase === 1) return "Hold...";
    return "Breathe out...";
  }, [elapsedSeconds]);

  const mettaPhrase = useMemo(() => {
    const idx = Math.floor(elapsedSeconds / 6) % METTA_PHRASES.length;
    return METTA_PHRASES[idx];
  }, [elapsedSeconds]);

  const playBellTone = () => {
    if (typeof window === "undefined") return;

    const Ctx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new Ctx();
    }

    const ctx = audioContextRef.current;
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    const oscillator = ctx.createOscillator();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(520, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.26, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2);

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start(now);
    oscillator.stop(now + 2.02);
  };

  const applyDuration = (minutes: number) => {
    const clamped = Math.max(1, Math.min(180, Math.round(minutes)));
    setDurationMinutes(clamped);
    setTotalSeconds(clamped * 60);
    setRemainingSeconds(clamped * 60);
    setIsRunning(false);
    setIsCompleted(false);
    setSaveState("idle");
    setSaveError("");
    startTimestampRef.current = null;
    endTimeRef.current = null;
  };

  const handleCustomDurationSet = () => {
    const parsed = Number(customDuration);
    if (!Number.isFinite(parsed)) return;
    applyDuration(parsed);
  };

  const handleStart = () => {
    if (remainingSeconds <= 0) return;
    if (!startTimestampRef.current) {
      startTimestampRef.current = Date.now();
      playBellTone();
    }
    endTimeRef.current = Date.now() + remainingSeconds * 1000;
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
    endTimeRef.current = null;
  };

  const stopAmbientAudio = useCallback(() => {
    const el = ambientAudioRef.current;
    if (!el) return;
    el.pause();
    el.currentTime = 0;
  }, []);

  const handleReset = () => {
    const resetSeconds = durationMinutes * 60;
    setIsRunning(false);
    setIsCompleted(false);
    setRemainingSeconds(resetSeconds);
    setTotalSeconds(resetSeconds);
    setSaveState("idle");
    setSaveError("");
    startTimestampRef.current = null;
    endTimeRef.current = null;
    stopAmbientAudio();
  };

  const handleSaveSession = async () => {
    setSaveState("saving");
    setSaveError("");
    try {
      const res = await fetch("/api/meditate/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          duration: durationMinutes,
          type: meditationType,
        }),
      });
      if (!res.ok) {
        let msg = "Could not save session.";
        try {
          const j = await res.json();
          if (j.error) msg = j.error;
        } catch { /* ignore */ }
        throw new Error(msg);
      }
      setSaveState("saved");
    } catch (err) {
      setSaveState("error");
      setSaveError(err instanceof Error ? err.message : "Could not save session.");
    }
  };

  useEffect(() => {
    if (!isRunning) return;

    const id = window.setInterval(() => {
      if (!endTimeRef.current) return;
      const next = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
      setRemainingSeconds(next);
      if (next <= 0) {
        setIsRunning(false);
        setIsCompleted(true);
        endTimeRef.current = null;
        playBellTone();
      }
    }, 200);

    return () => {
      window.clearInterval(id);
    };
  }, [isRunning]);

  useEffect(() => {
    // Keep timer in sync when setup changes before starting.
    if (isRunning || isCompleted || startTimestampRef.current) return;
    const next = durationMinutes * 60;
    setTotalSeconds(next);
    setRemainingSeconds(next);
  }, [durationMinutes, isRunning, isCompleted]);

  const selectedSound = useMemo(
    () => AMBIENT_SOUNDS.find((s) => s.id === selectedSoundId) ?? AMBIENT_SOUNDS[0],
    [selectedSoundId]
  );
  const hasAmbientFile = selectedSound.file !== null;

  useEffect(() => {
    const el = ambientAudioRef.current;
    if (!el) return;
    el.loop = true;
    if (!selectedSound.file) {
      el.removeAttribute("src");
      el.load();
      return;
    }
    el.src = selectedSound.file;
    el.load();
  }, [selectedSound.file, selectedSoundId]);

  useEffect(() => {
    const el = ambientAudioRef.current;
    if (!el) return;
    el.volume = ambientVolume;
  }, [ambientVolume]);

  useEffect(() => {
    const el = ambientAudioRef.current;
    if (!el) return;
    if (!selectedSound.file || isCompleted) {
      stopAmbientAudio();
      return;
    }
    if (isRunning) {
      void el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [isRunning, isCompleted, selectedSound.file, selectedSoundId, stopAmbientAudio]);

  const sessionSummary = `${durationMinutes} min • ${meditationType}`;

  const renderSoundPills = (category: AmbientSoundCategory) =>
    AMBIENT_SOUNDS.filter((s) => s.category === category).map((sound) => {
      const selected = selectedSoundId === sound.id;
      return (
        <button
          key={sound.id}
          type="button"
          onClick={() => setSelectedSoundId(sound.id)}
          className="rounded-full px-3 py-1.5 text-[0.82rem] sm:text-[0.86rem] transition-colors"
          style={{
            border: "1px solid #C8A96E",
            color: selected ? "#1A1A1A" : "#C8A96E",
            backgroundColor: selected ? "#C8A96E" : "#2A2A2A",
          }}
        >
          <span className="mr-1.5" aria-hidden>
            {sound.icon}
          </span>
          {sound.label}
        </button>
      );
    });

  return (
    <AuthGate message="Sign in to save your meditation sessions and track your consistency.">
      <audio ref={ambientAudioRef} loop playsInline preload="metadata" className="hidden" aria-hidden="true" />
      <div className="relative z-10 min-h-screen sacred-home">
        <div className="sacred-mountains" aria-hidden="true" />

        <main className="relative max-w-[980px] mx-auto px-4 sm:px-6 pt-5 pb-12">
          <NavBar />

          <section
            className="rounded-2xl border p-4 sm:p-5 mb-6"
            style={{ backgroundColor: "#2A2A2A", borderColor: "#3A3A3A" }}
          >
            <h1 className="font-display text-[1.75rem] mb-4" style={{ color: "#F0EDE6" }}>
              Meditation Session Setup
            </h1>

            <div className="mb-4">
              <p className="text-[0.85rem] uppercase tracking-[0.12em] mb-2" style={{ color: "#8F8A81" }}>
                Duration
              </p>
              <div className="flex flex-wrap gap-2">
                {PRESET_MINUTES.map((minutes) => {
                  const selected = durationMinutes === minutes;
                  return (
                    <button
                      key={minutes}
                      type="button"
                      onClick={() => applyDuration(minutes)}
                      className="rounded-full px-4 py-1.5 text-[0.86rem] transition-colors"
                      style={{
                        border: "1px solid #C8A96E",
                        color: selected ? "#1A1A1A" : "#C8A96E",
                        backgroundColor: selected ? "#C8A96E" : "transparent",
                      }}
                    >
                      {minutes} min
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-4 flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="flex-1">
                <label className="text-[0.85rem] uppercase tracking-[0.12em] mb-2 block" style={{ color: "#8F8A81" }}>
                  Custom duration (min)
                </label>
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={customDuration}
                  onChange={(e) => setCustomDuration(e.target.value)}
                  placeholder="Enter minutes"
                  className="w-full rounded-xl px-3 py-2 outline-none"
                  style={{
                    backgroundColor: "#1A1A1A",
                    border: "1px solid #3A3A3A",
                    color: "#F0EDE6",
                  }}
                />
              </div>
              <button
                type="button"
                onClick={handleCustomDurationSet}
                className="rounded-full px-4 py-2 text-[0.86rem] transition-colors"
                style={{ border: "1px solid #C8A96E", color: "#C8A96E" }}
              >
                Set Custom
              </button>
            </div>

            <div>
              <p className="text-[0.85rem] uppercase tracking-[0.12em] mb-2" style={{ color: "#8F8A81" }}>
                Meditation Type
              </p>
              <div className="flex flex-wrap gap-2">
                {(["Silent", "Breathing Focus", "Loving-Kindness"] as MeditationType[]).map((type) => {
                  const selected = meditationType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setMeditationType(type)}
                      className="rounded-full px-4 py-1.5 text-[0.86rem] transition-colors"
                      style={{
                        border: "1px solid #3A3A3A",
                        color: selected ? "#C8A96E" : "#8F8A81",
                        backgroundColor: selected ? "rgba(200, 169, 110, 0.13)" : "transparent",
                      }}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 pt-4 border-t" style={{ borderColor: "#3A3A3A" }}>
              <p className="text-[0.85rem] uppercase tracking-[0.12em] mb-3" style={{ color: "#8F8A81" }}>
                Background sound
              </p>
              <div className="mb-3">
                <p className="text-[0.78rem] font-semibold mb-2" style={{ color: "#A8A49C" }}>
                  Ambient Sounds
                </p>
                <div className="flex flex-wrap gap-2">{renderSoundPills("ambient")}</div>
              </div>
              <div className="mb-3">
                <p className="text-[0.78rem] font-semibold mb-2" style={{ color: "#A8A49C" }}>
                  Mantras
                </p>
                <div className="flex flex-wrap gap-2">{renderSoundPills("mantra")}</div>
              </div>
              {hasAmbientFile && (
                <div className="mt-3 flex flex-col gap-1.5 max-w-xs">
                  <label className="text-[0.78rem]" style={{ color: "#8F8A81" }}>
                    Volume
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={ambientVolume}
                    onChange={(e) => setAmbientVolume(Number(e.target.value))}
                    className="meditation-volume-slider w-full"
                    style={{ ["--vol-pct" as string]: `${ambientVolume * 100}%` }}
                  />
                </div>
              )}
            </div>
          </section>

          <section
            className="rounded-2xl border p-5 sm:p-7 mb-6 text-center"
            style={{ backgroundColor: "#242424", borderColor: "#3A3A3A" }}
          >
            {!isCompleted ? (
              <>
                <h2 className="font-display text-[1.6rem] mb-5" style={{ color: "#F0EDE6" }}>
                  Meditation Timer
                </h2>

                <div className="mx-auto mb-5 relative w-[280px] h-[280px] sm:w-[320px] sm:h-[320px]">
                  <svg viewBox="0 0 300 300" className="w-full h-full -rotate-90">
                    <circle
                      cx="150"
                      cy="150"
                      r={radius}
                      stroke="#3A3A3A"
                      strokeWidth="12"
                      fill="none"
                    />
                    <circle
                      cx="150"
                      cy="150"
                      r={radius}
                      stroke="#C8A96E"
                      strokeWidth="12"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={dashOffset}
                      style={{ transition: "stroke-dashoffset 0.2s linear" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="font-display text-[2.7rem] sm:text-[3rem]" style={{ color: "#F0EDE6" }}>
                      {formatTime(remainingSeconds)}
                    </span>
                  </div>
                </div>

                <div className="flex justify-center flex-wrap gap-2 mb-5">
                  {!isRunning ? (
                    <button
                      type="button"
                      onClick={handleStart}
                      className="rounded-full px-5 py-2 text-[0.9rem] transition-colors"
                      style={{ border: "1px solid #C8A96E", color: "#C8A96E" }}
                    >
                      Start
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handlePause}
                      className="rounded-full px-5 py-2 text-[0.9rem] transition-colors"
                      style={{ border: "1px solid #C8A96E", color: "#C8A96E" }}
                    >
                      Pause
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleReset}
                    className="rounded-full px-5 py-2 text-[0.9rem] transition-colors"
                    style={{ border: "1px solid #C8A96E", color: "#C8A96E" }}
                  >
                    Reset
                  </button>
                </div>

                {meditationType === "Breathing Focus" && (
                  <div className="flex flex-col items-center gap-3">
                    <div className={`meditation-breath-pulse ${isRunning ? "is-running" : ""}`} />
                    <p className="text-[1rem] italic" style={{ color: "#C8A96E" }}>
                      {breathingPhrase}
                    </p>
                  </div>
                )}

                {meditationType === "Loving-Kindness" && (
                  <p className="text-[1rem] italic min-h-8" style={{ color: "#C8A96E" }}>
                    {mettaPhrase}
                  </p>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center text-center">
                <h2 className="font-display text-[2rem] mb-2" style={{ color: "#F0EDE6" }}>
                  🪷 Session Complete
                </h2>
                <p className="text-[0.95rem] mb-4" style={{ color: "#8F8A81" }}>
                  {sessionSummary}
                </p>
                <button
                  type="button"
                  onClick={handleSaveSession}
                  disabled={saveState === "saving" || saveState === "saved"}
                  className="rounded-full px-5 py-2 text-[0.9rem] mb-4 transition-opacity"
                  style={{
                    border: "1px solid #C8A96E",
                    color: "#C8A96E",
                    opacity: saveState === "saving" ? 0.7 : 1,
                  }}
                >
                  {saveState === "saving"
                    ? "Saving..."
                    : saveState === "saved"
                      ? "Saved to Practice Log"
                      : "Save to Practice Log"}
                </button>
                {saveState === "error" && (
                  <p className="text-[0.85rem] mb-4" style={{ color: "#C4785B" }}>
                    {saveError || "Could not save this session."}
                  </p>
                )}
                <div className="mb-2">
                  <MonkCharacter mood="happy" size={92} />
                </div>
                <p className="text-[0.95rem]" style={{ color: "#A8A49C" }}>
                  Beautiful practice. Carry this calm into the rest of your day.
                </p>
              </div>
            )}
          </section>
        </main>
      </div>

      <style jsx>{`
        .meditation-breath-pulse {
          width: 84px;
          height: 84px;
          border-radius: 999px;
          border: 1px solid rgba(200, 169, 110, 0.5);
          background: radial-gradient(circle at 30% 30%, rgba(232, 213, 168, 0.16), rgba(200, 169, 110, 0.08));
          transform: scale(0.9);
        }

        .meditation-breath-pulse.is-running {
          animation: meditationBreathCycle 12s ease-in-out infinite;
        }

        @keyframes meditationBreathCycle {
          0% {
            transform: scale(0.9);
          }
          33% {
            transform: scale(1.18);
          }
          66% {
            transform: scale(1.18);
          }
          100% {
            transform: scale(0.9);
          }
        }

        .meditation-volume-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 6px;
          border-radius: 999px;
          background: #3a3a3a;
          outline: none;
        }

        .meditation-volume-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #c8a96e;
          border: 2px solid #1a1a1a;
          cursor: pointer;
        }

        .meditation-volume-slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #c8a96e;
          border: 2px solid #1a1a1a;
          cursor: pointer;
        }

        .meditation-volume-slider::-webkit-slider-runnable-track {
          height: 6px;
          border-radius: 999px;
          background: linear-gradient(to right, #c8a96e 0%, #c8a96e var(--vol-pct, 65%), #3a3a3a var(--vol-pct, 65%), #3a3a3a 100%);
        }

        .meditation-volume-slider::-moz-range-track {
          height: 6px;
          border-radius: 999px;
          background: #3a3a3a;
        }

        .meditation-volume-slider::-moz-range-progress {
          height: 6px;
          border-radius: 999px;
          background: #c8a96e;
        }
      `}</style>
    </AuthGate>
  );
}
