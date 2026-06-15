// Shared banner displayed at the top of both Scenario Testing and Scenario
// Impact tabs, naming the scenario behind the result.
import { useMemo } from "react";
import { useScenario } from "@/contexts/ScenarioContext";
import { useHumanCapitalData } from "@/hooks/useHumanCapitalData";
import { PILLAR_CONFIG } from "@/config/dataPoints";
import { SCENARIO_SEVERITY_STYLES, type ScenarioSeverity } from "./scenarios";

function fmt(value: number, unit: string) {
  const v = unit === "%" ? value.toFixed(1) : String(value);
  return unit === "%" ? `${v}%` : `${v} ${unit}`;
}

export const ScenarioAppliedBanner = () => {
  const { selectedScenario, scenarioModified, overrides } = useScenario();
  const { data } = useHumanCapitalData();

  const liveValues = useMemo<Record<string, number | null>>(() => {
    const out: Record<string, number | null> = {};
    Object.entries(data.capturesByKri).forEach(([kriId, caps]) => {
      const latest = caps[0];
      out[kriId] = latest ? Number(latest.headline_value) : null;
    });
    return out;
  }, [data]);

  // Build a map of liveKriId → { name, unit } from the human pillar config.
  const kriMeta = useMemo(() => {
    const m: Record<string, { name: string; unit: string }> = {};
    const human = PILLAR_CONFIG.find((p) => p.id === "human");
    human?.indicators.forEach((ind) => {
      ind.dataPoints.forEach((dp) => {
        if (dp.liveKriId) m[dp.liveKriId] = { name: dp.name, unit: dp.unit };
      });
    });
    return m;
  }, []);

  const overrideEntries = Object.entries(overrides);
  const hasOverrides = overrideEntries.length > 0;

  // Decide the headline.
  let title: string;
  let modifiedTag = false;
  if (selectedScenario) {
    title = `Scenario applied: ${selectedScenario.title}`;
    modifiedTag = scenarioModified;
  } else if (hasOverrides) {
    title = "Scenario applied: Custom (manual inputs)";
  } else {
    title = "No scenario applied — adjust an input or pick a preset on the Scenario Testing tab.";
  }

  const severity = selectedScenario?.severity as ScenarioSeverity | undefined;
  const sevStyle = severity ? SCENARIO_SEVERITY_STYLES[severity] : null;

  // List of changed inputs reflecting CURRENT values.
  const inputBits = overrideEntries
    .map(([kriId, val]) => {
      const meta = kriMeta[kriId];
      if (!meta) return null;
      const live = liveValues[kriId];
      if (live != null && live === val) return null;
      return `${meta.name} ${fmt(val, meta.unit)}`;
    })
    .filter(Boolean) as string[];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-[#001D57]">{title}</span>
        {sevStyle && (
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${sevStyle.chip}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${sevStyle.dot}`} aria-hidden />
            {severity}
          </span>
        )}
        {modifiedTag && (
          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide italic text-amber-800">
            modified
          </span>
        )}
      </div>
      {inputBits.length > 0 && (
        <p className="mt-1.5 text-xs text-slate-600">
          Inputs: {inputBits.join(" · ")}
        </p>
      )}
    </div>
  );
};
