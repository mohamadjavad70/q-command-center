import type { RunLog } from "@/lib/executor";
import { CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface Props {
  logs: RunLog[];
  running: boolean;
}

export default function RunLogPanel({ logs, running }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (logs.length === 0 && !running) return null;

  return (
    <div className="border-t border-border bg-card/80 max-h-52 overflow-y-auto">
      <div className="px-4 py-2 border-b border-border flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          {running ? "⏳ در حال اجرا..." : `✅ اجرا تمام — ${logs.length} مرحله`}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {logs.filter(l => l.ok).length}/{logs.length} موفق
        </span>
      </div>
      <div className="divide-y divide-border">
        {logs.map((log, i) => (
          <div key={log.nodeId + i} className="px-4 py-2">
            <button
              onClick={() => setExpanded(expanded === log.nodeId ? null : log.nodeId)}
              className="w-full flex items-center gap-2 text-xs"
            >
              {log.ok
                ? <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--neon-green))] shrink-0" />
                : <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
              }
              <span className="font-mono text-[11px] truncate flex-1 text-right">{log.label.split("\n")[0]}</span>
              <span className="text-[9px] text-muted-foreground flex items-center gap-1">
                <Clock className="h-2.5 w-2.5" />
                {log.endedAt - log.startedAt}ms
              </span>
              {expanded === log.nodeId ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {expanded === log.nodeId && (
              <pre className="mt-2 text-[9px] font-mono bg-muted/30 rounded p-2 whitespace-pre-wrap break-all max-h-32 overflow-y-auto">
                {log.error
                  ? `❌ خطا: ${log.error}`
                  : JSON.stringify(log.output, null, 2)
                }
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
