'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, FileText, CheckCircle, Edit3, Trash2, Plus, Save, X, Truck, Package, MapPin } from 'lucide-react';
import api from '../../../lib/api';
import { Badge } from '../../../components/ui/Badge';

export default function ChallanDetailPage({ params }: any) {
  const router = useRouter();
  const [challanId, setChallanId] = useState<string | null>(null);
  const [challan, setChallan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [marking, setMarking] = useState(false);

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
    notes: '',
    status: 'draft',
    items: []
  });

  useEffect(() => {
    Promise.resolve(params).then(p => {
      if (p && p.id) setChallanId(p.id);
    });
  }, [params]);

  const fetchChallan = () => {
    if (!challanId) return;
    setLoading(true);
    api.get(`/api/challan/${challanId}`)
      .then(r => setChallan(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchChallan();
  }, [challanId]);

  const startEditing = () => {
    if (!challan) return;
    setEditForm({
      receiver_name: challan.receiver_name || '',
      receiver_address: challan.receiver_address || '',
      receiver_gstin: challan.receiver_gstin || '',
      receiver_state: challan.receiver_state || '',
      receiver_state_code: challan.receiver_state_code || '',
      payment_terms: challan.payment_terms || '',
      consignee_name: challan.consignee_name || '',
      consignee_address: challan.consignee_address || '',
      consignee_gstin: challan.consignee_gstin || '',
      consignee_state: challan.consignee_state || '',
      consignee_state_code: challan.consignee_state_code || '',
      reverse_charge: challan.reverse_charge || false,
      invoice_ref: challan.invoice_ref || '',
      transportation_mode: challan.transportation_mode || '',
      vehicle_no: challan.vehicle_no || '',
      date_of_supply: challan.date_of_supply ? challan.date_of_supply.split('T')[0] : '',
      place_of_supply: challan.place_of_supply || '',
      other_reference: challan.other_reference || '',
      notes: challan.notes || '',
      status: challan.status || 'draft',
      items: (challan.items || []).map((it: any) => ({
        product_id: it.product_id || null,
        description: it.description || '',
        hsn_sac: it.hsn_sac || '',
        uom: it.uom || 'Nos',
        quantity: it.quantity || 1,
        rate: it.rate || 0,
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
      total_amount: 0
    };
    setEditForm({ ...editForm, items: [...editForm.items, newItem] });
  };

  const handleRemoveEditItem = (index: number) => {
    if (editForm.items.length === 1) {
      alert('Challan must have at least one line item.');
      return;
    }
    setEditForm({ ...editForm, items: editForm.items.filter((_: any, i: number) => i !== index) });
  };

  const calculateEditTotals = () => {
    let totalAmount = 0;
    let totalQty = 0;
    (editForm.items || []).forEach((it: any) => {
      const q = Number(it.quantity) || 0;
      const r = Number(it.rate) || 0;
      totalQty += q;
      totalAmount += q * r;
    });
    return {
      totalQty,
      totalAmount: Math.round(totalAmount * 100) / 100
    };
  };

  const handleSaveChallanEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challanId) return;
    if (!editForm.receiver_name.trim()) {
      alert('Receiver Name is required.');
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
        items: editForm.items.map((it: any) => ({
          product_id: it.product_id ? Number(it.product_id) : null,
          description: it.description.trim() || 'Item',
          hsn_sac: it.hsn_sac.trim() || '',
          uom: it.uom || 'Nos',
          quantity: Number(it.quantity) || 1,
          rate: Number(it.rate) || 0,
          total_amount: Math.round((Number(it.quantity) || 1) * (Number(it.rate) || 0) * 100) / 100
        }))
      };

      const res = await api.put(`/api/challan/${challanId}`, payload);
      setChallan(res.data);
      setIsEditing(false);
      alert('✅ Delivery Challan updated successfully!');
      fetchChallan();
    } catch (err: any) {
      console.error('Failed to update Challan:', err);
      alert('Failed to save Challan changes.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDownload = async () => {
    if (!challanId) return;
    setDownloading(true);
    try {
      const res = await api.get(`/api/challan/${challanId}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `Challan_${challan.challan_number.replace(/\//g, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Failed to download PDF');
    } finally {
      setDownloading(false);
    }
  };

  const handleMarkDelivered = async () => {
    if (!challanId) return;
    setMarking(true);
    try {
      const res = await api.put(`/api/challan/${challanId}`, { status: 'delivered' });
      setChallan(res.data);
    } catch {
      alert('Failed to update status');
    } finally {
      setMarking(false);
    }
  };

  if (loading || !challanId) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="w-8 h-8 border-2 border-vodacom-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!challan) {
    return (
      <div className="text-center py-12 bg-vodacom-surface/10 rounded-2xl">
        <p className="text-xs text-vodacom-muted">Challan not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <button onClick={() => router.push('/challan')} className="text-vodacom-muted hover:text-white p-1 rounded-lg">
            <ArrowLeft size={16} />
          </button>
          <span className="text-xs text-vodacom-muted">Back to challans</span>
        </div>
        
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <>
              <button
                type="button"
                onClick={startEditing}
                className="border border-white/10 bg-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-1.5"
              >
                <Edit3 size={14} className="text-amber-400" />
                <span>Edit Challan</span>
              </button>

              <button
                onClick={handleDownload}
                disabled={downloading}
                className="border border-vodacom-blue/30 bg-vodacom-blue/10 hover:bg-vodacom-blue/20 text-vodacom-blue text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-1.5 disabled:opacity-50"
              >
                <Download size={14} />
                {downloading ? 'Downloading...' : 'Download PDF'}
              </button>

              {challan.status !== 'delivered' && (
                <button
                  onClick={handleMarkDelivered}
                  disabled={marking}
                  className="bg-vodacom-green hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-lg"
                >
                  <CheckCircle size={14} />
                  {marking ? 'Updating...' : 'Mark Delivered'}
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-1.5"
            >
              <X size={14} />
              <span>Cancel Edit</span>
            </button>
          )}
        </div>
      </div>

      {/* ── EDIT MODE VIEW ── */}
      {isEditing ? (
        <form onSubmit={handleSaveChallanEdit} className="bg-vodacom-surface border border-amber-500/30 rounded-2xl p-6 shadow-2xl space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-white/10">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Edit3 size={16} className="text-amber-400" /> Editing Delivery Challan {challan.challan_number}
              </h2>
              <p className="text-xs text-vodacom-muted">Update receiver, consignee, delivery items, or transport details</p>
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
            {/* Receiver / Billed To */}
            <div className="p-4 bg-vodacom-darker/60 rounded-xl border border-white/5 space-y-3">
              <h3 className="text-xs font-bold text-vodacom-blue uppercase tracking-wider">Receiver (Billed To)</h3>
              <div>
                <label className="block text-[10px] text-vodacom-muted uppercase mb-1">Company / Receiver Name *</label>
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
                  <label className="block text-[10px] text-vodacom-muted uppercase mb-1">State</label>
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

            {/* Consignee / Shipped To */}
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

          {/* Transport Details */}
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
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-vodacom-muted uppercase mb-1">Transport Mode</label>
              <input
                type="text"
                className="w-full bg-vodacom-darker border border-white/10 rounded-lg p-2 text-xs text-white"
                placeholder="By Hand / Road"
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
              <label className="block text-[10px] text-vodacom-muted uppercase mb-1">Invoice Reference</label>
              <input
                type="text"
                className="w-full bg-vodacom-darker border border-white/10 rounded-lg p-2 text-xs text-white font-mono"
                placeholder="INV-..."
                value={editForm.invoice_ref}
                onChange={e => setEditForm({ ...editForm, invoice_ref: e.target.value })}
              />
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
                    placeholder="Challan remarks or delivery notes..."
                    value={editForm.notes}
                    onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                  />
                </div>
                <div className="w-full sm:w-64 space-y-2 text-xs text-right bg-vodacom-darker/60 p-4 rounded-xl border border-white/5">
                  <div className="flex justify-between text-vodacom-muted">
                    <span>Total Quantity:</span>
                    <span className="text-white font-semibold">{totals.totalQty}</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-white pt-2 border-t border-white/10">
                    <span>Total Amount:</span>
                    <span className="text-vodacom-green">₹{totals.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
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
              <Save size={15} /> {savingEdit ? 'Saving Changes...' : 'Save Challan Changes'}
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-vodacom-surface border border-white/5 rounded-2xl p-8 shadow-2xl space-y-8">
          <div className="flex justify-between border-b border-white/5 pb-6">
            <div>
              <h2 className="text-[20px] font-black text-white font-mono">{challan.challan_number}</h2>
              <div className="text-[12px] text-vodacom-muted mt-1">Date: {new Date(challan.date).toLocaleDateString('en-IN')}</div>
            </div>
            <div className="text-right">
              <Badge variant={challan.status === 'delivered' ? 'success' : 'warning'}>{challan.status}</Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 text-[12px]">
            <div>
              <div className="text-[10px] font-bold text-vodacom-muted uppercase tracking-wider mb-2">Billed To</div>
              <div className="text-white font-bold text-[14px]">{challan.receiver_name}</div>
              <div className="text-slate-300 mt-1 whitespace-pre-wrap">{challan.receiver_address}</div>
              {challan.receiver_gstin && <div className="text-vodacom-muted mt-1">GSTIN: {challan.receiver_gstin}</div>}
            </div>
            <div>
              <div className="text-[10px] font-bold text-vodacom-muted uppercase tracking-wider mb-2">Shipped To</div>
              <div className="text-white font-bold text-[14px]">{challan.consignee_name || challan.receiver_name}</div>
              <div className="text-slate-300 mt-1 whitespace-pre-wrap">{challan.consignee_address || challan.receiver_address}</div>
              {(challan.consignee_gstin || challan.receiver_gstin) && <div className="text-vodacom-muted mt-1">GSTIN: {challan.consignee_gstin || challan.receiver_gstin}</div>}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold text-vodacom-muted uppercase tracking-wider mb-3">Items</div>
            <div className="border border-white/10 rounded-xl overflow-hidden">
              <table className="w-full text-[12px] text-left">
                <thead className="bg-white/5 text-vodacom-muted">
                  <tr>
                    <th className="px-4 py-2">Item</th>
                    <th className="px-4 py-2">HSN/SAC</th>
                    <th className="px-4 py-2 text-right">Qty</th>
                    <th className="px-4 py-2 text-right">Rate</th>
                    <th className="px-4 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {challan.items?.map((it: any, i: number) => (
                    <tr key={i}>
                      <td className="px-4 py-3 font-semibold text-white">{it.description}</td>
                      <td className="px-4 py-3">{it.hsn_sac || '—'}</td>
                      <td className="px-4 py-3 text-right">{it.quantity} {it.uom}</td>
                      <td className="px-4 py-3 text-right">₹{it.rate.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                      <td className="px-4 py-3 text-right font-bold text-white">₹{it.total_amount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                    </tr>
                  ))}
                  <tr className="bg-white/5 font-bold text-white">
                    <td colSpan={2} className="px-4 py-3 text-right">Grand Total</td>
                    <td className="px-4 py-3 text-right">{challan.total_qty}</td>
                    <td className="px-4 py-3 text-right"></td>
                    <td className="px-4 py-3 text-right text-vodacom-green">₹{challan.total_amount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {challan.notes && (
            <div className="bg-vodacom-darker/60 border border-white/5 rounded-xl p-4">
              <div className="text-[10px] font-bold text-vodacom-muted uppercase tracking-wider mb-1">Notes / Remarks</div>
              <p className="text-xs text-slate-300">{challan.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

