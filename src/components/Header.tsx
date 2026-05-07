import { ChevronDown } from "lucide-react";

export const Header = () => {
  return (
    <header className="w-full border-b border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-bold text-accent2"
          >
            RC
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-lg font-bold text-brand sm:text-xl">ResilienC</span>
            <span className="text-slate-500 text-2xl">Human Capital</span>
          </div>
        </div>

        <div className="flex items-center">
          <button
            type="button"
            className="flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-brand shadow-sm hover:bg-slate-50 sm:px-4"
          >
            <span className="h-2 w-2 rounded-full bg-accent2" />
            Demo NHS Trust
            <ChevronDown size={16} className="text-slate-500" />
          </button>
        </div>
      </div>
    </header>

  );
};
