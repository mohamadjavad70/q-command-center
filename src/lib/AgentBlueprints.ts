// کتابخانه ایجنت‌های پیش‌ساخته — The Agent Knowledge Base

export type NodeCategory = "trigger" | "ai" | "tool" | "logic" | "output" | "storage";

export interface AgentNode {
  id: string;
  label: string;
  labelFa: string;
  category: NodeCategory;
  description: string;
  color: string;
  defaults?: Record<string, any>;
  io?: {
    in: Record<string, string>;
    out: Record<string, string>;
  };
}

export interface Blueprint {
  id: string;
  name: string;
  nameFa: string;
  keywords: string[];
  description: string;
  nodes: AgentNode[];
  connections: { from: string; to: string }[];
}

export const nodeLibrary: AgentNode[] = [
  {
    id: "trigger_webhook", label: "Webhook Trigger", labelFa: "تریگر وب‌هوک", category: "trigger",
    description: "دریافت درخواست HTTP", color: "neon-green",
    defaults: { url: "/webhook", method: "POST" },
    io: { in: {}, out: { payload: "داده دریافتی", headers: "هدرها" } },
  },
  {
    id: "trigger_schedule", label: "Schedule Trigger", labelFa: "تریگر زمان‌بندی", category: "trigger",
    description: "اجرا در زمان مشخص", color: "neon-green",
    defaults: { cron: "0 */6 * * *", timezone: "Asia/Tehran" },
    io: { in: {}, out: { triggeredAt: "زمان اجرا" } },
  },
  {
    id: "trigger_message", label: "Message Trigger", labelFa: "تریگر پیام", category: "trigger",
    description: "وقتی پیامی دریافت شد", color: "neon-green",
    defaults: { source: "any" },
    io: { in: {}, out: { message: "متن پیام", sender: "فرستنده" } },
  },
  {
    id: "ai_analyzer", label: "AI Analyzer", labelFa: "تحلیل‌گر هوشمند", category: "ai",
    description: "تحلیل متن/تصویر با AI", color: "neon-blue",
    defaults: { model: "auto", prompt: "" },
    io: { in: { text: "متن ورودی", context: "زمینه" }, out: { analysis: "نتیجه تحلیل", confidence: "اطمینان" } },
  },
  {
    id: "ai_generator", label: "AI Generator", labelFa: "تولیدکننده محتوا", category: "ai",
    description: "تولید متن، تصویر یا پاسخ", color: "neon-blue",
    defaults: { model: "auto", temperature: 0.7, maxTokens: 500 },
    io: { in: { prompt: "پرامپت", context: "زمینه" }, out: { generated: "خروجی تولیدشده" } },
  },
  {
    id: "ai_classifier", label: "AI Classifier", labelFa: "دسته‌بند هوشمند", category: "ai",
    description: "دسته‌بندی ورودی‌ها", color: "neon-blue",
    defaults: { categories: "مثبت,منفی,خنثی" },
    io: { in: { text: "متن ورودی" }, out: { category: "دسته", score: "امتیاز" } },
  },
  {
    id: "tool_http", label: "HTTP Request", labelFa: "درخواست HTTP", category: "tool",
    description: "ارسال درخواست به API", color: "neon-amber",
    defaults: { url: "", method: "GET", headers: "{}", body: "" },
    io: { in: { url: "آدرس", method: "متد", body: "بدنه" }, out: { response: "پاسخ", status: "وضعیت" } },
  },
  {
    id: "tool_scraper", label: "Web Scraper", labelFa: "استخراج‌کننده وب", category: "tool",
    description: "استخراج اطلاعات از سایت", color: "neon-amber",
    defaults: { url: "", selector: "body" },
    io: { in: { url: "آدرس سایت", selector: "انتخاب‌گر CSS" }, out: { content: "محتوا", links: "لینک‌ها" } },
  },
  {
    id: "tool_email", label: "Email Sender", labelFa: "ارسال ایمیل", category: "tool",
    description: "ارسال ایمیل خودکار", color: "neon-amber",
    defaults: { to: "", subject: "", body: "" },
    io: { in: { to: "گیرنده", subject: "موضوع", body: "متن" }, out: { sent: "ارسال شد؟", messageId: "شناسه" } },
  },
  {
    id: "tool_telegram", label: "Telegram Bot", labelFa: "ربات تلگرام", category: "tool",
    description: "ارسال/دریافت پیام تلگرام", color: "neon-amber",
    defaults: { botToken: "", chatId: "", action: "send_message" },
    io: { in: { chatId: "شناسه چت", text: "متن پیام" }, out: { sent: "ارسال شد؟", messageId: "شناسه پیام" } },
  },
  {
    id: "tool_instagram", label: "Instagram Tool", labelFa: "ابزار اینستاگرام", category: "tool",
    description: "خواندن DM/کامنت/پست و ارسال پاسخ (فعلاً شبیه‌سازی)", color: "neon-amber",
    defaults: { mode: "read_dm", account: "@qmetaram", limit: 5, query: "" },
    io: {
      in: { mode: "حالت اجرا", account: "اکانت", limit: "تعداد", query: "فیلتر" },
      out: { items: "لیست پیام/کامنت", meta: "متادیتا" },
    },
  },
  {
    id: "logic_router", label: "Logic Router", labelFa: "مسیریاب منطقی", category: "logic",
    description: "تصمیم‌گیری بر اساس شرط", color: "neon-purple",
    defaults: { condition: "", trueLabel: "بله", falseLabel: "خیر" },
    io: { in: { value: "مقدار ورودی", condition: "شرط" }, out: { result: "نتیجه", branch: "شاخه" } },
  },
  {
    id: "logic_filter", label: "Data Filter", labelFa: "فیلتر داده", category: "logic",
    description: "فیلتر کردن داده‌ها", color: "neon-purple",
    defaults: { field: "", operator: "contains", value: "" },
    io: { in: { data: "داده ورودی", field: "فیلد", value: "مقدار" }, out: { filtered: "داده فیلترشده", count: "تعداد" } },
  },
  {
    id: "logic_merge", label: "Data Merge", labelFa: "ترکیب داده", category: "logic",
    description: "ترکیب چند جریان داده", color: "neon-purple",
    defaults: { strategy: "append" },
    io: { in: { dataA: "داده اول", dataB: "داده دوم" }, out: { merged: "داده ترکیب‌شده" } },
  },
  {
    id: "storage_db", label: "Database", labelFa: "پایگاه‌داده", category: "storage",
    description: "ذخیره/خواندن از دیتابیس", color: "neon-red",
    defaults: { action: "insert", table: "records" },
    io: { in: { action: "عملیات", data: "داده" }, out: { saved: "ذخیره شد؟", count: "تعداد" } },
  },
  {
    id: "storage_file", label: "File Storage", labelFa: "ذخیره فایل", category: "storage",
    description: "ذخیره/خواندن فایل", color: "neon-red",
    defaults: { path: "", action: "write" },
    io: { in: { path: "مسیر فایل", content: "محتوا" }, out: { saved: "ذخیره شد؟", url: "آدرس فایل" } },
  },
  {
    id: "output_response", label: "Send Response", labelFa: "ارسال پاسخ", category: "output",
    description: "ارسال خروجی نهایی", color: "neon-green",
    defaults: { format: "json" },
    io: { in: { data: "داده خروجی" }, out: { delivered: "ارسال شد؟" } },
  },
  {
    id: "output_notify", label: "Notification", labelFa: "اعلان", category: "output",
    description: "ارسال نوتیفیکیشن", color: "neon-green",
    defaults: { channel: "push", message: "" },
    io: { in: { message: "متن اعلان", channel: "کانال" }, out: { delivered: "ارسال شد؟" } },
  },
];

