import { useState } from "react";
import { navigationMap, getEffectiveAccess, setPageAccess, type PageAccess } from "@/lib/NavigationMap";
import { Lock, Unlock, RefreshCw, Globe, Shield, Eye, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const accessConfig: Record<PageAccess, { label: string; labelFa: string; icon: typeof Lock; cls: string }> = {
  public: { label: "Public", labelFa: "عمومی", icon: Globe, cls: "text-[hsl(var(--neon-green))]" },
  private: { label: "Private", labelFa: "خصوصی", icon: Lock, cls: "text-[hsl(var(--neon-red))]" },
  updating: { label: "Updating", labelFa: "در حال بروزرسانی", icon: RefreshCw, cls: "text-primary" },
};

const cycleAccess = (current: PageAccess): PageAccess => {
  const order: PageAccess[] = ["public", "private", "updating"];
  return order[(order.indexOf(current) + 1) % order.length];
};

export default function AccessControlPanel() {
  const [, forceUpdate] = useState(0);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [filterAccess, setFilterAccess] = useState<PageAccess | "all">("all");

  const allPages = navigationMap.flatMap((g) =>
    g.pages.map((p) => ({ ...p, groupIcon: g.icon, groupLabelFa: g.labelFa }))
  );

  const filtered = filterAccess === "all"
    ? allPages
    : allPages.filter((p) => getEffectiveAccess(p) === filterAccess);

  const toggleAccess = (path: string, currentAccess: PageAccess) => {
    const next = cycleAccess(currentAccess);
    setPageAccess(path, next);
    forceUpdate((n) => n + 1);
  };

  const copyLink = (path: string) => {
    navigator.clipboard.writeText(`https://qmetaram.com${path}`);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 1500);
  };

  const publicCount = allPages.filter((p) => getEffectiveAccess(p) === "public").length;
  const privateCount = allPages.filter((p) => getEffectiveAccess(p) === "private").length;
  const updatingCount = allPages.filter((p) => getEffectiveAccess(p) === "updating").length;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <span className="text-sm font-black uppercase tracking-wider text-primary">
            کنترل دسترسی صفحات
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="text-[hsl(var(--neon-green))]">🟢 {publicCount} عمومی</span>
          <span className="text-[hsl(var(--neon-red))]">🔴 {privateCount} خصوصی</span>
          <span className="text-primary">🟡 {updatingCount} بروزرسانی</span>
        </div>
      </div>

      {/* Filter */}
      <div className="px-5 py-2 border-b border-border/50 flex items-center gap-2">
        {(["all", "public", "private", "updating"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilterAccess(f)}
            className={`text-[10px] px-3 py-1 rounded-full border transition-all ${
              filterAccess === f
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-accent/50 text-muted-foreground border-border hover:border-primary/40"
            }`}
          >
            {f === "all" ? `همه (${allPages.length})` : `${accessConfig[f].labelFa} (${allPages.filter(p => getEffectiveAccess(p) === f).length})`}
          </button>
        ))}
      </div>

      {/* Pages List */}
      <div className="max-h-[400px] overflow-y-auto divide-y divide-border/50">
        {filtered.map((page) => {
          const effective = getEffectiveAccess(page);
          const cfg = accessConfig[effective];
          const Icon = cfg.icon;

          return (
            <div
              key={page.path}
              className="px-5 py-3 flex items-center gap-3 hover:bg-accent/20 transition-colors group"
            >
              {/* Access toggle button */}
              <button
                onClick={() => toggleAccess(page.path, effective)}
                className={`h-8 w-8 rounded-lg border flex items-center justify-center transition-all hover:scale-110 ${
                  effective === "public"
                    ? "border-[hsl(var(--neon-green))]/30 bg-[hsl(var(--neon-green))]/10"
                    : effective === "private"
                    ? "border-[hsl(var(--neon-red))]/30 bg-[hsl(var(--neon-red))]/10"
                    : "border-primary/30 bg-primary/10"
                }`}
                title={`کلیک کنید: ${cfg.labelFa} → ${accessConfig[cycleAccess(effective)].labelFa}`}
              >
                <Icon className={`h-3.5 w-3.5 ${cfg.cls}`} />
              </button>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px]">{page.groupIcon}</span>
                  <span className="text-sm font-medium truncate">{page.labelFa}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${cfg.cls} bg-accent/50`}>
                    {cfg.labelFa}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <code className="text-[10px] text-muted-foreground font-mono">{page.path}</code>
                  <span className="text-[9px] text-muted-foreground/50">v{page.version}</span>
                </div>
              </div>

              {/* Copy link */}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => copyLink(page.path)}
                title="کپی لینک"
              >
                {copiedPath === page.path ? (
                  <Check className="h-3 w-3 text-[hsl(var(--neon-green))]" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>

              {/* View */}
              <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                <a href={page.path} title="مشاهده صفحه">
                  <Eye className="h-3 w-3" />
                </a>
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
