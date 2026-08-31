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
import { ResilienceChatPanel } from "@/components/ResilienceChatPanel";
import { useChatContext } from "@/hooks/useChatContext";

const Index = () => {
  const [active, setActive] = useState<TabId>("alerts");
  const { context, loading: chatContextLoading } = useChatContext();




  return (
    <ScenarioProvider>
    <div className="min-h-screen bg-slate-50 text-slate-900 text-sm leading-relaxed">
      <Header />
      <div className="border-b border-slate-200 bg-white px-4 py-2 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            to="/pillar/human"
            className="inline-flex min-h-[36px] items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-brand hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <ChevronLeft size={14} aria-hidden />
            Back to Human (Workforce) summary
          </Link>
          <nav aria-label="Breadcrumb" className="text-xs text-slate-500">
            <Link to="/" className="hover:underline">Five Capitals</Link>
            <span className="mx-1.5">›</span>
            <Link to="/pillar/human" className="hover:underline">Human (Workforce)</Link>
            <span className="mx-1.5">›</span>
            <span className="font-semibold text-slate-700">Dashboard</span>
          </nav>
        </div>
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
            <ScenarioTestingTab
              onViewImpact={() => setActive("scenario_impact")}
              onBack={() => setActive("prediction")}
            />
          )}
        </div>
        <div role="tabpanel" id={tabPanelId("scenario_impact")} aria-labelledby={tabButtonId("scenario_impact")} hidden={active !== "scenario_impact"}>
          {active === "scenario_impact" && (
            <ScenarioImpactTab onBack={() => setActive("scenario_testing")} />
          )}
        </div>
        <div role="tabpanel" id={tabPanelId("prediction")} aria-labelledby={tabButtonId("prediction")} hidden={active !== "prediction"}>
          {active === "prediction" && <AiRiskPredictionTab />}
        </div>
      </main>
      <Footer />
      <ResilienceChatPanel context={context} loading={chatContextLoading} />
    </div>
    </ScenarioProvider>
  );
};

export default Index;
