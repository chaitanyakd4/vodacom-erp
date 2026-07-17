'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Megaphone } from 'lucide-react';
import api from '../../../lib/api';

export default function NewEnquiryPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    shipping_address: '',
    state_name: '',
    state_code: '',
    notes: ''
  });
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...formData,
        shipping_address: sameAsBilling ? formData.address : formData.shipping_address,
        state_name: formData.state_name || '',
        state_code: formData.state_code || ''
      };
      await api.post('/api/sales/enquiries', payload);
      router.push('/enquiries');
    } catch (err) {
      console.error(err);
      alert('Failed to create enquiry');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-vodacom-surface border border-white/5 p-8 rounded-2xl shadow-2xl">
      <h1 className="text-lg font-bold text-white tracking-wide mb-1 flex items-center gap-2">
        <Megaphone size={18} className="text-vodacom-green" />
        <span>Log New Sales Lead</span>
      </h1>
      <p className="text-xs text-vodacom-muted mb-6">Enter details for the new prospective customer</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">Company Name <span className="text-red-400">*</span></label>
          <input
            required
            type="text"
            className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue focus:border-vodacom-blue transition-all duration-200"
            value={formData.company_name}
            onChange={e => setFormData({ ...formData, company_name: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">Contact Person <span className="text-red-400">*</span></label>
            <input
              required
              type="text"
              className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue focus:border-vodacom-blue transition-all duration-200"
              value={formData.contact_person}
              onChange={e => setFormData({ ...formData, contact_person: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">Phone Number <span className="text-red-400">*</span></label>
            <input
              required
              type="text"
              className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue focus:border-vodacom-blue transition-all duration-200"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">Email Address</label>
          <input
            type="email"
            className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue focus:border-vodacom-blue transition-all duration-200"
            value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">Billing Address <span className="text-red-400">*</span></label>
          <textarea
            required
            rows={2}
            className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue focus:border-vodacom-blue transition-all duration-200"
            value={formData.address}
            onChange={e => {
              setFormData({ ...formData, address: e.target.value });
              if (sameAsBilling) setFormData(prev => ({ ...prev, shipping_address: e.target.value }));
            }}
          />
        </div>

        <div className="flex items-center gap-2 mt-2">
          <input
            type="checkbox"
            id="sameAsBilling"
            className="w-4 h-4 rounded border-white/10 bg-vodacom-darker text-vodacom-green focus:ring-vodacom-green"
            checked={sameAsBilling}
            onChange={e => {
              setSameAsBilling(e.target.checked);
              if (e.target.checked) setFormData(prev => ({ ...prev, shipping_address: prev.address }));
            }}
          />
          <label htmlFor="sameAsBilling" className="text-[11px] text-vodacom-muted font-bold tracking-wide">
            Shipping Address same as Billing
          </label>
        </div>

        {!sameAsBilling && (
          <div>
            <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">Shipping Address (Consignee) <span className="text-red-400">*</span></label>
            <textarea
              required={!sameAsBilling}
              rows={2}
              className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue focus:border-vodacom-blue transition-all duration-200"
              value={formData.shipping_address}
              onChange={e => setFormData({ ...formData, shipping_address: e.target.value })}
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">State Name (e.g. Delhi)</label>
            <input
              type="text"
              className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue focus:border-vodacom-blue transition-all duration-200"
              value={formData.state_name}
              onChange={e => setFormData({ ...formData, state_name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">State Code (e.g. 07)</label>
            <input
              type="text"
              className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue focus:border-vodacom-blue transition-all duration-200"
              value={formData.state_code}
              onChange={e => setFormData({ ...formData, state_code: e.target.value })}
            />
          </div>
        </div>
        
        <div>
          <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">Lead Notes / Requirements</label>
          <textarea
            rows={3}
            placeholder="What is the client looking for?"
            className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue focus:border-vodacom-blue transition-all duration-200"
            value={formData.notes}
            onChange={e => setFormData({ ...formData, notes: e.target.value })}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 text-[12px] font-bold uppercase tracking-wider">
          <button
            type="button"
            onClick={() => router.push('/enquiries')}
            className="px-5 py-2.5 border border-white/10 hover:bg-white/5 text-vodacom-text rounded-xl transition-all duration-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-vodacom-green hover:bg-emerald-500 text-white rounded-xl transition-all duration-200 shadow-lg shadow-vodacom-green/15"
          >
            {saving ? 'Creating...' : 'Create Lead'}
          </button>
        </div>
      </form>
    </div>
  );
}