// الگوهای آماده (Blueprints)
export const blueprints: Blueprint[] = [
  {
    id: "bp_instagram_sales",
    name: "Instagram Sales Agent",
    nameFa: "ایجنت فروش اینستاگرام",
    keywords: ["اینستاگرام", "instagram", "فروش", "دایرکت", "پست", "استوری"],
    description: "دریافت پیام از اینستاگرام → تحلیل نیاز مشتری → پاسخ هوشمند → ثبت سفارش",
    nodes: [
      nodeLibrary.find(n => n.id === "trigger_webhook")!,
      nodeLibrary.find(n => n.id === "tool_instagram")!,
      nodeLibrary.find(n => n.id === "ai_analyzer")!,
      nodeLibrary.find(n => n.id === "ai_generator")!,
      nodeLibrary.find(n => n.id === "storage_db")!,
      nodeLibrary.find(n => n.id === "output_response")!,
    ],
    connections: [
      { from: "trigger_webhook", to: "tool_instagram" },
      { from: "tool_instagram", to: "ai_analyzer" },
      { from: "ai_analyzer", to: "ai_generator" },
      { from: "ai_generator", to: "storage_db" },
      { from: "storage_db", to: "output_response" },
    ],
  },
  {
    id: "bp_telegram_support",
    name: "Telegram Support Bot",
    nameFa: "ربات پشتیبانی تلگرام",
    keywords: ["تلگرام", "telegram", "پشتیبانی", "ربات", "بات"],
    description: "دریافت سوال از تلگرام → جستجو در دانش‌بنیان → پاسخ خودکار",
    nodes: [
      nodeLibrary.find(n => n.id === "trigger_message")!,
      nodeLibrary.find(n => n.id === "tool_telegram")!,
      nodeLibrary.find(n => n.id === "ai_classifier")!,
      nodeLibrary.find(n => n.id === "ai_generator")!,
      nodeLibrary.find(n => n.id === "output_response")!,
    ],
    connections: [
      { from: "trigger_message", to: "tool_telegram" },
      { from: "tool_telegram", to: "ai_classifier" },
      { from: "ai_classifier", to: "ai_generator" },
      { from: "ai_generator", to: "output_response" },
    ],
  },
  {
    id: "bp_content_creator",
    name: "Content Creation Pipeline",
    nameFa: "خط تولید محتوا",
    keywords: ["محتوا", "content", "تولید", "نوشتن", "بلاگ", "مقاله"],
    description: "دریافت موضوع → تحقیق وب → تولید محتوا → انتشار خودکار",
    nodes: [
      nodeLibrary.find(n => n.id === "trigger_schedule")!,
      nodeLibrary.find(n => n.id === "tool_scraper")!,
      nodeLibrary.find(n => n.id === "ai_analyzer")!,
      nodeLibrary.find(n => n.id === "ai_generator")!,
      nodeLibrary.find(n => n.id === "tool_http")!,
      nodeLibrary.find(n => n.id === "output_notify")!,
    ],
    connections: [
      { from: "trigger_schedule", to: "tool_scraper" },
      { from: "tool_scraper", to: "ai_analyzer" },
      { from: "ai_analyzer", to: "ai_generator" },
      { from: "ai_generator", to: "tool_http" },
      { from: "tool_http", to: "output_notify" },
    ],
  },
  {
    id: "bp_crypto_monitor",
    name: "Crypto Price Monitor",
    nameFa: "مانیتور قیمت رمزارز",
    keywords: ["کریپتو", "crypto", "بیتکوین", "قیمت", "ارز", "صرافی"],
    description: "بررسی قیمت → تحلیل روند → هشدار به کاربر",
    nodes: [
      nodeLibrary.find(n => n.id === "trigger_schedule")!,
      nodeLibrary.find(n => n.id === "tool_http")!,
      nodeLibrary.find(n => n.id === "ai_analyzer")!,
      nodeLibrary.find(n => n.id === "logic_router")!,
      nodeLibrary.find(n => n.id === "output_notify")!,
    ],
    connections: [
      { from: "trigger_schedule", to: "tool_http" },
      { from: "tool_http", to: "ai_analyzer" },
      { from: "ai_analyzer", to: "logic_router" },
      { from: "logic_router", to: "output_notify" },
    ],
  },
  {
    id: "bp_data_pipeline",
    name: "Data Processing Pipeline",
    nameFa: "خط پردازش داده",
    keywords: ["داده", "data", "پردازش", "آنالیز", "گزارش"],
    description: "دریافت داده → فیلتر → پردازش → ذخیره → گزارش",
    nodes: [
      nodeLibrary.find(n => n.id === "trigger_webhook")!,
      nodeLibrary.find(n => n.id === "logic_filter")!,
      nodeLibrary.find(n => n.id === "ai_analyzer")!,
      nodeLibrary.find(n => n.id === "storage_db")!,
      nodeLibrary.find(n => n.id === "output_notify")!,
    ],
    connections: [
      { from: "trigger_webhook", to: "logic_filter" },
      { from: "logic_filter", to: "ai_analyzer" },
      { from: "ai_analyzer", to: "storage_db" },
      { from: "storage_db", to: "output_notify" },
    ],
  },
];

