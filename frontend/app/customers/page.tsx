'use client';
import { useState, useMemo } from 'react';
import { useCustomers } from '../../hooks/useCustomers';
import { Table } from '../../components/ui/Table';
import { EditCustomerModal } from '../../components/ui/EditCustomerModal';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Upload, Pencil, ChevronRight } from 'lucide-react';

export default function CustomersPage() {
  const { customers, loading } = useCustomers();
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [localUpdates, setLocalUpdates] = useState<Record<number, any>>({});
  const router = useRouter();

  const customerList = useMemo(() => {
    return customers.map((c: any) => localUpdates[c.id] || c);
  }, [customers, localUpdates]);

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

      <Table headers={['Company Name', 'Contact Person', 'Phone Number', 'Email Address', 'Company / Site Address', 'GSTIN', 'Actions']}>
        {customerList.map((c: any) => (
          <tr 
            key={c.id} 
            onClick={() => router.push(`/customers/${c.id}`)} 
            className="hover:bg-white/5 cursor-pointer transition-colors duration-150 text-xs"
          >
            <td className="px-4 py-3.5 font-semibold text-white whitespace-nowrap">
              <div className="flex items-center gap-2">
                <span>{c.company_name}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCustomer(c);
                  }}
                  className="p-1 hover:bg-white/10 rounded text-vodacom-muted hover:text-vodacom-blue transition-colors cursor-pointer"
                  title="Edit client info with 1 click"
                >
                  <Pencil size={11} />
                </button>
              </div>
            </td>
            <td className="px-4 py-3.5 text-slate-300 whitespace-nowrap">{c.contact_person}</td>
            <td className="px-4 py-3.5 font-mono text-slate-300 whitespace-nowrap">{c.phone}</td>
            <td className="px-4 py-3.5 text-vodacom-muted max-w-[160px] truncate" title={c.email || ''}>{c.email || '—'}</td>
            <td className="px-4 py-3.5 text-slate-300 max-w-[200px] truncate" title={c.address || ''}>{c.address || '—'}</td>
            <td className="px-4 py-3.5 font-mono text-vodacom-blue whitespace-nowrap">{c.gstin || 'N/A'}</td>
            <td className="px-4 py-3.5 text-right whitespace-nowrap">
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCustomer(c);
                  }}
                  className="px-2.5 py-1 bg-vodacom-surface hover:bg-white/10 border border-white/10 rounded-lg text-[11px] text-white font-medium inline-flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Pencil size={10} /> Edit
                </button>
                <ChevronRight size={14} className="text-vodacom-muted" />
              </div>
            </td>
          </tr>
        ))}
      </Table>

      <EditCustomerModal
        isOpen={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        customer={selectedCustomer}
        onSuccess={(updated) => {
          setLocalUpdates(prev => ({
            ...prev,
            [updated.id]: updated
          }));
        }}
      />
    </div>
  );
}

