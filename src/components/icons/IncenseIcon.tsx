export default function IncenseIcon({
  size = 52,
  color = "#C4785B",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 52 52"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M18 44 Q18 40 26 40 Q34 40 34 44"
        stroke={color}
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
      />
      <line x1="17" y1="44" x2="35" y2="44" stroke={color} strokeWidth="1.4" strokeLinecap="round" />

      <line x1="26" y1="40" x2="26" y2="18" stroke={color} strokeWidth="1.3" strokeLinecap="round" />

      <circle cx="26" cy="17" r="1.8" fill={color} opacity="0.7" />
      <circle cx="26" cy="17" r="3" stroke={color} strokeWidth="0.6" fill="none" opacity="0.3" />

      <path
        d="M26 15 C24 12 28 9 26 6 C24 3 28 1 26 -1"
        stroke={color}
        strokeWidth="1.1"
        fill="none"
        strokeLinecap="round"
        opacity="0.8"
      />
      <path
        d="M23 13 C21 10 25 7 23 4 C21 1 24 -1 23 -3"
        stroke={color}
        strokeWidth="0.9"
        fill="none"
        strokeLinecap="round"
        opacity="0.45"
      />
      <path
        d="M29 13 C31 10 27 7 29 4 C31 1 28 -1 29 -3"
        stroke={color}
        strokeWidth="0.9"
        fill="none"
        strokeLinecap="round"
        opacity="0.45"
      />
    </svg>
  );
}
