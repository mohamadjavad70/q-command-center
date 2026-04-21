import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Zap, Trash2, Download, Copy, Check, Brain, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { analyzeIdea, type Blueprint } from "@/lib/AgentBlueprints";
import { safeParseJSON, isForgeChatMessages } from "@/lib/storageValidation";

interface ChatMsg {
  id: string;
  role: "user" | "system";
  content: string;
  type: "text" | "analysis" | "blueprint";
  blueprint?: Blueprint;
  timestamp: number;
}

const STORAGE_KEY = "q-forge-chat";
const load = (): ChatMsg[] => safeParseJSON(localStorage.getItem(STORAGE_KEY), isForgeChatMessages, []) as ChatMsg[];
const save = (m: ChatMsg[]) => localStorage.setItem(STORAGE_KEY, JSON.stringify(m));

interface Props {
  onBlueprintSelect: (bp: Blueprint) => void;
}

export default function ForgeChat({ onBlueprintSelect }: Props) {
  const [msgs, setMsgs] = useState<ChatMsg[]>(load);
  const [input, setInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => { save(msgs); }, [msgs]);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;

    if (trimmed === "/clear") { setMsgs([]); setInput(""); return; }

    const userMsg: ChatMsg = {
      id: crypto.randomUUID(), role: "user", content: trimmed,
      type: "text", timestamp: Date.now(),
    };

    // تحلیل هوشمند ایده
    const analysis = analyzeIdea(trimmed);
    const responses: ChatMsg[] = [];

    if (analysis.matchedBlueprint) {
      responses.push({
        id: crypto.randomUUID(), role: "system", type: "analysis", timestamp: Date.now(),
        content: `🧠 تحلیل هوشمند (اطمینان: ${analysis.confidence}%)\n\n` +
          `📋 الگوی شناسایی‌شده: ${analysis.matchedBlueprint.nameFa}\n` +
          `📝 ${analysis.matchedBlueprint.description}\n\n` +
          `🔧 بخش‌های عملیاتی:\n${analysis.operationalParts.join("\n")}`
      });
      responses.push({
        id: crypto.randomUUID(), role: "system", type: "blueprint", timestamp: Date.now(),
        content: `✅ نقشه آماده! دکمه «اعمال روی بوم» را بزنید تا گره‌ها روی Canvas قرار بگیرند.`,
        blueprint: analysis.matchedBlueprint,
      });
    } else {
      responses.push({
        id: crypto.randomUUID(), role: "system", type: "analysis", timestamp: Date.now(),
        content: `🧠 تحلیل عمومی:\n\n` +
          `الگوی دقیقی در کتابخانه پیدا نشد، اما ساختار پایه پیشنهاد می‌شود:\n\n` +
          `🔧 بخش‌های عملیاتی:\n${analysis.operationalParts.join("\n")}\n\n` +
          `💡 نکته: کلمات کلیدی بیشتری استفاده کنید. مثال:\n` +
          `"ایجنت فروش اینستاگرام"\n"ربات پشتیبانی تلگرام"\n"خط تولید محتوا"`
      });
    }

    setMsgs(prev => [...prev, userMsg, ...responses]);
    setInput("");
  }, [input]);

  const copyMsg = (msg: ChatMsg) => {
    navigator.clipboard.writeText(msg.content);
    setCopiedId(msg.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-[hsl(var(--neon-amber))]" />
          <span className="text-xs font-bold tracking-wider uppercase" style={{ color: "hsl(var(--neon-amber))" }}>
            مغز استراتژیک
          </span>
          <span className="h-2 w-2 rounded-full bg-[hsl(var(--neon-green))] animate-pulse" />
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
            const blob = new Blob([JSON.stringify(msgs, null, 2)], { type: "application/json" });
            const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
            a.download = `q-forge-chat-${Date.now()}.json`; a.click();
          }}>
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setMsgs([])}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {msgs.length === 0 && (
          <div className="text-center text-muted-foreground text-xs py-8 space-y-3">
            <Brain className="h-10 w-10 mx-auto opacity-20" />
            <p className="font-bold">مغز استراتژیک Q</p>
            <p className="text-[10px] leading-relaxed max-w-[220px] mx-auto">
              ایده‌ات رو بنویس، من تحلیل می‌کنم و بهترین گره‌ها رو از کتابخونه پیشنهاد می‌دم.
            </p>
            <div className="space-y-1.5 mt-4">
              {["ایجنت فروش اینستاگرام", "ربات پشتیبانی تلگرام", "خط تولید محتوا"].map(ex => (
                <button key={ex} onClick={() => setInput(ex)}
                  className="block w-full text-[10px] px-3 py-1.5 rounded-lg border border-border bg-muted/30 text-muted-foreground hover:border-[hsl(var(--neon-amber))/0.5] hover:text-foreground transition-colors">
                  💡 {ex}
                </button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((msg) => (
          <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[90%] rounded-lg px-3 py-2 text-xs group relative ${
              msg.role === "user"
                ? "bg-[hsl(var(--neon-amber))/0.12] border border-[hsl(var(--neon-amber))/0.25]"
                : msg.type === "blueprint"
                  ? "bg-[hsl(var(--neon-green))/0.08] border border-[hsl(var(--neon-green))/0.25]"
                  : "bg-muted/50 border border-border"
            }`}>
              <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed">{msg.content}</pre>
              {msg.blueprint && (
                <Button
                  size="sm"
                  className="mt-2 w-full text-[10px] h-7 gap-1"
                  style={{ background: "hsl(var(--neon-amber))", color: "hsl(var(--primary-foreground))" }}
                  onClick={() => onBlueprintSelect(msg.blueprint!)}
                >
                  <Sparkles className="h-3 w-3" /> اعمال روی بوم
                </Button>
              )}
              <button onClick={() => copyMsg(msg)}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {copiedId === msg.id ? <Check className="h-3 w-3 text-[hsl(var(--neon-green))]" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
              </button>
            </div>
          </div>
        ))}
        <div ref={bottom} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="ایده‌ات رو بنویس... مثال: ایجنت فروش اینستاگرام"
            rows={2}
            className="flex-1 bg-muted/30 border border-border rounded-lg px-3 py-2 text-xs font-mono resize-none focus:outline-none focus:border-[hsl(var(--neon-amber))/0.5] transition-colors placeholder:text-muted-foreground"
          />
          <Button onClick={send} size="icon" className="h-full aspect-square"
            style={{ background: "hsl(var(--neon-amber))", color: "hsl(var(--primary-foreground))" }}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
