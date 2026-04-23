/**
 * QNativeChat — چت بومی Q بدون وابستگی به OpenAI
 * - حالت آفلاین: پاسخ‌های rule-based از این فایل
 * - حالت آنلاین: می‌تواند به Ollama محلی یا سرور Q متصل شود
 * - اولویت: offline → local-ollama → server
 */

export type QChatRole = "user" | "assistant";
export type QChatTurn = { role: QChatRole; content: string };

type FlowStep = "none" | "onboarding" | "security" | "mission";

function inferFlowStep(input: string, lang: "fa" | "de" | "en"): FlowStep {
  const text = input.toLowerCase();
  const onboardingKeys = ["شروع", "start", "begin", "onboarding", "setup"];
  const securityKeys = ["امنیت", "security", "guardian", "token", "auth"];
  const missionKeys = ["ماموریت", "mission", "plan", "roadmap", "next step"];

  if (onboardingKeys.some((k) => text.includes(k))) return "onboarding";
  if (securityKeys.some((k) => text.includes(k))) return "security";
  if (missionKeys.some((k) => text.includes(k))) return "mission";

  if (lang === "fa" && text.includes("راهنما")) return "onboarding";
  return "none";
}

function flowResponse(step: FlowStep, lang: "fa" | "de" | "en"): string | null {
  if (step === "none") return null;

  const responses: Record<"fa" | "de" | "en", Record<Exclude<FlowStep, "none">, string>> = {
    fa: {
      onboarding: "مسیر شروع سریع: 1) وضعیت را در /health چک کن 2) ماژول /q-core را باز کن 3) با /q-analytics پایش را فعال کن.",
      security: "چک امنیتی پیشنهادی: JWT معتبر + Guardian middleware + محدودسازی نرخ + بازبینی CORS/RLS.",
      mission: "پلن اجرایی امروز: تثبیت هسته، کاهش latency، و تکمیل یک اسپرینت برای ماژول بحرانی.",
    },
    de: {
      onboarding: "Schnellstart: 1) /health pruefen 2) /q-core oeffnen 3) Monitoring in /q-analytics aktivieren.",
      security: "Sicherheitscheck: gueltiges JWT, Guardian Middleware, Rate Limit und CORS/RLS pruefen.",
      mission: "Heute: Kern stabilisieren, Latenz reduzieren, einen kritischen Modul-Sprint abschliessen.",
    },
    en: {
      onboarding: "Quick start: 1) check /health 2) open /q-core 3) enable monitoring in /q-analytics.",
      security: "Security checklist: valid JWT, Guardian middleware, rate limiting, and CORS/RLS review.",
      mission: "Today's mission: stabilize core paths, reduce latency, and finish one critical module sprint.",
    },
  };

  return responses[lang][step];
}

// ─── پایگاه دانش محلی ─────────────────────────────────────────────────────────
const knowledgeBase: Array<{ keywords: string[]; response: string; lang?: "fa" | "de" | "en" }> = [
  // Persian (fa)
  { keywords: ["سلام", "درود", "خوش آمدی"], response: "سلام! چطور می‌توانم کمک کنم؟", lang: "fa" },
  { keywords: ["کیو", "q", "پروژه"], response: "Q یک شبکه هوشمند غیرمتمرکز است. مرکز فرماندهی — حافظه — ماژول‌های تخصصی.", lang: "fa" },
  { keywords: ["ماژول", "بخش", "قسمت"], response: "ماژول‌های فعال: Galaxy (کهکشان) · Swiss Voice · Q-Core · Q-Network · Analytics.", lang: "fa" },
  { keywords: ["امنیت", "حفاظت", "guardian"], response: "Guardian فعال است: Helmet، Rate Limit (۳۰/دقیقه)، CORS whitelist، RLS Supabase.", lang: "fa" },
  { keywords: ["حافظه", "memory", "یادگیری"], response: "حافظه در دو لایه: localStorage (کوتاه‌مدت) + Supabase (بلندمدت). داده‌های شما ایمن است.", lang: "fa" },
  { keywords: ["صدا", "voice", "تلفظ"], response: "Swiss Voice Agent آماده است: گفتار به متن (Whisper) + متن به گفتار (TTS) + حافظه بلندمدت.", lang: "fa" },
  { keywords: ["پول", "درآمد", "اشتراک", "قیمت"], response: "مدل درآمدی: B2C Subscription (Swiss Voice) + B2B API Access + Referral.", lang: "fa" },
  { keywords: ["خطا", "مشکل", "error"], response: "لطفاً پیام خطا را کامل بفرستید تا بررسی کنم. یا به /health بروید.", lang: "fa" },
  { keywords: ["galaxy", "کهکشان"], response: "Q Galaxy: کاوش سیارات دانش. هر سیاره یک حوزه تخصصی است. مسیر: /galaxy", lang: "fa" },
  { keywords: ["network", "شبکه", "qpn"], response: "QPN (Q Private Network): شبکه آفلاین-ready با Service Worker + IndexedDB sync.", lang: "fa" },
  { keywords: ["چه کاری", "چه می‌کنی", "کمک"], response: "می‌توانم: اطلاعات پروژه، وضعیت ماژول‌ها، راهنمای فنی، و تحلیل استراتژیک ارائه دهم.", lang: "fa" },
  { keywords: ["ممنون", "مرسی", "سپاس"], response: "خوشحالم که کمک کردم. سؤال دیگری دارید؟", lang: "fa" },
  { keywords: ["health", "سلامت", "وضعیت سیستم"], response: "برای دیدن سلامت سیستم به /health بروید. بررسی‌های Frontend، Supabase و Domain اجرا می‌شود.", lang: "fa" },
  { keywords: ["faq", "سوال", "پرسش"], response: "بخش FAQ در صفحه اصلی اضافه شده و پاسخ سریع اپراتوری ارائه می‌دهد.", lang: "fa" },
  { keywords: ["countdown", "timer", "شمارش"], response: "در داشبورد یک شمارشگر ماموریت دارید که پنجره عملیات بعدی را نشان می‌دهد.", lang: "fa" },
  // German (de)
  { keywords: ["hallo", "guten tag", "hi"], response: "Hallo! Wie kann ich Ihnen helfen?", lang: "de" },
  { keywords: ["projekt", "system", "was ist"], response: "Q ist ein intelligentes, dezentrales Netzwerk. Kommandozentrale · Speicher · Spezialmodule.", lang: "de" },
  { keywords: ["sicherheit", "schutz"], response: "Guardian aktiv: Helmet, Rate-Limiting (30/min), CORS-Whitelist, Supabase RLS.", lang: "de" },
  { keywords: ["health", "status", "monitoring"], response: "Nutzen Sie /health fuer den Live-Status von Frontend, Datenbank und Domain.", lang: "de" },
  // English (en)
  { keywords: ["hello", "hey", "hi there"], response: "Hello! How can I assist you today?", lang: "en" },
  { keywords: ["what is q", "tell me about", "explain"], response: "Q is a sovereign AI network: Command Center · Memory Engine · Specialized Modules.", lang: "en" },
  { keywords: ["help", "support", "guide"], response: "I can help with: module status, project info, technical guidance, and strategy.", lang: "en" },
  { keywords: ["error", "bug", "problem", "issue"], response: "Please share the full error message. You can also check /health for system status.", lang: "en" },
  { keywords: ["security", "safe", "protect"], response: "Guardian active: Helmet + Rate limiting (30/min) + CORS whitelist + Supabase RLS.", lang: "en" },
  { keywords: ["mission", "countdown", "operations"], response: "Mission panel includes countdown, case cards, and operator FAQ for fast alignment.", lang: "en" },
];

