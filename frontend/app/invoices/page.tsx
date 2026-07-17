'use client';
import { useState } from 'react';
import { useInvoices } from '../../hooks/useInvoices';
import { useCustomers } from '../../hooks/useCustomers';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import Link from 'next/link';

export default function InvoicesPage() {
  const { invoices, loading: invLoading } = useInvoices();
  const { customers, loading: custLoading } = useCustomers();
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid'>('all');

  const loading = invLoading || custLoading;

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="w-8 h-8 border-2 border-vodacom-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Create a mapping of customer ID to company name
  const customerMap = customers.reduce((acc: Record<number, string>, c: any) => {
    acc[c.id] = c.company_name;
    return acc;
  }, {});

  const filteredInvoices = invoices.filter((inv: any) => {
    if (statusFilter === 'all') return true;
    return inv.status === statusFilter;
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide">Invoices & Billing</h1>
          <p className="text-[11px] text-vodacom-muted mt-0.5">Track customer billings, taxes, and payment statuses</p>
        </div>
        <Link
          href="/invoices/new"
          className="bg-vodacom-green hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all duration-200 shadow-lg shadow-vodacom-green/15"
        >
          Create Invoice
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {(['all', 'pending', 'paid'] as const).map(option => (
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

      <Table headers={['Invoice #', 'Customer Company', 'Issue Date', 'Grand Total', 'Status', 'Actions']}>
        {filteredInvoices.map((inv: any) => (
          <tr key={inv.id} className="hover:bg-white/5 transition-colors duration-150">
            <td className="px-6 py-4 font-mono font-bold text-white tracking-wide">{inv.invoice_number}</td>
            <td className="px-6 py-4 text-slate-300">{customerMap[inv.customer_id] || 'Unknown Customer'}</td>
            <td className="px-6 py-4 text-vodacom-muted">{new Date(inv.date).toLocaleDateString('en-IN')}</td>
            <td className="px-6 py-4 font-semibold text-white">₹{inv.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            <td className="px-6 py-4">
              <Badge variant={inv.status === 'paid' ? 'success' : 'warning'}>{inv.status}</Badge>
            </td>
            <td className="px-6 py-4">
              <Link
                href={`/invoices/${inv.id}`}
                className="text-[12px] font-bold text-vodacom-blue hover:text-white transition-colors uppercase tracking-wider"
              >
                View Details
              </Link>
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

