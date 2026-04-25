"use client";

import { useState, useRef, useCallback } from "react";

function createBowlSound(audioCtx: AudioContext): void {
  const frequencies = [220, 440, 659.3, 880];
  const gains = [0.5, 0.3, 0.15, 0.1];
  const duration = 4;

  frequencies.forEach((freq, i) => {
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);

    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(gains[i], audioCtx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      audioCtx.currentTime + duration
    );

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + duration);
  });
}

const INTERVALS = [
  { label: "Off", value: 0 },
  { label: "1 min", value: 60000 },
  { label: "3 min", value: 180000 },
  { label: "5 min", value: 300000 },
];

export default function BellToggle() {
  const [intervalIndex, setIntervalIndex] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  }, []);

  const ringBell = useCallback(() => {
    const ctx = getAudioCtx();
    if (ctx.state === "suspended") ctx.resume();
    createBowlSound(ctx);
  }, [getAudioCtx]);

  const handleBellClick = () => {
    ringBell();
  };

  const handleIntervalChange = () => {
    const nextIndex = (intervalIndex + 1) % INTERVALS.length;
    setIntervalIndex(nextIndex);

    if (intervalRef.current) clearInterval(intervalRef.current);

    const nextInterval = INTERVALS[nextIndex];
    if (nextInterval.value > 0) {
      setIsActive(true);
      intervalRef.current = setInterval(ringBell, nextInterval.value);
    } else {
      setIsActive(false);
    }
  };

  const currentInterval = INTERVALS[intervalIndex];

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleBellClick}
        title="Ring bell"
        className="w-9 h-9 rounded-full flex items-center justify-center text-base transition-all duration-200 active:scale-95"
        style={{
          backgroundColor: "#2A2A2A",
          border: "1px solid #3A3A3A",
          color: "#C8A96E",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#C8A96E")}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#3A3A3A")}
      >
        🔔
      </button>
      <button
        onClick={handleIntervalChange}
        title="Set bell interval"
        className="h-9 px-3 rounded-full flex items-center gap-1 text-[0.75rem] font-body font-semibold transition-all duration-200"
        style={{
          backgroundColor: isActive ? "rgba(200,169,110,0.12)" : "#2A2A2A",
          border: `1px solid ${isActive ? "#C8A96E" : "#3A3A3A"}`,
          color: isActive ? "#C8A96E" : "#6E6A62",
        }}
      >
        {isActive && (
          <span
            className="inline-block w-[6px] h-[6px] rounded-full animate-pulse"
            style={{ backgroundColor: "#C8A96E" }}
          />
        )}
        {currentInterval.label}
      </button>
    </div>
  );
}
