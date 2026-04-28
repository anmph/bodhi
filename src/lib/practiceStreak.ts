/** Local calendar day key YYYY-MM-DD (no UTC shift). */
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

/** Longest consecutive-day streak in the supplied log dates. */
export function bestStreakFromDays(logDates: Date[]): number {
  const activeDays = new Set<string>();
  for (const d of logDates) activeDays.add(toPracticeDayKey(new Date(d)));
  if (activeDays.size === 0) return 0;
  const sorted = Array.from(activeDays).sort();
  let best = 1;
  let current = 1;
  for (let i = 1; i < sorted.length; i++) {
    const msPerDay = 86400000;
    const diff = (new Date(sorted[i]).getTime() - new Date(sorted[i - 1]).getTime()) / msPerDay;
    if (diff === 1) {
      current += 1;
      if (current > best) best = current;
    } else {
      current = 1;
    }
  }
  return best;
}

/** Consecutive calendar days ending today with at least one practice log. */
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
