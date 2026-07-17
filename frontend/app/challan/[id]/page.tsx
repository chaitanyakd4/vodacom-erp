'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, FileText, CheckCircle } from 'lucide-react';
import api from '../../../lib/api';
import { Badge } from '../../../components/ui/Badge';

export default function ChallanDetailPage({ params }: any) {
  const router = useRouter();
  const [challanId, setChallanId] = useState<string | null>(null);
  const [challan, setChallan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    Promise.resolve(params).then(p => {
      if (p && p.id) setChallanId(p.id);
    });
  }, [params]);

  useEffect(() => {
    if (!challanId) return;
    api.get(`/api/challan/${challanId}`)
      .then(r => setChallan(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [challanId]);

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
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <button onClick={() => router.push('/challan')} className="text-vodacom-muted hover:text-white p-1 rounded-lg">
            <ArrowLeft size={16} />
          </button>
          <span className="text-xs text-vodacom-muted">Back to challans</span>
        </div>
        
        <div className="flex gap-3">
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
        </div>
      </div>

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

      </div>
    </div>
  );
}
