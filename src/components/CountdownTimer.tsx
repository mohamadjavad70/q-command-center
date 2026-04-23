import { useEffect, useMemo, useState } from "react";

interface CountdownTimerProps {
  targetISO?: string;
  title?: string;
}

function getRemaining(targetISO: string) {
  const target = new Date(targetISO).getTime();
  const now = Date.now();
  const diff = Math.max(0, target - now);

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return { diff, days, hours, minutes, seconds };
}

export default function CountdownTimer({
  targetISO,
  title = "Next Mission Window",
}: CountdownTimerProps) {
  const fallbackTarget = useMemo(() => {
    const next = new Date();
    next.setHours(next.getHours() + 72);
    return next.toISOString();
  }, []);

  const finalTarget = targetISO ?? fallbackTarget;
  const [remaining, setRemaining] = useState(() => getRemaining(finalTarget));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRemaining(getRemaining(finalTarget));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [finalTarget]);

  const cells = [
    { label: "Days", value: remaining.days },
    { label: "Hours", value: remaining.hours },
    { label: "Min", value: remaining.minutes },
    { label: "Sec", value: remaining.seconds },
  ];

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="text-sm font-bold tracking-wide text-foreground">{title}</h3>
        <span className="text-[10px] px-2 py-1 rounded-md border border-primary/25 text-primary bg-primary/10">
          {remaining.diff > 0 ? "Scheduled" : "Live"}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {cells.map((cell) => (
          <div key={cell.label} className="rounded-lg border border-border bg-background px-2 py-3 text-center">
            <div className="text-xl font-black text-primary tabular-nums">{String(cell.value).padStart(2, "0")}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-[0.18em]">{cell.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
