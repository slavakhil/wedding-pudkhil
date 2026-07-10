import { useEffect, useMemo, useState } from "react";

const fallbackWeddingDateTime = "2026-08-21T13:30";
const yakutskUtcOffsetHours = 9;

function parseYakutskDateTime(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);

  if (!match) {
    return Number.NaN;
  }

  const [, year, month, day, hours, minutes, seconds = "0"] = match;
  return Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hours) - yakutskUtcOffsetHours,
    Number(minutes),
    Number(seconds)
  );
}

export function useCountdown(weddingDateTime = fallbackWeddingDateTime) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return useMemo(() => {
    const weddingDate = parseYakutskDateTime(weddingDateTime);
    const targetDate = Number.isFinite(weddingDate) ? weddingDate : parseYakutskDateTime(fallbackWeddingDateTime);
    const diff = Math.max(targetDate - now, 0);
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    return { days, hours, minutes, seconds };
  }, [now, weddingDateTime]);
}
