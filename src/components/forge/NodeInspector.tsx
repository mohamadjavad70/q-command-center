import { useMemo } from "react";
import type { Node } from "reactflow";
import { nodeLibrary, type AgentNode } from "@/lib/AgentBlueprints";
import { Settings2, ArrowDownToLine, ArrowUpFromLine, Activity } from "lucide-react";

interface Props {
  nodes: Node[];
  selectedNodeId: string | null;
  onUpdateNodeConfig: (nodeId: string, patch: Record<string, any>) => void;
  lastRunByNode: Record<string, any>;
}

export default function NodeInspector({ nodes, selectedNodeId, onUpdateNodeConfig, lastRunByNode }: Props) {
  const node = useMemo(() => nodes.find((n) => n.id === selectedNodeId) ?? null, [nodes, selectedNodeId]);

  const lib = useMemo((): AgentNode | null => {
    if (!node) return null;
    const nodeType = (node.data as any)?.nodeType;
    return nodeLibrary.find((x) => x.id === nodeType) ?? null;
  }, [node]);

  if (!node) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-xs gap-3 px-6">
        <Settings2 className="h-8 w-8 opacity-20" />
        <p className="text-center">روی یک گره کلیک کن تا Inspector باز شود.</p>
      </div>
    );
  }

  const cfg = ((node.data as any)?.config ?? {}) as Record<string, any>;
  const ioIn = lib?.io?.in ?? {};
  const ioOut = lib?.io?.out ?? {};
  const lastRun = lastRunByNode[node.id];

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: lib ? `hsl(var(--${lib.color}))` : "hsl(var(--muted-foreground))" }} />
          <span className="text-xs font-bold">{lib?.labelFa ?? "گره"}</span>
        </div>
        <p className="text-[10px] text-muted-foreground">{lib?.description ?? ""}</p>
        <p className="text-[9px] text-muted-foreground mt-1 font-mono opacity-60">ID: {node.id}</p>
      </div>

      {/* Config inputs */}
      {Object.keys(ioIn).length > 0 && (
        <div className="px-4 py-3 border-b border-border space-y-3">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-widest">
            <ArrowDownToLine className="h-3 w-3" /> پارامترها
          </div>
          {Object.entries(ioIn).map(([k, label]) => (
            <div key={k}>
              <label className="text-[10px] text-muted-foreground block mb-1">
                {label} <span className="opacity-50">({k})</span>
              </label>
              <input
                className="w-full bg-muted/30 border border-border rounded px-2 py-1.5 text-[11px] font-mono focus:outline-none focus:border-[hsl(var(--neon-amber))] transition-colors"
                value={cfg[k] ?? ""}
                onChange={(e) => onUpdateNodeConfig(node.id, { [k]: e.target.value })}
              />
            </div>
          ))}
        </div>
      )}

      {/* Output schema */}
      {Object.keys(ioOut).length > 0 && (
        <div className="px-4 py-3 border-b border-border space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-widest mb-2">
            <ArrowUpFromLine className="h-3 w-3" /> خروجی‌ها
          </div>
          {Object.entries(ioOut).map(([k, label]) => (
            <div key={k} className="flex items-center gap-2 text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--neon-green))]" />
              <span className="font-mono opacity-70">{k}</span>
              <span className="text-muted-foreground">— {label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Last run output */}
      <div className="px-4 py-3 space-y-2">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-widest">
          <Activity className="h-3 w-3" /> آخرین خروجی اجرا
        </div>
        {lastRun ? (
          <pre className="text-[10px] font-mono bg-muted/30 border border-border rounded p-2 whitespace-pre-wrap break-all max-h-48 overflow-y-auto text-[hsl(var(--neon-green))]">
            {JSON.stringify(lastRun, null, 2)}
          </pre>
        ) : (
          <p className="text-[10px] text-muted-foreground italic">هنوز اجرا نشده</p>
        )}
      </div>
    </div>
  );
}
