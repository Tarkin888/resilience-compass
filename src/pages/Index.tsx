import { useState } from "react";
import { Header } from "@/components/Header";
import { ScoreCard } from "@/components/ScoreCard";
import { TabBar, TabId } from "@/components/TabBar";
import { TabPlaceholder } from "@/components/TabPlaceholder";

const Index = () => {
  const [active, setActive] = useState<TabId>("alerts");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 text-sm leading-relaxed">
      <Header />
      <ScoreCard />
      <TabBar active={active} onChange={setActive} />
      <main className="px-6 py-6">
        {active === "alerts" && (
          <TabPlaceholder
            title="Live Risk Alerts"
            purpose="Real-time signals across your workforce, prioritised by severity."
            note="Live data wire-up coming in Prompt 3"
          />
        )}
        {active === "library" && (
          <TabPlaceholder
            title="Scenario Testing Library"
            purpose="A catalogue of resilience scenarios you can run against your organisation."
          />
        )}
        {active === "visualiser" && (
          <TabPlaceholder
            title="Scenario Impact Visualiser"
            purpose="Visualise how each scenario shifts your Human Capital score and sub-indices."
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
