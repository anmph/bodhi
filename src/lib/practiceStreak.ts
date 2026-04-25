/** Local calendar day key YYYY-MM-DD (no UTC shift — matches dashboard streak route). */
export function toPracticeDayKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function subtractPracticeDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() - days);
  return next;
}

/**
 * Consecutive calendar days ending today that have at least one practice log.
 */
export function consecutiveStreakEndingToday(logDates: Date[]): number {
  const activeDays = new Set<string>();
  for (const d of logDates) {
    activeDays.add(toPracticeDayKey(new Date(d)));
  }

  let streakDays = 0;
  const today = new Date();
  while (true) {
    const day = subtractPracticeDays(today, streakDays);
    if (!activeDays.has(toPracticeDayKey(day))) break;
    streakDays += 1;
  }
  return streakDays;
}
