'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ClipboardList, Download, Trash2, Eye, Plus } from 'lucide-react';
import api from '../../lib/api';
import { Badge } from '../../components/ui/Badge';

export default function PurchaseOrderListPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<number | null>(null);

  useEffect(() => {
    api.get('/api/purchase-orders/')
      .then(r => setOrders(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleDownload = async (po: any) => {
    setDownloading(po.id);
    try {
      const res = await api.get(`/api/purchase-orders/${po.id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `PO_${po.po_number.replace(/\//g, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Failed to download PDF');
    } finally {
      setDownloading(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this Purchase Order?')) return;
    await api.delete(`/api/purchase-orders/${id}`);
    setOrders(prev => prev.filter(o => o.id !== id));
  };

  const statusVariant = (s: string) => {
    switch (s) {
      case 'received': return 'success';
      case 'sent': return 'warning';
      case 'cancelled': return 'danger';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="w-8 h-8 border-2 border-vodacom-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
            <ClipboardList size={20} className="text-vodacom-blue" />
            Purchase Orders
          </h1>
          <p className="text-[11px] text-vodacom-muted mt-0.5">
            Create and manage purchase orders sent to suppliers
          </p>
        </div>
        <Link
          href="/purchase-orders/new"
          className="bg-vodacom-blue hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all duration-200 shadow-lg shadow-vodacom-blue/15 flex items-center gap-2"
        >
          <Plus size={14} />
          Create PO
        </Link>
      </div>

      {/* Summary Stats */}
      {orders.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total POs', value: orders.length, color: 'text-vodacom-blue' },
            { label: 'Draft', value: orders.filter(o => o.status === 'draft').length, color: 'text-vodacom-muted' },
            { label: 'Sent', value: orders.filter(o => o.status === 'sent').length, color: 'text-amber-400' },
            { label: 'Received', value: orders.filter(o => o.status === 'received').length, color: 'text-emerald-400' },
          ].map(stat => (
            <div key={stat.label} className="bg-vodacom-surface border border-white/5 rounded-2xl p-4 shadow-lg">
              <div className={`text-2xl font-extrabold ${stat.color}`}>{stat.value}</div>
              <div className="text-[10px] text-vodacom-muted font-bold uppercase tracking-wider mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {orders.length === 0 ? (
        <div className="text-center py-24 bg-vodacom-surface/30 border border-dashed border-white/10 rounded-2xl">
          <ClipboardList size={36} className="text-vodacom-muted/40 mx-auto mb-3" />
          <p className="text-sm text-vodacom-muted">No purchase orders created yet.</p>
          <Link
            href="/purchase-orders/new"
            className="inline-block mt-4 text-xs text-vodacom-blue hover:underline"
          >
            Create your first Purchase Order →
          </Link>
        </div>
      ) : (
        <div className="bg-vodacom-surface border border-white/5 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-white/5 text-vodacom-muted font-bold uppercase tracking-wider text-[10px]">
                <th className="px-6 py-4 text-left">PO Number</th>
                <th className="px-6 py-4 text-left">Supplier</th>
                <th className="px-6 py-4 text-left">Date</th>
                <th className="px-6 py-4 text-left">Place of Supply</th>
                <th className="px-6 py-4 text-right">Items</th>
                <th className="px-6 py-4 text-right">Total Qty</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {orders.map(po => (
                <tr key={po.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-vodacom-blue">{po.po_number}</td>
                  <td className="px-6 py-4 text-slate-300 max-w-[200px] truncate">{po.receiver_name}</td>
                  <td className="px-6 py-4 text-vodacom-muted">{new Date(po.date).toLocaleDateString('en-IN')}</td>
                  <td className="px-6 py-4 text-vodacom-muted">{po.place_of_supply || '—'}</td>
                  <td className="px-6 py-4 text-right text-slate-300">{po.items?.length || 0}</td>
                  <td className="px-6 py-4 text-right font-semibold text-white">{po.total_qty?.toLocaleString('en-IN')}</td>
                  <td className="px-6 py-4 text-right font-bold text-white">
                    ₹{(po.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Badge variant={statusVariant(po.status) as any}>{po.status}</Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <Link
                        href={`/purchase-orders/${po.id}`}
                        className="p-1.5 rounded-lg text-vodacom-blue hover:bg-vodacom-blue/10 transition-colors"
                        title="View"
                      >
                        <Eye size={14} />
                      </Link>
                      <button
                        onClick={() => handleDownload(po)}
                        disabled={downloading === po.id}
                        className="p-1.5 rounded-lg text-vodacom-green hover:bg-vodacom-green/10 transition-colors disabled:opacity-40"
                        title="Download PDF"
                      >
                        <Download size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(po.id)}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
