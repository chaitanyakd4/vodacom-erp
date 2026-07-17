export function ConfirmDialog({ isOpen, onClose, onConfirm, title, message }: any) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-vodacom-surface border border-white/10 p-6 rounded-2xl shadow-2xl max-w-sm w-full">
        <h2 className="text-[15px] font-bold text-white mb-2 tracking-wide">{title}</h2>
        <p className="text-vodacom-muted text-[13px] mb-6 leading-relaxed">{message}</p>
        <div className="flex justify-end gap-2 text-[13px]">
          <button onClick={onClose} className="px-4 py-2 border border-white/10 hover:bg-white/5 text-vodacom-text rounded-xl transition-all duration-200">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-medium rounded-xl transition-all duration-200 shadow-lg shadow-red-600/20">Confirm</button>
        </div>
      </div>
    </div>
  );
}

