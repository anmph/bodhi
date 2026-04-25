interface Prayer {
  id: string;
  text: string;
  name: string;
  createdAt: string;
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export default function PrayerCard({ prayer }: { prayer: Prayer }) {
  return (
    <div
      className="rounded-[10px] px-5 py-4 animate-fade-in"
      style={{ backgroundColor: "#242424", border: "1px solid #2A2A2A" }}
    >
      <span className="block text-[0.8rem] mb-2" style={{ color: "#3A3A3A" }}>
        🪷
      </span>
      <p
        className="font-display italic text-[1rem] leading-[1.75] mb-3"
        style={{ color: "#E8D5A8" }}
      >
        {prayer.text}
      </p>
      <div className="flex items-center justify-between">
        <span
          className="font-body text-[0.78rem]"
          style={{ color: "#6E6A62" }}
        >
          &mdash; {prayer.name}
        </span>
        <span
          className="font-body text-[0.72rem]"
          style={{ color: "#3A3A3A" }}
        >
          {formatRelativeTime(prayer.createdAt)}
        </span>
      </div>
    </div>
  );
}
