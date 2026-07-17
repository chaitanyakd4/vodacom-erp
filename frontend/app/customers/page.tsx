'use client';
import { useCustomers } from '../../hooks/useCustomers';
import { Table } from '../../components/ui/Table';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Upload } from 'lucide-react';

export default function CustomersPage() {
  const { customers, loading } = useCustomers();
  const router = useRouter();

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
          <h1 className="text-xl font-bold text-white tracking-wide">Customers</h1>
          <p className="text-[11px] text-vodacom-muted mt-0.5">Directory of registered customer profiles</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/customers/import"
            className="flex items-center gap-2 bg-vodacom-surface hover:bg-white/5 border border-white/10 text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all duration-200"
          >
            <Upload size={14} />
            <span>Import</span>
          </Link>
          <Link
            href="/customers/new"
            className="bg-vodacom-green hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all duration-200 shadow-lg shadow-vodacom-green/15"
          >
            Add Customer
          </Link>
        </div>
      </div>

      <Table headers={['Company Name', 'Contact Person', 'Email Address', 'Phone Number', 'GSTIN']}>
        {customers.map((c: any) => (
          <tr key={c.id} onClick={() => router.push(`/customers/${c.id}`)} className="hover:bg-white/5 cursor-pointer transition-colors duration-150">
            <td className="px-6 py-4 font-semibold text-white">{c.company_name}</td>
            <td className="px-6 py-4 text-slate-300">{c.contact_person}</td>
            <td className="px-6 py-4 text-vodacom-muted">{c.email || 'N/A'}</td>
            <td className="px-6 py-4 text-slate-300">{c.phone}</td>
            <td className="px-6 py-4 font-mono text-vodacom-blue">{c.gstin || 'N/A'}</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

