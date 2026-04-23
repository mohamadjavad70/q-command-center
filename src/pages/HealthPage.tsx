import { useEffect, useMemo, useState } from "react";
import { Activity, Database, Cpu, RefreshCcw } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type CheckStatus = "pass" | "fail" | "loading";
type HealthTab = "overview" | "dependencies" | "runtime";

interface HealthCheck {
  name: string;
  status: CheckStatus;
  detail: string;
  latencyMs?: number;
}

const TAB_META: Array<{ id: HealthTab; label: string; icon: typeof Activity }> = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "dependencies", label: "Dependencies", icon: Database },
  { id: "runtime", label: "Runtime", icon: Cpu },
];

const STATUS_BADGE: Record<CheckStatus, string> = {
  pass: "text-emerald-300 border-emerald-400/40 bg-emerald-500/10",
  fail: "text-rose-300 border-rose-400/40 bg-rose-500/10",
  loading: "text-amber-300 border-amber-400/40 bg-amber-500/10",
};

const STATUS_LABEL: Record<CheckStatus, string> = {
  pass: "PASS",
  fail: "FAIL",
  loading: "RUN",
};

async function checkSupabase(): Promise<HealthCheck> {
  const t0 = Date.now();
  try {
    const { error } = await supabase.from("QMETARAM").select("id").limit(1);
    if (error) throw error;
    return { name: "Supabase DB", status: "pass", detail: "SELECT 1 OK", latencyMs: Date.now() - t0 };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { name: "Supabase DB", status: "fail", detail: msg, latencyMs: Date.now() - t0 };
  }
}

async function checkFrontend(): Promise<HealthCheck> {
  return { name: "Frontend", status: "pass", detail: "React app running", latencyMs: 0 };
}

async function checkQMetaram(): Promise<HealthCheck> {
  const t0 = Date.now();
  try {
    const res = await fetch("https://qmetaram.com/-/status", { signal: AbortSignal.timeout(8000) });
    return {
      name: "qmetaram.com",
      status: res.ok ? "pass" : "fail",
      detail: `HTTP ${res.status}`,
      latencyMs: Date.now() - t0,
    };
  } catch {
    try {
      const res = await fetch("https://qmetaram.com/", { method: "HEAD", signal: AbortSignal.timeout(8000) });
      return {
        name: "qmetaram.com",
        status: res.ok ? "pass" : "fail",
        detail: `HTTP ${res.status}`,
        latencyMs: Date.now() - t0,
      };
    } catch (err2: unknown) {
      const msg = err2 instanceof Error ? err2.message : String(err2);
      return { name: "qmetaram.com", status: "fail", detail: msg, latencyMs: Date.now() - t0 };
    }
  }
}

export default function HealthPage() {
  const [checks, setChecks] = useState<HealthCheck[]>([
    { name: "Frontend", status: "loading", detail: "" },
    { name: "Supabase DB", status: "loading", detail: "" },
    { name: "qmetaram.com", status: "loading", detail: "" },
  ]);
  const [checkedAt, setCheckedAt] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<HealthTab>("overview");

  const runChecks = async () => {
    setRunning(true);
    setChecks((prev) => prev.map((c) => ({ ...c, status: "loading", detail: c.detail })));
    const results = await Promise.all([checkFrontend(), checkSupabase(), checkQMetaram()]);
    setChecks(results);
    setCheckedAt(new Date().toLocaleTimeString("fa-IR"));
    setRunning(false);
  };

  useEffect(() => {
    runChecks();
  }, []);

  const allPass = checks.every((c) => c.status === "pass");
  const avgLatency = useMemo(() => {
    const valid = checks.filter((c) => typeof c.latencyMs === "number");
    if (!valid.length) return 0;
    const total = valid.reduce((acc, item) => acc + (item.latencyMs ?? 0), 0);
    return Math.round(total / valid.length);
  }, [checks]);

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="rounded-2xl border border-border bg-card p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black tracking-tight">Q Network Health Intelligence</h1>
              <p className="text-sm text-muted-foreground mt-1">Last check: {checkedAt || "..."}</p>
            </div>
            <button
              type="button"
              onClick={runChecks}
              disabled={running}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-primary/30 bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 transition-colors disabled:opacity-60"
            >
              <RefreshCcw className={`w-4 h-4 ${running ? "animate-spin" : ""}`} />
              {running ? "Running" : "Re-run checks"}
            </button>
          </div>

          <div className={`mt-4 rounded-lg border px-4 py-3 text-sm font-semibold ${allPass ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300" : "border-rose-400/30 bg-rose-500/10 text-rose-300"}`}>
            {allPass ? "All systems operational" : "One or more checks failed"}
          </div>

          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Checks" value={String(checks.length)} />
            <StatCard label="Pass" value={String(checks.filter((c) => c.status === "pass").length)} />
            <StatCard label="Fail" value={String(checks.filter((c) => c.status === "fail").length)} />
            <StatCard label="Avg Latency" value={`${avgLatency}ms`} />
          </div>
        </header>

        <section className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="border-b border-border p-2 flex flex-wrap gap-2">
            {TAB_META.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${active ? "bg-primary/15 text-primary border border-primary/30" : "text-muted-foreground border border-border hover:text-foreground"}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {activeTab === "overview" && (
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {checks.map((check) => (
                <article key={check.name} className="rounded-xl border border-border bg-background p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold">{check.name}</h3>
                    <span className={`text-[10px] px-2 py-1 rounded-md border ${STATUS_BADGE[check.status]}`}>
                      {STATUS_LABEL[check.status]}
                    </span>
                  </div>
                  <p className="text-[12px] text-muted-foreground mt-2 leading-5 break-words">{check.detail || "Running check..."}</p>
                  <p className="text-[11px] text-primary mt-2">Latency: {check.latencyMs != null ? `${check.latencyMs}ms` : "-"}</p>
                </article>
              ))}
            </div>
          )}

          {activeTab === "dependencies" && (
            <div className="p-4 space-y-3">
              <DependencyRow name="Supabase" status={findStatus(checks, "Supabase DB")} description="Primary persistence and auth backbone" />
              <DependencyRow name="QMetaram Domain" status={findStatus(checks, "qmetaram.com")} description="External availability and DNS reachability" />
              <DependencyRow name="Frontend Runtime" status={findStatus(checks, "Frontend")} description="Client rendering and routing shell" />
            </div>
          )}

          {activeTab === "runtime" && (
            <div className="p-4">
              <div className="rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground leading-6">
                <p>Environment: Browser runtime</p>
                <p>Health checks are executed in parallel with 8s timeout on remote calls.</p>
                <p>Recommended action on failure: isolate failing dependency, inspect network policy, re-run checks.</p>
                <p className="mt-3 text-primary">Security Brain v3 · Operational telemetry channel enabled</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function findStatus(checks: HealthCheck[], name: string): CheckStatus {
  return checks.find((item) => item.name === name)?.status ?? "loading";
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="text-lg font-black text-primary">{value}</div>
      <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
    </div>
  );
}

function DependencyRow({ name, status, description }: { name: string; status: CheckStatus; description: string }) {
  return (
    <article className="rounded-xl border border-border bg-background p-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="text-sm font-semibold">{name}</h3>
        <p className="text-[12px] text-muted-foreground mt-1">{description}</p>
      </div>
      <span className={`text-[10px] px-2 py-1 rounded-md border ${STATUS_BADGE[status]}`}>{STATUS_LABEL[status]}</span>
    </article>
  );
}
