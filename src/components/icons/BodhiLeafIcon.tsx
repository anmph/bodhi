export default function BodhiLeafIcon({
  size = 52,
  color = "#7BA886",
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
        d="M26 44 C26 44 10 32 10 20 C10 13 16 8 22 10 C24 10.8 25.2 12 26 13.5 C26.8 12 28 10.8 30 10 C36 8 42 13 42 20 C42 32 26 44 26 44Z"
        stroke={color}
        strokeWidth="1.4"
        fill="none"
        strokeLinejoin="round"
      />
      <line x1="26" y1="13" x2="26" y2="42" stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.7" />
      <path d="M26 20 Q20 21 17 24" stroke={color} strokeWidth="0.9" fill="none" strokeLinecap="round" opacity="0.6" />
      <path d="M26 26 Q19 27 16 31" stroke={color} strokeWidth="0.9" fill="none" strokeLinecap="round" opacity="0.6" />
      <path d="M26 32 Q21 33 19 37" stroke={color} strokeWidth="0.9" fill="none" strokeLinecap="round" opacity="0.5" />
      <path d="M26 20 Q32 21 35 24" stroke={color} strokeWidth="0.9" fill="none" strokeLinecap="round" opacity="0.6" />
      <path d="M26 26 Q33 27 36 31" stroke={color} strokeWidth="0.9" fill="none" strokeLinecap="round" opacity="0.6" />
      <path d="M26 32 Q31 33 33 37" stroke={color} strokeWidth="0.9" fill="none" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}
