import { useState } from "react";
import { Link } from "react-router-dom";
import { navigationMap, getNavigationStats, type ModuleStatus } from "@/lib/NavigationMap";
import {
  Shield, Zap, Eye, Terminal, ChevronDown, ChevronRight, ExternalLink,
  MessageSquare, BarChart3, Cpu, Home, Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ExecutiveChat from "@/components/ExecutiveChat";
import { statusConfigExec as statusConfig } from "@/lib/statusMeta";
import SovereignEye from "@/components/SovereignEye";
import ModuleDashboard from "@/components/ModuleDashboard";
import AccessControlPanel from "@/components/AccessControlPanel";

export default function SamArman() {
  const stats = getNavigationStats();
  const allPages = navigationMap.flatMap((g) => g.pages);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["governance"]));
  const [filter, setFilter] = useState<ModuleStatus | "all">("all");
  const [showChat, setShowChat] = useState(false);
  const [showAccessPanel, setShowAccessPanel] = useState(false);

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filteredMap = navigationMap.map((g) => ({
    ...g,
    pages: filter === "all" ? g.pages : g.pages.filter((p) => p.status === filter),
  })).filter((g) => g.pages.length > 0);

  const totalFiltered = filteredMap.reduce((sum, g) => sum + g.pages.length, 0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Top Bar ── */}
      <header className="sticky top-0 z-50 glass-panel border-b border-border">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div
              className="h-9 w-9 rounded-lg flex items-center justify-center glow-gold"
              style={{ background: "hsl(var(--neon-gold) / 0.12)", border: "1px solid hsl(var(--neon-gold) / 0.25)" }}
            >
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-[0.15em] uppercase text-primary text-glow-gold">
                SAM ARMAN — EXECUTIVE
              </h1>
              <p className="text-[10px] text-muted-foreground">پنل مدیریت اجرایی — دسترسی کامل</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/q-analytics" className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors px-2 py-1.5 rounded-md hover:bg-accent">
              <BarChart3 className="w-3 h-3" /> آنالیز
            </Link>
            <Link to="/q-core" className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors px-2 py-1.5 rounded-md hover:bg-accent">
              <Cpu className="w-3 h-3" /> Q-Core
            </Link>
            <Link to="/" className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors px-2 py-1.5 rounded-md hover:bg-accent">
              <Home className="w-3 h-3" /> خانه
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* ── KPI Row ── */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[
            { label: "کل صفحات", value: stats.total },
            { label: "عملیاتی", value: stats.ready, neon: "neon-green" },
            { label: "نیمه‌فعال", value: stats.partial, neon: "neon-gold" },
            { label: "پیش‌نویس", value: stats.stub, neon: "neon-red" },
            { label: "برنامه‌ریزی", value: stats.planned },
            { label: "قدرت کلی", value: `${stats.readinessPercent}٪`, neon: "neon-gold" },
          ].map((kpi, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-3 text-center">
              <div
                className="text-xl font-black font-mono"
                style={kpi.neon ? { color: `hsl(var(--${kpi.neon}))` } : undefined}
              >
                {kpi.value}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">{kpi.label}</div>
            </div>
          ))}
        </div>

        {/* ── System Health Bar ── */}
        <div className="rounded-xl border border-border bg-card p-5 glow-gold">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm font-bold">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-primary">سلامت سیستم</span>
            </div>
            <span className="text-sm font-mono text-muted-foreground">{stats.readinessPercent}٪</span>
          </div>
          <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${stats.readinessPercent}%`,
                background: "linear-gradient(90deg, hsl(var(--destructive)), hsl(var(--primary)))",
              }}
            />
          </div>
          <div className="flex gap-4 mt-3 text-[10px] text-muted-foreground">
            <span>{navigationMap.length} ماژول</span>
            <span>{allPages.length} صفحه</span>
            <span>{allPages.filter((p) => p.notes).length} هشدار</span>
          </div>
        </div>

        {/* ── Module Dashboard (Charts) ── */}
        <ModuleDashboard />

        {/* ── Access Control Panel ── */}
        <div className="space-y-3">
          <button
            onClick={() => setShowAccessPanel((v) => !v)}
            className="flex items-center gap-2 text-sm font-bold text-primary hover:text-primary/80 transition-colors"
          >
            <Settings className="h-4 w-4" />
            <span>کنترل دسترسی صفحات (Public / Private / Updating)</span>
            {showAccessPanel ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          {showAccessPanel && <AccessControlPanel />}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-muted-foreground ml-2">فیلتر:</span>
          {(["all", "ready", "partial", "stub", "planned"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-[10px] px-3 py-1.5 rounded-full border transition-all ${
                filter === f
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-accent/50 text-muted-foreground border-border hover:border-primary/40"
              }`}
            >
              {f === "all" ? `همه (${allPages.length})` : `${statusConfig[f].label} (${allPages.filter((p) => p.status === f).length})`}
            </button>
          ))}
          <span className="text-[10px] text-muted-foreground mr-auto">
            نمایش {totalFiltered} صفحه
          </span>
        </div>

        {/* ── Module Groups ── */}
        <div className="space-y-4">
          {filteredMap.map((group) => {
            const expanded = expandedGroups.has(group.id);
            const readyCount = group.pages.filter((p) => p.status === "ready").length;
            const partialCount = group.pages.filter((p) => p.status === "partial").length;
            const pct = group.pages.length > 0
              ? Math.round(((readyCount * 100 + partialCount * 50 + group.pages.filter((p) => p.status === "stub").length * 15) / (group.pages.length * 100)) * 100)
              : 0;

            return (
              <div
                key={group.id}
                className="rounded-xl border border-border bg-card overflow-hidden hover:border-primary/20 transition-all"
              >
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="w-full px-5 py-4 flex items-center gap-3 hover:bg-accent/30 transition-colors text-left"
                >
                  {expanded
                    ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  }
                  <span className="text-lg">{group.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{group.labelFa}</span>
                      <span className="text-[10px] text-muted-foreground">({group.label})</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-muted-foreground">{group.pages.length} صفحه</span>
                      <div className="flex-1 max-w-[120px] h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] font-mono text-primary">{pct}٪</span>
                    </div>
                  </div>
                </button>

                {expanded && (
                  <div className="border-t border-border divide-y divide-border/50">
                    {group.pages.map((page) => {
                      const S = statusConfig[page.status];
                      return (
                        <div key={page.path} className="px-5 py-3 flex items-center gap-3 hover:bg-accent/20 transition-colors group/row">
                          <S.icon className={`h-3.5 w-3.5 ${S.cls} shrink-0`} />
                          <code className="text-[11px] text-muted-foreground font-mono min-w-[140px]">{page.path}</code>
                          <span className="text-sm flex-1 truncate">{page.labelFa}</span>
                          <span className="text-[10px] text-muted-foreground">{page.source}</span>
                          {page.notes && (
                            <span className="text-[10px] text-primary max-w-[180px] truncate hidden md:inline" title={page.notes}>
                              ⚠ {page.notes}
                            </span>
                          )}
                          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover/row:opacity-100 transition-opacity" asChild>
                            <a href={page.path}>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Executive Chat (Floating Panel) ── */}
        {showChat && (
          <div className="fixed bottom-24 left-6 w-[380px] max-h-[70vh] z-50 rounded-xl shadow-2xl border border-border overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            <ExecutiveChat />
          </div>
        )}

        {/* ── Footer ── */}
        <footer className="text-center py-8 space-y-2 text-[10px] text-muted-foreground">
          <p className="flex items-center justify-center gap-2">
            <Eye className="h-3 w-3" /> Sam Arman Executive Panel v2.0
          </p>
          <p>
            <Terminal className="inline h-3 w-3 mr-1" />
            {stats.total} صفحه · {navigationMap.length} ماژول · Golden HUD Active
          </p>
        </footer>
      </main>

      {/* ── Chat FAB ── */}
      <button
        onClick={() => setShowChat((v) => !v)}
        className="fixed bottom-6 left-6 h-14 w-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center glow-gold shadow-xl hover:scale-110 transition-transform z-50"
      >
        <MessageSquare className="h-6 w-6" />
      </button>
    </div>
  );
}
