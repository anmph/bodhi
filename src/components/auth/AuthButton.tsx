"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

function getInitials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export default function AuthButton() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!menuRef.current) return;
      if (menuRef.current.contains(event.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (status === "loading") {
    return (
      <span
        style={{ color: "#8F8A81", fontSize: "0.78rem", padding: "0 4px" }}
        aria-hidden
      >
        …
      </span>
    );
  }

  if (!session) {
    return (
      <button
        type="button"
        onClick={() => signIn("google")}
        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[0.8rem] font-semibold transition-colors"
        style={{
          backgroundColor: "transparent",
          color: "#C8A96E",
          border: "1px solid #C8A96E",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor =
            "rgba(200, 169, 110, 0.08)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor =
            "transparent";
        }}
      >
        <GoogleG />
        Sign in with Google
      </button>
    );
  }

  const displayName =
    session.user?.name?.split(" ")[0] ?? session.user?.email ?? "You";

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full"
        style={{
          backgroundColor: "#242424",
          border: "1px solid #3A3A3A",
          color: "#F0EDE6",
        }}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {session.user?.image && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={session.user.image}
            alt={session.user.name ?? "User"}
            width={26}
            height={26}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            style={{
              borderRadius: 9999,
              border: "1px solid rgba(200,169,110,0.35)",
              objectFit: "cover",
            }}
          />
        ) : (
          <span
            aria-label={session.user?.name ?? "User"}
            style={{
              width: 26,
              height: 26,
              borderRadius: 9999,
              backgroundColor: "#C8A96E",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.7rem",
              fontWeight: 700,
              color: "#1A1A1A",
            }}
          >
            {getInitials(session.user?.name)}
          </span>
        )}
        <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>
          {displayName}
        </span>
        <span style={{ color: "#8F8A81", fontSize: "0.68rem" }}>▾</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 rounded-[10px] shadow-lg z-50"
          style={{
            backgroundColor: "#1F1F1F",
            border: "1px solid #3A3A3A",
            minWidth: 200,
          }}
        >
          <div
            className="px-3 py-2.5"
            style={{ borderBottom: "1px solid #2A2A2A" }}
          >
            <p
              style={{
                color: "#F0EDE6",
                fontSize: "0.85rem",
                fontWeight: 600,
                margin: 0,
              }}
            >
              {session.user?.name}
            </p>
            <p
              style={{
                color: "#8F8A81",
                fontSize: "0.72rem",
                margin: "2px 0 0",
                wordBreak: "break-all",
              }}
            >
              {session.user?.email}
            </p>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              void signOut({ callbackUrl: "/" });
            }}
            className="w-full text-left px-3 py-2 text-[0.85rem] transition-colors"
            style={{ color: "#E8D5A8", backgroundColor: "transparent" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                "#2A2A2A";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                "transparent";
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function GoogleG() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path
        fill="currentColor"
        d="M12 10.2v3.9h5.5c-.2 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.9 3.7 14.7 2.6 12 2.6 6.8 2.6 2.6 6.8 2.6 12s4.2 9.4 9.4 9.4c5.4 0 9-3.8 9-9.1 0-.6-.1-1.1-.2-1.6H12z"
      />
    </svg>
  );
}
