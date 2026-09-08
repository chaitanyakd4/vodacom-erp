'use client';
import { useState } from 'react';
import { useEnquiries } from '../../hooks/useSales';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function EnquiriesPage() {
  const { enquiries, loading } = useEnquiries();
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'quoted' | 'converted' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="w-8 h-8 border-2 border-vodacom-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const filteredEnquiries = enquiries.filter((e: any) => {
    if (statusFilter !== 'all' && e.status !== statusFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const comp = (e.company_name || '').toLowerCase();
    const contact = (e.contact_person || '').toLowerCase();
    const ph = (e.phone || '').toLowerCase();
    return comp.includes(q) || contact.includes(q) || ph.includes(q);
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide">Sales Enquiries</h1>
          <p className="text-[11px] text-vodacom-muted mt-0.5">Manage new leads and quotations</p>
        </div>
        <Link
          href="/enquiries/new"
          className="bg-vodacom-green hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all duration-200 shadow-lg shadow-vodacom-green/15"
        >
          Add New Lead
        </Link>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex gap-2 flex-wrap">
          {(['all', 'new', 'quoted', 'converted', 'rejected'] as const).map(option => (
            <button
              key={option}
              onClick={() => setStatusFilter(option)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold capitalize transition-all duration-200 border ${
                statusFilter === option
                  ? 'bg-vodacom-blue/15 border-vodacom-blue text-white shadow-lg shadow-vodacom-blue/5'
                  : 'bg-vodacom-surface/40 border-white/5 text-vodacom-muted hover:text-white hover:bg-vodacom-surface/75'
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Search company, contact, or phone..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-vodacom-darker border border-white/10 rounded-xl pl-9 pr-4 py-2 text-[12px] text-white placeholder-vodacom-muted focus:outline-none focus:ring-1 focus:ring-vodacom-blue transition-all"
          />
          <Search className="absolute left-3 top-2.5 text-vodacom-muted" size={13} />
        </div>
      </div>

      {filteredEnquiries.length === 0 ? (
        <div className="bg-vodacom-surface border border-white/5 rounded-2xl p-12 text-center text-vodacom-muted text-xs">
          No sales enquiries found matching your search.
        </div>
      ) : (
        <Table headers={['Company Name', 'Contact Person', 'Date', 'Status']}>
        {filteredEnquiries.map((e: any) => (
          <tr key={e.id} onClick={() => router.push(`/enquiries/${e.id}`)} className="hover:bg-white/5 cursor-pointer transition-colors duration-150">
            <td className="px-6 py-4 font-semibold text-white">{e.company_name}</td>
            <td className="px-6 py-4 text-slate-300">
              <div>{e.contact_person}</div>
              <div className="text-[10px] text-vodacom-muted">{e.phone}</div>
            </td>
            <td className="px-6 py-4 text-vodacom-muted">{new Date(e.created_at).toLocaleDateString('en-IN')}</td>
            <td className="px-6 py-4">
               <Badge variant={e.status === 'converted' ? 'success' : e.status === 'rejected' ? 'danger' : 'warning'}>
                 {e.status}
               </Badge>
            </td>
          </tr>
        ))}
        </Table>
      )}
    </div>
  );
}
