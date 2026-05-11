import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DataSourceChip } from "@/components/DataSourceChip";
import {
  SCENARIOS,
  SCENARIO_SEVERITY_STYLES,
  type Scenario,
  type ScenarioSeverity,
  type ScenarioType,
} from "./scenarios";

interface Props {
  onLoadScenario: (scenario: Scenario) => void;
}

const SEVERITY_OPTIONS: Array<"All" | ScenarioSeverity> = ["All", "Critical", "Warning", "Watch"];
const TYPE_OPTIONS: Array<{ value: "All" | ScenarioType; label: string }> = [
  { value: "All", label: "All types" },
  { value: "Demand surge", label: "Demand surge" },
  { value: "Workforce shock", label: "Workforce shock" },
  { value: "Compliance", label: "Compliance" },
  { value: "Strategic", label: "Strategic" },
];

const pillClass = (active: boolean) =>
  `rounded-full px-3 py-1.5 text-xs font-medium transition-colors min-h-[36px] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
    active
      ? "bg-slate-900 text-white"
      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
  }`;

export const ScenarioLibraryTab = ({ onLoadScenario }: Props) => {
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState<"All" | ScenarioSeverity>("All");
  const [type, setType] = useState<"All" | ScenarioType>("All");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SCENARIOS.filter((s) => {
      if (q && !s.title.toLowerCase().includes(q)) return false;
      if (severity !== "All" && s.severity !== severity) return false;
      if (type !== "All" && s.type !== type) return false;
      return true;
    });
  }, [query, severity, type]);

  const clearFilters = () => {
    setQuery("");
    setSeverity("All");
    setType("All");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <DataSourceChip variant="mockup" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative w-full min-w-0 flex-1 sm:min-w-[220px]">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search scenarios"
              aria-label="Search scenarios"
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-xs font-medium text-slate-500">Severity</span>
            <Select value={severity} onValueChange={(v) => setSeverity(v as typeof severity)}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEVERITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-xs font-medium text-slate-500">Type</span>
            <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <p className="text-sm text-slate-600">No scenarios match these filters</p>
          <Button variant="outline" className="mt-4" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <ScenarioCard key={s.id} scenario={s} onLoad={() => onLoadScenario(s)} />
          ))}
        </div>
      )}
    </div>
  );
};

const ScenarioCard = ({ scenario, onLoad }: { scenario: Scenario; onLoad: () => void }) => {
  const styles = SCENARIO_SEVERITY_STYLES[scenario.severity];
  const delta = scenario.projectedScore - scenario.baseScore;
  const deltaText = `${delta > 0 ? "+" : ""}${delta}`;
  const deltaColour =
    delta < 0 ? "text-red-700" : delta > 0 ? "text-emerald-700" : "text-slate-700";

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
          {scenario.type}
        </span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold ${styles.chip}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} aria-hidden />
          {scenario.severity}
        </span>
      </div>

      <h3 className="mt-3 text-base font-semibold leading-snug text-slate-900">{scenario.title}</h3>

      <p
        className="mt-2 text-base text-slate-600"
        style={{
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {scenario.description}
      </p>

      <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2">
        <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
          Estimated score impact
        </div>
        <div className="mt-1 font-mono text-sm tabular-nums text-slate-900">
          {scenario.baseScore} → {scenario.projectedScore}{" "}
          <span className={`font-semibold ${deltaColour}`}>({deltaText})</span>
        </div>
      </div>

      <div className="mt-4 flex-1" />
      <Button variant="outline" className="mt-4 w-full" onClick={onLoad}>
        Load into Visualiser
      </Button>
    </div>
  );
};
