"use client";

import { signIn, useSession } from "next-auth/react";
import type { ReactNode } from "react";

interface AuthGateProps {
  children: ReactNode;
  message?: string;
}

export default function AuthGate({ children, message }: AuthGateProps) {
  const { status } = useSession();

  if (status === "loading") {
    return (
      <div
        style={{ color: "#8F8A81", textAlign: "center", padding: "120px 16px" }}
      >
        <p>Loading…</p>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 text-center">
        <span style={{ color: "#C8A96E", fontSize: "2.2rem" }}>☸</span>
        <h2
          className="font-display"
          style={{ fontSize: "1.75rem", color: "#F0EDE6", margin: 0 }}
        >
          Sign in to continue
        </h2>
        <p style={{ color: "#A8A49C", maxWidth: 420, lineHeight: 1.6 }}>
          {message ??
            "Sign in with Google to save your chat history, scripture readings, and daily practice streak."}
        </p>
        <button
          type="button"
          onClick={() => signIn("google")}
          className="px-5 py-2.5 rounded-full font-semibold"
          style={{ backgroundColor: "#C8A96E", color: "#1A1A1A" }}
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
