import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Terminal, Code2, Lightbulb, Trash2, Download, Copy, Check, Users, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { safeParseJSON, isChatMessages } from "@/lib/storageValidation";
import { navigationMap, getNavigationStats } from "@/lib/NavigationMap";
import { runCouncilConsensus, councilMembers } from "@/lib/CouncilBrain";

interface ChatMessage {
  id: string;
  role: "user" | "system";
  content: string;
  type: "text" | "code" | "idea" | "command" | "council";
  timestamp: number;
}

const STORAGE_KEY = "q-executive-chat";

function loadMessages(): ChatMessage[] {
  return safeParseJSON(localStorage.getItem(STORAGE_KEY), isChatMessages, []) as ChatMessage[];
}

function saveMessages(msgs: ChatMessage[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs));
}

function processCommand(input: string): ChatMessage[] {
  const id = () => crypto.randomUUID();
  const timestamp = Date.now();
  const trimmed = input.trim();

  // Detect code blocks
  if (trimmed.startsWith("```") || trimmed.startsWith("code:")) {
    return [{ id: id(), role: "system", content: `✅ کد ذخیره شد:\n${trimmed.replace(/^code:\s*/, "")}`, type: "code", timestamp }];
  }

  // Detect ideas
  if (trimmed.startsWith("idea:") || trimmed.startsWith("ایده:")) {
    const ideaText = trimmed.replace(/^(idea:|ایده:)\s*/, "");
    // Save to ideas vault
    try {
      const existing = JSON.parse(localStorage.getItem("q-ideas-vault") || "[]");
      existing.push({ text: ideaText, timestamp, id: id() });
      localStorage.setItem("q-ideas-vault", JSON.stringify(existing));
    } catch {}
    return [{ id: id(), role: "system", content: `💡 ایده استراتژیک ثبت شد: "${ideaText}"\n\n📍 در تالار ایده‌ها ذخیره گردید.`, type: "idea", timestamp }];
  }

  // System commands
  if (trimmed === "/status") {
    const stats = getNavigationStats();
    return [{ id: id(), role: "system", content: `🟢 سیستم آنلاین\n📊 ${stats.total} صفحه ثبت‌شده | ${stats.readinessPercent}٪ آمادگی\n🛡️ Error Boundary فعال | آخرین بیلد: امروز\n👑 شورای ۱۲ نفره: فعال`, type: "command", timestamp }];
  }

  if (trimmed === "/help") {
    return [{
      id: id(), role: "system", type: "command", timestamp,
      content: `📋 **دستورات موجود:**
/status — وضعیت سیستم
/export — خروجی JSON از چت
/clear — پاک کردن تاریخچه
/modules — لیست ماژول‌ها
/council — معرفی اعضای شورا
idea: [متن] — ثبت ایده جدید
code: [کد] — ذخیره قطعه کد

💬 **هر متن دیگر** → تحلیل توسط شورای ۱۲ نفره و اجماع مادر کورا`,
    }];
  }

  if (trimmed === "/modules") {
    const stats = getNavigationStats();
    const moduleLines = navigationMap.map((g) => {
      const ready = g.pages.filter(p => p.status === "ready").length;
      const partial = g.pages.filter(p => p.status === "partial").length;
      const total = g.pages.length;
      const pct = total > 0 ? Math.round(((ready * 100 + partial * 50) / (total * 100)) * 100) : 0;
      return `${g.icon} ${g.labelFa} — ${total} صفحه (${pct}٪) [✓${ready} ◐${partial}]`;
    }).join("\n");
    return [{
      id: id(), role: "system", type: "command", timestamp,
      content: `📦 **ماژول‌های فعال** (${navigationMap.length} گروه · ${stats.total} صفحه · قدرت ${stats.readinessPercent}٪):\n\n${moduleLines}`,
    }];
  }

  if (trimmed === "/council") {
    const lines = councilMembers.map(m => `${m.emoji} **${m.nameFa}** (${m.name}) — ${m.expertise}`).join("\n");
    return [{
      id: id(), role: "system", type: "command", timestamp,
      content: `👑 **شورای ۱۲ نفره مادر کورا:**\n\n${lines}\n\n🏛️ تمام تصمیمات با اجماع این ۱۲ عضو صادر می‌شود.`,
    }];
  }

  // === COUNCIL CONSENSUS — replaces "یادداشت ثبت شد" ===
  const result = runCouncilConsensus(trimmed);

  const messages: ChatMessage[] = [];

  // Brief council analysis summary
  const topAnalyses = result.memberAnalyses
    .filter((_, i) => i % 3 === 0) // Show 4 key members
    .map(m => `${m.member.emoji} **${m.member.nameFa}:** ${m.analysis}`)
    .join("\n");

  messages.push({
    id: id(), role: "system", type: "council", timestamp,
    content: `🏛️ **تحلیل شورا:**\n${topAnalyses}`,
  });

  // Mother Core verdict
  messages.push({
    id: id(), role: "system", type: "council", timestamp: timestamp + 1,
    content: result.motherCoreVerdict,
  });

  return messages;
}

