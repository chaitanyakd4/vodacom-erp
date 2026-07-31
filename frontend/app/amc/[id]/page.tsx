'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ShieldCheck, Save, RefreshCw, Ban, AlertTriangle, X, Package, Plus, Trash2, Search } from 'lucide-react';
import api from '../../../lib/api';
import { useProducts } from '../../../hooks/useProducts';
import { Badge } from '../../../components/ui/Badge';

export default function AmcDetailPage({ params }: any) {
  const router = useRouter();
  const { products } = useProducts();
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
  const [items, setItems] = useState<any[]>([]);
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

  // Add Product to Existing AMC Modal State
  const [showAddProdModal, setShowAddProdModal] = useState(false);
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [addProdForm, setAddProdForm] = useState({
    product_id: '',
    product_name: '',
    quantity: 1,
    unit_price: 0,
    increase_contract_amount: true
  });
  const [addingProduct, setAddingProduct] = useState(false);

  const modalFilteredProducts = products.filter((p: any) =>
    p.name.toLowerCase().includes(modalSearchQuery.toLowerCase()) ||
    (p.category && p.category.toLowerCase().includes(modalSearchQuery.toLowerCase())) ||
    (p.sku && p.sku.toLowerCase().includes(modalSearchQuery.toLowerCase()))
  );

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
      setItems(amcData.items || []);

      // Prepare default renewal dates
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

  const handleAddProductToAmc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amcId) return;

    let pName = addProdForm.product_name;
    let pId: number | null = null;

    if (addProdForm.product_id) {
      const p = products.find((prod: any) => prod.id === Number(addProdForm.product_id));
      if (p) {
        pName = p.name;
        pId = p.id;
      }
    }

    if (!pName.trim()) {
      alert('Please select or enter a product name.');
      return;
    }

    setAddingProduct(true);
    try {
      await api.post(`/api/amc/${amcId}/add-product`, {
        product_id: pId,
        product_name: pName,
        quantity: Number(addProdForm.quantity),
        unit_price: Number(addProdForm.unit_price),
        increase_contract_amount: addProdForm.increase_contract_amount
      });
      setShowAddProdModal(false);
      setAddProdForm({ product_id: '', product_name: '', quantity: 1, unit_price: 0, increase_contract_amount: true });
      setModalSearchQuery('');
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to add product to AMC coverage.');
    } finally {
      setAddingProduct(false);
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!amcId) return;
    if (confirm('Remove this covered item from AMC coverage?')) {
      try {
        await api.delete(`/api/amc/${amcId}/items/${itemId}`);
        fetchData();
      } catch (err) {
        console.error(err);
        alert('Failed to remove item.');
      }
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
    <div className="max-w-4xl mx-auto space-y-6">
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
          <button
            onClick={() => setShowAddProdModal(true)}
            className="bg-vodacom-blue hover:bg-blue-600 text-white text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-xl transition-all shadow-lg flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} />
            <span>Add Covered Product</span>
          </button>

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

      {/* Contract Detail Card */}
      <div className="bg-vodacom-surface border border-white/5 p-8 rounded-2xl shadow-2xl space-y-6">
        <div className="flex justify-between items-start pb-4 border-b border-white/5">
          <h1 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
            <ShieldCheck size={20} className="text-vodacom-green" />
            <span>Contract #{formData.contract_number}</span>
          </h1>
          <Badge variant={isActive ? 'success' : isExpired ? 'warning' : 'danger'}>
            {formData.status}
          </Badge>
        </div>

        {customer && (
          <div className="p-4 bg-vodacom-darker/60 border border-white/5 rounded-xl text-xs space-y-1">
            <div className="text-[10px] font-bold text-vodacom-muted uppercase tracking-wider">Client Customer Account</div>
            <div className="text-white font-semibold pt-0.5">{customer.company_name}</div>
            <div className="text-vodacom-muted">Contact: {customer.contact_person} | Phone: {customer.phone}</div>
          </div>
        )}

        {/* ── Covered Inventory Products Section ── */}
        <div className="p-6 bg-vodacom-darker/60 border border-white/10 rounded-2xl space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                <Package size={16} className="text-vodacom-blue" />
                <span>Covered Inventory Products under AMC</span>
              </h2>
              <p className="text-[10px] text-vodacom-muted mt-0.5">Enlisted hardware and products covered by this service contract</p>
            </div>
            <button
              onClick={() => setShowAddProdModal(true)}
              className="px-3 py-1.5 bg-vodacom-blue/20 hover:bg-vodacom-blue/30 border border-vodacom-blue/40 text-vodacom-blue hover:text-white text-xs font-bold uppercase rounded-lg transition-all flex items-center gap-1 cursor-pointer"
            >
              <Plus size={13} />
              <span>Add Product</span>
            </button>
          </div>

          {items.length === 0 ? (
            <div className="py-6 text-center text-xs text-vodacom-muted border border-dashed border-white/5 rounded-xl">
              No specific inventory products enlisted yet under this contract. Click <strong>Add Product</strong> above to add hardware coverage.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/5">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 text-vodacom-muted font-bold uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Product Name</th>
                    <th className="px-4 py-3 text-center">Qty</th>
                    <th className="px-4 py-3 text-right">Unit Price</th>
                    <th className="px-4 py-3 text-right">Total Price</th>
                    <th className="px-4 py-3 text-center">Date Added</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-200">
                  {items.map(it => (
                    <tr key={it.id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3 font-semibold text-white">{it.product_name}</td>
                      <td className="px-4 py-3 text-center font-mono">{it.quantity}</td>
                      <td className="px-4 py-3 text-right font-mono">₹{it.unit_price?.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">
                        ₹{it.total_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-center text-vodacom-muted font-mono text-[11px]">
                        {it.added_date ? new Date(it.added_date).toLocaleDateString('en-IN') : 'Original'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleDeleteItem(it.id)}
                          className="text-vodacom-muted hover:text-red-400 p-1 transition-colors"
                          title="Remove item"
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

        {/* Contract Edit Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">Contract Number</label>
              <input
                required
                type="text"
                className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue transition-all font-mono"
                value={formData.contract_number}
                onChange={e => setFormData({ ...formData, contract_number: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">Status Category</label>
              <select
                className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue transition-all"
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
              <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">Contract Value (₹)</label>
              <input
                required
                type="number"
                min="0"
                className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue transition-all font-mono font-bold"
                value={formData.amount}
                onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">Notes, History &amp; Price Adjustment Log</label>
            <textarea
              rows={4}
              className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue transition-all font-mono leading-relaxed"
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
              className="px-5 py-2.5 bg-vodacom-green hover:bg-emerald-500 text-white rounded-xl transition-all shadow-lg shadow-vodacom-green/15 flex items-center justify-center gap-1.5 border-none cursor-pointer"
            >
              <Save size={14} />
              <span>{saving ? 'Saving...' : 'Update Contract'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* ── Add Product to AMC Coverage Modal ── */}
      {showAddProdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowAddProdModal(false)} />

          <div className="relative w-full max-w-md bg-vodacom-surface border border-white/10 rounded-2xl shadow-2xl p-6 overflow-hidden z-10 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center pb-4 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <Plus size={18} className="text-vodacom-blue" />
                <h3 className="text-base font-bold text-white">Add Product to AMC Coverage</h3>
              </div>
              <button
                onClick={() => setShowAddProdModal(false)}
                className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-vodacom-muted hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddProductToAmc} className="space-y-4">
              
              {/* Product Search Bar */}
              <div>
                <label className="block text-[10px] font-bold text-vodacom-muted uppercase tracking-wider mb-1">Search Inventory</label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-2.5 text-vodacom-muted" />
                  <input
                    type="text"
                    placeholder="Search by product name, category, SKU..."
                    className="w-full pl-9 pr-3 py-2 bg-vodacom-darker border border-white/10 rounded-xl text-xs text-white placeholder-vodacom-muted focus:outline-none focus:border-vodacom-blue"
                    value={modalSearchQuery}
                    onChange={e => setModalSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-vodacom-muted uppercase tracking-wider mb-1">
                  Pick Inventory Product ({modalFilteredProducts.length} matched)
                </label>
                <select
                  className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-vodacom-blue"
                  value={addProdForm.product_id}
                  onChange={e => {
                    const pid = e.target.value;
                    if (pid) {
                      const p = products.find((prod: any) => prod.id === Number(pid));
                      if (p) {
                        setAddProdForm({
                          ...addProdForm,
                          product_id: pid,
                          product_name: p.name,
                          unit_price: p.price || 0
                        });
                      }
                    } else {
                      setAddProdForm({ ...addProdForm, product_id: '', product_name: '', unit_price: 0 });
                    }
                  }}
                >
                  <option value="">-- Choose from Inventory ({modalFilteredProducts.length}) --</option>
                  {modalFilteredProducts.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.category || 'General'}) - ₹{p.price}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-vodacom-muted uppercase tracking-wider mb-1">Product Name</label>
                <input
                  required
                  type="text"
                  className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-vodacom-blue"
                  value={addProdForm.product_name}
                  onChange={e => setAddProdForm({ ...addProdForm, product_name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-vodacom-muted uppercase tracking-wider mb-1">Quantity</label>
                  <input
                    required
                    type="number"
                    min="1"
                    className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-2.5 text-xs text-white text-center focus:outline-none focus:border-vodacom-blue"
                    value={addProdForm.quantity}
                    onChange={e => setAddProdForm({ ...addProdForm, quantity: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-vodacom-muted uppercase tracking-wider mb-1">Unit Price (₹)</label>
                  <input
                    required
                    type="number"
                    min="0"
                    className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-vodacom-blue font-mono"
                    value={addProdForm.unit_price}
                    onChange={e => setAddProdForm({ ...addProdForm, unit_price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="p-3 bg-vodacom-blue/10 border border-vodacom-blue/20 rounded-xl">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-white/20 text-vodacom-blue focus:ring-vodacom-blue"
                    checked={addProdForm.increase_contract_amount}
                    onChange={e => setAddProdForm({ ...addProdForm, increase_contract_amount: e.target.checked })}
                  />
                  <span className="text-xs text-white font-medium">
                    Automatically increase total contract pricing by <strong>₹{(addProdForm.quantity * addProdForm.unit_price).toLocaleString('en-IN')}</strong> and log date
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddProdModal(false)}
                  className="px-4 py-2 border border-white/10 hover:bg-white/5 text-slate-300 text-xs font-bold uppercase rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingProduct}
                  className="px-5 py-2 bg-vodacom-blue hover:bg-blue-600 text-white text-xs font-bold uppercase rounded-xl transition-all shadow-lg disabled:opacity-50"
                >
                  {addingProduct ? 'Adding...' : 'Add Covered Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
