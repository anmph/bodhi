export default function LotusIcon({
  size = 52,
  color = "#C8A96E",
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
      <circle cx="26" cy="26" r="4" stroke={color} strokeWidth="1.4" fill="none" />

      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
        <ellipse
          key={i}
          cx="26"
          cy="15"
          rx="3.5"
          ry="8"
          stroke={color}
          strokeWidth="1.2"
          fill="none"
          opacity={i % 2 === 0 ? 1 : 0.55}
          transform={`rotate(${angle} 26 26)`}
        />
      ))}

      <line x1="26" y1="30" x2="26" y2="44" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M26 38 Q20 34 18 30" stroke={color} strokeWidth="1.1" fill="none" strokeLinecap="round" />
      <path d="M26 36 Q32 32 34 28" stroke={color} strokeWidth="1.1" fill="none" strokeLinecap="round" />
    </svg>
  );
}
