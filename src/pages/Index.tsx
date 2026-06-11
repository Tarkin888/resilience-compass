import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Header } from "@/components/Header";
import { ScoreCard } from "@/components/ScoreCard";
import { TrendPanel } from "@/components/TrendPanel";
import { Footer } from "@/components/Footer";
import { TabBar, TabId, tabButtonId, tabPanelId } from "@/components/TabBar";
import { LiveRiskAlertsTab } from "@/components/alerts/LiveRiskAlertsTab";
import { ScenarioTestingTab } from "@/components/scenarios/ScenarioTestingTab";
import { ScenarioImpactTab } from "@/components/scenarios/ScenarioImpactTab";
import { AiRiskPredictionTab } from "@/components/prediction/AiRiskPredictionTab";
import { ScenarioProvider } from "@/contexts/ScenarioContext";

const Index = () => {
  const [active, setActive] = useState<TabId>("alerts");

  return (
    <ScenarioProvider>
    <div className="min-h-screen bg-slate-50 text-slate-900 text-sm leading-relaxed">
      <Header />
      <div className="border-b border-slate-200 bg-white px-4 py-2 sm:px-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded"
        >
          <ChevronLeft size={14} aria-hidden />
          Five Capitals
        </Link>
      </div>
      <ScoreCard />
      <TrendPanel />
      <TabBar active={active} onChange={setActive} />
      <main className="px-4 py-4 sm:px-6 sm:py-6">
        <div role="tabpanel" id={tabPanelId("alerts")} aria-labelledby={tabButtonId("alerts")} hidden={active !== "alerts"}>
          {active === "alerts" && <LiveRiskAlertsTab />}
        </div>
        <div role="tabpanel" id={tabPanelId("scenario_testing")} aria-labelledby={tabButtonId("scenario_testing")} hidden={active !== "scenario_testing"}>
          {active === "scenario_testing" && (
            <ScenarioTestingTab onViewImpact={() => setActive("scenario_impact")} />
          )}
        </div>
        <div role="tabpanel" id={tabPanelId("scenario_impact")} aria-labelledby={tabButtonId("scenario_impact")} hidden={active !== "scenario_impact"}>
          {active === "scenario_impact" && (
            <ScenarioImpactTab onBack={() => setActive("scenario_testing")} />
          )}
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
    </ScenarioProvider>
  );
};

export default Index;
