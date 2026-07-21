import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
// Raw import of the root CHANGELOG so entries can be edited without touching layout code.
// eslint-disable-next-line import/no-unresolved
import changelogRaw from "../../CHANGELOG.md?raw";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const formatBuildDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()].slice(0, 3)} ${d.getUTCFullYear()}`;
};

type ChangelogEntry = { version: string; date: string; description: string };

const parseChangelog = (raw: string): ChangelogEntry[] => {
  const entries: ChangelogEntry[] = [];
  const lines = raw.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^##\s+(.+?)\s+—\s+(.+)$/);
    if (!match) continue;
    let desc = "";
    for (let j = i + 1; j < lines.length; j++) {
      const t = lines[j].trim();
      if (!t) continue;
      if (t.startsWith("##")) break;
      desc = t;
      break;
    }
    entries.push({ version: match[1].trim(), date: match[2].trim(), description: desc });
  }
  return entries;
};

export const Footer = () => {
  const [open, setOpen] = useState(false);
  const commit = typeof __BUILD_COMMIT__ !== "undefined" ? __BUILD_COMMIT__ : "dev";
  const buildDate = typeof __BUILD_DATE__ !== "undefined" ? formatBuildDate(__BUILD_DATE__) : "";
  const entries = useMemo(() => parseChangelog(changelogRaw), []);

  return (
    <footer className="mt-10 border-t border-slate-200 bg-white px-6 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span className="tabular-nums">
          Build {commit}
          {buildDate ? ` · ${buildDate}` : ""}
          <span className="mx-2 text-slate-300">·</span>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="text-brand hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded"
              >
                What's new
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>What's new</DialogTitle>
              </DialogHeader>
              {entries.length === 0 ? (
                <p className="text-sm text-slate-500">No entries yet.</p>
              ) : (
                <ol className="mt-2 space-y-4">
                  {entries.map((e) => (
                    <li key={`${e.version}-${e.date}`} className="border-l-2 border-slate-200 pl-3">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="text-sm font-semibold text-slate-900">v{e.version}</span>
                        <span className="text-xs text-slate-500">{e.date}</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-700">{e.description}</p>
                    </li>
                  ))}
                </ol>
              )}
            </DialogContent>
          </Dialog>
        </span>
        <Link
          to="/admin/status"
          className="text-brand hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded"
        >
          Live data status
        </Link>
      </div>
    </footer>
  );
};
