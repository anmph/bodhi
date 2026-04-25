"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/insights/bodhi", label: "From Bodhi" },
  { href: "/insights/reddit", label: "From Reddit" },
] as const;

export default function InsightsSubNav() {
  const pathname = usePathname();

  return (
    <nav
      className="flex flex-wrap gap-2 mb-6"
      aria-label="Insights sections"
    >
      {TABS.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="rounded-[10px] px-4 py-2 text-[0.78rem] font-semibold tracking-wide uppercase transition-colors"
            style={{
              backgroundColor: isActive
                ? "rgba(200, 169, 110, 0.22)"
                : "#1E1E1E",
              border: isActive
                ? "1px solid rgba(200, 169, 110, 0.5)"
                : "1px solid #333333",
              color: isActive ? "#E8D5A8" : "#8F8A81",
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
