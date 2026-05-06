import { useState } from "react";
import { Header } from "@/components/Header";
import { ScoreCard } from "@/components/ScoreCard";
import { TabBar, TabId } from "@/components/TabBar";
import { TabPlaceholder } from "@/components/TabPlaceholder";
import { LiveRiskAlertsTab } from "@/components/alerts/LiveRiskAlertsTab";
import { ScenarioLibraryTab } from "@/components/scenarios/ScenarioLibraryTab";
import { VisualiserMockup } from "@/components/scenarios/VisualiserMockup";
import type { Scenario } from "@/components/scenarios/scenarios";

const Index = () => {
  const [active, setActive] = useState<TabId>("alerts");
  const [loadedScenario, setLoadedScenario] = useState<Scenario | null>(null);

  const handleLoadScenario = (s: Scenario) => {
    setLoadedScenario(s);
    setActive("visualiser");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 text-sm leading-relaxed">
      <Header />
      <ScoreCard />
      <TabBar active={active} onChange={setActive} />
      <main className="px-6 py-6">
        {active === "alerts" && <LiveRiskAlertsTab />}
        {active === "library" && <ScenarioLibraryTab onLoadScenario={handleLoadScenario} />}
        {active === "visualiser" && (
          <VisualiserMockup
            scenario={loadedScenario}
            onBrowseScenarios={() => setActive("library")}
          />
        )}
        {active === "prediction" && (
          <TabPlaceholder
            title="AI Risk Prediction"
            purpose="Forward-looking risk forecasts to help you prioritise interventions."
          />
        )}
      </main>
    </div>
  );
};

export default Index;
