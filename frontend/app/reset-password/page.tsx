'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Zap, KeyRound, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import api from '../../lib/api';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Password reset token is missing. Please request a new link.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/auth/reset-password', {
        token,
        new_password: password,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reset password. The link may have expired or is invalid.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="text-center space-y-4">
        <p className="text-red-400 text-sm font-medium">Invalid or missing reset token.</p>
        <p className="text-slate-300 text-xs leading-relaxed">
          Please request a new reset link from the forgot password recovery page.
        </p>
        <div className="pt-2">
          <Link
            href="/forgot-password"
            className="inline-block bg-vodacom-blue hover:bg-blue-600 text-white text-xs font-bold uppercase tracking-wider px-5 py-3 rounded-xl transition-all duration-200"
          >
            Go to Recovery Page
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center space-y-5">
        <div className="w-12 h-12 rounded-full bg-vodacom-green/20 border border-vodacom-green/40 flex items-center justify-center mx-auto text-vodacom-green">
          <CheckCircle2 size={24} />
        </div>
        <div>
          <h3 className="text-white font-bold text-base">Password Reset Complete</h3>
          <p className="text-slate-300 text-xs mt-1.5 leading-relaxed">
            Your account password has been updated. You can now sign in using your new credentials.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/login"
            className="w-full inline-flex justify-center bg-vodacom-green hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider px-5 py-3 rounded-xl transition-all duration-200 shadow-lg shadow-vodacom-green/15"
          >
            Sign In Now
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleReset} className="space-y-5">
      <p className="text-slate-300 text-xs text-center leading-relaxed">
        Please choose a strong new password to secure your portal account.
      </p>

      <div>
        <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">
          New Password
        </label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            required
            minLength={6}
            className="appearance-none rounded-xl relative block w-full pl-4 pr-11 py-3 bg-vodacom-darker/60 border border-white/10 placeholder-vodacom-muted text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue focus:border-vodacom-blue transition-all duration-200"
            placeholder="Enter new password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-vodacom-muted hover:text-white transition-colors duration-150"
            title={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">
          Confirm Password
        </label>
        <div className="relative">
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            required
            minLength={6}
            className="appearance-none rounded-xl relative block w-full pl-4 pr-11 py-3 bg-vodacom-darker/60 border border-white/10 placeholder-vodacom-muted text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue focus:border-vodacom-blue transition-all duration-200"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-vodacom-muted hover:text-white transition-colors duration-150"
            title={showConfirmPassword ? 'Hide password' : 'Show password'}
          >
            {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {error && <p className="text-red-400 text-xs text-center font-medium mt-2">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full flex justify-center py-3 px-4 text-xs font-bold uppercase tracking-wider rounded-xl text-white bg-vodacom-green hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-vodacom-green/20 border-none mt-6"
      >
        {loading ? 'Resetting password...' : 'Update Password'}
      </button>
    </form>
  );
}

export default function ResetPassword() {
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
            Reset Password Authentication
          </p>
        </div>

        <Suspense fallback={<div className="text-center text-xs text-vodacom-muted">Loading reset parameters...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
