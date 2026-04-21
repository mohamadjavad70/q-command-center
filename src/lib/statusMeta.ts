import { CheckCircle2, AlertCircle, Clock, CircleDot, AlertTriangle } from "lucide-react";
import type { ModuleStatus } from "./NavigationMap";

export const statusMeta: Record<
  ModuleStatus,
  { label: string; color: string; icon: typeof CheckCircle2; glow: string }
> = {
  ready: {
    label: "عملیاتی",
    color: "text-[hsl(var(--neon-green))]",
    icon: CheckCircle2,
    glow: "glow-gold",
  },
  partial: {
    label: "نیمه‌فعال",
    color: "text-primary",
    icon: AlertCircle,
    glow: "glow-gold",
  },
  stub: {
    label: "پیش‌نویس",
    color: "text-muted-foreground",
    icon: Clock,
    glow: "",
  },
  planned: {
    label: "برنامه‌ریزی",
    color: "text-muted-foreground/50",
    icon: CircleDot,
    glow: "",
  },
};

/** Same keys but using AlertTriangle for stub (executive view) */
export const statusConfigExec: Record<
  ModuleStatus,
  { icon: typeof CheckCircle2; label: string; cls: string }
> = {
  ready:   { icon: CheckCircle2,   label: "عملیاتی",     cls: "text-[hsl(var(--neon-green))]" },
  partial: { icon: Clock,          label: "نیمه‌فعال",   cls: "text-primary" },
  stub:    { icon: AlertTriangle,  label: "پیش‌نویس",    cls: "text-muted-foreground" },
  planned: { icon: CircleDot,      label: "برنامه‌ریزی", cls: "text-muted-foreground/50" },
};
