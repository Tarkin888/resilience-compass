import { ChevronDown } from "lucide-react";

export const Header = () => {
  return (
    <header className="w-full border-b border-slate-200 bg-white">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex flex-col">
          <span className="text-xl font-bold text-slate-900 leading-tight">ResilienceC</span>
          <span className="text-xs text-slate-500">Human Capital</span>
        </div>

        <div className="flex items-center">
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-50"
          >
            <span className="h-2 w-2 rounded-full bg-brand" />
            Demo NHS Trust
            <ChevronDown size={16} className="text-slate-500" />
          </button>
        </div>

        <div />
      </div>
    </header>
  );
};
