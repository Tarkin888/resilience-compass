import { ChevronDown, LogOut, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
export const Header = () => {
  const { user, signOut } = useAuth();

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
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Admin dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Admin menu"
                className="flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-brand shadow-sm hover:bg-slate-50 sm:px-4"
              >
                <Shield size={16} />
                <span>Admin</span>
                <ChevronDown size={16} className="text-slate-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to="/admin/status" className="cursor-pointer">
                  Data feed status
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/admin/sources" className="cursor-pointer">
                  Manage sources
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Existing trust selector */}
          <span
            aria-label="Demo NHS Trust"
            className="flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium shadow-sm"
          >
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-accent2"></span>
            Demo NHS Trust
          </span>

          {user && (
            <button
              type="button"
              onClick={() => void signOut()}
              className="flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-brand shadow-sm hover:bg-slate-50 sm:px-4"
            >
              <LogOut size={16} />
              <span>Sign out</span>
            </button>
          )}
        </div>

      </div>
    </header>

  );
};