// ─── تشخیص زبان ────────────────────────────────────────────────────────────────
function detectLang(text: string): "fa" | "de" | "en" {
  const persianChars = (text.match(/[\u0600-\u06FF]/g) ?? []).length;
  if (persianChars > 2) return "fa";
  const germanWords = ["der", "die", "das", "ist", "sind", "haben", "bitte", "danke"];
  const lower = text.toLowerCase();
  if (germanWords.some((w) => lower.includes(w))) return "de";
  return "en";
}

// ─── پاسخ‌های fallback بر اساس زبان ───────────────────────────────────────────
const fallbacks: Record<"fa" | "de" | "en", string> = {
  fa: "متوجه نشدم. می‌توانید بپرسید: سلام · پروژه · ماژول · امنیت · حافظه · صدا · galaxy",
  de: "Das habe ich nicht verstanden. Sie können fragen: hallo · projekt · sicherheit",
  en: "I didn't understand. You can ask about: hello · modules · security · memory · voice",
};

// ─── موتور اصلی ────────────────────────────────────────────────────────────────
export function qNativeChat(input: string): string {
  const text = input.trim().toLowerCase();
  const lang = detectLang(input);

  const step = inferFlowStep(input, lang);
  const stepReply = flowResponse(step, lang);
  if (stepReply) return stepReply;

  // دنبال بهترین match بگرد
  let bestMatch: string | null = null;
  let bestScore = 0;

  for (const entry of knowledgeBase) {
    // اگر زبان مشخص شده و با زبان کاربر match نمی‌کند، کم اهمیت‌تر است
    const langBonus = !entry.lang || entry.lang === lang ? 1 : 0.3;
    const matchCount = entry.keywords.filter((k) => text.includes(k.toLowerCase())).length;
    const score = matchCount * langBonus;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = entry.response;
    }
  }

  if (bestMatch && bestScore > 0) return bestMatch;
  return fallbacks[lang];
}

// ─── پردازش با تاریخچه ─────────────────────────────────────────────────────────
export function qNativeChatWithHistory(
  input: string,
  history: QChatTurn[] = []
): string {
  // برای پیام‌های follow-up، زمینه آخرین پاسخ را بررسی کن
  const lastAssistant = [...history].reverse().find((t) => t.role === "assistant");
  const combined = lastAssistant
    ? `${lastAssistant.content} ${input}`
    : input;
  return qNativeChat(combined);
}

// ─── بررسی دسترسی به اینترنت ─────────────────────────────────────────────────
export function isOnline(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

// ─── Ollama (اختیاری، محلی) ───────────────────────────────────────────────────
const OLLAMA_URL = (typeof import.meta !== "undefined" ? (import.meta.env?.VITE_OLLAMA_URL as string | undefined) : undefined) ?? "http://localhost:11434";

export async function ollamaChat(
  message: string,
  model = "llama3",
  history: QChatTurn[] = []
): Promise<string | null> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          ...history.map((t) => ({ role: t.role, content: t.content })),
          { role: "user", content: message },
        ],
        stream: false,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.message?.content ?? null;
  } catch {
    return null;
  }
}

/**
 * chatWithFallback
 * اولویت: Ollama محلی → پاسخ بومی
 * وقتی OpenAI در دسترس نیست، از این استفاده کنید.
 */
export async function chatWithFallback(
  message: string,
  history: QChatTurn[] = []
): Promise<{ text: string; source: "ollama" | "native" }> {
  // تلاش برای Ollama محلی
  const ollamaResponse = await ollamaChat(message, "llama3", history);
  if (ollamaResponse) {
    return { text: ollamaResponse, source: "ollama" };
  }
  // fallback به پاسخ بومی
  return {
    text: qNativeChatWithHistory(message, history),
    source: "native",
  };
}
