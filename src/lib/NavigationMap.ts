/**
 * NavigationMap — نقشه مسیریابی یکپارچه تمام ماژول‌های Qmetaram
 * مرجع واحد (Single Source of Truth) برای ۱۲۰+ صفحه
 * 
 * وضعیت آمادگی:
 * 🟢 ready    = عملکردی و پایدار (60%+)
 * 🟡 partial  = UI آماده، نیاز به اتصال داده (30-60%)
 * 🔴 stub     = فقط placeholder یا خالی (<30%)
 * ⚪ planned  = طراحی شده ولی هنوز ساخته نشده
 */

export type ModuleStatus = "ready" | "partial" | "stub" | "planned";
export type PageAccess = "public" | "private" | "updating";

export interface PageEntry {
  path: string;
  label: string;
  labelFa: string;
  status: ModuleStatus;
  source: string; // پروژه مبدأ
  notes?: string;
  access: PageAccess;
  version: string;
}

// ═══════════════════════════════════════════
// مدیریت دسترسی (Access Control Manager)
// ═══════════════════════════════════════════
const ACCESS_STORAGE_KEY = "q-page-access-overrides";

export function getAccessOverrides(): Record<string, PageAccess> {
  try {
    return JSON.parse(localStorage.getItem(ACCESS_STORAGE_KEY) || "{}");
  } catch { return {}; }
}

export function setPageAccess(path: string, access: PageAccess) {
  const overrides = getAccessOverrides();
  overrides[path] = access;
  localStorage.setItem(ACCESS_STORAGE_KEY, JSON.stringify(overrides));
}

export function getEffectiveAccess(page: PageEntry): PageAccess {
  const overrides = getAccessOverrides();
  return overrides[page.path] ?? page.access;
}

export interface ModuleGroup {
  id: string;
  label: string;
  labelFa: string;
  icon: string;
  color: "blue" | "red" | "green" | "amber" | "purple";
  pages: PageEntry[];
}

