"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import AuthButton from "@/components/auth/AuthButton";

interface NavItem {
  href: string;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/about", label: "About" },
  { href: "/chat", label: "Chat" },
  { href: "/scriptures", label: "Scriptures" },
  { href: "/prayers", label: "Prayers" },
  { href: "/identify", label: "Identify" },
  { href: "/insights", label: "Insights" },
  { href: "/dashboard", label: "My Practice" },
];

interface NavBarProps {
  rightSlot?: ReactNode;
}

export default function NavBar({ rightSlot }: NavBarProps) {
  const pathname = usePathname();

  return (
    <header className="mb-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <Link href="/" className="group inline-flex items-center gap-2 cursor-pointer">
          <span
            className="transition-colors duration-200 group-hover:text-[#C8A96E]"
            style={{ color: "#A8A49C", fontSize: "1.05rem" }}
          >
            ☸
          </span>
          <h1 className="font-display text-[1.4rem] text-[#F0EDE6] transition-colors duration-200 group-hover:text-[#C8A96E]">
              Bodhi
          </h1>
        </Link>
        <div className="flex items-center gap-2">
          {rightSlot}
          <AuthButton />
        </div>
      </div>

      <nav
        className="w-full flex flex-wrap items-center justify-center gap-x-5 gap-y-2 py-2 px-1"
        style={{ borderTop: "1px solid #2A2A2A", borderBottom: "1px solid #2A2A2A" }}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="text-[0.76rem] tracking-[0.13em] uppercase font-body transition-colors"
              style={{
                color: isActive ? "#C8A96E" : "#6E6A62",
                fontWeight: isActive ? 700 : 500,
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
