import { useState } from "react";
import { Header } from "@/components/Header";
import { ScoreCard } from "@/components/ScoreCard";
import { Footer } from "@/components/Footer";
import { TabBar, TabId } from "@/components/TabBar";
import { LiveRiskAlertsTab } from "@/components/alerts/LiveRiskAlertsTab";
import { ScenarioLibraryTab } from "@/components/scenarios/ScenarioLibraryTab";
import { VisualiserMockup } from "@/components/scenarios/VisualiserMockup";
import { AiRiskPredictionTab } from "@/components/prediction/AiRiskPredictionTab";
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
        {active === "prediction" && <AiRiskPredictionTab />}
      </main>
      <Footer />
    </div>
  );
};

export default Index;
