import { Line, LineChart, ResponsiveContainer, Dot } from "recharts";

const data = [
  { q: "Q1", v: 62 },
  { q: "Q2", v: 58 },
  { q: "Q3", v: 56 },
  { q: "Q4", v: 54 },
];

const LastDot = (props: any) => {
  const { cx, cy, index } = props;
  if (index !== data.length - 1) return null;
  return <Dot cx={cx} cy={cy} r={5} fill="#B45309" stroke="#fff" strokeWidth={2} />;
};

export const ScoreCard = () => {
  return (
    <section className="px-6 py-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-baseline gap-3">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-6xl font-bold text-slate-900 leading-none">54</span>
                <span className="text-2xl text-slate-500">/100</span>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <span className="text-sm font-medium text-slate-500">Human Capital Score</span>
                <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-severity-warning">
                  At Risk
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <div className="h-16 w-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                  <Line
                    type="monotone"
                    dataKey="v"
                    stroke="#B45309"
                    strokeWidth={2}
                    dot={<LastDot />}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <span className="mt-1 text-xs text-slate-500">Trend: declining (last 4 quarters)</span>
          </div>
        </div>
      </div>
    </section>
  );
};
