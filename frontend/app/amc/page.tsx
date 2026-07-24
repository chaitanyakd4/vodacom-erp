'use client';
import { useState } from 'react';
import { useAmc } from '../../hooks/useAmc';
import { useCustomers } from '../../hooks/useCustomers';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, RefreshCw } from 'lucide-react';
import api from '../../lib/api';

export default function AmcPage() {
  const { amcs, loading: amcLoading } = useAmc();
  const { customers, loading: custLoading } = useCustomers();
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'cancelled'>('all');
  const [renewingId, setRenewingId] = useState<number | null>(null);
  const router = useRouter();

  const loading = amcLoading || custLoading;

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="w-8 h-8 border-2 border-vodacom-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const customerMap = customers.reduce((acc: Record<number, string>, c: any) => {
    acc[c.id] = c.company_name;
    return acc;
  }, {});

  const handleQuickRenew = async (e: React.MouseEvent, amcId: number) => {
    e.stopPropagation();
    setRenewingId(amcId);
    try {
      await api.post(`/api/amc/${amcId}/renew`);
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('Failed to renew contract.');
    } finally {
      setRenewingId(null);
    }
  };

  const filteredAmcs = amcs.filter((amc: any) => {
    if (statusFilter === 'all') return true;
    return amc.status === statusFilter;
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide">Annual Maintenance Contracts</h1>
          <p className="text-[11px] text-vodacom-muted mt-0.5">Track active, expired, and renewed servicing agreements</p>
        </div>
        <Link
          href="/amc/new"
          className="bg-vodacom-green hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all duration-200 shadow-lg shadow-vodacom-green/15 text-center"
        >
          New AMC
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(['all', 'active', 'expired', 'cancelled'] as const).map(option => (
          <button
            key={option}
            onClick={() => setStatusFilter(option)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold capitalize transition-all duration-200 border ${
              statusFilter === option
                ? 'bg-vodacom-blue/15 border-vodacom-blue text-white shadow-lg shadow-vodacom-blue/5'
                : 'bg-vodacom-surface/40 border-white/5 text-vodacom-muted hover:text-white hover:bg-vodacom-surface/75'
            }`}
          >
            {option} ({amcs.filter((a: any) => option === 'all' || a.status === option).length})
          </button>
        ))}
      </div>

      <Table headers={['Contract #', 'Client Company', 'Coverage Start', 'Coverage End', 'Contract Amount', 'Status', 'Actions']}>
        {filteredAmcs.map((amc: any) => (
          <tr
            key={amc.id}
            onClick={() => router.push(`/amc/${amc.id}`)}
            className="group hover:bg-white/5 transition-colors duration-150 cursor-pointer"
          >
            <td className="px-6 py-4 font-mono font-bold text-white tracking-wide">{amc.contract_number}</td>
            <td className="px-6 py-4 text-slate-300">{customerMap[amc.customer_id] || 'Unknown Customer'}</td>
            <td className="px-6 py-4 text-vodacom-muted">{new Date(amc.start_date).toLocaleDateString('en-IN')}</td>
            <td className="px-6 py-4 text-vodacom-muted">{new Date(amc.end_date).toLocaleDateString('en-IN')}</td>
            <td className="px-6 py-4 font-semibold text-white">₹{amc.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            <td className="px-6 py-4">
              <Badge variant={amc.status === 'active' ? 'success' : amc.status === 'expired' ? 'warning' : 'danger'}>
                {amc.status}
              </Badge>
            </td>
            <td className="px-4 py-4 text-right">
              {amc.status === 'expired' ? (
                <button
                  onClick={(e) => handleQuickRenew(e, amc.id)}
                  disabled={renewingId === amc.id}
                  className="px-3 py-1.5 bg-vodacom-blue/20 hover:bg-vodacom-blue/35 text-vodacom-blue border border-vodacom-blue/30 text-[11px] font-bold uppercase rounded-lg transition-all inline-flex items-center gap-1"
                >
                  <RefreshCw size={12} className={renewingId === amc.id ? 'animate-spin' : ''} />
                  <span>{renewingId === amc.id ? 'Renewing...' : 'Renew'}</span>
                </button>
              ) : (
                <ChevronRight size={14} className="text-vodacom-muted group-hover:text-white transition-colors ml-auto" />
              )}
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
