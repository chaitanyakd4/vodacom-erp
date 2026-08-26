'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, ClipboardList, Download, Trash2, Check, X, Edit3,
  Package, MapPin, CreditCard, Truck, Plus, Save
} from 'lucide-react';
import api from '../../../lib/api';
import { Badge } from '../../../components/ui/Badge';

const INFO_ROW = "flex justify-between items-start py-2 border-b border-white/5 last:border-0";
const LABEL_CLS = "text-[10px] font-bold text-vodacom-muted uppercase tracking-wider";
const VALUE_CLS = "text-[12px] text-slate-200 text-right max-w-[60%]";

export default function PurchaseOrderDetailPage({ params }: any) {
  const router = useRouter();
  const [poId, setPoId] = useState<string | null>(null);
  const [po, setPo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState<any>({
    receiver_name: '',
    receiver_address: '',
    receiver_gstin: '',
    receiver_state: '',
    receiver_state_code: '',
    payment_terms: '',
    consignee_name: '',
    consignee_address: '',
    consignee_gstin: '',
    consignee_state: '',
    consignee_state_code: '',
    reverse_charge: false,
    invoice_ref: '',
    transportation_mode: '',
    vehicle_no: '',
    date_of_supply: '',
    place_of_supply: '',
    other_reference: '',
    tax_rate: 18.0,
    notes: '',
    status: 'draft',
    items: []
  });

  useEffect(() => {
    Promise.resolve(params).then(p => { if (p?.id) setPoId(p.id); });
  }, [params]);

  const fetchPo = async () => {
    if (!poId) return;
    setLoading(true);
    try {
      const res = await api.get(`/api/purchase-orders/${poId}`);
      setPo(res.data);
    } catch {
      alert('Purchase Order not found');
      router.push('/purchase-orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPo(); }, [poId]);

  const startEditing = () => {
    if (!po) return;
    setEditForm({
      receiver_name: po.receiver_name || '',
      receiver_address: po.receiver_address || '',
      receiver_gstin: po.receiver_gstin || '',
      receiver_state: po.receiver_state || '',
      receiver_state_code: po.receiver_state_code || '',
      payment_terms: po.payment_terms || '',
      consignee_name: po.consignee_name || '',
      consignee_address: po.consignee_address || '',
      consignee_gstin: po.consignee_gstin || '',
      consignee_state: po.consignee_state || '',
      consignee_state_code: po.consignee_state_code || '',
      reverse_charge: po.reverse_charge || false,
      invoice_ref: po.invoice_ref || '',
      transportation_mode: po.transportation_mode || '',
      vehicle_no: po.vehicle_no || '',
      date_of_supply: po.date_of_supply ? po.date_of_supply.split('T')[0] : '',
      place_of_supply: po.place_of_supply || '',
      other_reference: po.other_reference || '',
      tax_rate: po.tax_rate || 18.0,
      notes: po.notes || '',
      status: po.status || 'draft',
      items: (po.items || []).map((it: any) => ({
        product_id: it.product_id || null,
        description: it.description || '',
        hsn_sac: it.hsn_sac || '',
        uom: it.uom || 'Nos',
        quantity: it.quantity || 1,
        rate: it.rate || 0,
        tax_rate: it.tax_rate || po.tax_rate || 18.0,
        total_amount: it.total_amount || 0
      }))
    });
    setIsEditing(true);
  };

  const handleEditItemChange = (index: number, field: string, value: any) => {
    const items = [...editForm.items];
    const item = { ...items[index], [field]: value };
    const q = Number(item.quantity) || 0;
    const r = Number(item.rate) || 0;
    item.total_amount = Math.round(q * r * 100) / 100;
    items[index] = item;
    setEditForm({ ...editForm, items });
  };

  const handleAddEditItem = () => {
    const newItem = {
      product_id: null,
      description: '',
      hsn_sac: '',
      uom: 'Nos',
      quantity: 1,
      rate: 0,
      tax_rate: editForm.tax_rate || 18.0,
      total_amount: 0
    };
    setEditForm({ ...editForm, items: [...editForm.items, newItem] });
  };

  const handleRemoveEditItem = (index: number) => {
    if (editForm.items.length === 1) {
      alert('PO must have at least one line item.');
      return;
    }
    setEditForm({ ...editForm, items: editForm.items.filter((_: any, i: number) => i !== index) });
  };

  const calculateEditTotals = () => {
    let subtotal = 0;
    let totalQty = 0;
    (editForm.items || []).forEach((it: any) => {
      const q = Number(it.quantity) || 0;
      const r = Number(it.rate) || 0;
      totalQty += q;
      subtotal += q * r;
    });
    const taxRate = Number(editForm.tax_rate) || 18.0;
    const taxAmount = subtotal * (taxRate / 100);
    return {
      totalQty,
      subtotal: Math.round(subtotal * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      grandTotal: Math.round((subtotal + taxAmount) * 100) / 100
    };
  };

  const handleSavePoEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poId) return;
    if (!editForm.receiver_name.trim()) {
      alert('Supplier (Receiver) Name is required.');
      return;
    }
    if (editForm.items.length === 0) {
      alert('At least one item is required.');
      return;
    }

    setSavingEdit(true);
    try {
      const payload = {
        ...editForm,
        date_of_supply: editForm.date_of_supply ? new Date(editForm.date_of_supply).toISOString() : null,
        tax_rate: Number(editForm.tax_rate) || 18.0,
        items: editForm.items.map((it: any) => ({
          product_id: it.product_id ? Number(it.product_id) : null,
          description: it.description.trim() || 'Item',
          hsn_sac: it.hsn_sac.trim() || '',
          uom: it.uom || 'Nos',
          quantity: Number(it.quantity) || 1,
          rate: Number(it.rate) || 0,
          tax_rate: Number(it.tax_rate) || Number(editForm.tax_rate) || 18.0,
          total_amount: Math.round((Number(it.quantity) || 1) * (Number(it.rate) || 0) * 100) / 100
        }))
      };

      const res = await api.put(`/api/purchase-orders/${poId}`, payload);
      setPo(res.data);
      setIsEditing(false);
      alert('✅ Purchase Order updated successfully!');
      fetchPo();
    } catch (err: any) {
      console.error('Failed to update PO:', err);
      alert('Failed to save PO changes.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDownload = async () => {
    if (!po) return;
    setDownloading(true);
    try {
      const res = await api.get(`/api/purchase-orders/${po.id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `PO_${po.po_number.replace(/\//g, '-')}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Failed to download PDF');
    } finally {
      setDownloading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setUpdatingStatus(true);
    try {
      await api.put(`/api/purchase-orders/${po.id}`, { status: newStatus });
      fetchPo();
    } catch {
      alert('Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this Purchase Order permanently?')) return;
    await api.delete(`/api/purchase-orders/${po.id}`);
    router.push('/purchase-orders');
  };

  if (loading || !po) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="w-8 h-8 border-2 border-vodacom-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const statusVariant = (s: string) => {
    switch (s) {
      case 'received': return 'success';
      case 'sent': return 'warning';
      case 'cancelled': return 'danger';
      default: return 'default';
    }
  };

  const isSameState = (po.place_of_supply || '').toLowerCase().includes('delhi') || po.place_of_supply === '';

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/purchase-orders')} className="p-2 rounded-xl bg-white/5 border border-white/10 text-vodacom-muted hover:text-white transition-colors">
            <ArrowLeft size={15} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white font-mono">{po.po_number}</h1>
            <p className="text-[11px] text-vodacom-muted">
              Created {new Date(po.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isEditing ? (
            <>
              <Badge variant={statusVariant(po.status) as any}>{po.status}</Badge>
              <button
                type="button"
                onClick={startEditing}
                className="flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-bold uppercase rounded-xl transition-all"
              >
                <Edit3 size={13} className="text-amber-400" /> Edit PO
              </button>
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="flex items-center gap-1.5 px-4 py-2 bg-vodacom-blue/20 hover:bg-vodacom-blue/35 text-vodacom-blue border border-vodacom-blue/30 text-xs font-bold uppercase rounded-xl transition-all disabled:opacity-50"
              >
                <Download size={13} />
                {downloading ? 'Downloading...' : 'Download PDF'}
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold uppercase rounded-xl transition-all"
              >
                <Trash2 size={13} /> Delete
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-bold uppercase rounded-xl transition-all"
            >
              <X size={13} /> Cancel Edit
            </button>
          )}
        </div>
      </div>

      {/* ── EDIT MODE VIEW ── */}
      {isEditing ? (
        <form onSubmit={handleSavePoEdit} className="bg-vodacom-surface border border-amber-500/30 rounded-2xl p-6 shadow-2xl space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-white/10">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Edit3 size={16} className="text-amber-400" /> Editing Purchase Order {po.po_number}
              </h2>
              <p className="text-xs text-vodacom-muted">Update supplier, delivery details, items, or taxes and click Save</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 border border-white/10 hover:bg-white/5 text-slate-300 text-xs font-bold uppercase rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingEdit}
                className="px-5 py-2 bg-vodacom-green hover:bg-emerald-500 text-white text-xs font-bold uppercase rounded-xl transition-all shadow-lg shadow-vodacom-green/20 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Save size={14} /> {savingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Supplier / Receiver Details */}
            <div className="p-4 bg-vodacom-darker/60 rounded-xl border border-white/5 space-y-3">
              <h3 className="text-xs font-bold text-vodacom-blue uppercase tracking-wider">Supplier (Billed To)</h3>
              <div>
                <label className="block text-[10px] text-vodacom-muted uppercase mb-1">Company / Supplier Name *</label>
                <input
                  required
                  type="text"
                  className="w-full bg-vodacom-darker border border-white/10 rounded-lg p-2.5 text-xs text-white"
                  value={editForm.receiver_name}
                  onChange={e => setEditForm({ ...editForm, receiver_name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] text-vodacom-muted uppercase mb-1">Address</label>
                <textarea
                  rows={2}
                  className="w-full bg-vodacom-darker border border-white/10 rounded-lg p-2.5 text-xs text-white"
                  value={editForm.receiver_address}
                  onChange={e => setEditForm({ ...editForm, receiver_address: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-vodacom-muted uppercase mb-1">GSTIN</label>
                  <input
                    type="text"
                    className="w-full bg-vodacom-darker border border-white/10 rounded-lg p-2 text-xs text-white font-mono"
                    value={editForm.receiver_gstin}
                    onChange={e => setEditForm({ ...editForm, receiver_gstin: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-vodacom-muted uppercase mb-1">State &amp; Code</label>
                  <input
                    type="text"
                    className="w-full bg-vodacom-darker border border-white/10 rounded-lg p-2 text-xs text-white"
                    placeholder="e.g. Delhi (07)"
                    value={editForm.receiver_state}
                    onChange={e => setEditForm({ ...editForm, receiver_state: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Consignee / Shipping Details */}
            <div className="p-4 bg-vodacom-darker/60 rounded-xl border border-white/5 space-y-3">
              <h3 className="text-xs font-bold text-vodacom-green uppercase tracking-wider">Consignee (Shipped To)</h3>
              <div>
                <label className="block text-[10px] text-vodacom-muted uppercase mb-1">Consignee Name</label>
                <input
                  type="text"
                  className="w-full bg-vodacom-darker border border-white/10 rounded-lg p-2.5 text-xs text-white"
                  value={editForm.consignee_name}
                  onChange={e => setEditForm({ ...editForm, consignee_name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] text-vodacom-muted uppercase mb-1">Delivery Address</label>
                <textarea
                  rows={2}
                  className="w-full bg-vodacom-darker border border-white/10 rounded-lg p-2.5 text-xs text-white"
                  value={editForm.consignee_address}
                  onChange={e => setEditForm({ ...editForm, consignee_address: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-vodacom-muted uppercase mb-1">GSTIN</label>
                  <input
                    type="text"
                    className="w-full bg-vodacom-darker border border-white/10 rounded-lg p-2 text-xs text-white font-mono"
                    value={editForm.consignee_gstin}
                    onChange={e => setEditForm({ ...editForm, consignee_gstin: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-vodacom-muted uppercase mb-1">State</label>
                  <input
                    type="text"
                    className="w-full bg-vodacom-darker border border-white/10 rounded-lg p-2 text-xs text-white"
                    value={editForm.consignee_state}
                    onChange={e => setEditForm({ ...editForm, consignee_state: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Transport & Metadata */}
          <div className="p-4 bg-vodacom-darker/40 rounded-xl border border-white/5 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-[10px] text-vodacom-muted uppercase mb-1">Status</label>
              <select
                className="w-full bg-vodacom-darker border border-white/10 rounded-lg p-2 text-xs text-white"
                value={editForm.status}
                onChange={e => setEditForm({ ...editForm, status: e.target.value })}
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="received">Received</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-vodacom-muted uppercase mb-1">Transport Mode</label>
              <input
                type="text"
                className="w-full bg-vodacom-darker border border-white/10 rounded-lg p-2 text-xs text-white"
                placeholder="By Road / Courier"
                value={editForm.transportation_mode}
                onChange={e => setEditForm({ ...editForm, transportation_mode: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[10px] text-vodacom-muted uppercase mb-1">Vehicle No</label>
              <input
                type="text"
                className="w-full bg-vodacom-darker border border-white/10 rounded-lg p-2 text-xs text-white font-mono"
                value={editForm.vehicle_no}
                onChange={e => setEditForm({ ...editForm, vehicle_no: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[10px] text-vodacom-muted uppercase mb-1">GST Tax Rate %</label>
              <select
                className="w-full bg-vodacom-darker border border-white/10 rounded-lg p-2 text-xs text-white"
                value={editForm.tax_rate}
                onChange={e => setEditForm({ ...editForm, tax_rate: Number(e.target.value) })}
              >
                <option value="0">0%</option>
                <option value="5">5%</option>
                <option value="12">12%</option>
                <option value="18">18%</option>
                <option value="28">28%</option>
              </select>
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold text-vodacom-muted uppercase tracking-wider">Line Items</span>
              <button
                type="button"
                onClick={handleAddEditItem}
                className="px-3 py-1.5 bg-vodacom-blue/10 hover:bg-vodacom-blue/20 border border-vodacom-blue/30 text-vodacom-blue text-xs font-bold rounded-lg flex items-center gap-1 transition-all"
              >
                <Plus size={13} /> Add Item
              </button>
            </div>

            <div className="overflow-x-auto border border-white/10 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-vodacom-darker text-[10px] uppercase text-vodacom-muted">
                  <tr>
                    <th className="p-3">Description</th>
                    <th className="p-3 w-28 text-center">HSN/SAC</th>
                    <th className="p-3 w-20 text-center">UOM</th>
                    <th className="p-3 w-20 text-center">Qty</th>
                    <th className="p-3 w-28 text-right">Rate (₹)</th>
                    <th className="p-3 w-28 text-right">Total (₹)</th>
                    <th className="p-3 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 bg-vodacom-surface/50">
                  {editForm.items.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td className="p-2.5">
                        <input
                          type="text"
                          required
                          className="w-full bg-vodacom-darker border border-white/10 rounded-lg p-2 text-xs text-white"
                          value={item.description}
                          onChange={e => handleEditItemChange(idx, 'description', e.target.value)}
                        />
                      </td>
                      <td className="p-2.5 text-center">
                        <input
                          type="text"
                          className="w-24 bg-vodacom-darker border border-white/10 rounded-lg p-2 text-xs text-white text-center font-mono"
                          value={item.hsn_sac}
                          onChange={e => handleEditItemChange(idx, 'hsn_sac', e.target.value)}
                        />
                      </td>
                      <td className="p-2.5 text-center">
                        <input
                          type="text"
                          className="w-16 bg-vodacom-darker border border-white/10 rounded-lg p-2 text-xs text-white text-center"
                          value={item.uom}
                          onChange={e => handleEditItemChange(idx, 'uom', e.target.value)}
                        />
                      </td>
                      <td className="p-2.5 text-center">
                        <input
                          type="number"
                          min="0.01"
                          step="any"
                          className="w-16 bg-vodacom-darker border border-white/10 rounded-lg p-2 text-xs text-white text-center"
                          value={item.quantity}
                          onChange={e => handleEditItemChange(idx, 'quantity', Number(e.target.value))}
                        />
                      </td>
                      <td className="p-2.5 text-right">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-24 bg-vodacom-darker border border-white/10 rounded-lg p-2 text-xs text-white text-right"
                          value={item.rate}
                          onChange={e => handleEditItemChange(idx, 'rate', Number(e.target.value))}
                        />
                      </td>
                      <td className="p-2.5 text-right font-bold text-white">
                        ₹{(Number(item.quantity || 1) * Number(item.rate || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveEditItem(idx)}
                          className="p-1 text-red-400 hover:bg-red-400/10 rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Edit Totals Summary */}
          {(() => {
            const totals = calculateEditTotals();
            return (
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-4 border-t border-white/10">
                <div className="w-full sm:w-1/2">
                  <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">Notes / Terms</label>
                  <textarea
                    rows={3}
                    className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue"
                    placeholder="PO notes or payment terms..."
                    value={editForm.notes}
                    onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                  />
                </div>
                <div className="w-full sm:w-64 space-y-2 text-xs text-right bg-vodacom-darker/60 p-4 rounded-xl border border-white/5">
                  <div className="flex justify-between text-vodacom-muted">
                    <span>Subtotal:</span>
                    <span className="text-white font-semibold">₹{totals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-vodacom-muted">
                    <span>GST Tax ({editForm.tax_rate}%):</span>
                    <span className="text-white font-semibold">₹{totals.taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-white pt-2 border-t border-white/10">
                    <span>Grand Total:</span>
                    <span className="text-vodacom-blue">₹{totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-5 py-2.5 border border-white/10 hover:bg-white/5 text-slate-300 text-xs font-bold uppercase rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingEdit}
              className="px-6 py-2.5 bg-vodacom-green hover:bg-emerald-500 text-white text-xs font-bold uppercase rounded-xl transition-all shadow-lg shadow-vodacom-green/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save size={15} /> {savingEdit ? 'Saving Changes...' : 'Save PO Changes'}
            </button>
          </div>
        </form>
      ) : (
        <>
      {/* ── Status Actions ── */}
      {po.status !== 'cancelled' && (
        <div className="flex items-center gap-2 p-4 bg-vodacom-surface border border-white/5 rounded-2xl shadow-lg">
          <span className="text-[11px] text-vodacom-muted font-bold uppercase tracking-wider mr-2">Update Status:</span>
          {po.status === 'draft' && (
            <button onClick={() => handleStatusChange('sent')} disabled={updatingStatus}
              className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold uppercase text-amber-400 border border-amber-500/30 hover:bg-amber-500/10 rounded-lg transition-all disabled:opacity-50">
              <Truck size={12} /> Mark as Sent
            </button>
          )}
          {(po.status === 'draft' || po.status === 'sent') && (
            <button onClick={() => handleStatusChange('received')} disabled={updatingStatus}
              className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold uppercase text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10 rounded-lg transition-all disabled:opacity-50">
              <Check size={12} /> Mark as Received
            </button>
          )}
          {po.status !== 'received' && (
            <button onClick={() => handleStatusChange('cancelled')} disabled={updatingStatus}
              className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold uppercase text-red-400 border border-red-500/30 hover:bg-red-500/10 rounded-lg transition-all ml-auto disabled:opacity-50">
              <X size={12} /> Cancel PO
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Supplier Info ── */}
        <div className="bg-vodacom-surface border border-white/5 rounded-2xl p-6 shadow-xl">
          <h2 className="text-[12px] font-bold text-white tracking-wide mb-4 flex items-center gap-2 pb-3 border-b border-white/5">
            <Package size={13} className="text-vodacom-blue" /> Supplier (Billed To)
          </h2>
          <div className="space-y-1">
            <div className={INFO_ROW}><span className={LABEL_CLS}>Name</span><span className={VALUE_CLS}>{po.receiver_name}</span></div>
            <div className={INFO_ROW}><span className={LABEL_CLS}>Address</span><span className={VALUE_CLS}>{po.receiver_address || '—'}</span></div>
            <div className={INFO_ROW}><span className={LABEL_CLS}>GSTIN</span><span className={VALUE_CLS}>{po.receiver_gstin || '—'}</span></div>
            <div className={INFO_ROW}><span className={LABEL_CLS}>State</span><span className={VALUE_CLS}>{po.receiver_state || '—'} {po.receiver_state_code ? `(${po.receiver_state_code})` : ''}</span></div>
            <div className={INFO_ROW}><span className={LABEL_CLS}>Payment</span><span className={VALUE_CLS}>{po.payment_terms || '—'}</span></div>
          </div>
        </div>

        {/* ── Consignee Info ── */}
        <div className="bg-vodacom-surface border border-white/5 rounded-2xl p-6 shadow-xl">
          <h2 className="text-[12px] font-bold text-white tracking-wide mb-4 flex items-center gap-2 pb-3 border-b border-white/5">
            <MapPin size={13} className="text-vodacom-green" /> Consignee (Shipped To)
          </h2>
          <div className="space-y-1">
            <div className={INFO_ROW}><span className={LABEL_CLS}>Name</span><span className={VALUE_CLS}>{po.consignee_name || '—'}</span></div>
            <div className={INFO_ROW}><span className={LABEL_CLS}>Address</span><span className={VALUE_CLS}>{po.consignee_address || '—'}</span></div>
            <div className={INFO_ROW}><span className={LABEL_CLS}>GSTIN</span><span className={VALUE_CLS}>{po.consignee_gstin || '—'}</span></div>
            <div className={INFO_ROW}><span className={LABEL_CLS}>State</span><span className={VALUE_CLS}>{po.consignee_state || '—'}</span></div>
            <div className={INFO_ROW}><span className={LABEL_CLS}>Reference</span><span className={VALUE_CLS}>{po.other_reference || '—'}</span></div>
          </div>
        </div>

        {/* ── Transport & Meta ── */}
        <div className="bg-vodacom-surface border border-white/5 rounded-2xl p-6 shadow-xl">
          <h2 className="text-[12px] font-bold text-white tracking-wide mb-4 flex items-center gap-2 pb-3 border-b border-white/5">
            <Truck size={13} className="text-amber-400" /> Transport &amp; Meta
          </h2>
          <div className="space-y-1">
            <div className={INFO_ROW}><span className={LABEL_CLS}>Rev. Charge</span><span className={VALUE_CLS}>{po.reverse_charge ? 'Yes' : 'No'}</span></div>
            <div className={INFO_ROW}><span className={LABEL_CLS}>Invoice Ref</span><span className={VALUE_CLS}>{po.invoice_ref || '—'}</span></div>
            <div className={INFO_ROW}><span className={LABEL_CLS}>Transport</span><span className={VALUE_CLS}>{po.transportation_mode || '—'}</span></div>
            <div className={INFO_ROW}><span className={LABEL_CLS}>Vehicle No</span><span className={VALUE_CLS}>{po.vehicle_no || '—'}</span></div>
            <div className={INFO_ROW}><span className={LABEL_CLS}>Date of Supply</span><span className={VALUE_CLS}>{po.date_of_supply ? new Date(po.date_of_supply).toLocaleDateString('en-IN') : '—'}</span></div>
            <div className={INFO_ROW}><span className={LABEL_CLS}>Place of Supply</span><span className={VALUE_CLS}>{po.place_of_supply || '—'}</span></div>
          </div>
        </div>
      </div>

      {/* ── Items Table ── */}
      <div className="bg-vodacom-surface border border-white/5 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-white/5">
          <h2 className="text-[13px] font-bold text-white flex items-center gap-2">
            <ClipboardList size={14} className="text-vodacom-blue" />
            Line Items ({po.items?.length || 0})
          </h2>
        </div>
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-white/5 text-vodacom-muted font-bold uppercase tracking-wider text-[10px] bg-vodacom-darker/40">
              <th className="px-4 py-3 text-center w-10">Sr</th>
              <th className="px-4 py-3 text-left">Product / Service</th>
              <th className="px-4 py-3 text-center">HSN/SAC</th>
              <th className="px-4 py-3 text-center">UOM</th>
              <th className="px-4 py-3 text-right">Qty</th>
              <th className="px-4 py-3 text-right">Rate (₹)</th>
              <th className="px-4 py-3 text-right">GST %</th>
              <th className="px-4 py-3 text-right">Total (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {(po.items || []).map((item: any, idx: number) => (
              <tr key={item.id} className="hover:bg-white/5 transition-colors">
                <td className="px-4 py-3 text-center text-vodacom-muted">{idx + 1}</td>
                <td className="px-4 py-3">
                  <div className="text-white font-semibold">{item.description}</div>
                </td>
                <td className="px-4 py-3 text-center text-vodacom-muted font-mono">{item.hsn_sac || '—'}</td>
                <td className="px-4 py-3 text-center text-vodacom-muted">{item.uom}</td>
                <td className="px-4 py-3 text-right text-slate-300">{item.quantity.toLocaleString('en-IN')}</td>
                <td className="px-4 py-3 text-right text-slate-300">₹{item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td className="px-4 py-3 text-right text-slate-300">{item.tax_rate}%</td>
                <td className="px-4 py-3 text-right font-bold text-white">₹{item.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals Footer */}
        <div className="border-t border-white/10 bg-vodacom-darker/40 px-6 py-4">
          <div className="flex justify-end">
            <div className="w-72 space-y-2 text-[12px]">
              <div className="flex justify-between text-vodacom-muted">
                <span>Subtotal (Before Tax)</span>
                <span className="font-semibold text-white">₹{(po.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              {isSameState ? (
                <>
                  <div className="flex justify-between text-vodacom-muted">
                    <span>CGST {(po.tax_rate || 18) / 2}%</span>
                    <span>₹{(po.cgst_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-vodacom-muted">
                    <span>SGST {(po.tax_rate || 18) / 2}%</span>
                    <span>₹{(po.sgst_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-vodacom-muted">
                  <span>IGST {po.tax_rate || 18}%</span>
                  <span>₹{(po.igst_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between text-white font-extrabold text-[15px] pt-2 border-t border-white/10">
                <span>Grand Total</span>
                <span className="text-vodacom-blue">₹{(po.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      {po.notes && (
        <div className="bg-vodacom-surface border border-white/5 rounded-2xl p-6 shadow-xl">
          <h2 className="text-[12px] font-bold text-vodacom-muted uppercase tracking-wider mb-2">Notes</h2>
          <p className="text-[13px] text-slate-300 leading-relaxed">{po.notes}</p>
        </div>
      )}
      </>
      )}
    </div>
  );
}
