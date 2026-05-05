import { Bell, Layers, BarChart3, TrendingUp, LucideIcon } from "lucide-react";

export type TabId = "alerts" | "library" | "visualiser" | "prediction";

export const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: "alerts", label: "Live Risk Alerts", icon: Bell },
  { id: "library", label: "Scenario Testing Library", icon: Layers },
  { id: "visualiser", label: "Scenario Impact Visualiser", icon: BarChart3 },
  { id: "prediction", label: "AI Risk Prediction", icon: TrendingUp },
];

interface Props {
  active: TabId;
  onChange: (id: TabId) => void;
}

export const TabBar = ({ active, onChange }: Props) => {
  return (
    <div className="border-b border-slate-200 bg-white px-6">
      <nav className="flex gap-1">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = id === active;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                isActive ? "text-brand" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Icon size={16} />
              {label}
              {isActive && (
                <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-brand" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};
