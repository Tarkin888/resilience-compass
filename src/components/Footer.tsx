import { Link } from "react-router-dom";

export const Footer = () => (
  <footer className="mt-10 border-t border-slate-200 bg-white px-6 py-4">
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
      <span>Demo build for 14 May 2026</span>
      <Link
        to="/admin/status"
        className="text-brand hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded"
      >
        Live data status
      </Link>
    </div>
  </footer>
);