// تحلیل‌گر هوشمند
export function analyzeIdea(idea: string): {
  matchedBlueprint: Blueprint | null;
  suggestedNodes: AgentNode[];
  operationalParts: string[];
  confidence: number;
} {
  const lower = idea.toLowerCase();
  let bestMatch: Blueprint | null = null;
  let bestScore = 0;

  for (const bp of blueprints) {
    let score = 0;
    for (const kw of bp.keywords) {
      if (lower.includes(kw.toLowerCase())) score += 1;
    }
    if (score > bestScore) { bestScore = score; bestMatch = bp; }
  }

  if (!bestMatch || bestScore === 0) {
    const genericNodes = [
      nodeLibrary.find(n => n.id === "trigger_webhook")!,
      nodeLibrary.find(n => n.id === "ai_analyzer")!,
      nodeLibrary.find(n => n.id === "logic_router")!,
      nodeLibrary.find(n => n.id === "output_response")!,
    ];
    return {
      matchedBlueprint: null, suggestedNodes: genericNodes,
      operationalParts: ["۱. دریافت ورودی (Trigger)", "۲. تحلیل و پردازش (AI)", "۳. تصمیم‌گیری (Logic)", "۴. خروجی نهایی (Output)"],
      confidence: 20,
    };
  }

  return {
    matchedBlueprint: bestMatch,
    suggestedNodes: bestMatch.nodes,
    operationalParts: bestMatch.nodes.map((n, i) => `${i + 1}. ${n.labelFa} — ${n.description}`),
    confidence: Math.min(100, bestScore * 30 + 10),
  };
}

