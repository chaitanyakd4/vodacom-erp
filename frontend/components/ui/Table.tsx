export function Table({ headers, children }: { headers: string[], children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto border border-white/5 rounded-xl shadow-lg shadow-black/20">
      <table className="min-w-full divide-y divide-white/5 bg-vodacom-surface/25 backdrop-blur-md">
        <thead className="bg-vodacom-darker/60">
          <tr>
            {headers.map((header, i) => (
              <th key={i} className="px-6 py-3.5 text-left text-[11px] font-bold text-vodacom-muted uppercase tracking-[0.12em] border-b border-white/5">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5 text-[13px]">
          {children}
        </tbody>
      </table>
    </div>
  );
}

