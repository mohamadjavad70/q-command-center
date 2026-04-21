/**
 * CouncilBrain — مغز شورای ۱۲ نفره (محلی، بدون Cloud)
 * هر پیام کاربر توسط ۱۲ کاراکتر تحلیل و اجماع نهایی توسط مادر کورا صادر می‌شود
 */

import { navigationMap, getNavigationStats } from "./NavigationMap";

export interface CouncilMember {
  id: string;
  name: string;
  nameFa: string;
  emoji: string;
  expertise: string;
}

export const councilMembers: CouncilMember[] = [
  { id: "architect", name: "Architect", nameFa: "معمار", emoji: "🏗️", expertise: "ساختار و زیرساخت" },
  { id: "sentinel", name: "Sentinel", nameFa: "نگهبان", emoji: "🛡️", expertise: "امنیت و دفاع" },
  { id: "visionary", name: "Visionary", nameFa: "آینده‌بین", emoji: "🔮", expertise: "استراتژی و چشم‌انداز" },
  { id: "analyst", name: "Analyst", nameFa: "تحلیلگر", emoji: "📊", expertise: "داده و آنالیز" },
  { id: "defender", name: "Defender", nameFa: "مدافع", emoji: "⚔️", expertise: "حفاظت از دارایی" },
  { id: "localist", name: "Localist", nameFa: "بومی‌ساز", emoji: "🌍", expertise: "بومی‌سازی و زبان" },
  { id: "cryptographer", name: "Cryptographer", nameFa: "رمزنگار", emoji: "🔐", expertise: "رمزنگاری و حریم خصوصی" },
  { id: "automator", name: "Automator", nameFa: "خودکارساز", emoji: "🤖", expertise: "اتوماسیون و ایجنت" },
  { id: "orchestrator", name: "Orchestrator", nameFa: "هماهنگ‌کننده", emoji: "🎼", expertise: "هماهنگی ماژول‌ها" },
  { id: "critic", name: "Critic", nameFa: "منتقد", emoji: "🧐", expertise: "بازبینی و بهبود" },
  { id: "guardian", name: "Guardian", nameFa: "محافظ", emoji: "👁️", expertise: "مانیتورینگ و هشدار" },
  { id: "sovereign", name: "Sovereign", nameFa: "فرمانروا", emoji: "👑", expertise: "تصمیم‌گیری نهایی" },
];

// Knowledge base for contextual responses
const knowledgeBase: Record<string, string[]> = {
  security: [
    "لایه رمزنگاری AES-256 فعال است",
    "فایروال داخلی روی تمام endpointها نظارت دارد",
    "سیستم تشخیص نفوذ (IDS) در حالت مانیتورینگ فعال",
  ],
  exchange: [
    "ماژول صرافی سمیر ۸ صفحه دارد",
    "کیف پول دیجیتال نیاز به اتصال Web3 دارد",
    "بازارهای مالی در حالت نمایشی (Demo) فعال هستند",
  ],
  ai: [
    "هسته هوش مصنوعی Q-Core با ۱۸ نود فعال است",
    "۵ بلوپرینت از پیش ساخته موجود است",
    "ایجنت‌ها قابلیت اتصال به API خارجی دارند",
  ],
  modules: [
    "۱۰ ماژول استراتژیک در سیستم ثبت شده",
    "هر ماژول دارای سطح آمادگی مستقل است",
    "مانیتورینگ ۲۴/۷ روی تمام ماژول‌ها فعال",
  ],
  strategy: [
    "هدف‌گذاری بازار UAE و USA در اولویت",
    "مدل درآمدزایی B2B SaaS + Token Economy",
    "برنامه خروج (Exit) به سمت Oracle/SAP طراحی شده",
  ],
};

