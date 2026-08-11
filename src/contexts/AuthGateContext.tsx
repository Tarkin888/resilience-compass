import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

const STORAGE_KEY = "resc_auth_unlocked";
const PASSWORD = "Zotero786";

interface AuthGateValue {
  unlocked: boolean;
  unlock: (password: string) => boolean;
  logOut: () => void;
}

const AuthGateContext = createContext<AuthGateValue | undefined>(undefined);

export const AuthGateProvider = ({ children }: { children: ReactNode }) => {
  const [unlocked, setUnlocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      if (unlocked) localStorage.setItem(STORAGE_KEY, "true");
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage unavailable */
    }
  }, [unlocked]);

  const unlock = useCallback((password: string) => {
    if (password === PASSWORD) {
      setUnlocked(true);
      return true;
    }
    return false;
  }, []);

  const logOut = useCallback(() => setUnlocked(false), []);

  const value = useMemo(() => ({ unlocked, unlock, logOut }), [unlocked, unlock, logOut]);

  return <AuthGateContext.Provider value={value}>{children}</AuthGateContext.Provider>;
};

export const useAuthGate = () => {
  const ctx = useContext(AuthGateContext);
  if (!ctx) throw new Error("useAuthGate must be used within AuthGateProvider");
  return ctx;
};