export default function ExecutiveChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(loadMessages);
  const [input, setInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { saveMessages(messages); }, [messages]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isThinking]);

  const send = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;

    if (trimmed === "/clear") {
      setMessages([]);
      setInput("");
      return;
    }

    if (trimmed === "/export") {
      const blob = new Blob([JSON.stringify(messages, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `q-chat-${Date.now()}.json`;
      a.click();
      setInput("");
      return;
    }

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      type: trimmed.startsWith("idea:") || trimmed.startsWith("ایده:") ? "idea" : trimmed.startsWith("code:") || trimmed.startsWith("```") ? "code" : "text",
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsThinking(true);

    // Simulate council deliberation delay
    setTimeout(() => {
      const responses = processCommand(trimmed);
      setMessages((prev) => [...prev, ...responses]);
      setIsThinking(false);
    }, trimmed.startsWith("/") || trimmed.startsWith("idea:") || trimmed.startsWith("ایده:") || trimmed.startsWith("code:") ? 300 : 1200);
  }, [input, messages]);

  const copyMsg = (msg: ChatMessage) => {
    navigator.clipboard.writeText(msg.content);
    setCopiedId(msg.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const typeIcon = (type: ChatMessage["type"]) => {
    if (type === "code") return <Code2 className="h-3 w-3 text-[hsl(var(--neon-green))]" />;
    if (type === "idea") return <Lightbulb className="h-3 w-3 text-primary" />;
    if (type === "council") return <Crown className="h-3 w-3 text-primary" />;
    if (type === "command") return <Terminal className="h-3 w-3 text-[hsl(var(--neon-green))]" />;
    return <Terminal className="h-3 w-3 text-muted-foreground" />;
  };

  return (
    <div className="glass-panel rounded-xl flex flex-col h-[520px] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Crown className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold tracking-wider uppercase text-glow-gold">شورای ۱۲ · مادر کورا</span>
          <span className="h-2 w-2 rounded-full bg-[hsl(var(--neon-green))] animate-pulse" />
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
            const blob = new Blob([JSON.stringify(messages, null, 2)], { type: "application/json" });
            const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
            a.download = `q-chat-${Date.now()}.json`; a.click();
          }}>
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setMessages([])}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground text-xs py-12 space-y-2">
            <Crown className="h-8 w-8 mx-auto opacity-30" />
            <p>شورای ۱۲ نفره مادر کورا — آماده دریافت فرمان</p>
            <p className="text-[10px]">هر پیام شما توسط ۱۲ متخصص تحلیل و اجماع نهایی صادر می‌شود</p>
            <p className="text-[10px]">تایپ کنید <code className="bg-muted px-1 rounded">/help</code> برای لیست دستورات</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm group relative ${
              msg.role === "user"
                ? "bg-primary/15 border border-primary/20 text-foreground"
                : msg.type === "council"
                ? "bg-primary/5 border border-primary/30 text-foreground"
                : "bg-muted/50 border border-border text-foreground"
            }`}>
              <div className="flex items-center gap-1.5 mb-1">
                {typeIcon(msg.type)}
                <span className="text-[10px] text-muted-foreground">
                  {msg.type === "council" ? "اجماع شورا" : ""}
                  {" "}
                  {new Date(msg.timestamp).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed">{msg.content}</pre>
              <button
                onClick={() => copyMsg(msg)}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {copiedId === msg.id ? <Check className="h-3 w-3 text-[hsl(var(--neon-green))]" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
              </button>
            </div>
          </div>
        ))}

        {/* Thinking indicator */}
        {isThinking && (
          <div className="flex gap-2 justify-start">
            <div className="bg-primary/5 border border-primary/30 rounded-lg px-4 py-3 flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-primary animate-pulse" />
              <span className="text-xs text-primary animate-pulse">شورا در حال بررسی...</span>
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="فرمان خود را صادر کنید... شورای ۱۲ نفره تحلیل می‌کند"
            rows={4}
            maxLength={100000}
            className="flex-1 bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm font-mono resize-y focus:outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground"
          />
          <Button onClick={send} size="icon" className="h-full aspect-square glow-gold" disabled={isThinking}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex justify-end mt-1">
          <span className={`text-[9px] font-mono ${input.length > 90000 ? 'text-red-400' : input.length > 50000 ? 'text-amber-400' : 'text-muted-foreground/40'}`}>
            {input.length.toLocaleString()} / ۱۰۰٬۰۰۰
          </span>
        </div>
        <div className="flex gap-2 mt-1">
          {[
            { label: "💡 ایده", prefix: "idea: " },
            { label: "💻 کد", prefix: "code: " },
            { label: "📊 وضعیت", prefix: "/status" },
            { label: "📦 ماژول‌ها", prefix: "/modules" },
            { label: "👑 شورا", prefix: "/council" },
            { label: "❓ راهنما", prefix: "/help" },
          ].map((shortcut) => (
            <button
              key={shortcut.label}
              onClick={() => { setInput(shortcut.prefix); }}
              className="text-[10px] px-2 py-1 rounded-full border border-border bg-muted/30 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
            >
              {shortcut.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
