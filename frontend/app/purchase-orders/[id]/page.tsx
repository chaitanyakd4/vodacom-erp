'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, ClipboardList, Download, Trash2, Check, X, Edit3,
  Package, MapPin, CreditCard, Truck
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
          <Badge variant={statusVariant(po.status) as any}>{po.status}</Badge>
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
        </div>
      </div>

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
    </div>
  );
}
