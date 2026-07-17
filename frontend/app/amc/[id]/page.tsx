'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ShieldCheck, Save, Calendar } from 'lucide-react';
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

  useEffect(() => {
    Promise.resolve(params).then(p => {
      if (p && p.id) setAmcId(p.id);
    });
  }, [params]);

  useEffect(() => {
    if (!amcId) return;

    const fetchData = async () => {
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

        // Fetch customer details
        const custRes = await api.get(`/api/customers/${amcData.customer_id}`);
        setCustomer(custRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

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

  if (loading || !amcId) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="w-8 h-8 border-2 border-vodacom-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => router.push('/amc')}
          className="text-vodacom-muted hover:text-white p-1 rounded-lg transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <span className="text-xs text-vodacom-muted">Back to contracts</span>
      </div>

      {/* Contract Detail Card & Edit Form */}
      <div className="bg-vodacom-surface border border-white/5 p-8 rounded-2xl shadow-2xl">
        <div className="flex justify-between items-start pb-4 border-b border-white/5 mb-6">
          <h1 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
            <ShieldCheck size={18} className="text-vodacom-green" />
            <span>Manage Contract details</span>
          </h1>
          <Badge variant={formData.status === 'active' ? 'success' : 'danger'}>
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
                value={formData.amount}
                onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">Notes (Optional)</label>
            <textarea
              rows={3}
              className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue focus:border-vodacom-blue transition-all duration-200"
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
    </div>
  );
}
