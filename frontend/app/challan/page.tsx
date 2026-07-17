'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PackageCheck, Download, Trash2, Eye } from 'lucide-react';
import api from '../../lib/api';
import { Badge } from '../../components/ui/Badge';

export default function ChallanListPage() {
  const [challans, setChallans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<number | null>(null);

  useEffect(() => {
    api.get('/api/challan/')
      .then(r => setChallans(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleDownload = async (challan: any) => {
    setDownloading(challan.id);
    try {
      const res = await api.get(`/api/challan/${challan.id}/pdf`, { responseType: 'blob' });
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
      setDownloading(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this challan?')) return;
    await api.delete(`/api/challan/${id}`);
    setChallans(prev => prev.filter(c => c.id !== id));
  };

  const statusVariant = (s: string) =>
    s === 'delivered' ? 'success' : s === 'sent' ? 'warning' : 'default';

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
          <h1 className="text-xl font-bold text-white tracking-wide">Delivery Challans</h1>
          <p className="text-[11px] text-vodacom-muted mt-0.5">Manage and download delivery challans linked to inventory items</p>
        </div>
        <Link
          href="/challan/new"
          className="bg-vodacom-green hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all duration-200 shadow-lg shadow-vodacom-green/15 flex items-center gap-2"
        >
          <PackageCheck size={14} />
          Create Challan
        </Link>
      </div>

      {challans.length === 0 ? (
        <div className="text-center py-24 bg-vodacom-surface/30 border border-dashed border-white/10 rounded-2xl">
          <PackageCheck size={36} className="text-vodacom-muted/40 mx-auto mb-3" />
          <p className="text-sm text-vodacom-muted">No challans created yet.</p>
          <Link href="/challan/new" className="inline-block mt-4 text-xs text-vodacom-blue hover:underline">Create your first challan →</Link>
        </div>
      ) : (
        <div className="bg-vodacom-surface border border-white/5 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-white/5 text-vodacom-muted font-bold uppercase tracking-wider text-[10px]">
                <th className="px-6 py-4 text-left">Challan #</th>
                <th className="px-6 py-4 text-left">Receiver</th>
                <th className="px-6 py-4 text-left">Date</th>
                <th className="px-6 py-4 text-left">Place of Supply</th>
                <th className="px-6 py-4 text-right">Items</th>
                <th className="px-6 py-4 text-right">Total Qty</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {challans.map(c => (
                <tr key={c.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-white">{c.challan_number}</td>
                  <td className="px-6 py-4 text-slate-300 max-w-[180px] truncate">{c.receiver_name}</td>
                  <td className="px-6 py-4 text-vodacom-muted">{new Date(c.date).toLocaleDateString('en-IN')}</td>
                  <td className="px-6 py-4 text-vodacom-muted">{c.place_of_supply || '—'}</td>
                  <td className="px-6 py-4 text-right text-slate-300">{c.items?.length || 0}</td>
                  <td className="px-6 py-4 text-right font-semibold text-white">{c.total_qty?.toLocaleString('en-IN')}</td>
                  <td className="px-6 py-4 text-center">
                    <Badge variant={statusVariant(c.status) as any}>{c.status}</Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <Link
                        href={`/challan/${c.id}`}
                        className="p-1.5 rounded-lg text-vodacom-blue hover:bg-vodacom-blue/10 transition-colors"
                        title="View"
                      >
                        <Eye size={14} />
                      </Link>
                      <button
                        onClick={() => handleDownload(c)}
                        disabled={downloading === c.id}
                        className="p-1.5 rounded-lg text-vodacom-green hover:bg-vodacom-green/10 transition-colors disabled:opacity-40"
                        title="Download PDF"
                      >
                        <Download size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
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
