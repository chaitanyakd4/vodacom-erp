export function SearchBar({ placeholder, onSearch }: { placeholder?: string, onSearch: (term: string) => void }) {
  return (
    <input
      type="text"
      placeholder={placeholder || "Search..."}
      onChange={(e) => onSearch(e.target.value)}
      className="bg-vodacom-surface/50 border border-white/10 text-[13px] text-white placeholder-vodacom-muted rounded-xl px-4 py-2.5 w-full max-w-sm focus:outline-none focus:ring-1 focus:ring-vodacom-blue focus:border-vodacom-blue transition-all duration-200"
    />
  );
}

