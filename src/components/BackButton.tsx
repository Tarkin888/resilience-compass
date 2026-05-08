import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const BackButton = () => {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(-1)}
      className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50 min-h-[44px] font-bold text-blue-900"
    >
      <ChevronLeft size={16} aria-hidden />
      Back to last site visited
    </button>
  );
};
