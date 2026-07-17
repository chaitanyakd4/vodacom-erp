/**
 * customers/new/page.tsx - New customer form
 */

'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../lib/api';

export default function NewCustomerPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    gstin: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/customers/', formData);
      router.push('/customers');
    } catch (err) {
      console.error(err);
      alert('Failed to add customer');
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-vodacom-surface border border-white/5 p-8 rounded-2xl shadow-2xl">
      <h1 className="text-lg font-bold text-white tracking-wide mb-1">Add New Customer</h1>
      <p className="text-xs text-vodacom-muted mb-6">Create a customer profile for invoices and AMC contracts</p>
      
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">Company Name</label>
          <input
            required
            type="text"
            className="w-full bg-vodacom-darker/60 border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue focus:border-vodacom-blue transition-all duration-200"
            placeholder="e.g. Acme Corporation"
            value={formData.company_name}
            onChange={e => setFormData({...formData, company_name: e.target.value})}
          />
        </div>
        
        <div>
          <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">Contact Person</label>
          <input
            required
            type="text"
            className="w-full bg-vodacom-darker/60 border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue focus:border-vodacom-blue transition-all duration-200"
            placeholder="e.g. John Doe"
            value={formData.contact_person}
            onChange={e => setFormData({...formData, contact_person: e.target.value})}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">Email Address</label>
            <input
              type="email"
              className="w-full bg-vodacom-darker/60 border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue focus:border-vodacom-blue transition-all duration-200"
              placeholder="e.g. billing@acme.com"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">Phone Number</label>
            <input
              required
              type="text"
              className="w-full bg-vodacom-darker/60 border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue focus:border-vodacom-blue transition-all duration-200"
              placeholder="e.g. +91 98765 43210"
              value={formData.phone}
              onChange={e => setFormData({...formData, phone: e.target.value})}
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">GSTIN (Optional)</label>
          <input
            type="text"
            className="w-full bg-vodacom-darker/60 border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue focus:border-vodacom-blue transition-all duration-200 font-mono"
            placeholder="e.g. 07AAAAA1111A1Z1"
            value={formData.gstin}
            onChange={e => setFormData({...formData, gstin: e.target.value})}
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">Billing Address</label>
          <textarea
            required
            rows={3}
            className="w-full bg-vodacom-darker/60 border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue focus:border-vodacom-blue transition-all duration-200"
            placeholder="Enter full physical address for tax invoices..."
            value={formData.address}
            onChange={e => setFormData({...formData, address: e.target.value})}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 text-[12px] font-bold uppercase tracking-wider">
          <button
            type="button"
            onClick={() => router.push('/customers')}
            className="px-5 py-2.5 border border-white/10 hover:bg-white/5 text-vodacom-text rounded-xl transition-all duration-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 bg-vodacom-green hover:bg-emerald-500 text-white rounded-xl transition-all duration-200 shadow-lg shadow-vodacom-green/15"
          >
            Save Customer
          </button>
        </div>
      </form>
    </div>
  );
}

