## What to build

A single reusable `ScoreScale` component, used in two sizes (`large`, `compact`), applied wherever a 0–100 composite/indicator score is shown today.

### Component spec — `src/components/ScoreScale.tsx`

Props:
- `score: number` (0–100)
- `size: "large" | "compact"`
- `label?: string` (e.g. "Human Capital score", "Projected score") — rendered as small eyebrow above the number
- `id?: string` for aria

Visual structure:
- Large number to the left (or above on narrow widths). Colour derived from zone:
  - `< 25` → red (severity-critical token)
  - `25–74` → amber (severity-warning token)
  - `≥ 75` → green (severity-stable token)
- One-line caption beneath the number, format: `"<score> — <zone phrase>, <relation to target>"`. Examples:
  - `54 — within the operating band, below target`
  - `18 — below threshold, action required`
  - `82 — at or above target`
  - `92 — at or above target. Review — above target.` (for `score ≥ 90`, append the over-target flag inline + small pill)
- Horizontal track 0–100 with three coloured zones: 0–25 red tint, 25–75 amber tint, 75–100 green tint.
- Two fixed reference markers:
  - Threshold at 25 — labelled `Threshold (25)` with helper `level we don't want to breach`
  - Target at 75 — labelled `Target (75)` with helper `where we want to be in normal conditions`
- Pointer/needle at the score's exact position (vertical bar + small filled triangle on top).
- Numeric scale ticks at 0, 25, 50, 75, 100 under the track.
- ARIA: `role="img"` with descriptive `aria-label` summarising score, zone, and relation to target; visually hidden helper text for screen readers; markers and helper text rendered as real text (not tooltip-only).

Size variants:
- `large`: number ~text-6xl, full-width track ~h-3, marker labels visible inline beneath, caption at base font size, helper text visible.
- `compact`: number ~text-3xl, narrower track ~h-2, marker labels rendered as short tags (`T 25`, `Tgt 75`) under the track, helper text omitted (kept in `aria-label` only).

Zone helper used internally:
```ts
type Zone = "below" | "operating" | "ontarget";
function zoneFor(score: number): Zone { ... }
```

### Where to apply it

1. `src/components/ScoreCard.tsx` — replace the `54 / 100` block with `<ScoreScale score={54} size="large" label="Human Capital score" />`. Keep the `At Risk` status pill positioned alongside. Remove the literal `/100`. Stale-data warning icon retained.
2. `src/components/scenarios/VisualiserMockup.tsx` — the before/after score impact strip becomes two stacked `<ScoreScale size="compact" />` (baseline + projected) with the existing arrow + delta line between/under them. Existing band bar with two pips is removed (the new component carries the same information).
3. `src/components/prediction/AiRiskPredictionTab.tsx` — the "current score" reference shown alongside the trajectory chart becomes `<ScoreScale score={54} size="compact" label="Current score" />`. Trajectory chart, ReferenceLine, projected-score numeric callouts and intervention uplift lines are unchanged.
4. `src/components/scenarios/ScenarioLibraryTab.tsx` — within each scenario card, the "Estimated score impact `54 → 38`" line becomes a small inline `<ScoreScale size="compact" />` for the projected score (baseline 54 stays as text on the left for context). Layout of the scenario cards is otherwise unchanged.

### Out of scope

- Tab 1 KRI cards (Sickness Absence, Vacancies, etc.) display raw measurements in their own units (5.2%, 8.5%) and do not have a normalised 0–100 score. They are not "scores" in the sense this component represents and are left alone — their existing value/threshold/status presentation is preserved. Confirming this interpretation matches your intent: the new component goes anywhere the current UI shows a 0–100 figure (composite score, scenario projected score, prediction trajectory anchor), and KRI raw-unit readings stay as they are.

### Things explicitly preserved

- Score values: 54 composite; trend 62→58→56→54; scenario base/projected pairs; prediction trajectory points and ±4 forecast band.
- `At Risk` status pill on the header.
- Tab structure, routing, copy elsewhere, KRI card internals, intervention engine.
- Stale-data tooltip on the composite score.

### Tokens

Use existing severity tokens (`severity-critical`, `severity-warning`, `severity-stable` / equivalents from `severity.ts`); add zone background tints in `tailwind.config.ts` only if a token is missing. No raw hex in components.

### Files touched

- new: `src/components/ScoreScale.tsx`
- edit: `src/components/ScoreCard.tsx`
- edit: `src/components/scenarios/VisualiserMockup.tsx`
- edit: `src/components/prediction/AiRiskPredictionTab.tsx`
- edit: `src/components/scenarios/ScenarioLibraryTab.tsx`
