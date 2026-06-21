import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type KriDefinition = Tables<"kri_definitions">;
export type KriCapture = Tables<"kri_captures">;
export type Threshold = Tables<"thresholds">;
export type CaptureLog = Pick<Tables<"capture_log">, "id" | "kri_id" | "outcome" | "attempt_at">;
export type Source = Omit<Tables<"sources">, "simulate_failure" | "backfill_file_url">;

export interface HumanCapitalData {
  definitions: KriDefinition[];
  capturesByKri: Record<string, KriCapture[]>; // newest first
  thresholdsByKri: Record<string, Threshold>;
  sourcesByKri: Record<string, Source>;
  latestLogByKri: Record<string, CaptureLog | undefined>;
}

const EMPTY: HumanCapitalData = {
  definitions: [],
  capturesByKri: {},
  thresholdsByKri: {},
  sourcesByKri: {},
  latestLogByKri: {},
};

export function useHumanCapitalData() {
  const [data, setData] = useState<HumanCapitalData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [defs, caps, thresh, srcs, logs] = await Promise.all([
        supabase.from("kri_definitions").select("*").order("display_order"),
        supabase.from("kri_captures").select("*").order("captured_at", { ascending: false }),
        supabase.from("thresholds").select("*"),
        supabase.from("sources_public" as "sources").select("id,kri_id,publisher,publication_name,series_landing_page_url,edition_page_url_pattern,update_cadence,file_format,last_known_file_url,updated_at"),
        supabase.from("capture_log").select("id,kri_id,outcome,attempt_at").order("attempt_at", { ascending: false }),
      ]);

      const firstError = [defs, caps, thresh, srcs, logs].find((r) => r.error)?.error;
      if (firstError) throw firstError;

      const capturesByKri: Record<string, KriCapture[]> = {};
      (caps.data ?? []).forEach((c) => {
        (capturesByKri[c.kri_id] ??= []).push(c);
      });

      const thresholdsByKri: Record<string, Threshold> = {};
      (thresh.data ?? []).forEach((t) => {
        thresholdsByKri[t.kri_id] = t;
      });

      const sourcesByKri: Record<string, Source> = {};
      (srcs.data ?? []).forEach((s) => {
        sourcesByKri[s.kri_id] = s;
      });

      const latestLogByKri: Record<string, CaptureLog | undefined> = {};
      (logs.data ?? []).forEach((l) => {
        if (!latestLogByKri[l.kri_id]) latestLogByKri[l.kri_id] = l;
      });

      setData({
        definitions: defs.data ?? [],
        capturesByKri,
        thresholdsByKri,
        sourcesByKri,
        latestLogByKri,
      });
    } catch (e: any) {
      setError(e?.message ?? "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, refresh: load };
}
