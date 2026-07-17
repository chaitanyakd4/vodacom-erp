export function Modal({ isOpen, onClose, children, title }: any) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-vodacom-surface border border-white/10 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center px-6 py-4 border-b border-white/5">
          <h2 className="text-[15px] font-bold text-white tracking-wide">{title}</h2>
          <button onClick={onClose} className="text-vodacom-muted hover:text-white text-xl transition-colors font-medium">&times;</button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

