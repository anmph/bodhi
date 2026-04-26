import { Flame } from "lucide-react";

export default function IncenseIcon({ size = 52, color = "#C4785B" }: { size?: number; color?: string }) {
  return <Flame size={size} color={color} strokeWidth={1.4} />;
}
