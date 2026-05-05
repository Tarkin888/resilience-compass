interface Props {
  title: string;
  purpose: string;
  note?: string;
}

export const TabPlaceholder = ({ title, purpose, note = "Coming in next prompt" }: Props) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{purpose}</p>
        </div>
        <span className="inline-flex shrink-0 items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-severity-watch">
          {note}
        </span>
      </div>
    </div>
  );
};
