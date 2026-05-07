import { Area, AreaChart, ResponsiveContainer, XAxis, Dot } from "recharts";

const BRAND_RED = "#B91C1C";
const BRAND_GREEN = "#15803D";
const NEUTRAL = "#64748B";

// Single config object — swap to live data later without component changes.
const trendData: { quarter: string; score: number }[] = [
  { quarter: "Q2 25", score: 62 },
  { quarter: "Q3 25", score: 58 },
  { quarter: "Q4 25", score: 56 },
  { quarter: "Q1 26", score: 54 },
];

const PointDot = (props: any) => {
  const { cx, cy } = props;
  if (cx == null || cy == null) return null;
  return <circle cx={cx} cy={cy} r={4} fill={BRAND_RED} stroke="#fff" strokeWidth={1.5} />;
};

function summarise(data: { quarter: string; score: number }[]) {
  const delta = data[data.length - 1].score - data[0].score;
  const abs = Math.abs(delta);
  const symbol = delta < 0 ? "▼" : delta > 0 ? "▲" : "▬";
  let verdict: string;
  if (delta <= -5) verdict = "sustained decline";
  else if (delta < 0) verdict = "modest decline";
  else if (delta === 0) verdict = "stable";
  else if (delta <= 5) verdict = "modest improvement";
  else verdict = "sustained improvement";
  const colour = delta < 0 ? BRAND_RED : delta > 0 ? BRAND_GREEN : NEUTRAL;
  return { delta, abs, symbol, verdict, colour };
}

export const TrendPanel = () => {
  const s = summarise(trendData);

  return (
    <section className="w-full px-6 pt-2 pb-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          12-month trend
        </div>

        <div className="h-28 w-full sm:h-32">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 8, right: 12, bottom: 4, left: 12 }}>
              <defs>
                <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={BRAND_RED} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={BRAND_RED} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="quarter"
                axisLine={false}
                tickLine={false}
                interval={0}
                tick={{ fill: "#64748B", fontSize: 11 }}
                tickMargin={8}
                className="text-[10px] sm:text-[11px]"
                tickFormatter={(q: string) => {
                  const row = trendData.find((d) => d.quarter === q);
                  return row ? `${q} · ${row.score}` : q;
                }}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke={BRAND_RED}
                strokeWidth={2}
                fill="url(#trendFill)"
                dot={<PointDot />}
                activeDot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-2 text-xs" style={{ color: s.colour }}>
          <span aria-hidden>{s.symbol} </span>
          <span className="font-semibold">
            {s.abs} point{s.abs === 1 ? "" : "s"} over 12 months
          </span>
          <span className="font-normal text-slate-600"> · {s.verdict}</span>
        </div>
      </div>
    </section>
  );
};
