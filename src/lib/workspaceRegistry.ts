export type WorkspaceStatus = "active" | "support" | "archive";
export type WorkspaceRole = "core" | "satellite" | "backend" | "library" | "deployment" | "archive";

export interface WorkspaceProject {
  id: string;
  name: string;
  folder: string;
  role: WorkspaceRole;
  status: WorkspaceStatus;
  priority: "high" | "medium" | "low";
  stack: string[];
  summary: string;
  action: string;
}

export const workspaceProjects: WorkspaceProject[] = [
  {
    id: "command-center",
    name: "مرکز فرماندهی کیو",
    folder: "مرکز فرماندهی کیو",
    role: "core",
    status: "active",
    priority: "high",
    stack: ["Vite", "React", "TypeScript", "Vitest"],
    summary: "هسته فرماندهی، رجیستری صفحات و داشبورد مدیریتی پروژه Q.",
    action: "به عنوان هسته canonical نگه داشته شود و توسعه از اینجا هدایت شود.",
  },
  {
    id: "q-network",
    name: "Q-NETWORK",
    folder: "Q-NETWORK",
    role: "backend",
    status: "active",
    priority: "high",
    stack: ["SQL", "PostgreSQL", "Remix migrations"],
    summary: "لایه مهاجرت‌ها، داده و زیرساخت بک‌اند.",
    action: "به عنوان منبع رسمی دیتابیس و migrationها ایزوله بماند.",
  },
  {
    id: "q-network-q3",
    name: "Q.NETWORK.Q3",
    folder: "Q.NETWORK.Q3",
    role: "library",
    status: "support",
    priority: "high",
    stack: ["React", "TSX", "UI components"],
    summary: "کتابخانه بزرگ کامپوننت‌های رابط کاربری برای استفاده مجدد.",
    action: "برای تغذیه UI هسته مرکزی و ماژول‌های جانبی استفاده شود.",
  },
  {
    id: "aiamir",
    name: "Q.AIAMIR",
    folder: "Q.AIAMIR",
    role: "satellite",
    status: "active",
    priority: "medium",
    stack: ["Vite", "React", "TypeScript"],
    summary: "ماژول فعال رابط و تجربه تعاملی.",
    action: "به عنوان ماهواره محصولی متصل به فرماندهی باقی بماند.",
  },
  {
    id: "galexi",
    name: "Q.GALEXI",
    folder: "Q.GALEXI",
    role: "satellite",
    status: "active",
    priority: "medium",
    stack: ["Vite", "React", "TypeScript", "Whispers"],
    summary: "ماژول کهکشانی/تعاملی با ساختار مدرن و قابلیت اتصال.",
    action: "به عنوان satellite مستقل ولی سازگار با هسته حفظ شود.",
  },
  {
    id: "eleven-twelve",
    name: "11.12",
    folder: "11.12",
    role: "deployment",
    status: "support",
    priority: "medium",
    stack: ["Python", "Deploy assets", "Nested projects"],
    summary: "محیط استقرار و پایش با فایل‌های مختلط و زیرپروژه‌های تو در تو.",
    action: "فقط برای استقرار/آرشیو نگه‌داری شود و به‌تدریج سامان‌دهی شود.",
  },
  {
    id: "q1",
    name: "Q1.V1.1",
    folder: "Q1.V1.1",
    role: "archive",
    status: "archive",
    priority: "low",
    stack: ["Media", "Scripts", "HTML demos"],
    summary: "ترکیب دموها، فایل‌های صوتی و اسکریپت‌های قدیمی.",
    action: "به آرشیو منتقل و از هسته عملیاتی جدا شود.",
  },
  {
    id: "sale-1404",
    name: "sale 1404",
    folder: "sale 1404",
    role: "archive",
    status: "archive",
    priority: "low",
    stack: ["Shortcuts", "PowerShell"],
    summary: "پوشه جانبی با میان‌برها و فایل‌های غیرهسته‌ای.",
    action: "از جریان اصلی توسعه خارج بماند.",
  },
  {
    id: "mixed-bin",
    name: "در هم همه چیز",
    folder: "در هم همه چیز",
    role: "archive",
    status: "archive",
    priority: "low",
    stack: ["Media", "HTML", "Misc"],
    summary: "انبار فایل‌های متفرقه و محتوای غیرساختاریافته.",
    action: "برای کاهش نویز پروژه آرشیو یا پاکسازی شود.",
  },
];

export function getWorkspaceSummary() {
  const total = workspaceProjects.length;
  const active = workspaceProjects.filter((project) => project.status === "active").length;
  const support = workspaceProjects.filter((project) => project.status === "support").length;
  const archive = workspaceProjects.filter((project) => project.status === "archive").length;
  const highPriority = workspaceProjects.filter((project) => project.priority === "high").length;

  return {
    total,
    active,
    support,
    archive,
    highPriority,
    core: workspaceProjects.find((project) => project.role === "core")?.name ?? "Q Core",
  };
}
