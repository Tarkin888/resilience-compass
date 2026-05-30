import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const RED = "#DC2626";
const AMBER = "#F59E0B";
const GREEN = "#16A34A";
const TEAL = "#24BEAA";
const NAVY = "#001D57";

function StaticRangeBar() {
  return (
    <div className="mt-4">
      <svg
        viewBox="0 0 200 28"
        preserveAspectRatio="none"
        className="block h-7 w-full"
        role="img"
        aria-label="Operating range from 0 to 100. Minimum threshold at 25, target at 75."
      >
        <defs>
          <linearGradient id="static-grad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor={RED} />
            <stop offset="50%" stopColor={AMBER} />
            <stop offset="100%" stopColor={GREEN} />
          </linearGradient>
        </defs>
        {/* solid red 0-25 */}
        <rect x="0" y="10" width="50" height="6" fill={RED} />
        {/* gradient 25-75 */}
        <rect x="50" y="10" width="100" height="6" fill="url(#static-grad)" />
        {/* solid green 75-100 */}
        <rect x="150" y="10" width="50" height="6" fill={GREEN} />

        {/* end dots */}
        <circle cx="2" cy="13" r="2.5" fill="#000" />
        <circle cx="198" cy="13" r="2.5" fill="#000" />

        {/* teal ticks at 25 and 75 */}
        <line x1="50" y1="6" x2="50" y2="20" stroke={TEAL} strokeWidth="2" />
        <line x1="150" y1="6" x2="150" y2="20" stroke={TEAL} strokeWidth="2" />
      </svg>

      {/* threshold/target labels */}
      <div className="relative mt-1 h-4 text-[10px] font-bold" style={{ color: TEAL }} aria-hidden>
        <span className="absolute -translate-x-1/2" style={{ left: "25%" }}>
          Min threshold
        </span>
        <span className="absolute -translate-x-1/2" style={{ left: "75%" }}>
          Target
        </span>
      </div>

      {/* numeric scale */}
      <div className="relative mt-0.5 h-3 text-[10px] tabular-nums text-slate-500" aria-hidden>
        {[0, 25, 75, 100].map((t) => (
          <span key={t} className="absolute -translate-x-1/2" style={{ left: `${t}%` }}>
            {t}
          </span>
        ))}
      </div>
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
              <strong>Red (0–24)</strong> below the threshold, <strong>Amber (25–74)</strong> within the operating range but below target, and{" "}
              <strong>Green (75–100)</strong> at or above target.
            </p>
          </section>

          {/* Section 4 */}
          <section>
            <h3 className="mb-1 text-sm font-bold">The four Workforce indicators</h3>
            <p className="mb-2">Workforce resilience is tracked through four indicators:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>Workforce of the Future</strong> — having the right skills to compete in a changing market.
              </li>
              <li>
                <strong>Job Distribution</strong> — a workforce distribution that balances knowledge, cost and
                resilience.
              </li>
              <li>
                <strong>People Resilience</strong> — collective resilience across the workforce, to navigate change
                and challenging times.
              </li>
              <li>
                <strong>Continuity of Critical Skills</strong> — maintaining the essential skills and experience
                needed to deliver today's services reliably.
              </li>
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