export const navigationMap: ModuleGroup[] = [
  // ═══════════════════════════════════════════
  // 🔵 قطب آبی — حاکمیت و مدیریت (Blue Horizon)
  // ═══════════════════════════════════════════
  {
    id: "governance",
    label: "Governance & Admin",
    labelFa: "حاکمیت و مدیریت",
    icon: "👑",
    color: "blue",
    pages: [
      { path: "/admin", label: "Admin Panel", labelFa: "پنل مدیریت", status: "partial", source: "qmetaram-hub", access: "private", version: "1.0.0" },
      { path: "/admin/hierarchy", label: "Admin Hierarchy", labelFa: "سلسله مراتب", status: "stub", source: "qmetaram-hub", access: "private", version: "0.1.0" },
      { path: "/sam-arman", label: "Sam Arman Executive", labelFa: "مدیریت اجرایی سام آرمان", status: "ready", source: "this-project", access: "private", version: "2.0.0" },
      { path: "/settings", label: "Settings", labelFa: "تنظیمات", status: "partial", source: "qmetaram-hub", access: "private", version: "1.0.0" },
      { path: "/transparency", label: "Transparency", labelFa: "شفافیت", status: "stub", source: "qmetaram-hub", access: "public", version: "0.1.0" },
      { path: "/impressum", label: "Impressum", labelFa: "ایمپرسوم", status: "stub", source: "qmetaram-hub", access: "public", version: "0.1.0" },
      { path: "/terms", label: "Terms of Service", labelFa: "شرایط خدمات", status: "stub", source: "qmetaram-hub", access: "public", version: "0.1.0" },
      { path: "/privacy", label: "Privacy Policy", labelFa: "حریم خصوصی", status: "stub", source: "qmetaram-hub", access: "public", version: "0.1.0" },
      { path: "/about", label: "About", labelFa: "درباره ما", status: "stub", source: "qmetaram-hub", access: "public", version: "0.1.0" },
    ],
  },

  // ═══════════════════════════════════════════
  // 🔴 قطب قرمز — عملیات و هسته (Red Core)
  // ═══════════════════════════════════════════
  {
    id: "operations",
    label: "Operations & AI Core",
    labelFa: "مرکز عملیات هوشمند",
    icon: "⚡",
    color: "red",
    pages: [
      { path: "/sun-core", label: "SunCore", labelFa: "هسته خورشید", status: "partial", source: "q-metaram", access: "private", version: "1.2.0" },
      { path: "/command-center", label: "Command Center", labelFa: "مرکز فرمان", status: "partial", source: "q-metaram", access: "private", version: "1.0.0" },
      { path: "/chat", label: "Noor Chat", labelFa: "چت نور", status: "partial", source: "qmetaram-hub", access: "private", version: "1.5.0" },
      { path: "/chat/archive", label: "Chat Archive", labelFa: "آرشیو مکالمات", status: "stub", source: "qmetaram-hub", access: "private", version: "0.1.0" },
      { path: "/ai-tools", label: "AI Tools", labelFa: "ابزارهای هوش مصنوعی", status: "partial", source: "qmetaram-hub", access: "public", version: "1.0.0" },
      { path: "/ai-assistant", label: "AI Assistant", labelFa: "دستیار هوشمند", status: "partial", source: "qmetaram-hub", access: "public", version: "1.0.0" },
      { path: "/agent-forge", label: "Agent Forge", labelFa: "کارگاه ایجنت", status: "stub", source: "qmetaram-hub", access: "private", version: "0.1.0" },
      { path: "/ollama", label: "Ollama Integration", labelFa: "اتصال Ollama", status: "stub", source: "qmetaram-hub", access: "private", version: "0.1.0" },
      { path: "/q-core", label: "QCore", labelFa: "هسته Q", status: "partial", source: "q-metaram", access: "private", version: "1.3.0" },
    ],
  },

  // ═══════════════════════════════════════════
  // 🛡️ لایه امنیت و دفاع
  // ═══════════════════════════════════════════
  {
    id: "security",
    label: "Security & Defense",
    labelFa: "دفاع و مانیتورینگ",
    icon: "🛡️",
    color: "blue",
    pages: [
      { path: "/auth", label: "Authentication", labelFa: "احراز هویت", status: "partial", source: "unified", notes: "تجمیع از ۵ پروژه", access: "public", version: "1.0.0" },
      { path: "/security", label: "Security Dashboard", labelFa: "داشبورد امنیتی", status: "partial", source: "qmetaram-hub", access: "private", version: "1.0.0" },
      { path: "/security/unified", label: "Unified Security", labelFa: "امنیت یکپارچه", status: "stub", source: "qmetaram-hub", access: "private", version: "0.1.0" },
      { path: "/security/guardian", label: "Guardian", labelFa: "نگهبان", status: "stub", source: "guardian-dojo", access: "private", version: "0.1.0" },
      { path: "/sentinel", label: "Sentinel Dashboard", labelFa: "داشبورد سنتینل", status: "stub", source: "qmetaram-hub", access: "private", version: "0.1.0" },
      { path: "/network", label: "Network Monitoring", labelFa: "مانیتورینگ شبکه", status: "stub", source: "qmetaram-hub", access: "private", version: "0.1.0" },
      { path: "/q-network", label: "Q-Network Mesh", labelFa: "شبکه مش Q", status: "ready", source: "this-project", access: "public", version: "1.0.0" },
      { path: "/war-room", label: "War Room", labelFa: "اتاق جنگ", status: "partial", source: "unified", notes: "تجمیع از ۵ پروژه", access: "private", version: "1.0.0" },
      { path: "/security/whitepaper", label: "Security Whitepaper", labelFa: "وایت‌پیپر امنیتی", status: "stub", source: "qmetaram-hub", access: "public", version: "0.1.0" },
    ],
  },

  // ═══════════════════════════════════════════
  // 🎨 استودیوهای خلاقیت
  // ═══════════════════════════════════════════
  {
    id: "studios",
    label: "Creative Studios",
    labelFa: "استودیوهای خلاقیت",
    icon: "🎨",
    color: "purple",
    pages: [
      { path: "/studio/beethoven", label: "Beethoven Studio", labelFa: "استودیو بتهوون (موسیقی)", status: "partial", source: "qmetaram-hub", notes: "مشکل توقف در ساخت — نیاز به Retry Logic", access: "public", version: "1.1.0" },
      { path: "/studio/davinci", label: "DaVinci Studio", labelFa: "استودیو داوینچی (تصویر)", status: "partial", source: "qmetaram-hub", notes: "نیاز به کتابخانه الهام", access: "public", version: "1.0.0" },
      { path: "/studio/matrix", label: "Matrix Studio", labelFa: "استودیو ماتریکس (ایجنت)", status: "stub", source: "qmetaram-hub", notes: "خروجی کد+آیکون نیاز دارد", access: "private", version: "0.2.0" },
      { path: "/tesla-lab", label: "Tesla Lab", labelFa: "آزمایشگاه تسلا", status: "stub", source: "qmetaram-hub", access: "private", version: "0.1.0" },
    ],
  },

  // ═══════════════════════════════════════════
  // 💱 صرافی و تبادلات مالی (سمیر)
  // ═══════════════════════════════════════════
  {
    id: "exchange",
    label: "Samir Exchange",
    labelFa: "صرافی سمیر",
    icon: "💱",
    color: "amber",
    pages: [
      { path: "/exchange", label: "Exchange", labelFa: "صرافی", status: "partial", source: "samir-exchange", access: "public", version: "1.5.0" },
      { path: "/exchange/dashboard", label: "Dashboard", labelFa: "داشبورد مالی", status: "partial", source: "samir-exchange", access: "private", version: "1.2.0" },
      { path: "/exchange/markets", label: "Markets", labelFa: "بازارها", status: "partial", source: "samir-exchange", access: "public", version: "1.0.0" },
      { path: "/exchange/tokens", label: "Tokens", labelFa: "توکن‌ها", status: "stub", source: "samir-exchange", access: "public", version: "0.1.0" },
      { path: "/exchange/wallet", label: "Wallet", labelFa: "کیف پول", status: "stub", source: "samir-exchange", access: "private", version: "0.1.0" },
      { path: "/exchange/ai-galaxy", label: "AI Galaxy", labelFa: "کهکشان AI", status: "stub", source: "samir-exchange", access: "public", version: "0.1.0" },
      { path: "/exchange/ai-market", label: "AI Market", labelFa: "بازار AI", status: "stub", source: "samir-exchange", access: "public", version: "0.1.0" },
      { path: "/exchange/referrals", label: "Referrals", labelFa: "دعوت دوستان", status: "stub", source: "samir-exchange", access: "public", version: "0.1.0" },
    ],
  },

  // ═══════════════════════════════════════════
  // 🌌 کهکشان و شبکه
  // ═══════════════════════════════════════════
  {
    id: "galaxy",
    label: "Galaxy & Network",
    labelFa: "کهکشان و شبکه",
    icon: "🌌",
    color: "purple",
    pages: [
      { path: "/star-world", label: "StarWorld", labelFa: "دنیای ستاره", status: "partial", source: "q-metaram", access: "public", version: "1.0.0" },
      { path: "/galaxy", label: "Galaxy View", labelFa: "نمای کهکشان", status: "partial", source: "this-project", notes: "Galaxy MVP هدایت‌شده فعال شد", access: "public", version: "0.2.0" },
      { path: "/omega-node", label: "Omega Central Node", labelFa: "گره مرکزی اُمگا", status: "stub", source: "qmetaram-hub", access: "private", version: "0.1.0" },
      { path: "/qpn", label: "QPN Landing", labelFa: "شبکه QPN", status: "stub", source: "qmetaram-hub", access: "public", version: "0.1.0" },
      { path: "/qpn/messenger", label: "QPN Messenger", labelFa: "پیام‌رسان QPN", status: "stub", source: "qmetaram-hub", access: "private", version: "0.1.0" },
      { path: "/qpn/quantum-link", label: "Quantum Link", labelFa: "لینک کوانتومی", status: "stub", source: "qmetaram-hub", access: "private", version: "0.1.0" },
    ],
  },

  // ═══════════════════════════════════════════
  // 📊 داشبوردها
  // ═══════════════════════════════════════════
  {
    id: "dashboards",
    label: "Dashboards",
    labelFa: "داشبوردها",
    icon: "📊",
    color: "green",
    pages: [
      { path: "/dashboard/q11", label: "Q11 Dashboard", labelFa: "داشبورد Q11", status: "partial", source: "qmetaram-hub", access: "private", version: "1.0.0" },
      { path: "/dashboard/noor", label: "Noor Strategic", labelFa: "داشبورد استراتژیک نور", status: "stub", source: "qmetaram-hub", access: "private", version: "0.1.0" },
      { path: "/dashboard/sovereign", label: "Sovereign Dashboard", labelFa: "داشبورد حاکمیت", status: "stub", source: "qmetaram-hub", access: "private", version: "0.1.0" },
    ],
  },

  // ═══════════════════════════════════════════
  // 🛒 مارکت‌پلیس
  // ═══════════════════════════════════════════
  {
    id: "marketplace",
    label: "Marketplace",
    labelFa: "مارکت‌پلیس",
    icon: "🛒",
    color: "green",
    pages: [
      { path: "/marketplace", label: "Marketplace", labelFa: "فروشگاه ماژول‌ها", status: "partial", source: "qmetaram-hub", access: "public", version: "1.0.0" },
      { path: "/modules", label: "Modules Hub", labelFa: "هاب ماژول‌ها", status: "stub", source: "qmetaram-hub", access: "public", version: "0.1.0" },
      { path: "/compare", label: "Compare", labelFa: "مقایسه", status: "stub", source: "qmetaram-hub", access: "public", version: "0.1.0" },
      { path: "/search", label: "Search", labelFa: "جستجو", status: "stub", source: "qmetaram-hub", access: "public", version: "0.1.0" },
      { path: "/subscriptions", label: "Subscriptions", labelFa: "اشتراک‌ها", status: "stub", source: "qmetaram-hub", access: "private", version: "0.1.0" },
    ],
  },

  // ═══════════════════════════════════════════
  // 💡 ایده‌ها و الهام (صفحات تک‌پروژه‌ای اینجا جمع می‌شوند)
  // ═══════════════════════════════════════════
  {
    id: "ideas",
    label: "Ideas & Inspiration",
    labelFa: "ایده‌ها و الهام",
    icon: "💡",
    color: "amber",
    pages: [
      { path: "/ideas", label: "Ideas Board", labelFa: "تابلوی ایده‌ها", status: "partial", source: "qmetaram-hub", access: "public", version: "1.0.0" },
      { path: "/ideas/matrix-gateways", label: "Matrix Gateways", labelFa: "دروازه ماتریکس", status: "stub", source: "matrix-gateways", access: "public", version: "0.1.0" },
      { path: "/ideas/whispering-galaxies", label: "Whispering Galaxies", labelFa: "کهکشان‌های زمزمه", status: "stub", source: "whispering-galaxies", access: "public", version: "0.1.0" },
      { path: "/ideas/guardian-core", label: "Guardian Core", labelFa: "هسته محافظ", status: "stub", source: "guardian-core", access: "public", version: "0.1.0" },
      { path: "/ideas/listening-ear", label: "Q's Listening Ear", labelFa: "گوش شنوای Q", status: "stub", source: "qs-listening-ear", access: "public", version: "0.1.0" },
      { path: "/ideas/golgolab", label: "GolGolab", labelFa: "گل‌گلاب", status: "stub", source: "golgolab", access: "public", version: "0.1.0" },
      { path: "/ideas/persian-muse", label: "Persian AI Muse", labelFa: "الهام‌بخش فارسی", status: "stub", source: "persian-ai-muse", access: "public", version: "0.1.0" },
      { path: "/ideas/galaxy-planet", label: "Galaxy Planet Hub", labelFa: "هاب سیاره کهکشان", status: "stub", source: "galaxy-planet-hub", access: "public", version: "0.1.0" },
      { path: "/ideas/mowlana", label: "Mowlana Sanctuary", labelFa: "حریم مولانا", status: "stub", source: "qmetaram-hub", access: "public", version: "0.1.0" },
      { path: "/ideas/quantum-therapy", label: "Quantum Pulse Therapy", labelFa: "پالس‌تراپی کوانتومی", status: "stub", source: "qmetaram-hub", access: "public", version: "0.1.0" },
    ],
  },

  // ═══════════════════════════════════════════
  // 👤 شخصی و ویژه
  // ═══════════════════════════════════════════
  {
    id: "personal",
    label: "Personal & Special",
    labelFa: "شخصی و ویژه",
    icon: "👤",
    color: "blue",
    pages: [
      { path: "/private-hub", label: "Private Hub", labelFa: "هاب خصوصی", status: "stub", source: "qmetaram-hub", access: "private", version: "0.1.0" },
      { path: "/hall", label: "Hall", labelFa: "تالار بزرگ", status: "stub", source: "qmetaram-hub", access: "private", version: "0.1.0" },
      { path: "/sovereign-hub", label: "Sovereign Empowerment Hub", labelFa: "هاب توانمندسازی", status: "stub", source: "qmetaram-hub", access: "private", version: "0.1.0" },
      { path: "/memorial", label: "Memorial", labelFa: "یادبود", status: "stub", source: "samir-exchange", access: "private", version: "0.1.0" },
      { path: "/install", label: "Install App", labelFa: "نصب اپلیکیشن", status: "stub", source: "qmetaram-hub", access: "public", version: "0.1.0" },
    ],
  },
];

// ═══════════════════════════════════════════
// آمار سریع
// ═══════════════════════════════════════════
export function getNavigationStats() {
  const allPages = navigationMap.flatMap((g) => g.pages);
  const total = allPages.length;
  const ready = allPages.filter((p) => p.status === "ready").length;
  const partial = allPages.filter((p) => p.status === "partial").length;
  const stub = allPages.filter((p) => p.status === "stub").length;
  const planned = allPages.filter((p) => p.status === "planned").length;

  return {
    total,
    ready,
    partial,
    stub,
    planned,
    readinessPercent: Math.round(((ready * 100 + partial * 50 + stub * 15) / (total * 100)) * 100),
  };
}
