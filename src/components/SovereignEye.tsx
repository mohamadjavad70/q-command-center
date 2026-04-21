import React, { forwardRef } from "react";

const RADIUS = 50;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const SovereignEye = forwardRef<HTMLDivElement, { progress: number }>(({ progress }, ref) => {
  const offset = CIRCUMFERENCE - (progress / 100) * CIRCUMFERENCE;

  return (
    <div ref={ref} className="relative flex flex-col items-center justify-center w-28 h-28">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
        <circle
          cx="64"
          cy="64"
          r={RADIUS}
          strokeWidth="5"
          fill="transparent"
          className="stroke-secondary"
        />
        <circle
          cx="64"
          cy="64"
          r={RADIUS}
          strokeWidth="5"
          fill="transparent"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="stroke-primary transition-all duration-1000 ease-in-out"
          style={{ filter: "drop-shadow(0 0 6px hsl(var(--primary) / 0.5))" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black text-primary text-glow-gold">
          {progress}٪
        </span>
        <span className="text-[8px] text-muted-foreground uppercase tracking-[0.2em]">
          Integrity
        </span>
      </div>
    </div>
  );
});

SovereignEye.displayName = "SovereignEye";

export default SovereignEye;
