import { useRef } from "react";
import { Bell, Layers, BarChart3, TrendingUp, LucideIcon } from "lucide-react";

export type TabId = "alerts" | "library" | "visualiser" | "prediction";

export const TABS: { id: TabId; label: string; shortLabel: string; icon: LucideIcon }[] = [
  { id: "alerts", label: "Live Risk Alerts", shortLabel: "Alerts", icon: Bell },
  { id: "library", label: "Scenario Testing Library", shortLabel: "Scenarios", icon: Layers },
  { id: "visualiser", label: "Scenario Impact Visualiser", shortLabel: "Visualiser", icon: BarChart3 },
  { id: "prediction", label: "AI Risk Prediction", shortLabel: "Prediction", icon: TrendingUp },
];

export const tabButtonId = (id: TabId) => `tab-${id}`;
export const tabPanelId = (id: TabId) => `tabpanel-${id}`;

interface Props {
  active: TabId;
  onChange: (id: TabId) => void;
}

export const TabBar = ({ active, onChange }: Props) => {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const focusAndActivate = (id: TabId) => {
    onChange(id);
    requestAnimationFrame(() => refs.current[id]?.focus());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const idx = TABS.findIndex((t) => t.id === active);
    if (idx < 0) return;
    let next = idx;
    if (e.key === "ArrowRight") next = (idx + 1) % TABS.length;
    else if (e.key === "ArrowLeft") next = (idx - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TABS.length - 1;
    else return;
    e.preventDefault();
    focusAndActivate(TABS[next].id);
  };

  return (
    <div className="border-b border-slate-200 bg-white px-3 sm:px-6">
      <nav
        role="tablist"
        aria-label="Module"
        className="-mx-1 flex gap-1 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        onKeyDown={handleKeyDown}
      >
        {TABS.map(({ id, label, shortLabel, icon: Icon }) => {
          const isActive = id === active;
          return (
            <button
              key={id}
              ref={(el) => (refs.current[id] = el)}
              type="button"
              role="tab"
              id={tabButtonId(id)}
              aria-selected={isActive}
              aria-controls={tabPanelId(id)}
              aria-label={label}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(id)}
              className={`relative flex shrink-0 items-center gap-2 px-3 py-3 text-sm font-medium transition-colors min-h-[44px] sm:px-4 ${
                isActive ? "text-brand" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Icon size={16} aria-hidden />
              <span className="sm:hidden">{shortLabel}</span>
              <span className="hidden sm:inline">{label}</span>
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