// تبدیل Blueprint به نودها و اتصالات React Flow — با prefix برای جلوگیری از id تکراری
export function blueprintToFlow(bp: Blueprint) {
  const prefix = `bp-${Date.now()}-`;
  const idMap = new Map<string, string>();

  const nodes = bp.nodes.map((n, i) => {
    const newId = `${prefix}${n.id}`;
    idMap.set(n.id, newId);
    return {
      id: newId,
      type: i === 0 ? "input" : i === bp.nodes.length - 1 ? "output" : "default",
      position: { x: 80 + i * 220, y: 120 + (i % 2 === 0 ? 0 : 60) },
      data: {
        label: `${n.labelFa}\n${n.label}`,
        category: n.category,
        nodeType: n.id,
        config: { ...(n.defaults ?? {}) },
      },
      style: {
        background: `hsl(var(--${n.color}) / 0.15)`,
        border: `1px solid hsl(var(--${n.color}) / 0.5)`,
        color: `hsl(var(--foreground))`,
        borderRadius: "8px", padding: "10px 14px", fontSize: "11px", fontFamily: "monospace",
      },
    };
  });

  const edges = bp.connections.map((c, i) => ({
    id: `${prefix}e-${i}`,
    source: idMap.get(c.from) ?? c.from,
    target: idMap.get(c.to) ?? c.to,
    animated: true,
    style: { stroke: "hsl(var(--neon-amber))", strokeWidth: 2 },
  }));

  return { nodes, edges };
}
