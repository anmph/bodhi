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
  const mouthPath =
    mood === "speaking"
      ? "M53 66 Q60 74 67 66"
      : mood === "thinking"
        ? "M53 67 Q60 70 67 67"
        : "M53 66 Q60 72 67 66";

  if (headOnly) {
    return (
      <svg
        viewBox="0 0 80 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: "visible", width: resolvedSize, height: "auto" }}
      >
        <defs>
          <radialGradient id="headOnlyShade" cx="50%" cy="24%" r="75%">
            <stop offset="0%" stopColor="#F0D8B5" />
            <stop offset="100%" stopColor="#E8C9A0" />
          </radialGradient>
        </defs>
        <ellipse cx="12" cy="40" rx="4.5" ry="6" fill="#E8C9A0" />
        <ellipse cx="68" cy="40" rx="4.5" ry="6" fill="#E8C9A0" />
        <ellipse cx="40" cy="38" rx="26" ry="28" fill="url(#headOnlyShade)" />
        <ellipse cx="32" cy="42" rx="4.5" ry="5" fill="#3D2B1F" />
        <ellipse cx="48" cy="42" rx="4.5" ry="5" fill="#3D2B1F" />
        <circle cx="30.5" cy="40.5" r="1.5" fill="white" />
        <circle cx="46.5" cy="40.5" r="1.5" fill="white" />
        <path d="M28 48 Q32 46.5 36 48" stroke="#3D2B1F" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M44 48 Q48 46.5 52 48" stroke="#3D2B1F" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M35 52 Q40 56 45 52" stroke="#3D2B1F" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <circle cx="24" cy="51" r="4.5" fill="#E8A0A0" opacity="0.3" />
        <circle cx="56" cy="51" r="4.5" fill="#E8A0A0" opacity="0.3" />
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
        <radialGradient id="bodhiGlow" cx="50%" cy="42%" r="50%">
          <stop offset="0%" stopColor="rgba(200, 169, 110, 0.15)" />
          <stop offset="100%" stopColor="rgba(200, 169, 110, 0)" />
        </radialGradient>
        <radialGradient id="headShade" cx="50%" cy="24%" r="75%">
          <stop offset="0%" stopColor="#F0D8B5" />
          <stop offset="100%" stopColor="#E8C9A0" />
        </radialGradient>
      </defs>

      <circle cx="60" cy="68" r="54" fill="url(#bodhiGlow)" />

      <ellipse cx="60" cy="56" rx="8" ry="9" fill="#E8C9A0" />
      <path
        d="M24 111 Q30 88 58 86 Q83 88 94 111 Q87 130 60 132 Q33 130 24 111Z"
        fill="#D4A545"
      />
      <path
        d="M44 95 Q63 108 80 92 Q79 110 60 120 Q45 114 44 95Z"
        fill="#C8A96E"
      />
      <ellipse cx="43" cy="118" rx="13" ry="10" fill="#C8A96E" />
      <ellipse cx="77" cy="118" rx="13" ry="10" fill="#C8A96E" />
      <circle cx="54" cy="110" r="5.6" fill="#E8C9A0" />
      <circle cx="66" cy="110" r="5.6" fill="#E8C9A0" />

      <ellipse cx="18" cy="56" rx="5.5" ry="8" fill="#E8C9A0" />
      <ellipse cx="102" cy="56" rx="5.5" ry="8" fill="#E8C9A0" />
      <ellipse cx="60" cy="52" rx="38" ry="42" fill="url(#headShade)" />
      <ellipse cx="48" cy="61" rx="6" ry="6.5" fill="#3D2B1F" />
      <ellipse cx="72" cy="61" rx="6" ry="6.5" fill="#3D2B1F" />
      <circle cx="46" cy="59" r="1.8" fill="white" />
      <circle cx="70" cy="59" r="1.8" fill="white" />
      <path d="M42 69 Q48 67 54 69" stroke="#3D2B1F" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M66 69 Q72 67 78 69" stroke="#3D2B1F" strokeWidth="1.4" strokeLinecap="round" />
      <path d={mouthPath} stroke="#3D2B1F" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <circle cx="38" cy="73" r="6" fill="#E8A0A0" opacity="0.3" />
      <circle cx="82" cy="73" r="6" fill="#E8A0A0" opacity="0.3" />
      <ellipse
        cx="50"
        cy="26"
        rx="13"
        ry="8"
        fill="white"
        opacity="0.15"
        transform="rotate(-12 50 26)"
      />
    </svg>
  );
}
