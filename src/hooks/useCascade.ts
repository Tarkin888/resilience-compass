// Cross-pillar cascade — Prompt 27.
// Live AI call, wrapped with:
//  - session-scoped cache keyed by scenario id (or a hash of custom overrides)
//  - clamps to keep numbers demo-safe
//  - deterministic fallback matrix if the call fails or JSON is unusable
// The scoring engine is NEVER bypassed — the returned deltas are applied to
// the caller's `otherCapitals` scores at render time and clamped 0..100 there.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fallbackForType, type CascadePillarId } from "@/config/cascadeFallback";
import type { Scenario } from "@/components/scenarios/scenarios";

export interface CascadeItem {
  pillarId: CascadePillarId;
  delta: number;
  rationale: string;
}

export type CascadeSource = "ai" | "fallback";

export interface UseCascadeResult {
  items: CascadeItem[];
  source: CascadeSource;
  loading: boolean;
  refresh: () => void;
}

export interface OtherCapital {
  id: CascadePillarId;
  name: string;
  score: number | null;
}

interface Args {
  scenario: Scenario | null;
  customKey?: string | null; // hash of overrides when no preset is selected
  currentHumanScore: number | null;
  projectedHumanScore: number | null;
  otherCapitals: OtherCapital[];
  primaryDelta: number | null; // projected - current
  /** Only fetch when true — i.e. a scenario has been applied. */
  enabled: boolean;
}

interface CacheEntry {
  items: CascadeItem[];
  source: CascadeSource;
}

// Module-level session cache. Cleared on full page reload only.
const sessionCache: Map<string, CacheEntry> = new Map();

const VALID_IDS: CascadePillarId[] = ["financial", "operational", "reputational", "environmental"];

function clampItems(
  raw: unknown,
  primaryDelta: number,
): CascadeItem[] {
  if (!Array.isArray(raw)) return [];
  const bound = Math.max(1, Math.abs(primaryDelta));
  const cleaned: CascadeItem[] = [];
  const seen = new Set<CascadePillarId>();
  for (const r of raw) {
    const pid = String((r as { pillarId?: unknown })?.pillarId ?? "") as CascadePillarId;
    const delta = Number((r as { delta?: unknown })?.delta);
    const rationale = String((r as { rationale?: unknown })?.rationale ?? "").trim();
    if (!VALID_IDS.includes(pid)) {
      console.warn("[cascade] dropped item — unknown pillarId:", r);
      continue;
    }
    if (seen.has(pid)) {
      console.warn("[cascade] dropped item — duplicate pillarId:", r);
      continue;
    }
    if (!Number.isFinite(delta)) {
      console.warn("[cascade] dropped item — non-numeric delta:", r);
      continue;
    }
    let d = delta;
    // Clamp magnitude to primary workforce shock.
    if (Math.abs(d) > bound) {
      console.warn("[cascade] clamped |delta| to primary bound", { pid, d, bound });
      d = Math.sign(d) * bound;
    }
    // Positive knock-on capped at +2 unless the primary was itself an improvement.
    if (d > 2 && primaryDelta <= 0) {
      console.warn("[cascade] capped positive delta at +2", { pid, d });
      d = 2;
    }
    d = Math.round(d);
    seen.add(pid);
    cleaned.push({ pillarId: pid, delta: d, rationale: rationale || "AI-indicative knock-on." });
  }
  return cleaned;
}

export function useCascade({
  scenario,
  customKey,
  currentHumanScore,
  projectedHumanScore,
  otherCapitals,
  primaryDelta,
  enabled,
}: Args): UseCascadeResult {
  const cacheKey = useMemo(() => {
    if (!enabled) return null;
    if (scenario?.id) return `preset:${scenario.id}`;
    if (customKey) return `custom:${customKey}`;
    return null;
  }, [enabled, scenario?.id, customKey]);

  const [state, setState] = useState<{ items: CascadeItem[]; source: CascadeSource } | null>(null);
  const [loading, setLoading] = useState(false);
  const nonce = useRef(0);

  const applyFallback = useCallback((): CacheEntry => {
    const items = fallbackForType(scenario?.type);
    return { items, source: "fallback" };
  }, [scenario?.type]);

  const run = useCallback(
    async (force: boolean) => {
      if (!cacheKey || !enabled) return;
      if (currentHumanScore == null || projectedHumanScore == null || primaryDelta == null) return;

      if (!force) {
        const cached = sessionCache.get(cacheKey);
        if (cached) {
          setState(cached);
          return;
        }
      }

      const myNonce = ++nonce.current;
      setLoading(true);

      try {
        const { data, error } = await supabase.functions.invoke("generate-cascade", {
          body: {
            scenario: scenario
              ? {
                  id: scenario.id,
                  title: scenario.title,
                  type: scenario.type,
                  description: scenario.description,
                }
              : { id: "custom", title: "Custom scenario", type: "Workforce shock", description: "Manual inputs" },
            currentHumanScore,
            projectedHumanScore,
            otherCapitals: otherCapitals.map((c) => ({ id: c.id, name: c.name, score: c.score })),
          },
        });

        if (myNonce !== nonce.current) return;

        if (error || !data || data.error) {
          console.warn("[cascade] AI call failed — using fallback", error ?? data);
          const fb = applyFallback();
          sessionCache.set(cacheKey, fb);
          setState(fb);
          return;
        }
        const cleaned = clampItems(data.items, primaryDelta);
        if (cleaned.length === 0) {
          const fb = applyFallback();
          sessionCache.set(cacheKey, fb);
          setState(fb);
          return;
        }
        const entry: CacheEntry = { items: cleaned, source: "ai" };
        sessionCache.set(cacheKey, entry);
        setState(entry);
      } catch (err) {
        if (myNonce !== nonce.current) return;
        console.warn("[cascade] threw — using fallback", err);
        const fb = applyFallback();
        sessionCache.set(cacheKey, fb);
        setState(fb);
      } finally {
        if (myNonce === nonce.current) setLoading(false);
      }
    },
    [
      cacheKey,
      enabled,
      currentHumanScore,
      projectedHumanScore,
      primaryDelta,
      scenario,
      otherCapitals,
      applyFallback,
    ],
  );

  // Fetch or restore from cache when the cache key changes.
  useEffect(() => {
    if (!cacheKey) {
      setState(null);
      return;
    }
    const cached = sessionCache.get(cacheKey);
    if (cached) {
      setState(cached);
      return;
    }
    void run(false);
  }, [cacheKey, run]);

  const refresh = useCallback(() => {
    if (cacheKey) sessionCache.delete(cacheKey);
    void run(true);
  }, [cacheKey, run]);

  return {
    items: state?.items ?? [],
    source: state?.source ?? "ai",
    loading,
    refresh,
  };
}