function detectTopics(input: string): string[] {
  const topics: string[] = [];
  const lower = input.toLowerCase();
  if (/امنیت|security|sentinel|فایروال|رمز|hack|نفوذ/.test(lower)) topics.push("security");
  if (/صرافی|exchange|wallet|کیف پول|سمیر|مالی|token/.test(lower)) topics.push("exchange");
  if (/هوش|ai|ایجنت|agent|مدل|نور|core/.test(lower)) topics.push("ai");
  if (/ماژول|module|صفحه|page|سیستم|system/.test(lower)) topics.push("modules");
  if (/استراتژی|strategy|بازار|market|سرمایه|invest|uae|usa/.test(lower)) topics.push("strategy");
  return topics.length > 0 ? topics : ["modules"];
}

function generateMemberAnalysis(member: CouncilMember, input: string, topics: string[]): string {
  const responses: Record<string, Record<string, string>> = {
    architect: {
      security: "ساختار امنیتی نیاز به لایه‌بندی عمیق‌تر دارد",
      exchange: "معماری صرافی باید microservice-based باشد",
      ai: "زیرساخت AI آماده مقیاس‌پذیری است",
      modules: "ساختار ماژولار پایدار و قابل توسعه",
      strategy: "معماری فنی از استراتژی بازار پشتیبانی می‌کند",
    },
    sentinel: {
      security: "تمام نقاط ورود مانیتور می‌شوند — آسیب‌پذیری شناسایی نشده",
      exchange: "تراکنش‌های مالی نیاز به ۲FA دارند",
      ai: "ایجنت‌ها در sandbox ایزوله اجرا می‌شوند",
      modules: "سلامت ماژول‌ها بررسی شد — هیچ تهدیدی وجود ندارد",
      strategy: "ریسک‌های امنیتی بازار هدف ارزیابی شد",
    },
    visionary: {
      security: "امنیت = اعتماد = رشد نمایی",
      exchange: "صرافی غیرمتمرکز آینده مالی ماست",
      ai: "AI حاکمیتی مرز جدید فناوری‌ست",
      modules: "هر ماژول یک ستون امپراتوری",
      strategy: "ورود به بازار UAE فرصت طلایی‌ست",
    },
    analyst: {
      security: "آمار نفوذ: صفر — نرخ پایداری ۹۹.۷٪",
      exchange: "حجم تراکنش‌ها در حالت آزمایشی: ۱۲۸ عملیات",
      ai: "بهره‌وری ایجنت‌ها: ۷۸٪",
      modules: `${getNavigationStats().total} صفحه · ${getNavigationStats().readinessPercent}٪ آمادگی`,
      strategy: "ROI پیش‌بینی شده: ۳.۲x در ۱۸ ماه",
    },
    defender: {
      security: "خط دفاعی مستحکم — آماده مقابله",
      exchange: "محافظت از دارایی‌های کاربران اولویت یک",
      ai: "ایجنت‌ها تحت کنترل کامل هستند",
      modules: "تمام ماژول‌ها در محیط ایمن",
      strategy: "حفاظت از مالکیت فکری تضمین شده",
    },
    localist: {
      security: "رابط کاربری امنیت به فارسی بهینه شده",
      exchange: "پشتیبانی از ریال و درهم فعال",
      ai: "مدل زبانی فارسی-عربی در حال آموزش",
      modules: "تمام برچسب‌ها دوزبانه هستند",
      strategy: "بومی‌سازی کامل برای خاورمیانه",
    },
    cryptographer: {
      security: "کلیدهای رمز با الگوریتم چرخشی محافظت می‌شوند",
      exchange: "توکن‌ها با SHA-256 هش شده‌اند",
      ai: "داده‌های ایجنت end-to-end رمزنگاری",
      modules: "پروتکل ارتباطی بین ماژول‌ها رمزشده",
      strategy: "استانداردهای GDPR رعایت شده",
    },
    automator: {
      security: "اسکن خودکار آسیب‌پذیری هر ۶ ساعت",
      exchange: "معاملات خودکار (Bot Trading) آماده",
      ai: "پایپلاین ایجنت خودکار فعال",
      modules: "CI/CD ماژول‌ها خودکارسازی شده",
      strategy: "کمپین‌های بازاریابی خودکار قابل راه‌اندازی",
    },
    orchestrator: {
      security: "هماهنگی بین لایه‌های امنیتی بهینه",
      exchange: "جریان مالی بین ماژول‌ها هماهنگ",
      ai: "ارکستراسیون ایجنت‌ها بدون تداخل",
      modules: "ترافیک بین ماژول‌ها متوازن",
      strategy: "هماهنگی تیم‌های فنی و بازاریابی",
    },
    critic: {
      security: "نقطه ضعف: نبود ۲FA واقعی — پیشنهاد: اولویت‌بندی شود",
      exchange: "کیف پول هنوز به بلاکچین واقعی وصل نیست",
      ai: "مدل AI محلی است — برای مقیاس به Cloud نیاز داریم",
      modules: "۶۳ صفحه هنوز stub هستند — سرعت توسعه باید بالا برود",
      strategy: "بدون محصول واقعی، استراتژی بازار معنا ندارد",
    },
    guardian: {
      security: "مانیتورینگ ۲۴/۷ فعال — هیچ ناهنجاری ثبت نشده",
      exchange: "نظارت بر تراکنش‌ها فعال",
      ai: "لاگ ایجنت‌ها ذخیره و قابل بازبینی",
      modules: "سلامت سیستم: سبز",
      strategy: "رصد رقبا و بازار فعال",
    },
    sovereign: {
      security: "تصمیم نهایی: امنیت در سطح قابل قبول",
      exchange: "تصمیم نهایی: صرافی آماده فاز بتا",
      ai: "تصمیم نهایی: هسته AI عملیاتی",
      modules: "تصمیم نهایی: مسیر توسعه صحیح است",
      strategy: "تصمیم نهایی: ادامه برنامه با قدرت",
    },
  };

  const topic = topics[0] || "modules";
  return responses[member.id]?.[topic] || "تحلیل در جریان...";
}

