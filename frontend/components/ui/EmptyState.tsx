export function EmptyState({ title, message }: { title: string, message?: string }) {
  return (
    <div className="text-center py-12 bg-vodacom-surface/10 border border-dashed border-white/5 rounded-2xl p-8">
      <h3 className="text-[14px] font-bold text-white tracking-wide">{title}</h3>
      {message && <p className="mt-2 text-xs text-vodacom-muted leading-relaxed">{message}</p>}
    </div>
  );
}

