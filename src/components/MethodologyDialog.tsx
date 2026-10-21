import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PILLAR_CONFIG } from "@/config/dataPoints";

const RED = "#DC2626";
const AMBER = "#F59E0B";
const GREEN = "#16A34A";
const TEAL = "#24BEAA";
const NAVY = "#001D57";

/** Indicators configured for the Human (Workforce) pillar in dataPoints.ts. */
const humanIndicators = PILLAR_CONFIG.find((p) => p.id === "human")?.indicators ?? [];


function StaticRangeBar() {
  return (
    <div className="mt-4">
      <svg
        viewBox="0 0 200 28"
        preserveAspectRatio="none"
        className="block h-7 w-full"
        role="img"
        aria-label="Operating range from 0 to 100. RAG colour bands: red 0–35, amber 36–66, green 67–100. Minimum threshold tick at 25, target tick at 75."
      >
        {/* solid red 0-35 */}
        <rect x="0" y="10" width="70" height="6" fill={RED} />
        {/* solid amber 35-67 */}
        <rect x="70" y="10" width="64" height="6" fill={AMBER} />
        {/* solid green 67-100 */}
        <rect x="134" y="10" width="66" height="6" fill={GREEN} />

        {/* end dots */}
        <circle cx="2" cy="13" r="2.5" fill="#000" />
        <circle cx="198" cy="13" r="2.5" fill="#000" />

        {/* teal ticks at 25 and 75 (threshold / target positions) */}
        <line x1="50" y1="6" x2="50" y2="20" stroke={TEAL} strokeWidth="2" />
        <line x1="150" y1="6" x2="150" y2="20" stroke={TEAL} strokeWidth="2" />
      </svg>

      {/* threshold/target labels */}
      <div className="relative mt-1 h-4 text-[10px] font-bold" style={{ color: TEAL }} aria-hidden>
        <span className="absolute -translate-x-1/2" style={{ left: "25%" }}>
          Min threshold (25)
        </span>
        <span className="absolute -translate-x-1/2" style={{ left: "75%" }}>
          Target (75)
        </span>
      </div>

      {/* numeric scale */}
      <div className="relative mt-0.5 h-3 text-[10px] tabular-nums text-slate-500" aria-hidden>
        {[0, 35, 67, 100].map((t) => (
          <span key={t} className="absolute -translate-x-1/2" style={{ left: `${t}%` }}>
            {t}
          </span>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-slate-500">
        Colours show the RAG bands (red ≤35, amber 36–66, green ≥67). The teal ticks mark the minimum threshold (25) and target (75) — these are separate from the colour boundaries.
      </p>
    </div>
  );
}

interface MethodologyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocusRef?: React.RefObject<HTMLElement>;
}

export const MethodologyDialog = ({ open, onOpenChange, returnFocusRef }: MethodologyDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-xl"
        onCloseAutoFocus={(e) => {
          if (returnFocusRef?.current) {
            e.preventDefault();
            returnFocusRef.current.focus();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: NAVY }}>How resilience scoring works</DialogTitle>
        </DialogHeader>
        <DialogDescription className="sr-only">
          Explains how ResilienceC produces its 0–100 resilience scores.
        </DialogDescription>

        <div className="space-y-6 text-sm leading-relaxed" style={{ color: NAVY }}>
          {/* Section 1 */}
          <section>
            <h3 className="mb-1 text-sm font-bold">Why we measure resilience</h3>
            <p>
              Resilience indicators act as an early-warning system — a "canary down the mine".
              Monitoring them regularly lets leaders take pre-emptive action sooner, builds awareness
              of the underlying health and strength of the organisation, and supports better judgement
              on where the risk trade-offs lie.
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h3 className="mb-1 text-sm font-bold">The 0–100 operating range</h3>
            <p>
              Every score sits on a single 0–100 scale with two fixed reference points:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong>Minimum threshold (25)</strong> — the lowest level of performance the organisation can
                tolerate. Falling below it creates a critical risk, and action is required.
              </li>
              <li>
                <strong>Target (75)</strong> — the expected level of performance, aligned to the organisation's
                strategy and vision.
              </li>
            </ul>
            <StaticRangeBar />
          </section>

          {/* Section 3 */}
          <section>
            <h3 className="mb-1 text-sm font-bold">How a score is built</h3>
            <p>
              Each data point is compared against its own target and minimum threshold and placed on
              the 0–100 scale, so that very different measures become directly comparable. Related data
              points are then averaged into an indicator score. A score is read as{" "}
              <strong>Red (0–35)</strong> below the threshold, <strong>Amber (36–66)</strong> within the operating range but below target, and{" "}
              <strong>Green (67–100)</strong> at or above target.
            </p>
          </section>

          {/* Section 4 */}
          <section>
            <h3 className="mb-1 text-sm font-bold">The Workforce indicators</h3>
            <p className="mb-2">
              Workforce resilience is tracked through the indicators configured for the Human
              (Workforce) pillar:
            </p>
            <ul className="space-y-2">
              {humanIndicators.map((indicator) => {
                const dp = indicator.dataPoints[0];
                const isLive = dp?.source === "Live";
                return (
                  <li key={indicator.id} className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <strong>{indicator.name}</strong>
                      {isLive ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700"
                          aria-label="Live public data"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-600" aria-hidden />
                          Live
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                          aria-label="Illustrative data"
                        >
                          Illustrative
                        </span>
                      )}
                    </div>
                    {indicator.description && (
                      <span className="text-xs text-slate-500">{indicator.description}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>


          {/* Section 5 */}
          <section>
            <h3 className="mb-1 text-sm font-bold">How to read the indicators</h3>
            <p>
              These are <em>indicators</em>, not exact measurements — resilience is not a precise science.
              They are most useful for prompting questions and directing attention, rather than as
              definitive scores. Expect to start simple and refine the measures over time.
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
};
