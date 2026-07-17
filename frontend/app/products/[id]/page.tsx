'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Package, Save } from 'lucide-react';
import api from '../../../lib/api';

export default function ProductDetailPage({ params }: any) {
  const router = useRouter();
  const [productId, setProductId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'Uncategorized',
    hsn_code: '',
    price: 0,
    tax_rate: 18.0,
    stock_quantity: 0,
    unit: 'pcs'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.resolve(params).then(p => {
      if (p && p.id) setProductId(p.id);
    });
  }, [params]);

  useEffect(() => {
    if (!productId) return;

    const fetchProduct = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/api/products/${productId}`);
        setFormData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) return;
    setSaving(true);
    try {
      await api.put(`/api/products/${productId}`, {
        ...formData,
        price: Number(formData.price),
        tax_rate: Number(formData.tax_rate),
        stock_quantity: Number(formData.stock_quantity)
      });
      router.push('/products');
    } catch (err) {
      console.error(err);
      alert('Failed to update product details');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      try {
        await api.delete(`/api/products/${productId}`);
        router.push('/products');
      } catch (err) {
        console.error(err);
        alert('Failed to delete product.');
      }
    }
  };

  if (loading || !productId) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="w-8 h-8 border-2 border-vodacom-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-vodacom-surface border border-white/5 p-8 rounded-2xl shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/products')}
            className="text-vodacom-muted hover:text-white p-1 rounded-lg transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white tracking-wide">Edit Product / Service</h1>
            <p className="text-xs text-vodacom-muted">Update pricing, description, tax rate, and stock counts</p>
          </div>
        </div>
        <button
          onClick={handleDelete}
          className="px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-bold rounded-lg transition-colors"
        >
          Delete Product
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">Product Name</label>
            <input
              required
              type="text"
              className="w-full bg-vodacom-darker/60 border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue focus:border-vodacom-blue transition-all duration-200"
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
              <option value="Uncategorized">Uncategorized</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">Description (Optional)</label>
          <textarea
            rows={2}
            className="w-full bg-vodacom-darker/60 border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue focus:border-vodacom-blue transition-all duration-200"
            value={formData.description || ''}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">HSN Code (Optional)</label>
            <input
              type="text"
              className="w-full bg-vodacom-darker/60 border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue focus:border-vodacom-blue transition-all duration-200 font-mono"
              value={formData.hsn_code || ''}
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
              value={formData.price}
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
            <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">Adjust Stock Quantity</label>
            <input
              required
              type="number"
              min="0"
              className="w-full bg-vodacom-darker/60 border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue focus:border-vodacom-blue transition-all duration-200"
              value={formData.stock_quantity}
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
            className="px-5 py-2.5 bg-vodacom-green hover:bg-emerald-500 text-white rounded-xl transition-all duration-200 shadow-lg shadow-vodacom-green/15 flex items-center justify-center gap-1.5 border-none cursor-pointer"
          >
            <Save size={14} />
            <span>{saving ? 'Saving...' : 'Update Product'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
