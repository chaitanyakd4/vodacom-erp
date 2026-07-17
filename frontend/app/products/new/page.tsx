'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../lib/api';

export default function NewProductPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'Unified Telecom',
    hsn_code: '',
    price: 0,
    tax_rate: 18.0,
    stock_quantity: 0,
    unit: 'pcs'
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/api/products/', {
        ...formData,
        price: Number(formData.price),
        tax_rate: Number(formData.tax_rate),
        stock_quantity: Number(formData.stock_quantity),
      });
      router.push('/products');
    } catch (err) {
      console.error(err);
      alert('Failed to add product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-vodacom-surface border border-white/5 p-8 rounded-2xl shadow-2xl">
      <h1 className="text-lg font-bold text-white tracking-wide mb-1">Add New Product / Service</h1>
      <p className="text-xs text-vodacom-muted mb-6">Create a product listing for invoices and items catalogue</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">Product Name</label>
            <input
              required
              type="text"
              className="w-full bg-vodacom-darker/60 border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue focus:border-vodacom-blue transition-all duration-200"
              placeholder="e.g. Dell PowerEdge Server R740"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">Category</label>
            <select
              className="w-full bg-vodacom-darker/60 border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue focus:border-vodacom-blue transition-all duration-200"
              value={formData.category}
              onChange={e => setFormData({ ...formData, category: e.target.value })}
            >
              <option value="Unified Telecom">Unified Telecom</option>
              <option value="Security Surveillance">Security Surveillance</option>
              <option value="Active & Passive Networking">Active & Passive Networking</option>
              <option value="Biometric Systems">Biometric Systems</option>
              <option value="Wireless & RF Loops">Wireless & RF Loops</option>
              <option value="AV Integration">AV Integration</option>
              <option value="General Hardware / Accessories">General Hardware / Accessories</option>
              <option value="Services / AMC">Services / AMC</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">Description (Optional)</label>
          <textarea
            rows={2}
            className="w-full bg-vodacom-darker/60 border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue focus:border-vodacom-blue transition-all duration-200"
            placeholder="Describe features or configuration parameters..."
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">HSN Code (Optional)</label>
            <input
              type="text"
              className="w-full bg-vodacom-darker/60 border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue focus:border-vodacom-blue transition-all duration-200 font-mono"
              placeholder="e.g. 84713010"
              value={formData.hsn_code}
              onChange={e => setFormData({ ...formData, hsn_code: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">Unit of Measure</label>
            <select
              className="w-full bg-vodacom-darker/60 border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue focus:border-vodacom-blue transition-all duration-200"
              value={formData.unit}
              onChange={e => setFormData({ ...formData, unit: e.target.value })}
            >
              <option value="pcs">Pieces (pcs)</option>
              <option value="hrs">Hours (hrs)</option>
              <option value="nos">Numbers (nos)</option>
              <option value="visits">Visits (visits)</option>
              <option value="months">Months (months)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">Unit Price (₹)</label>
            <input
              required
              type="number"
              step="0.01"
              min="0"
              className="w-full bg-vodacom-darker/60 border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue focus:border-vodacom-blue transition-all duration-200"
              placeholder="0.00"
              value={formData.price || ''}
              onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">GST Rate (%)</label>
            <select
              className="w-full bg-vodacom-darker/60 border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue focus:border-vodacom-blue transition-all duration-200"
              value={formData.tax_rate}
              onChange={e => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })}
            >
              <option value="0">0% (GST Exempt)</option>
              <option value="5">5% GST</option>
              <option value="12">12% GST</option>
              <option value="18">18% GST (Standard)</option>
              <option value="28">28% GST</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">Initial Stock</label>
            <input
              required
              type="number"
              min="0"
              className="w-full bg-vodacom-darker/60 border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue focus:border-vodacom-blue transition-all duration-200"
              value={formData.stock_quantity || ''}
              onChange={e => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 text-[12px] font-bold uppercase tracking-wider">
          <button
            type="button"
            onClick={() => router.push('/products')}
            className="px-5 py-2.5 border border-white/10 hover:bg-white/5 text-vodacom-text rounded-xl transition-all duration-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-vodacom-green hover:bg-emerald-500 text-white rounded-xl transition-all duration-200 shadow-lg shadow-vodacom-green/15"
          >
            {saving ? 'Saving...' : 'Save Product'}
          </button>
        </div>
      </form>
    </div>
  );
}
