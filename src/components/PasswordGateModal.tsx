import { useState, type FormEvent } from "react";
import { Lock } from "lucide-react";
import { useAuthGate } from "@/contexts/AuthGateContext";

export const PasswordGateModal = () => {
  const { unlocked, unlock } = useAuthGate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (unlocked) return null;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (unlock(password)) {
      setPassword("");
      setError(null);
    } else {
      setError("Incorrect password");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="password-gate-title"
    >
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-lg">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600"
          >
            <Lock size={18} />
          </span>
          <div>
            <h1 id="password-gate-title" className="text-base font-semibold text-slate-900">
              ResilienC demonstration
            </h1>
            <p className="text-sm text-slate-500">Enter the access password to continue.</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <label htmlFor="gate-password" className="block text-sm font-medium text-slate-700">
            Password
          </label>
          <input
            id="gate-password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError(null);
            }}
            autoComplete="current-password"
            autoFocus
            aria-invalid={!!error}
            aria-describedby={error ? "gate-password-error" : undefined}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-base text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          />
          {error && (
            <p id="gate-password-error" role="alert" className="text-sm font-medium text-red-600">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="min-h-[44px] w-full rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
};
