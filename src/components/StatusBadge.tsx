const STYLES: Record<string, string> = {
  paid: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  unpaid: "bg-amber-50 text-amber-700 ring-amber-600/20",
  pending: "bg-sky-50 text-sky-700 ring-sky-600/20",
  overdue: "bg-rose-50 text-rose-700 ring-rose-600/20",
};

export default function StatusBadge({ status }: { status: string }) {
  const style = STYLES[status] ?? "bg-slate-100 text-slate-700 ring-slate-500/20";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${style}`}
    >
      {status}
    </span>
  );
}
