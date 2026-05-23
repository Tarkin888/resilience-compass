import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
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
