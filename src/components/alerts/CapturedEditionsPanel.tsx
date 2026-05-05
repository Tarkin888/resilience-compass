import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { KriCapture, Source } from "@/hooks/useHumanCapitalData";
import { formatDateTime } from "./severity";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  displayName: string;
  captures: KriCapture[];
  source?: Source;
}

export const CapturedEditionsPanel = ({
  open,
  onOpenChange,
  displayName,
  captures,
  source,
}: Props) => {
  const rows = captures.slice(0, 6);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Captured editions — {displayName}</SheetTitle>
          <SheetDescription>
            {source ? `${source.publication_name}, ${source.publisher}` : "Public NHS source"}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-3">
          {rows.length === 0 && (
            <p className="text-sm text-slate-500">No captures recorded yet.</p>
          )}
          {rows.map((c) => (
            <div
              key={c.id}
              className="rounded-lg border border-slate-200 bg-white p-4 text-sm"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900">{c.edition_label}</span>
                <span className="font-mono text-base text-slate-900">
                  {c.headline_value?.toFixed(1)}
                  {c.headline_unit === "percent" ? "%" : ""}
                </span>
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Captured {formatDateTime(c.captured_at)}
              </div>
              {c.file_source_url && (
                <a
                  href={c.file_source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block truncate text-xs text-brand hover:underline"
                >
                  {c.file_source_url}
                </a>
              )}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};
