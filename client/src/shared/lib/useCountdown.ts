import { useEffect, useMemo, useState } from "react";

const fallbackWeddingDateTime = "2026-08-21T13:30";

export function useCountdown(weddingDateTime = fallbackWeddingDateTime) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return useMemo(() => {
    const weddingDate = new Date(weddingDateTime).getTime();
    const targetDate = Number.isFinite(weddingDate) ? weddingDate : new Date(fallbackWeddingDateTime).getTime();
    const diff = Math.max(targetDate - now, 0);
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    return { days, hours, minutes, seconds };
  }, [now, weddingDateTime]);
}
