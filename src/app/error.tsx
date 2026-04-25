"use client";

import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app error]", error);
  }, [error]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h2 className="font-display text-xl" style={{ color: "#F0EDE6" }}>
        Something went wrong
      </h2>
      <p className="max-w-md text-sm" style={{ color: "#A8A49C" }}>
        {error.message || "An unexpected error occurred."}
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="px-5 py-2.5 rounded-full font-semibold"
        style={{ backgroundColor: "#C8A96E", color: "#1A1A1A" }}
      >
        Try again
      </button>
    </div>
  );
}
