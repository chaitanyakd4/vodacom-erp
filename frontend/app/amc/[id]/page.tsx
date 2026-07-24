'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ShieldCheck, Save, RefreshCw, Ban, AlertTriangle, X } from 'lucide-react';
import api from '../../../lib/api';
import { Badge } from '../../../components/ui/Badge';

export default function AmcDetailPage({ params }: any) {
  const router = useRouter();
  const [amcId, setAmcId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    customer_id: 0,
    contract_number: '',
    start_date: '',
    end_date: '',
    amount: 0,
    status: 'active',
    notes: ''
  });
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Renewal Modal State
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [renewForm, setRenewForm] = useState({
    start_date: '',
    end_date: '',
    amount: 0,
    notes: ''
  });
  const [renewing, setRenewing] = useState(false);

  useEffect(() => {
    Promise.resolve(params).then(p => {
      if (p && p.id) setAmcId(p.id);
    });
  }, [params]);

  const fetchData = async () => {
    if (!amcId) return;
    setLoading(true);
    try {
      const amcRes = await api.get(`/api/amc/${amcId}`);
      const amcData = amcRes.data;
      setFormData({
        customer_id: amcData.customer_id,
        contract_number: amcData.contract_number,
        start_date: amcData.start_date,
        end_date: amcData.end_date,
        amount: amcData.amount,
        status: amcData.status,
        notes: amcData.notes || ''
      });

      // Prepare default renewal dates (1 year from current end_date)
      const curEndDate = new Date(amcData.end_date);
      const nextStartDate = new Date(curEndDate);
      nextStartDate.setDate(nextStartDate.getDate() + 1);
      const nextEndDate = new Date(nextStartDate);
      nextEndDate.setFullYear(nextEndDate.getFullYear() + 1);

      setRenewForm({
        start_date: nextStartDate.toISOString().split('T')[0],
        end_date: nextEndDate.toISOString().split('T')[0],
        amount: amcData.amount,
        notes: 'Standard 1-Year Renewal'
      });

      // Fetch customer details
      const custRes = await api.get(`/api/customers/${amcData.customer_id}`);
      setCustomer(custRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [amcId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amcId) return;
    setSaving(true);
    try {
      await api.put(`/api/amc/${amcId}`, {
        ...formData,
        customer_id: Number(formData.customer_id),
        amount: Number(formData.amount)
      });
      router.push('/amc');
    } catch (err) {
      console.error(err);
      alert('Failed to update AMC contract');
    } finally {
      setSaving(false);
    }
  };

  const handleRenew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amcId) return;
    setRenewing(true);
    try {
      await api.post(`/api/amc/${amcId}/renew`, renewForm);
      setShowRenewModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to renew contract.');
    } finally {
      setRenewing(false);
    }
  };

  const handleCancelContract = async () => {
    if (!amcId) return;
    if (confirm('Are you sure you want to cancel this contract? Cancelled contracts are permanently terminated.')) {
      setCancelling(true);
      try {
        await api.post(`/api/amc/${amcId}/cancel`);
        fetchData();
      } catch (err) {
        console.error(err);
        alert('Failed to cancel contract.');
      } finally {
        setCancelling(false);
      }
    }
  };

  if (loading || !amcId) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="w-8 h-8 border-2 border-vodacom-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isExpired = formData.status === 'expired';
  const isCancelled = formData.status === 'cancelled';
  const isActive = formData.status === 'active';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/amc')}
            className="text-vodacom-muted hover:text-white p-1 rounded-lg transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <span className="text-xs text-vodacom-muted">Back to contracts</span>
        </div>

        <div className="flex gap-2">
          {(isExpired || isActive) && (
            <button
              onClick={() => setShowRenewModal(true)}
              className="bg-vodacom-green hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-xl transition-all shadow-lg shadow-vodacom-green/15 flex items-center gap-1.5"
            >
              <RefreshCw size={14} />
              <span>Renew Contract</span>
            </button>
          )}

          {!isCancelled && (
            <button
              onClick={handleCancelContract}
              disabled={cancelling}
              className="border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <Ban size={14} />
              <span>{cancelling ? 'Cancelling...' : 'Cancel Contract'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Expiry / Cancelled Banners */}
      {isExpired && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/25 rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle size={22} className="text-amber-400 shrink-0" />
            <div>
              <div className="text-sm font-bold text-white">Coverage Expired on {new Date(formData.end_date).toLocaleDateString('en-IN')}</div>
              <p className="text-xs text-amber-300/80">This contract coverage term has finished. Expired contracts can be renewed anytime to reactivate.</p>
            </div>
          </div>
          <button
            onClick={() => setShowRenewModal(true)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase rounded-xl transition-all shrink-0"
          >
            Renew Now
          </button>
        </div>
      )}

      {isCancelled && (
        <div className="p-4 bg-red-500/10 border border-red-500/25 rounded-2xl flex items-center gap-3">
          <Ban size={22} className="text-red-400 shrink-0" />
          <div>
            <div className="text-sm font-bold text-white">Contract Cancelled</div>
            <p className="text-xs text-red-300/80">This agreement was terminated and is permanently distinct from expired coverage.</p>
          </div>
        </div>
      )}

      {/* Contract Detail Card & Edit Form */}
      <div className="bg-vodacom-surface border border-white/5 p-8 rounded-2xl shadow-2xl">
        <div className="flex justify-between items-start pb-4 border-b border-white/5 mb-6">
          <h1 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
            <ShieldCheck size={18} className="text-vodacom-green" />
            <span>Manage Contract details</span>
          </h1>
          <Badge variant={isActive ? 'success' : isExpired ? 'warning' : 'danger'}>
            {formData.status}
          </Badge>
        </div>

        {customer && (
          <div className="mb-6 p-4 bg-vodacom-darker/60 border border-white/5 rounded-xl text-xs space-y-1">
            <div className="text-[10px] font-bold text-vodacom-muted uppercase tracking-wider">Client Customer</div>
            <div className="text-white font-semibold pt-0.5">{customer.company_name}</div>
            <div className="text-vodacom-muted">Contact: {customer.contact_person} | Phone: {customer.phone}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">Contract Number</label>
              <input
                required
                type="text"
                className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue focus:border-vodacom-blue transition-all duration-200 font-mono"
                value={formData.contract_number}
                onChange={e => setFormData({ ...formData, contract_number: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">Status Category</label>
              <select
                className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue focus:border-vodacom-blue transition-all duration-200"
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="active">Active Coverage</option>
                <option value="expired">Expired (Finished Coverage Term)</option>
                <option value="cancelled">Cancelled (Terminated Agreement)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">Start Date</label>
              <input
                required
                type="date"
                className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue focus:border-vodacom-blue transition-all duration-200"
                value={formData.start_date}
                onChange={e => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">End Date</label>
              <input
                required
                type="date"
                className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue focus:border-vodacom-blue transition-all duration-200"
                value={formData.end_date}
                onChange={e => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">Contract Value (₹)</label>
              <input
                required
                type="number"
                min="0"
                className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue focus:border-vodacom-blue transition-all duration-200"
                value={formData.amount}
                onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">Notes &amp; Renewal History</label>
            <textarea
              rows={3}
              className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue focus:border-vodacom-blue transition-all duration-200 font-sans"
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 text-[12px] font-bold uppercase tracking-wider">
            <button
              type="button"
              onClick={() => router.push('/amc')}
              className="px-5 py-2.5 border border-white/10 hover:bg-white/5 text-vodacom-text rounded-xl transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-vodacom-green hover:bg-emerald-500 text-white rounded-xl transition-all duration-200 shadow-lg shadow-vodacom-green/15 flex items-center justify-center gap-1.5 border-none cursor-pointer"
            >
              <Save size={14} />
              <span>{saving ? 'Saving...' : 'Update Contract'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* ── Renewal Modal Dialog ── */}
      {showRenewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowRenewModal(false)} />

          <div className="relative w-full max-w-md bg-vodacom-surface border border-white/10 rounded-2xl shadow-2xl p-6 overflow-hidden z-10 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center pb-4 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <RefreshCw size={18} className="text-vodacom-green" />
                <h3 className="text-base font-bold text-white">Renew AMC Contract</h3>
              </div>
              <button
                onClick={() => setShowRenewModal(false)}
                className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-vodacom-muted hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleRenew} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-vodacom-muted uppercase tracking-wider mb-1">New Start Date</label>
                <input
                  required
                  type="date"
                  className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-2.5 text-[13px] text-white focus:outline-none focus:border-vodacom-blue"
                  value={renewForm.start_date}
                  onChange={e => setRenewForm({ ...renewForm, start_date: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-vodacom-muted uppercase tracking-wider mb-1">New End Date</label>
                <input
                  required
                  type="date"
                  className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-2.5 text-[13px] text-white focus:outline-none focus:border-vodacom-blue"
                  value={renewForm.end_date}
                  onChange={e => setRenewForm({ ...renewForm, end_date: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-vodacom-muted uppercase tracking-wider mb-1">Renewal Amount (₹)</label>
                <input
                  required
                  type="number"
                  min="0"
                  className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-2.5 text-[13px] text-white focus:outline-none focus:border-vodacom-blue"
                  value={renewForm.amount}
                  onChange={e => setRenewForm({ ...renewForm, amount: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-vodacom-muted uppercase tracking-wider mb-1">Renewal Notes</label>
                <input
                  type="text"
                  className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-2.5 text-[13px] text-white focus:outline-none focus:border-vodacom-blue"
                  value={renewForm.notes}
                  onChange={e => setRenewForm({ ...renewForm, notes: e.target.value })}
                  placeholder="e.g. Extended for 2026-27"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowRenewModal(false)}
                  className="px-4 py-2 border border-white/10 hover:bg-white/5 text-slate-300 text-xs font-bold uppercase rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={renewing}
                  className="px-5 py-2 bg-vodacom-green hover:bg-emerald-500 text-white text-xs font-bold uppercase rounded-xl transition-all shadow-lg shadow-vodacom-green/15 disabled:opacity-50"
                >
                  {renewing ? 'Renewing...' : 'Confirm Renewal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
