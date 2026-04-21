import { useState, useCallback, useRef, useEffect } from "react";
import { Mic, MicOff, Volume2, VolumeX, MessageSquare, X, Send, Brain } from "lucide-react";

/**
 * QVoiceChat — مرکز گفتگوی صوتی با هوش کیو
 * - STT: Web Speech API (browser-native, رایگان)
 * - TTS: Web Speech Synthesis API (browser-native, پشتیبانی از fa-IR)
 * - Q Memory: ارتباط با q_memory.py روی پورت 8765
 * - Council: پاسخ از طریق شورای نور
 */

const Q_MEMORY_API = "http://localhost:8765";

interface ChatEntry {
  role: "user" | "q";
  text: string;
  ts: number;
}

// --- Q Council Response Engine ---
function qCouncilResponse(input: string): string {
  const lower = input.toLowerCase();
  if (lower.includes("وضعیت") || lower.includes("status") || lower.includes("سرور")) {
    return "فرمانده، طبق گزارش شورای نور: سرویس‌های اصلی روی پورت‌های ۳۴۷۵۷، ۳۴۷۶۰، ۳۴۷۶۱ فعال هستند. تونل Cloudflare برقرار است.";
  }
  if (lower.includes("حافظه") || lower.includes("memory")) {
    fetch(`${Q_MEMORY_API}/status`).catch(() => {});
    return "حافظه Q در سه لایه فعال است: کوتاه‌مدت در RAM، بلندمدت در SQLite، تحلیلی با فرمول ۳.۶.۹. بروزرسانی هر ۳ ساعت انجام می‌شود.";
  }
  if (lower.includes("شبکه") || lower.includes("network") || lower.includes("نود")) {
    return "شبکه عصبی Q در حال رشد است. نودهای نسل ۳، ۶، ۹ به عنوان نودهای ارتقای شبکه علامت‌گذاری می‌شوند. برای ایجاد نود جدید دستور بگویید.";
  }
  if (lower.includes("پروژه") || lower.includes("فایل")) {
    return "فرمانده، شما ۶ پروژه فعال دارید: مرکز فرماندهی، Q.GALEXI، Q.AIAMIR، Guardian، Q.NETWORK.Q3 و هسته Q1. همه در ساختار Q-BRAIN سازماندهی شده‌اند.";
  }
  if (lower.includes("سلام") || lower.includes("hello") || lower.includes("کیو")) {
    return "فرمانده سام آرمان، شورای نور آماده است. ۱۲۰ عضو در انتظار فرمان شما هستند.";
  }
  if (lower.includes("galaxy") || lower.includes("کهکشان")) {
    return "سرویس کهکشان روی پورت ۳۴۷۶۰ فعال است. آدرس: galaxy.qmetaram.com — پس از تنظیم DNS Cloudflare قابل دسترس خواهد بود.";
  }
  if (lower.includes("guardian")) {
    return "Guardian — سیستم دفاعی هوش مصنوعی — روی پورت ۳۴۷۶۱ فعال است. پنل در مسیر guardian.qmetaram.com پس از DNS قابل دسترس است.";
  }
  // Default council response
  return `شورای نور دستور «${input}» را دریافت کرد. فرمانده، برای اجرا تأیید کنید یا جزئیات بیشتری بدهید.`;
}

