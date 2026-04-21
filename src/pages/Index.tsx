import { Link } from "react-router-dom";
import { navigationMap, getNavigationStats } from "@/lib/NavigationMap";
import { getWorkspaceSummary, workspaceProjects } from "@/lib/workspaceRegistry";
import {
  Shield, BarChart3, Cpu, Zap, Activity,
  ArrowRight, Sparkles, Globe
} from "lucide-react";
import SovereignEye from "@/components/SovereignEye";

const Index = () => {
  const stats = getNavigationStats();
  const workspace = getWorkspaceSummary();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 border-b border-border glass-panel">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center glow-gold"
              style={{ background: "hsl(var(--neon-gold) / 0.12)", border: "1px solid hsl(var(--neon-gold) / 0.25)" }}
            >
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-[0.2em] uppercase text-primary text-glow-gold">
                QMETARAM OS
              </h1>
              <p className="text-[10px] text-muted-foreground">مرکز فرماندهی حاکمیت دیجیتال</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/cybermap"
              className="flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-lg bg-blue-900/20 text-blue-400 border border-blue-500/20 hover:bg-blue-900/40 transition-all font-medium"
            >
              <Globe className="w-3 h-3" /> CyberMap
            </Link>
            <Link
              to="/q-analytics"
              className="flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-primary hover:border-primary/30 transition-all"
            >
              <BarChart3 className="w-3 h-3" /> آنالیز
            </Link>
            <Link
              to="/q-core"
              className="flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-primary hover:border-primary/30 transition-all"
            >
              <Cpu className="w-3 h-3" /> Q-Core
            </Link>
            <Link
              to="/sam-arman"
              className="flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all font-medium"
            >
              <Shield className="w-3 h-3" /> سام آرمان
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* ── HERO ── */}
        <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-8 md:p-12">
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{ background: "radial-gradient(ellipse at 20% 50%, hsl(var(--neon-gold)), transparent 60%)" }}
          />
          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-[10px] uppercase tracking-[0.3em] text-primary font-bold">Sovereign Digital Empire</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight text-foreground leading-tight">
                امپراتوری دیجیتال<br />
                <span className="text-primary text-glow-gold">Q.METARAM</span>
              </h2>
              <p className="text-sm text-muted-foreground mt-3 max-w-md">
                {stats.total} صفحه · {navigationMap.length} ماژول · قدرت کلی {stats.readinessPercent}٪
              </p>
            </div>
            <SovereignEye progress={stats.readinessPercent} />
          </div>
        </section>

        {/* ── KPI CARDS ── */}
        <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "کل صفحات", value: stats.total, neon: "neon-gold" },
            { label: "عملیاتی", value: stats.ready, neon: "neon-green" },
            { label: "نیمه‌فعال", value: stats.partial, neon: "neon-gold" },
            { label: "پیش‌نویس", value: stats.stub, neon: "neon-red" },
            { label: "آمادگی", value: `${stats.readinessPercent}٪`, neon: "neon-gold" },
          ].map((card, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 text-center relative overflow-hidden group hover:border-primary/30 transition-colors">
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-[0.04] transition-opacity"
                style={{ background: `radial-gradient(circle, hsl(var(--${card.neon})), transparent 70%)` }}
              />
              <div className="text-2xl font-black font-mono relative" style={{ color: `hsl(var(--${card.neon}))` }}>
                {card.value}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1 relative">{card.label}</div>
            </div>
          ))}
        </section>

        {/* ── Q CENTRAL CORE ── */}
        <section className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">هسته مرکزی Q</h2>
              <p className="text-sm text-muted-foreground mt-1">
                رجیستری زنده پروژه‌های workspace؛ هسته اصلی <span className="text-primary font-bold">{workspace.core}</span>
              </p>
            </div>
            <div className="text-[10px] text-muted-foreground rounded-lg border border-border px-3 py-2 bg-card">
              {workspace.total} پوشه اصلی · {workspace.active} فعال · {workspace.support} پشتیبان · {workspace.archive} آرشیوی
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "پروژه‌های اصلی", value: workspace.total },
              { label: "فعال", value: workspace.active },
              { label: "پشتیبان", value: workspace.support },
              { label: "آرشیو", value: workspace.archive },
            ].map((card) => (
              <div key={card.label} className="rounded-xl border border-border bg-card p-4">
                <div className="text-xl font-black text-primary">{card.value}</div>
                <div className="text-[10px] text-muted-foreground mt-1">{card.label}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {workspaceProjects.map((project) => (
              <div key={project.id} className="rounded-xl border border-border bg-card p-4 space-y-3 hover:border-primary/30 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold">{project.name}</div>
                    <div className="text-[10px] text-muted-foreground">{project.summary}</div>
                  </div>
                  <span className="text-[10px] px-2 py-1 rounded-full border border-border bg-background text-primary whitespace-nowrap">
                    {project.role}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {project.stack.slice(0, 3).map((item) => (
                    <span key={item} className="text-[10px] px-2 py-1 rounded-md bg-secondary text-secondary-foreground">
                      {item}
                    </span>
                  ))}
                </div>

                <div className="text-[11px] text-muted-foreground leading-5">{project.action}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── MODULE GRID ── */}
        <section className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
            <Activity className="w-3.5 h-3.5" /> ماژول‌های سیستم
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {navigationMap.map((group) => {
              const readyCount = group.pages.filter(p => p.status === "ready").length;
              const partialCount = group.pages.filter(p => p.status === "partial").length;
              const totalCount = group.pages.length;
              const pct = Math.round(((readyCount * 100 + partialCount * 50) / (totalCount * 100)) * 100);

              return (
                <div
                  key={group.id}
                  className="rounded-xl border border-border bg-card p-5 hover:border-primary/25 transition-all group/card relative overflow-hidden"
                >
                  <div
                    className="absolute inset-0 opacity-0 group-hover/card:opacity-[0.03] transition-opacity"
                    style={{ background: `radial-gradient(circle at 80% 20%, hsl(var(--neon-gold)), transparent 60%)` }}
                  />

                  <div className="relative flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{group.icon}</span>
                      <div>
                        <div className="text-sm font-bold">{group.labelFa}</div>
                        <div className="text-[10px] text-muted-foreground">{group.label}</div>
                      </div>
                    </div>
                    <span className="text-sm font-black font-mono text-primary">{pct}٪</span>
                  </div>

                  <div className="relative h-1.5 rounded-full bg-secondary overflow-hidden mb-3">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: "hsl(var(--primary))" }}
                    />
                  </div>

                  <div className="relative flex items-center justify-between">
                    <div className="flex gap-2 text-[10px]">
                      <span className="text-[hsl(var(--neon-green))]">✓{readyCount}</span>
                      <span className="text-primary">◐{partialCount}</span>
                      <span className="text-muted-foreground">○{totalCount - readyCount - partialCount}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{totalCount} صفحه</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── QUICK LINKS ── */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: "مرکز فرماندهی ایجنت", sub: "ساخت و اجرای ایجنت‌های هوشمند", to: "/q-core", icon: Cpu },
            { label: "آنالیز حاکمیتی", sub: "مانیتورینگ تمام صفحات و ماژول‌ها", to: "/q-analytics", icon: BarChart3 },
            { label: "پنل اجرایی سام آرمان", sub: "دسترسی کامل به تمام ماژول‌ها", to: "/sam-arman", icon: Shield },
            { label: "Q Galaxy", sub: "ورود به لایه کشف هدایت‌شده کهکشان", to: "/galaxy", icon: Sparkles },
          ].map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 hover:border-primary/30 hover:bg-accent/50 transition-all group/link"
            >
              <div
                className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "hsl(var(--neon-gold) / 0.1)", border: "1px solid hsl(var(--neon-gold) / 0.2)" }}
              >
                <link.icon className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold">{link.label}</div>
                <div className="text-[10px] text-muted-foreground">{link.sub}</div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover/link:text-primary transition-colors" />
            </Link>
          ))}
        </section>

        {/* ── FOOTER ── */}
        <footer className="text-center py-8 text-[10px] text-muted-foreground space-y-1">
          <p>🛡️ Qmetaram OS — {stats.total} صفحه · {navigationMap.length} ماژول · Error Boundary فعال</p>
          <p className="text-primary/40">«حاکمیت یعنی اشراف کامل بر هر آنچه ساخته‌ای»</p>
        </footer>
      </main>
    </div>
  );
};

export default Index;
