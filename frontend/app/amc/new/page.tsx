'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Plus, Trash2, Package, Search } from 'lucide-react';
import { useCustomers } from '../../../hooks/useCustomers';
import { useProducts } from '../../../hooks/useProducts';
import api from '../../../lib/api';

export default function NewAmcPage() {
  const router = useRouter();
  const { customers, loading: custLoading } = useCustomers();
  const { products, loading: prodLoading } = useProducts();

  const [formData, setFormData] = useState({
    customer_id: '',
    contract_number: '',
    start_date: '',
    end_date: '',
    amount: 0,
    status: 'active',
    notes: ''
  });

  // Enlisted AMC Items
  const [items, setItems] = useState<any[]>([]);
  const [prodSearchQuery, setProdSearchQuery] = useState<string>('');
  const [selectedProdId, setSelectedProdId] = useState<string>('');
  const [customProdName, setCustomProdName] = useState<string>('');
  const [itemQty, setItemQty] = useState<number>(1);
  const [itemUnitPrice, setItemUnitPrice] = useState<number>(0);

  const [saving, setSaving] = useState(false);

  const filteredProducts = products.filter((p: any) =>
    p.name.toLowerCase().includes(prodSearchQuery.toLowerCase()) ||
    (p.category && p.category.toLowerCase().includes(prodSearchQuery.toLowerCase())) ||
    (p.sku && p.sku.toLowerCase().includes(prodSearchQuery.toLowerCase()))
  );

  const handleAddProductItem = () => {
    let name = customProdName;
    let prodId: number | null = null;

    if (selectedProdId) {
      const p = products.find((prod: any) => prod.id === Number(selectedProdId));
      if (p) {
        name = p.name;
        prodId = p.id;
      }
    }

    if (!name.trim()) {
      alert('Please select a product from inventory or enter a custom product name.');
      return;
    }

    const total = itemQty * itemUnitPrice;
    const newItem = {
      product_id: prodId,
      product_name: name,
      quantity: itemQty,
      unit_price: itemUnitPrice,
      total_amount: total
    };

    const nextItems = [...items, newItem];
    setItems(nextItems);

    // Auto update total contract amount
    const newTotalAmount = nextItems.reduce((acc, it) => acc + it.total_amount, 0);
    setFormData(prev => ({ ...prev, amount: newTotalAmount }));

    // Reset item inputs
    setSelectedProdId('');
    setCustomProdName('');
    setItemQty(1);
    setItemUnitPrice(0);
  };

  const handleRemoveItem = (index: number) => {
    const nextItems = items.filter((_, i) => i !== index);
    setItems(nextItems);
    const newTotalAmount = nextItems.reduce((acc, it) => acc + it.total_amount, 0);
    setFormData(prev => ({ ...prev, amount: newTotalAmount }));
  };

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
        items: items
      });
      router.push('/amc');
    } catch (err) {
      console.error(err);
      alert('Failed to save AMC Contract.');
    } finally {
      setSaving(false);
    }
  };

  if (custLoading || prodLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="w-8 h-8 border-2 border-vodacom-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto bg-vodacom-surface border border-white/5 p-8 rounded-2xl shadow-2xl space-y-6">
      <div>
        <h1 className="text-lg font-bold text-white tracking-wide mb-1 flex items-center gap-2">
          <ShieldCheck size={20} className="text-vodacom-green" />
          <span>Create AMC Contract &amp; Enlist Covered Inventory Items</span>
        </h1>
        <p className="text-xs text-vodacom-muted">Enlist products from inventory under AMC coverage with quantity &amp; contract pricing</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">Client Customer</label>
          <select
            required
            className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue transition-all"
            value={formData.customer_id}
            onChange={e => setFormData({ ...formData, customer_id: e.target.value })}
          >
            <option value="">-- Choose Customer --</option>
            {customers.map((c: any) => (
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
              className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue transition-all font-mono"
              placeholder="e.g. AMC-2026-VTC-001"
              value={formData.contract_number}
              onChange={e => setFormData({ ...formData, contract_number: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">Status</label>
            <select
              className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue transition-all"
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
              className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue transition-all"
              value={formData.start_date}
              onChange={e => setFormData({ ...formData, start_date: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">End Date</label>
            <input
              required
              type="date"
              className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue transition-all"
              value={formData.end_date}
              onChange={e => setFormData({ ...formData, end_date: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">Total Contract Value (₹)</label>
            <input
              required
              type="number"
              min="0"
              className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue transition-all font-mono font-bold"
              placeholder="0.00"
              value={formData.amount || ''}
              onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
            />
          </div>
        </div>

        {/* ── Enlist Inventory Products Under AMC ── */}
        <div className="p-5 bg-vodacom-darker/60 border border-white/10 rounded-2xl space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Package size={15} className="text-vodacom-blue" />
              <span>Enlist Covered Inventory Products</span>
            </h3>
            <span className="text-[10px] text-vodacom-muted font-mono">{items.length} items added</span>
          </div>

          {/* Product Search & Filter Bar */}
          <div className="space-y-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-3 text-vodacom-muted" />
              <input
                type="text"
                placeholder="Search inventory products by name, category, or SKU..."
                className="w-full pl-9 pr-4 py-2.5 bg-vodacom-surface border border-white/10 rounded-xl text-xs text-white placeholder-vodacom-muted focus:outline-none focus:ring-1 focus:ring-vodacom-blue transition-all"
                value={prodSearchQuery}
                onChange={e => setProdSearchQuery(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-5">
                <label className="block text-[10px] font-bold text-vodacom-muted uppercase tracking-wider mb-1">
                  Select Product ({filteredProducts.length} matched)
                </label>
                <select
                  className="w-full bg-vodacom-surface border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue"
                  value={selectedProdId}
                  onChange={e => {
                    const pid = e.target.value;
                    setSelectedProdId(pid);
                    if (pid) {
                      const p = products.find((prod: any) => prod.id === Number(pid));
                      if (p) {
                        setCustomProdName(p.name);
                        setItemUnitPrice(p.price || 0);
                      }
                    }
                  }}
                >
                  <option value="">-- Choose from Inventory ({filteredProducts.length}) --</option>
                  {filteredProducts.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.category || 'General'}) - ₹{p.price}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-vodacom-muted uppercase tracking-wider mb-1">Qty</label>
                <input
                  type="number"
                  min="1"
                  className="w-full bg-vodacom-surface border border-white/10 rounded-xl p-2.5 text-xs text-white text-center focus:outline-none focus:ring-1 focus:ring-vodacom-blue"
                  value={itemQty}
                  onChange={e => setItemQty(parseInt(e.target.value) || 1)}
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[10px] font-bold text-vodacom-muted uppercase tracking-wider mb-1">Unit Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  className="w-full bg-vodacom-surface border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue font-mono"
                  value={itemUnitPrice}
                  onChange={e => setItemUnitPrice(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={handleAddProductItem}
                  className="w-full py-2.5 bg-vodacom-blue hover:bg-blue-600 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1 border-none cursor-pointer"
                >
                  <Plus size={14} /> Add
                </button>
              </div>
            </div>
          </div>

          {/* Enlisted Items Table */}
          {items.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-white/5">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 text-vodacom-muted font-bold uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-2.5">Product Name</th>
                    <th className="px-4 py-2.5 text-center">Qty</th>
                    <th className="px-4 py-2.5 text-right">Unit Price</th>
                    <th className="px-4 py-2.5 text-right">Total</th>
                    <th className="px-4 py-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-200">
                  {items.map((it, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-2.5 font-semibold text-white">{it.product_name}</td>
                      <td className="px-4 py-2.5 text-center font-mono">{it.quantity}</td>
                      <td className="px-4 py-2.5 text-right font-mono">₹{it.unit_price.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-400">
                        ₹{it.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-vodacom-muted hover:text-red-400 p-1 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">Notes (Optional)</label>
          <textarea
            rows={3}
            className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue transition-all"
            placeholder="Include serial numbers of covered servers, SLA guarantees, or special visit frequencies..."
            value={formData.notes}
            onChange={e => setFormData({ ...formData, notes: e.target.value })}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 text-[12px] font-bold uppercase tracking-wider">
          <button
            type="button"
            onClick={() => router.push('/amc')}
            className="px-5 py-2.5 border border-white/10 hover:bg-white/5 text-vodacom-text rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-vodacom-green hover:bg-emerald-500 text-white rounded-xl transition-all shadow-lg shadow-vodacom-green/15"
          >
            {saving ? 'Creating...' : 'Create Contract'}
          </button>
        </div>
      </form>
    </div>
  );
}
