'use client';
import Link from 'next/link';
import { ShieldOff, ArrowLeft } from 'lucide-react';

interface AccessDeniedProps {
  pageName?: string;
}

export function AccessDenied({ pageName }: AccessDeniedProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      {/* Icon */}
      <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6 shadow-lg shadow-red-500/10">
        <ShieldOff size={36} className="text-red-400" />
      </div>

      {/* Title */}
      <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
      <p className="text-vodacom-muted text-sm max-w-md leading-relaxed mb-1">
        You don't have permission to access{' '}
        <span className="text-white font-semibold">{pageName || 'this section'}</span>.
      </p>
      <p className="text-vodacom-muted text-xs max-w-md leading-relaxed mb-8">
        Please contact your administrator to request access to this module.
      </p>

      {/* Divider */}
      <div className="w-24 h-px bg-white/10 mb-8" />

      {/* Back button */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-vodacom-blue/20 hover:bg-vodacom-blue/30 border border-vodacom-blue/30 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-200"
      >
        <ArrowLeft size={14} />
        Back to Dashboard
      </Link>
    </div>
  );
}