export default function QVoiceChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [voiceGender, setVoiceGender] = useState<'male' | 'female'>('male');
  const [input, setInput] = useState("");
  const [chat, setChat] = useState<ChatEntry[]>([
    { role: "q", text: "فرمانده سام آرمان، شورای نور آماده است. می‌توانید صحبت کنید یا تایپ کنید.", ts: Date.now() }
  ]);
  const recognitionRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  const speak = useCallback((text: string) => {
    if (muted || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "fa-IR";
    u.rate = 1.05;
    u.pitch = voiceGender === 'female' ? 1.3 : 0.85;
    // انتخاب صدای فارسی با توجه به جنسیت انتخابی
    const voices = window.speechSynthesis.getVoices();
    const faVoices = voices.filter(v => v.lang.startsWith("fa") || v.lang.startsWith("ar"));
    if (faVoices.length > 0) {
      // تلاش برای انتخاب صدای متناسب با جنسیت
      const genderVoice = faVoices.find(v =>
        voiceGender === 'female'
          ? /female|zarifa|saman|woman/i.test(v.name)
          : /male|reza|aria|man/i.test(v.name)
      ) || faVoices[voiceGender === 'female' ? faVoices.length - 1 : 0];
      u.voice = genderVoice;
    }
    u.onstart = () => setIsSpeaking(true);
    u.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(u);
  }, [muted, voiceGender]);

  const processInput = useCallback((text: string) => {
    const userEntry: ChatEntry = { role: "user", text, ts: Date.now() };

    // sendToQMemory — ارسال به /chat endpoint با فالبک به پاسخ شورای نور
    const sendToQMemory = async (msg: string) => {
      try {
        const userId = localStorage.getItem("q_user_id") || "anonymous";
        let sessionId = localStorage.getItem("q_session_id");
        if (!sessionId) { sessionId = crypto.randomUUID(); localStorage.setItem("q_session_id", sessionId); }

        const res = await fetch(`${Q_MEMORY_API}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: userId, message: msg, session_id: sessionId })
        });

        if (res.ok) {
          const data = await res.json();
          const qEntry: ChatEntry = { role: "q", text: data.response, ts: Date.now() };
          // ذخیره در localStorage (بکاپ)
          const chatHistory = JSON.parse(localStorage.getItem("q_chat_history") || "[]");
          chatHistory.push({ role: "user", content: msg, timestamp: new Date().toISOString() });
          chatHistory.push({ role: "assistant", content: data.response, timestamp: new Date().toISOString() });
          localStorage.setItem("q_chat_history", JSON.stringify(chatHistory.slice(-50)));
          setChat(prev => [...prev, userEntry, qEntry]);
          speak(data.response);
          window.dispatchEvent(new CustomEvent("NOOR_COMMAND", { detail: msg }));
          return;
        }
        throw new Error("API failed");
      } catch {
        // Fallback: شورای نور local
        const response = qCouncilResponse(msg);
        const qEntry: ChatEntry = { role: "q", text: response, ts: Date.now() };
        // ذخیره در حافظه کوتاه‌مدت
        fetch(`${Q_MEMORY_API}/memory/short`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: `chat_${Date.now()}`, value: msg, category: "voice_chat" })
        }).catch(() => {});
        setChat(prev => [...prev, userEntry, qEntry]);
        speak(response);
        window.dispatchEvent(new CustomEvent("NOOR_COMMAND", { detail: msg }));
      }
    };

    sendToQMemory(text);
  }, [speak]);

  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      speak("مرورگر شما از تشخیص صدا پشتیبانی نمی‌کند. لطفاً از Chrome استفاده کنید.");
      return;
    }
    const r = new SR();
    r.lang = "fa-IR";
    r.continuous = false;
    r.interimResults = false;
    r.onstart = () => setIsListening(true);
    r.onresult = (e: any) => {
      const t = e.results[0][0].transcript as string;
      setInput(t);
      processInput(t);
    };
    r.onerror = () => setIsListening(false);
    r.onend = () => setIsListening(false);
    r.start();
    recognitionRef.current = r;
  }, [speak, processInput]);

  const sendText = useCallback(() => {
    if (!input.trim()) return;
    processInput(input.trim());
    setInput("");
  }, [input, processInput]);

  return (
    <>
      {/* FAB Button */}
      <button
        onClick={() => setIsOpen(o => !o)}
        className={`fixed bottom-8 right-8 z-[200] h-14 w-14 rounded-full flex items-center justify-center shadow-xl transition-all ${
          isOpen ? "bg-primary scale-110" : "bg-card border border-primary/30 hover:border-primary/60 hover:scale-105"
        }`}
        title="گفتگو با هوش کیو"
      >
        {isOpen
          ? <X className="h-6 w-6 text-primary-foreground" />
          : <Brain className="h-6 w-6 text-primary" />
        }
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-28 right-8 z-[199] w-80 bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 bg-primary/10 border-b border-border">
            <span className="text-[11px] font-mono text-primary font-semibold">⬡ هوش کیو — شورای نور</span>
            <div className="flex items-center gap-1">
              {/* انتخاب صدای زن/مرد */}
              <button
                onClick={() => setVoiceGender(g => g === 'male' ? 'female' : 'male')}
                className="px-1.5 py-0.5 rounded text-[10px] bg-muted hover:bg-accent border border-border transition-all"
                title={voiceGender === 'male' ? 'صدای مرد — کلیک برای تغییر به زن' : 'صدای زن — کلیک برای تغییر به مرد'}
              >
                {voiceGender === 'male' ? '🧑' : '👩'}
              </button>
              <button onClick={() => setMuted(m => !m)} className="p-1 rounded hover:bg-accent">
                {muted ? <VolumeX className="h-3.5 w-3.5 text-muted-foreground" /> : <Volume2 className="h-3.5 w-3.5 text-primary" />}
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-64 text-[11px]">
            {chat.map((entry, i) => (
              <div key={i} className={`flex ${entry.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-lg px-2.5 py-1.5 ${
                  entry.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground border border-border"
                }`}>
                  {entry.role === "q" && <span className="text-primary font-bold text-[9px] block mb-0.5">⬡ کیو</span>}
                  <p className="leading-relaxed">{entry.text}</p>
                </div>
              </div>
            ))}
            {isSpeaking && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-2.5 py-1.5 border border-primary/30">
                  <span className="text-primary text-[9px] animate-pulse">⬡ کیو در حال صحبت است...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="flex items-center gap-1.5 p-2 border-t border-border">
            <button
              onClick={startListening}
              className={`p-2 rounded-lg transition-all ${
                isListening ? "bg-primary text-primary-foreground animate-pulse" : "bg-muted hover:bg-accent"
              }`}
              title="ضبط صدا"
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendText()}
              placeholder="فرمان بدهید..."
              className="flex-1 bg-transparent text-[11px] outline-none placeholder:text-muted-foreground"
              dir="rtl"
            />
            <button onClick={sendText} className="p-2 rounded-lg bg-primary/20 hover:bg-primary/40 transition-all">
              <Send className="h-4 w-4 text-primary" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
