import { useParams, Link } from "react-router-dom";
import { navigationMap, getEffectiveAccess } from "@/lib/NavigationMap";
import { statusMeta } from "@/lib/statusMeta";
import { Shield, Home, Cpu, BarChart3, Zap, ArrowLeft, Lock } from "lucide-react";

/**
 * Ghost Route — Autonomous Container
 * Renders a sovereign-themed placeholder for any NavigationMap page
 * that doesn't have a dedicated component yet.
 */
export default function SovereignPage() {
  const params = useParams();
  const fullPath = "/" + (params["*"] ?? "");

  // Find page info from NavigationMap
  const allPages = navigationMap.flatMap((g) =>
    g.pages.map((p) => ({ ...p, groupIcon: g.icon, groupLabel: g.labelFa, groupId: g.id }))
  );
  const page = allPages.find((p) => p.path === fullPath);
  const group = page
    ? navigationMap.find((g) => g.id === page.groupId)
    : null;

  const sm = page ? statusMeta[page.status] : null;
  const StatusIcon = sm?.icon ?? Zap;
  const effectiveAccess = page ? getEffectiveAccess(page) : "public";

  // If private, show access denied
  if (effectiveAccess === "private") {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-8">
        <div className="max-w-md text-center space-y-6">
          <div className="mx-auto w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: "hsl(var(--neon-red) / 0.1)", border: "1px solid hsl(var(--neon-red) / 0.3)" }}>
            <Lock className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-black uppercase tracking-wide">صفحه خصوصی</h2>
          <p className="text-sm text-muted-foreground">{page?.labelFa ?? "این صفحه"} فقط برای فرمانده قابل دسترسی است.</p>
          <p className="text-[10px] text-muted-foreground font-mono">{fullPath} • ACCESS: RESTRICTED • v{page?.version ?? "?"}</p>
          <Link to="/sam-arman" className="inline-flex items-center gap-2 text-xs px-4 py-2 rounded-lg border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
            <ArrowLeft className="w-3 h-3" /> بازگشت به پنل اجرایی
          </Link>
        </div>
      </div>
    );
  }

  // If updating, show maintenance page
  if (effectiveAccess === "updating") {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-8">
        <div className="max-w-md text-center space-y-6">
          <div className="mx-auto w-20 h-20 rounded-2xl flex items-center justify-center animate-pulse" style={{ background: "hsl(var(--neon-gold) / 0.1)", border: "1px solid hsl(var(--neon-gold) / 0.3)" }}>
            <Zap className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-black uppercase tracking-wide">در حال بروزرسانی</h2>
          <p className="text-sm text-muted-foreground">{page?.labelFa ?? "این صفحه"} در حال دریافت نسخه جدید است.</p>
          <p className="text-[10px] text-muted-foreground font-mono">{fullPath} • STATUS: UPDATING • v{page?.version ?? "?"}</p>
          <Link to="/sam-arman" className="inline-flex items-center gap-2 text-xs px-4 py-2 rounded-lg border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
            <ArrowLeft className="w-3 h-3" /> بازگشت به پنل اجرایی
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border glass-panel">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div
              className="h-9 w-9 rounded-lg flex items-center justify-center glow-gold"
              style={{ background: "hsl(var(--neon-gold) / 0.12)", border: "1px solid hsl(var(--neon-gold) / 0.25)" }}
            >
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-xs font-black tracking-[0.15em] uppercase text-primary text-glow-gold">
                {page?.labelFa ?? "صفحه حاکمیتی"}
              </h1>
              <p className="text-[10px] text-muted-foreground">{page?.label ?? fullPath}</p>
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

      {/* Content */}
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-lg w-full text-center space-y-6">
          {/* Module badge */}
          {group && (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-card text-xs text-muted-foreground">
              <span>{group.icon}</span>
              <span>{group.labelFa}</span>
            </div>
          )}

          {/* Hero icon */}
          <div className="relative mx-auto w-24 h-24">
            <div
              className="absolute inset-0 rounded-2xl animate-pulse"
              style={{ background: "hsl(var(--neon-gold) / 0.08)", border: "1px solid hsl(var(--neon-gold) / 0.2)" }}
            />
            <div className="relative flex items-center justify-center w-full h-full">
              <Zap className="w-10 h-10 text-primary animate-pulse" />
            </div>
          </div>

          {/* Title */}
          <div>
            <h2 className="text-2xl font-black uppercase tracking-wide text-foreground">
              {page?.labelFa ?? "صفحه ناشناخته"}
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              {page?.label ?? fullPath}
            </p>
          </div>

          {/* Status */}
          {sm && (
            <div className="flex items-center justify-center gap-2">
              <StatusIcon className={`w-4 h-4 ${sm.color}`} />
              <span className={`text-xs ${sm.color}`}>{sm.label}</span>
              {page?.notes && (
                <span className="text-[10px] text-muted-foreground">— {page.notes}</span>
              )}
            </div>
          )}

          {/* Info card */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-3 text-right">
            <div className="grid grid-cols-2 gap-3 text-[11px]">
              <div className="bg-accent/50 rounded-lg px-3 py-2">
                <div className="text-muted-foreground text-[10px]">وضعیت</div>
                <div className="font-bold mt-0.5" style={{ color: `hsl(var(--${page?.status === "ready" ? "neon-green" : page?.status === "partial" ? "neon-gold" : "neon-red"}))` }}>
                  {sm?.label ?? "نامشخص"}
                </div>
              </div>
              <div className="bg-accent/50 rounded-lg px-3 py-2">
                <div className="text-muted-foreground text-[10px]">نسخه</div>
                <div className="font-bold mt-0.5 font-mono">v{page?.version ?? "?"}</div>
              </div>
              <div className="bg-accent/50 rounded-lg px-3 py-2">
                <div className="text-muted-foreground text-[10px]">مسیر</div>
                <div className="font-bold mt-0.5 font-mono text-[10px]">{fullPath}</div>
              </div>
              <div className="bg-accent/50 rounded-lg px-3 py-2">
                <div className="text-muted-foreground text-[10px]">دسترسی</div>
                <div className="font-bold mt-0.5 text-[hsl(var(--neon-green))]">🌐 عمومی</div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-center gap-3">
            <Link
              to="/sam-arman"
              className="flex items-center gap-2 text-xs px-4 py-2 rounded-lg border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <ArrowLeft className="w-3 h-3" />
              بازگشت به پنل اجرایی
            </Link>
            <Link
              to="/q-core"
              className="flex items-center gap-2 text-xs px-4 py-2 rounded-lg border border-border text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
            >
              <Cpu className="w-3 h-3" />
              ساخت ایجنت
            </Link>
          </div>

          {/* Footer note */}
          <p className="text-[10px] text-muted-foreground/50 font-mono">
            SOVEREIGN CONTAINER • SECURITY: ARMORED • AWAITING DEPLOYMENT
          </p>
        </div>
      </main>
    </div>
  );
}
