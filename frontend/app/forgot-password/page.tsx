'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Zap, ArrowLeft } from 'lucide-react';
import api from '../../lib/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    try {
      await api.post('/api/auth/forgot-password', { email });
      setMessage('If your email is registered, we have sent a password reset link to it. Please check your inbox.');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-vodacom-dark relative overflow-hidden z-50 fixed inset-0">
      
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-vodacom-blue/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-vodacom-green/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-md w-full p-8 glass-panel-glow rounded-2xl relative z-10 border border-white/10 shadow-2xl">
        <div className="flex flex-col items-center mb-6">
          <div className="w-[44px] h-[44px] bg-vodacom-blue/20 border border-vodacom-blue/40 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-vodacom-blue/15">
            <Zap size={22} className="text-vodacom-green" strokeWidth={2.5} />
          </div>
          <h2 className="text-center text-[20px] font-bold text-white tracking-wider leading-none">
            <span className="text-white">Voda</span>
            <span className="text-vodacom-green">com</span>
          </h2>
          <p className="text-[11px] text-vodacom-muted uppercase tracking-[0.2em] font-semibold mt-2">
            Forgot Password Recovery
          </p>
        </div>

        {message ? (
          <div className="space-y-6 text-center">
            <p className="text-slate-300 text-sm leading-relaxed">{message}</p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-xs font-semibold text-vodacom-green hover:text-emerald-400 transition-colors uppercase tracking-wider"
            >
              <ArrowLeft size={14} /> Back to Sign In
            </Link>
          </div>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit}>
            <p className="text-slate-300 text-xs text-center leading-relaxed">
              Enter your email address below and we'll send you a secure link to reset your account password.
            </p>

            <div>
              <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                className="appearance-none rounded-xl relative block w-full px-4 py-3 bg-vodacom-darker/60 border border-white/10 placeholder-vodacom-muted text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue focus:border-vodacom-blue transition-all duration-200"
                placeholder="enter your email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            {error && <p className="text-red-400 text-xs text-center font-medium mt-2">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 text-xs font-bold uppercase tracking-wider rounded-xl text-white bg-vodacom-green hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-vodacom-green/20 border-none mt-6"
            >
              {loading ? 'Sending link...' : 'Send Reset Link'}
            </button>

            <div className="text-center pt-2">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-xs font-semibold text-vodacom-muted hover:text-white transition-colors"
              >
                <ArrowLeft size={14} /> Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
