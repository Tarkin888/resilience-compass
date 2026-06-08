# Historical & Predictive Trend Engine — Draft 1 (build plan)

Scope confirmed by you: engine + history table + SPC + honest UI replacement of the header chart and trend chips. **No forecast line, no admin UI** in this build. Backfill **24 months** of real NHS England data for the two live KRIs (Staff Vacancies, Sickness Absence). Control limits **off by default**, with a toggle. UK English. All other KRIs show an honest "Historical data not yet available" state — no fabricated lines.

## 1. Database (one migration)

- `kri_captures`: add `period_date date` (the data month/quarter the value represents — distinct from `captured_at`, which is when we scraped) and `is_backfill boolean default false`. Backfill the existing two live rows with their `period_date` derived from `edition_label`.
- `thresholds`: add `valid_from date` (default '2018-01-01' for existing rows) and `valid_to date null`. Forward-proofing only — values unchanged.
- New table `score_history`:
  - `entity_type` enum: `kri | indicator | pillar | dashboard`
  - `entity_id text` (e.g. `vacancy`, `human`, `dashboard`)
  - `snapshot_date date`
  - `raw_value numeric null` (kris only)
  - `normalised_score numeric not null`
  - `rag_band text` (`red|amber|green`)
  - `target numeric null`, `min_threshold numeric null`
  - `method_version text` (e.g. `v1-2026-06`)
  - unique key `(entity_type, entity_id, snapshot_date, method_version)`
  - GRANTs: `SELECT` to `anon` + `authenticated`; `ALL` to `service_role`. RLS enabled with a public-read policy.

## 2. Edge function `backfill_kri_history` (admin-auth, idempotent)

For each of the two live KRIs:
1. Resolve the latest edition page → xlsx (reuses the existing `_shared/scrape.ts` helpers).
2. Extract the **full series** (not just last two points) from the same sheet/columns the live functions already parse.
3. Trim to the latest 24 months/quarters.
4. Upsert one `kri_captures` row per period with `is_backfill = true`, `period_date`, `edition_label`, raw value, sha256 of the source file. Skip periods already captured (idempotent).
5. After capture, recompute `score_history` for that KRI plus its parent indicator, the Human pillar, and the dashboard, using the existing `scoringEngine.ts` (`normaliseScore`, `bandFor`) and `pillarScores.ts` averaging logic. For any pillar/indicator without backfilled data, **no rows are written** — the UI then renders the empty state.

The function is callable from `AdminSources` via the existing `admin_action` indirection — same access model as the current scrapes.

## 3. Front-end engine pieces

- `src/lib/spc.ts` — pure SPC ("Making Data Count" / XmR) classifier on a normalised series, returning `{ direction: "Improving"|"Worsening"|"Steady"|"Establishing baseline", mean, ucl, lcl, points, tooltip }`. Rules:
  - <8 points → Establishing baseline.
  - Special cause if any point > UCL (Improving) or < LCL (Worsening).
  - Run rule: 7+ consecutive points one side of mean, or 7+ monotonic, classify accordingly.
  - Otherwise Steady.
- `src/hooks/useScoreHistory.ts` — fetches `score_history` rows for a given `entity_type`/`entity_id`, ordered by `snapshot_date`.

## 4. UI changes

- `src/components/TrendPanel.tsx` (header chart): replace illustrative constants with `useScoreHistory("dashboard","dashboard")`. RAG-banded background, real caption `Source: NHS England, {firstPeriod}–{lastPeriod}`. Toggle "Show control limits" (off by default). Honest empty state when no rows: "Historical data not yet available — backfill pending."
- Dial chips (KRI cards in Live Risk Alerts, pillar dial, dashboard header): drive `Steady / Improving / Worsening / Establishing baseline` from `spc.ts` over the relevant series. Tooltip carries the SPC basis. The hand-set chip values are removed.
- Illustrative pillars/KRIs with no backfilled rows: show "Establishing baseline" chip + low-data state on any chart — never a fake line.
- `assessTrend` (the older 2-point delta helper) stays only for the Tab 4 mock, which the spec leaves untouched.

## 5. Acceptance checks I will run

- Toggling a row in `kri_captures` moves the chart point.
- A flat-noisy synthetic series → Steady; sustained 7-point fall → Worsening (unit tests in `src/test/spc.test.ts`).
- Latest snapshot in `score_history` for Human pillar = **53** (matches live).
- Sickness Absence (lower-is-better) scores correctly across history — signed range exercised in tests.
- No fabricated line on any KRI without a real source; existing 9 engine tests still pass.

## 6. Technical notes

- Backfill scope: only `vacancy` and `sickness_absence`. Other Human-pillar KRIs (engagement/turnover/training) and all four other pillars produce no `score_history` rows in this build.
- `method_version = "v1-2026-06"` is stamped on every row so future scoring changes don't silently rewrite history.
- The recompute step lives in the edge function (service role) — the front-end never writes.
- Auth/CORS/loud-failure follow the existing scrape function patterns; `simulate_failure` honoured.

## 7. Not in this build (Draft 2 backlog)

Forecast line; admin UI for thresholds; backfill for illustrative KRIs.

Reply **go** to build, or push back on any item.
