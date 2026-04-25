"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import AuthButton from "@/components/auth/AuthButton";

interface NavItem {
  href: string;
  label: string;
}

const NAV_GROUPS: NavItem[][] = [
  [
    { href: "/chat", label: "Chat" },
    { href: "/scriptures", label: "Scriptures" },
    { href: "/meditate", label: "Meditate" },
  ],
  [
    { href: "/prayers", label: "Prayers" },
    { href: "/identify", label: "Identify" },
  ],
  [
    { href: "/insights", label: "Insights" },
    { href: "/dashboard", label: "My Practice" },
  ],
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
        className="w-full overflow-x-auto scrollbar-hide"
        style={{ borderTop: "1px solid #2A2A2A", borderBottom: "1px solid #2A2A2A" }}
      >
        <div className="min-w-max flex items-center justify-center gap-0 py-2 px-1 sm:px-2">
          {NAV_GROUPS.map((group, groupIndex) => (
            <div key={`group-${groupIndex}`} className="flex items-center">
              <div className="flex items-center gap-4 sm:gap-5 px-2 sm:px-3">
                {group.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`relative pb-[6px] text-[0.76rem] tracking-[0.13em] uppercase font-body transition-colors duration-200 font-semibold ${
                        isActive ? "text-[#C8A96E]" : "text-[#6E6A62] hover:text-[#A8A49C]"
                      }`}
                    >
                      {item.label}
                      <span
                        className="absolute left-0 right-0 -bottom-[1px] h-[2px] rounded-full transition-opacity duration-200"
                        style={{
                          backgroundColor: "#C8A96E",
                          opacity: isActive ? 1 : 0,
                        }}
                        aria-hidden="true"
                      />
                    </Link>
                  );
                })}
              </div>
              {groupIndex < NAV_GROUPS.length - 1 && (
                <span className="mx-1 h-5 w-px bg-[#2A2A2A]" aria-hidden="true" />
              )}
            </div>
          ))}
        </div>
      </nav>
    </header>
  );
}
