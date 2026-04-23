type MissionStatus = "completed" | "in-progress" | "planned";

interface MissionItem {
  id: string;
  title: string;
  description: string;
  impact: string;
  status: MissionStatus;
}

const missions: MissionItem[] = [
  {
    id: "m1",
    title: "Guardian Hardening",
    description: "Hardened middleware stack and endpoint protection for core services.",
    impact: "API trust + auth integrity",
    status: "completed",
  },
  {
    id: "m2",
    title: "QNative Offline Layer",
    description: "Activated local-first assistant responses with deterministic fallbacks.",
    impact: "Continuity under AI/API outage",
    status: "in-progress",
  },
  {
    id: "m3",
    title: "Sovereign Ops Dashboard",
    description: "Unified mission telemetry and cross-module readiness visibility.",
    impact: "Faster executive decisions",
    status: "planned",
  },
];

const statusMeta: Record<MissionStatus, { label: string; className: string }> = {
  completed: { label: "Completed", className: "text-emerald-400 border-emerald-400/30 bg-emerald-500/10" },
  "in-progress": { label: "In Progress", className: "text-amber-400 border-amber-400/30 bg-amber-500/10" },
  planned: { label: "Planned", className: "text-sky-400 border-sky-400/30 bg-sky-500/10" },
};

export default function MissionCards() {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <h3 className="text-sm font-bold tracking-wide text-foreground">Mission History</h3>
        <span className="text-[10px] text-muted-foreground">Case-style operational snapshots</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {missions.map((mission) => {
          const meta = statusMeta[mission.status];
          return (
            <article key={mission.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-sm font-bold text-foreground leading-5">{mission.title}</h4>
                <span className={`shrink-0 text-[10px] px-2 py-1 rounded-md border ${meta.className}`}>
                  {meta.label}
                </span>
              </div>
              <p className="text-[12px] text-muted-foreground leading-5">{mission.description}</p>
              <div className="text-[11px] text-primary">Impact: {mission.impact}</div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