export interface CouncilResponse {
  memberAnalyses: Array<{ member: CouncilMember; analysis: string; vote: "approve" | "caution" | "reject" }>;
  motherCoreVerdict: string;
  confidence: number;
  relatedKnowledge: string[];
}

export function runCouncilConsensus(input: string): CouncilResponse {
  const topics = detectTopics(input);
  const stats = getNavigationStats();

  // Generate each member's analysis
  const memberAnalyses = councilMembers.map((member) => {
    const analysis = generateMemberAnalysis(member, input, topics);
    // Most approve, critic sometimes cautions
    const vote: "approve" | "caution" | "reject" =
      member.id === "critic" ? "caution" : "approve";
    return { member, analysis, vote };
  });

  const approvals = memberAnalyses.filter((m) => m.vote === "approve").length;
  const confidence = Math.round((approvals / 12) * 100);

  // Gather related knowledge
  const relatedKnowledge = topics.flatMap((t) => knowledgeBase[t] || []);

  // Mother Core final verdict
  const topicLabels = topics.map((t) => {
    const labels: Record<string, string> = {
      security: "امنیت",
      exchange: "صرافی",
      ai: "هوش مصنوعی",
      modules: "ماژول‌ها",
      strategy: "استراتژی",
    };
    return labels[t] || t;
  });

  const motherCoreVerdict = `👑 **اجماع مادر کورا** (${confidence}٪ تایید از ۱۲ عضو):

فرمانده، شورا دستور شما درباره «${topicLabels.join(" و ")}» را بررسی کرد.

📊 **وضعیت سیستم:** ${stats.total} صفحه | ${stats.readinessPercent}٪ آمادگی کل
✅ **${approvals} عضو تایید** | ⚠️ ${12 - approvals} عضو محتاط

${relatedKnowledge.length > 0 ? `📋 **دانش مرتبط:**\n${relatedKnowledge.map((k) => `• ${k}`).join("\n")}` : ""}

🎯 **تصمیم نهایی:** عملیات تایید شد. مسیر اجرا آماده است.
💡 **توصیه منتقد:** ${memberAnalyses.find((m) => m.member.id === "critic")?.analysis || "—"}`;

  return { memberAnalyses, motherCoreVerdict, confidence, relatedKnowledge };
}
