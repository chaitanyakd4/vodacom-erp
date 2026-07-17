export function Badge({ children, variant = 'default' }: { children: React.ReactNode, variant?: 'default' | 'success' | 'warning' | 'danger' }) {
  const baseClasses = "px-2.5 py-0.5 text-[11px] font-semibold rounded-full border tracking-wide uppercase leading-none inline-flex items-center justify-center";
  const variants = {
    default: "bg-vodacom-surface/50 text-vodacom-muted border-white/5",
    success: "bg-vodacom-green/10 text-vodacom-green border-vodacom-green/20",
    warning: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    danger: "bg-red-500/10 text-red-400 border-red-500/20"
  };
  return (
    <span className={`${baseClasses} ${variants[variant]}`}>
      {children}
    </span>
  );
}

