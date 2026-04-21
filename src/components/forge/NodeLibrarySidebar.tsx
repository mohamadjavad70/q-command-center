import { nodeLibrary, type AgentNode } from "@/lib/AgentBlueprints";
import { Cpu, Zap, Brain, Wrench, GitBranch, Database, ArrowRightCircle } from "lucide-react";

const categoryConfig: Record<AgentNode["category"], { icon: typeof Cpu; label: string }> = {
  trigger: { icon: Zap, label: "تریگرها" },
  ai: { icon: Brain, label: "هوش مصنوعی" },
  tool: { icon: Wrench, label: "ابزارها" },
  logic: { icon: GitBranch, label: "منطق" },
  storage: { icon: Database, label: "ذخیره‌سازی" },
  output: { icon: ArrowRightCircle, label: "خروجی" },
};

const categories: AgentNode["category"][] = ["trigger", "ai", "tool", "logic", "storage", "output"];

interface Props {
  onAddNode: (node: AgentNode) => void;
}

export default function NodeLibrarySidebar({ onAddNode }: Props) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Cpu className="h-4 w-4 text-[hsl(var(--neon-amber))]" />
        <span className="text-xs font-bold tracking-wider uppercase" style={{ color: "hsl(var(--neon-amber))" }}>
          کتابخانه گره‌ها
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {categories.map(cat => {
          const cfg = categoryConfig[cat];
          const Icon = cfg.icon;
          const nodes = nodeLibrary.filter(n => n.category === cat);
          return (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{cfg.label}</span>
              </div>
              <div className="space-y-1.5">
                {nodes.map(node => (
                  <button
                    key={node.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/q-node-id", node.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onClick={() => onAddNode(node)}
                    className="w-full text-left p-2.5 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 hover:border-[hsl(var(--neon-amber))/0.4] transition-all group cursor-grab active:cursor-grabbing"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full`} style={{ background: `hsl(var(--${node.color}))` }} />
                      <span className="text-[11px] font-medium">{node.labelFa}</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-1 mr-4">{node.description}</p>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="p-3 border-t border-border">
        <p className="text-[9px] text-muted-foreground leading-relaxed text-center">
          روی هر گره کلیک کنید تا به بوم اضافه شود
        </p>
      </div>
    </div>
  );
}
