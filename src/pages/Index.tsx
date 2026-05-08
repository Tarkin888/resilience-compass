import { useState } from "react";
import { Header } from "@/components/Header";
import { ScoreCard } from "@/components/ScoreCard";
import { TrendPanel } from "@/components/TrendPanel";
import { Footer } from "@/components/Footer";
import { TabBar, TabId, tabButtonId, tabPanelId } from "@/components/TabBar";
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
      <TrendPanel />
      <p className="max-w-prose px-4 py-4 text-[14px] italic leading-relaxed text-slate-600 sm:px-6 sm:py-6 sm:text-[15px]">
        This is an AI-powered resilience dashboard helping NHS Trusts monitor and anticipate workforce risk. This prototype focuses on the Human Capital pillar, presenting a composite score drawn from Key Risk Indicators benchmarked against pre-pandemic NHS performance. Staff Vacancy Rate and Sickness Absence Rate are populated with live public data from NHS England; remaining KRIs are clearly labelled as illustrative demo data. This is a working demonstration intended to invite challenge and iteration, not a finished product.
      </p>
      <TabBar active={active} onChange={setActive} />
      <main className="px-4 py-4 sm:px-6 sm:py-6">
        <div role="tabpanel" id={tabPanelId("alerts")} aria-labelledby={tabButtonId("alerts")} hidden={active !== "alerts"}>
          {active === "alerts" && <LiveRiskAlertsTab />}
        </div>
        <div role="tabpanel" id={tabPanelId("library")} aria-labelledby={tabButtonId("library")} hidden={active !== "library"}>
          {active === "library" && <ScenarioLibraryTab onLoadScenario={handleLoadScenario} />}
        </div>
        <div role="tabpanel" id={tabPanelId("visualiser")} aria-labelledby={tabButtonId("visualiser")} hidden={active !== "visualiser"}>
          {active === "visualiser" && (
            <VisualiserMockup
              scenario={loadedScenario}
              onBrowseScenarios={() => setActive("library")}
            />
          )}
        </div>
        <div role="tabpanel" id={tabPanelId("prediction")} aria-labelledby={tabButtonId("prediction")} hidden={active !== "prediction"}>
          {active === "prediction" && <AiRiskPredictionTab />}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
