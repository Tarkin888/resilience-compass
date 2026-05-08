import { useEffect, useState } from "react";
import { ExternalLink, Check, AlertTriangle, FileText } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { KriCapture, Source } from "@/hooks/useHumanCapitalData";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "./severity";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kriId: string;
  displayName: string;
  isLive: boolean;
  captures: KriCapture[];
  source?: Source;
}

type LogRow = { id: string; outcome: string; attempt_at: string };

type Status = "new_edition" | "no_new_edition" | "failure";

interface Row {
  id: string;
  attemptAt: string;
  outcome: string;
  status: Status;
  edition: string | null;
  value: number | null;
  unit: string | null;
  url: string | null;
}

const SUCCESS_OUTCOMES = new Set(["ok", "success"]);
const NO_NEW = new Set(["no_new_edition"]);

function classifyOutcome(outcome: string): Status {
  if (SUCCESS_OUTCOMES.has(outcome)) return "new_edition";
  if (NO_NEW.has(outcome)) return "no_new_edition";
  return "failure";
}

const STATUS_BADGE: Record<Status, { label: string; className: string; icon: React.ReactNode }> = {
  new_edition: {
    label: "New edition",
    className: "bg-blue-50 text-blue-700 border-blue-200",
    icon: <FileText size={12} />,
  },
  no_new_edition: {
    label: "No new edition",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: <Check size={12} />,
  },
  failure: {
    label: "Failure",
    className: "bg-amber-50 text-amber-800 border-amber-200",
    icon: <AlertTriangle size={12} />,
  },
};

export const CapturedEditionsPanel = ({
  open,
  onOpenChange,
  kriId,
  displayName,
  isLive,
  captures,
  source,
}: Props) => {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [demoNoticeId, setDemoNoticeId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !isLive) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("capture_log")
        .select("id,outcome,attempt_at")
        .eq("kri_id", kriId)
        .order("attempt_at", { ascending: false })
        .limit(200);
      if (!cancelled) {
        setLogs(data ?? []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, isLive, kriId]);

  const rows: Row[] = isLive
    ? logs.map((l) => {
        const status = classifyOutcome(l.outcome);
        let match: KriCapture | undefined;
        if (status === "new_edition") {
          const target = new Date(l.attempt_at).getTime();
          match = captures.find((c) => Math.abs(new Date(c.captured_at).getTime() - target) < 5 * 60_000);
        }
        return {
          id: l.id,
          attemptAt: l.attempt_at,
          outcome: l.outcome,
          status,
          edition: match?.edition_label ?? null,
          value: match?.headline_value != null ? Number(match.headline_value) : null,
          unit: match?.headline_unit ?? null,
          url: match?.edition_page_url ?? source?.series_landing_page_url ?? null,
        };
      })
    : captures.map((c) => ({
        id: c.id,
        attemptAt: c.captured_at,
        outcome: "illustrative",
        status: "new_edition" as Status,
        edition: c.edition_label,
        value: c.headline_value != null ? Number(c.headline_value) : null,
        unit: c.headline_unit,
        url: null,
      }));

  const handleRowClick = (row: Row) => {
    if (!isLive || !row.url) {
      setDemoNoticeId(row.id);
      window.setTimeout(() => setDemoNoticeId((prev) => (prev === row.id ? null : prev)), 3000);
      return;
    }
    window.open(row.url, "_blank", "noopener,noreferrer");
  };

  const formatValue = (value: number | null, unit: string | null) => {
    if (value == null) return "—";
    const symbol = unit === "percent" ? "%" : unit ? ` ${unit}` : "";
    return `${value.toFixed(1)}${symbol}`;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Capture history — {displayName}</SheetTitle>
          <SheetDescription>
            {loading
              ? "Loading…"
              : `${rows.length} capture${rows.length === 1 ? "" : "s"} · most recent first`}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {rows.length === 0 && !loading && (
            <p className="py-12 text-center text-sm text-slate-500">No captures yet for this KRI.</p>
          )}

          {/* Desktop / wide table */}
          <div className="hidden sm:block">
            {rows.length > 0 && (
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">Captured at</th>
                      <th className="px-3 py-2 font-medium">Edition</th>
                      <th className="px-3 py-2 font-medium">Value</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const badge = STATUS_BADGE[row.status];
                      return (
                        <tr
                          key={row.id}
                          onClick={() => handleRowClick(row)}
                          className="cursor-pointer border-t border-slate-200 transition-colors hover:bg-slate-50"
                        >
                          <td className="whitespace-nowrap px-3 py-3 text-slate-700">
                            {formatDateTime(row.attemptAt)}
                          </td>
                          <td className="px-3 py-3 text-slate-700">{row.edition ?? "—"}</td>
                          <td className="px-3 py-3 font-mono tabular-nums text-slate-900">
                            {formatValue(row.value, row.unit)}
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${badge.className}`}
                            >
                              {badge.icon}
                              {badge.label}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRowClick(row);
                              }}
                              aria-label="Open source"
                              className="inline-flex h-11 w-11 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-brand"
                            >
                              <ExternalLink size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {demoNoticeId && (
              <p className="mt-3 text-xs text-slate-500">
                Illustrative demo data — no live source available.
              </p>
            )}
          </div>

          {/* Mobile / stacked rows */}
          <div className="space-y-2 sm:hidden">
            {rows.map((row) => {
              const badge = STATUS_BADGE[row.status];
              return (
                <div key={row.id}>
                  <button
                    type="button"
                    onClick={() => handleRowClick(row)}
                    className="flex w-full items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 text-left hover:bg-slate-50"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="text-xs text-slate-500">{formatDateTime(row.attemptAt)}</div>
                      <div className="text-sm font-medium text-slate-900">{row.edition ?? "—"}</div>
                      <div className="font-mono text-base tabular-nums text-slate-900">
                        {formatValue(row.value, row.unit)}
                      </div>
                      <span
                        className={`mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${badge.className}`}
                      >
                        {badge.icon}
                        {badge.label}
                      </span>
                    </div>
                    <span
                      aria-label="Open source"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-slate-500"
                    >
                      <ExternalLink size={16} />
                    </span>
                  </button>
                  {demoNoticeId === row.id && (
                    <p className="mt-1 px-1 text-xs text-slate-500">
                      Illustrative demo data — no live source available.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
