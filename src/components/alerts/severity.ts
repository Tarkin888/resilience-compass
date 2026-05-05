import type { Status, Trend } from "@/lib/calc";

export const SEVERITY_RANK: Record<Status, number> = {
  Critical: 0,
  Warning: 1,
  Watch: 2,
  OK: 3,
};

export const SEVERITY_STYLES: Record<Status, { dot: string; chip: string; label: string }> = {
  Critical: {
    dot: "bg-red-600",
    chip: "bg-red-50 text-red-700 border-red-200",
    label: "Critical",
  },
  Warning: {
    dot: "bg-amber-500",
    chip: "bg-amber-50 text-amber-800 border-amber-200",
    label: "Warning",
  },
  Watch: {
    dot: "bg-blue-500",
    chip: "bg-blue-50 text-blue-700 border-blue-200",
    label: "Watch",
  },
  OK: {
    dot: "bg-emerald-500",
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200",
    label: "On track",
  },
};

export function trendArrow(trend: Trend): { symbol: string; className: string; label: string } {
  if (trend === "improving") return { symbol: "↓", className: "text-emerald-600", label: "improving" };
  if (trend === "worsening") return { symbol: "↑", className: "text-red-600", label: "worsening" };
  return { symbol: "=", className: "text-slate-500", label: "steady" };
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
