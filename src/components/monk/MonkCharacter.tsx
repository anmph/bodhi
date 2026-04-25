"use client";

export type MonkMood =
  | "idle"
  | "thinking"
  | "happy"
  | "speaking"
  | "greeting"
  | "curious";

interface MonkCharacterProps {
  mood: MonkMood;
  size?: number | string;
  headOnly?: boolean;
}

export default function MonkCharacter({ mood, size = 130, headOnly = false }: MonkCharacterProps) {
  const resolvedSize = typeof size === "number" ? `${size}px` : size;

  const moodFace = {
    idle: {
      leftBrow: "M44 54 Q50 50 56 54",
      rightBrow: "M64 54 Q70 50 76 54",
      eyeMode: "open",
      leftEyeRx: 6.8,
      rightEyeRx: 6.8,
      mouthMode: "smile",
      mouthPath: "M55 80 Q60 84 65 80",
    },
    thinking: {
      leftBrow: "M44 54 Q50 48 56 53",
      rightBrow: "M64 55 Q70 57 76 54",
      eyeMode: "open",
      leftEyeRx: 5.2,
      rightEyeRx: 6.8,
      mouthMode: "line",
      mouthPath: "M56 81 Q60 82 64 81",
    },
    happy: {
      leftBrow: "M44 54 Q50 49 56 54",
      rightBrow: "M64 54 Q70 49 76 54",
      eyeMode: "crescent",
      leftEyeRx: 6.4,
      rightEyeRx: 6.4,
      mouthMode: "openSmile",
      mouthPath: "M52 78 Q60 90 68 78 Q66 92 54 88 Q51 83 52 78Z",
    },
    speaking: {
      leftBrow: "M44 54 Q50 51 56 54",
      rightBrow: "M64 54 Q70 51 76 54",
      eyeMode: "open",
      leftEyeRx: 6.6,
      rightEyeRx: 6.6,
      mouthMode: "oval",
      mouthPath: "",
    },
    greeting: {
      leftBrow: "M44 54 Q50 49 56 54",
      rightBrow: "M64 54 Q70 49 76 54",
      eyeMode: "crescent",
      leftEyeRx: 6.2,
      rightEyeRx: 6.2,
      mouthMode: "openSmile",
      mouthPath: "M53 79 Q60 89 67 79 Q65 92 55 88 Q52 84 53 79Z",
    },
    curious: {
      leftBrow: "M44 54 Q50 47 56 53",
      rightBrow: "M64 54 Q70 52 76 54",
      eyeMode: "open",
      leftEyeRx: 7.2,
      rightEyeRx: 5.6,
      mouthMode: "smile",
      mouthPath: "M55 80 Q60 85 65 80",
    },
  }[mood];

  if (headOnly) {
    return (
      <svg
        viewBox="0 0 80 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: "visible", width: resolvedSize, height: "auto" }}
      >
        <defs>
          <linearGradient id="monkHeadOnlySkin" x1="40" y1="10" x2="40" y2="70" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F5D6C3" />
            <stop offset="100%" stopColor="#EDBEAB" />
          </linearGradient>
        </defs>

        <ellipse cx="40" cy="39" rx="28" ry="29" fill="url(#monkHeadOnlySkin)" />
        <ellipse cx="40" cy="43" rx="24" ry="23" fill="#FFFFFF" opacity="0.08" />
        <ellipse cx="12.5" cy="39" rx="4.8" ry="6.2" fill="#E3AA97" />
        <ellipse cx="67.5" cy="39" rx="4.8" ry="6.2" fill="#E3AA97" />
        <ellipse cx="34" cy="21" rx="10.5" ry="4.8" fill="#FFFFFF" opacity="0.16" />

        <path d="M26 33 Q30 30 34 33" stroke="#8C5449" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M46 33 Q50 30 54 33" stroke="#8C5449" strokeWidth="1.4" strokeLinecap="round" />

        {moodFace.eyeMode === "crescent" ? (
          <>
            <path d="M26.5 41 Q30 37.5 33.5 41" stroke="#3D2B1F" strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M46.5 41 Q50 37.5 53.5 41" stroke="#3D2B1F" strokeWidth="2" strokeLinecap="round" fill="none" />
          </>
        ) : (
          <>
            <ellipse cx="30" cy="40.5" rx={moodFace.leftEyeRx * 0.64} ry="4.8" fill="#3D2B1F" />
            <ellipse cx="50" cy="40.5" rx={moodFace.rightEyeRx * 0.64} ry="4.8" fill="#3D2B1F" />
            <circle cx="28.2" cy="38.7" r="1.35" fill="#FFFFFF" />
            <circle cx="30.9" cy="40.9" r="0.6" fill="#FFFFFF" opacity="0.85" />
            <circle cx="48.2" cy="38.7" r="1.35" fill="#FFFFFF" />
            <circle cx="50.9" cy="40.9" r="0.6" fill="#FFFFFF" opacity="0.85" />
          </>
        )}

        <circle cx="40" cy="45.5" r="1.1" fill="#B67767" />

        {moodFace.mouthMode === "oval" ? (
          <ellipse cx="40" cy="51.5" rx="3.1" ry="2.5" fill="#7E312E" />
        ) : (
          <path
            d={moodFace.mouthMode === "line" ? "M36 51 Q40 52 44 51" : "M35.5 50.5 Q40 54.5 44.5 50.5"}
            stroke="#7E312E"
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
          />
        )}

        {moodFace.mouthMode === "openSmile" && (
          <>
            <path d="M35 50 Q40 57.5 45 50 Q44.4 58.5 35.6 55.2 Q34.8 52.8 35 50Z" fill="#8A2F2D" />
            <ellipse cx="40" cy="54.3" rx="2.4" ry="1.3" fill="#E88A8A" />
          </>
        )}

        <circle cx="22.5" cy="49.5" r="4.5" fill="#E8A0A0" opacity="0.35" />
        <circle cx="57.5" cy="49.5" r="4.5" fill="#E8A0A0" opacity="0.35" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 120 146"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ overflow: "visible", width: resolvedSize, height: "auto" }}
    >
      <defs>
        <linearGradient id="monkSkin" x1="60" y1="14" x2="60" y2="92" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F5D6C3" />
          <stop offset="100%" stopColor="#EDBEAB" />
        </linearGradient>
        <linearGradient id="robeMain" x1="60" y1="74" x2="60" y2="120" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#C8A43E" />
          <stop offset="100%" stopColor="#B8962E" />
        </linearGradient>
        <linearGradient id="robeWrap" x1="48" y1="76" x2="84" y2="110" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#D3B04A" />
          <stop offset="100%" stopColor="#A88425" />
        </linearGradient>
      </defs>

      <ellipse cx="60" cy="112" rx="25" ry="8" fill="#241B12" opacity="0.2" />

      <rect x="48" y="109" width="7.5" height="9" rx="3" fill="#F5D6C3" />
      <rect x="64.5" y="109" width="7.5" height="9" rx="3" fill="#F5D6C3" />
      <ellipse cx="52" cy="117.5" rx="6.8" ry="2.9" fill="#E7B19D" />
      <ellipse cx="68" cy="117.5" rx="6.8" ry="2.9" fill="#E7B19D" />

      <path
        d="M36 111 Q33 93 43 84 Q51 77 67 77 Q84 77 91 85 Q95 91 95 105 Q87 116 60 117 Q43 117 36 111Z"
        fill="url(#robeMain)"
      />
      <path d="M49 81 Q67 88 78 103 Q63 112 46 108 Q44 92 49 81Z" fill="url(#robeWrap)" />
      <path d="M40 97 Q49 95 57 88" stroke="#9B7A25" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
      <path d="M55 83 Q54 95 60 108" stroke="#987621" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M66 90 Q65 101 69 111" stroke="#987621" strokeWidth="1.6" strokeLinecap="round" />

      <ellipse cx="36.5" cy="93" rx="4.9" ry="6.2" fill="#F5D6C3" />
      <ellipse cx="85.5" cy="94.5" rx="5.2" ry="6.6" fill="#F5D6C3" />

      <ellipse cx="60" cy="53" rx="36" ry="35" fill="url(#monkSkin)" />
      <ellipse cx="60" cy="57" rx="31" ry="28" fill="#FFFFFF" opacity="0.06" />
      <ellipse cx="24" cy="52" rx="5.2" ry="7.2" fill="#E3AA97" />
      <ellipse cx="96" cy="52" rx="5.2" ry="7.2" fill="#E3AA97" />
      <ellipse cx="50" cy="26" rx="11.5" ry="5.5" fill="#FFFFFF" opacity="0.16" />

      <path d={moodFace.leftBrow} stroke="#8C5449" strokeWidth="1.8" strokeLinecap="round" />
      <path d={moodFace.rightBrow} stroke="#8C5449" strokeWidth="1.8" strokeLinecap="round" />

      {moodFace.eyeMode === "crescent" ? (
        <>
          <path d="M43.5 64 Q50 58 56.5 64" stroke="#3D2B1F" strokeWidth="2.4" strokeLinecap="round" fill="none" />
          <path d="M63.5 64 Q70 58 76.5 64" stroke="#3D2B1F" strokeWidth="2.4" strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          <ellipse cx="50" cy="64" rx={moodFace.leftEyeRx} ry="7.2" fill="#3D2B1F" />
          <ellipse cx="70" cy="64" rx={moodFace.rightEyeRx} ry="7.2" fill="#3D2B1F" />
          <circle cx="47.5" cy="61.5" r="2.1" fill="#FFFFFF" />
          <circle cx="50.8" cy="64.1" r="0.95" fill="#FFFFFF" opacity="0.9" />
          <circle cx="67.5" cy="61.5" r="2.1" fill="#FFFFFF" />
          <circle cx="70.8" cy="64.1" r="0.95" fill="#FFFFFF" opacity="0.9" />
        </>
      )}

      <circle cx="60" cy="71.2" r="1.3" fill="#B67767" />

      {moodFace.mouthMode === "oval" ? (
        <ellipse cx="60" cy="82" rx="3.6" ry="3" fill="#7E312E" />
      ) : moodFace.mouthMode === "openSmile" ? (
        <>
          <path d={moodFace.mouthPath} fill="#8A2F2D" />
          <ellipse cx="60" cy="86.7" rx="3" ry="1.75" fill="#E88A8A" />
        </>
      ) : (
        <path
          d={moodFace.mouthPath}
          stroke="#7E312E"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      )}

      <circle cx="40.5" cy="79.5" r="5.8" fill="#E8A0A0" opacity="0.35" />
      <circle cx="79.5" cy="79.5" r="5.8" fill="#E8A0A0" opacity="0.35" />
    </svg>
  );
}
