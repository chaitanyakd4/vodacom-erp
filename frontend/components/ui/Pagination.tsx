export function Pagination({ current, total, onChange }: { current: number; total: number; onChange: (page: number) => void }) {
  if (total <= 1) return null;
  return (
    <div className="flex items-center gap-1.5 mt-4 justify-end text-[13px]">
      <button
        disabled={current === 1}
        onClick={() => onChange(current - 1)}
        className="px-3 py-1.5 border border-white/5 bg-vodacom-surface/50 hover:bg-white/5 disabled:hover:bg-transparent text-vodacom-text rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
      >
        Previous
      </button>
      <span className="text-vodacom-muted px-3 py-1 font-medium">
        Page {current} of {total}
      </span>
      <button
        disabled={current === total}
        onClick={() => onChange(current + 1)}
        className="px-3 py-1.5 border border-white/5 bg-vodacom-surface/50 hover:bg-white/5 disabled:hover:bg-transparent text-vodacom-text rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
      >
        Next
      </button>
    </div>
  );
}
