'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { useCustomers } from '../../../hooks/useCustomers';
import api from '../../../lib/api';

export default function NewAmcPage() {
  const router = useRouter();
  const { customers, loading } = useCustomers();

  const [formData, setFormData] = useState({
    customer_id: '',
    contract_number: '',
    start_date: '',
    end_date: '',
    amount: 0,
    status: 'active',
    notes: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_id) {
      alert('Please select a customer.');
      return;
    }

    setSaving(true);
    try {
      await api.post('/api/amc/', {
        ...formData,
        customer_id: Number(formData.customer_id),
        amount: Number(formData.amount),
      });
      router.push('/amc');
    } catch (err) {
      console.error(err);
      alert('Failed to save AMC Contract.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="w-8 h-8 border-2 border-vodacom-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-vodacom-surface border border-white/5 p-8 rounded-2xl shadow-2xl">
      <h1 className="text-lg font-bold text-white tracking-wide mb-1 flex items-center gap-2">
        <ShieldCheck size={18} className="text-vodacom-green" />
        <span>Create AMC Contract</span>
      </h1>
      <p className="text-xs text-vodacom-muted mb-6">Create a service coverage timeline agreement for server servicing and hardware support</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">Client Customer</label>
          <select
            required
            className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue focus:border-vodacom-blue transition-all duration-200"
            value={formData.customer_id}
            onChange={e => setFormData({ ...formData, customer_id: e.target.value })}
          >
            <option value="">-- Choose Customer --</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>
                {c.company_name} ({c.contact_person})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">Contract Number</label>
            <input
              required
              type="text"
              className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue focus:border-vodacom-blue transition-all duration-200 font-mono"
              placeholder="e.g. AMC-2026-VTC-001"
              value={formData.contract_number}
              onChange={e => setFormData({ ...formData, contract_number: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">Status</label>
            <select
              className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue focus:border-vodacom-blue transition-all duration-200"
              value={formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="active">Active Coverage</option>
              <option value="expired">Expired / Cancelled</option>
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
              placeholder="0.00"
              value={formData.amount || ''}
              onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">Notes (Optional)</label>
          <textarea
            rows={3}
            className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue focus:border-vodacom-blue transition-all duration-200"
            placeholder="Include serial numbers of covered servers, SLA guarantees, or special visit frequencies..."
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
            className="px-5 py-2.5 bg-vodacom-green hover:bg-emerald-500 text-white rounded-xl transition-all duration-200 shadow-lg shadow-vodacom-green/15"
          >
            {saving ? 'Creating...' : 'Create Contract'}
          </button>
        </div>
      </form>
    </div>
  );
}
