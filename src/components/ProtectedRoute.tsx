import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Login from "@/pages/Login";

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-base text-slate-500">Loading…</p>
      </div>
    );
  }

  if (!user) return <Login />;

  return <>{children}</>;
};

export default ProtectedRoute;
