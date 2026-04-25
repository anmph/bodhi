"use client";

import Link from "next/link";

export default function BackLink() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-1 text-[0.82rem] font-body mb-6 transition-colors duration-200"
      style={{ color: "#6E6A62" }}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLAnchorElement).style.color = "#C8A96E")
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLAnchorElement).style.color = "#6E6A62")
      }
    >
      &larr; Back to Bodhi
    </Link>
  );
}
