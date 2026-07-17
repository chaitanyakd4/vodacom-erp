'use client';
import { useState } from 'react';
import { useServiceWork } from '../../hooks/useServiceWork';
import { useCustomers } from '../../hooks/useCustomers';
import { useProducts } from '../../hooks/useProducts';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import Link from 'next/link';
import { Wrench } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ServiceWorkPage() {
  const router = useRouter();
  const { serviceWork, loading: swLoading } = useServiceWork();
  const { customers, loading: custLoading } = useCustomers();
  const { products, loading: prodLoading } = useProducts();

  // Filter states
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved' | 'closed'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'low' | 'medium' | 'high' | 'critical'>('all');

  const loading = swLoading || custLoading || prodLoading;

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

  const productMap = products.reduce((acc: Record<number, string>, p: any) => {
    acc[p.id] = p.name;
    return acc;
  }, {});

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'low': return 'default';
      case 'medium': return 'warning';
      case 'high': return 'danger';
      case 'critical': return 'danger';
      default: return 'default';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'open': return 'default';
      case 'in_progress': return 'warning';
      case 'resolved': return 'success';
      case 'closed': return 'default';
      default: return 'default';
    }
  };

  const filteredTickets = serviceWork.filter((ticket: any) => {
    const statusMatch = statusFilter === 'all' || ticket.status === statusFilter;
    const priorityMatch = priorityFilter === 'all' || ticket.priority === priorityFilter;
    return statusMatch && priorityMatch;
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide">Service Work Tracker</h1>
          <p className="text-[11px] text-vodacom-muted mt-0.5">Manage client service queries, complaints, and repair tasks</p>
        </div>
        <Link
          href="/service-work/new"
          className="bg-vodacom-green hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all duration-200 shadow-lg shadow-vodacom-green/15 flex items-center gap-2"
        >
          <Wrench size={16} />
          <span>New Ticket</span>
        </Link>
      </div>

      {/* Double Filter Bar */}
      <div className="glass-panel border border-white/5 p-4 rounded-2xl mb-6 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        {/* Status Filter */}
        <div className="space-y-1.5 w-full md:w-auto">
          <label className="block text-[9px] font-bold text-vodacom-muted uppercase tracking-wider">Filter by Status</label>
          <div className="flex flex-wrap gap-1.5">
            {(['all', 'open', 'in_progress', 'resolved', 'closed'] as const).map(option => (
              <button
                key={option}
                onClick={() => setStatusFilter(option)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold capitalize transition-all duration-150 border ${
                  statusFilter === option
                    ? 'bg-vodacom-blue/15 border-vodacom-blue text-white'
                    : 'bg-white/5 border-transparent text-vodacom-muted hover:text-white hover:bg-white/10'
                }`}
              >
                {option.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Priority Filter */}
        <div className="space-y-1.5 w-full md:w-auto">
          <label className="block text-[9px] font-bold text-vodacom-muted uppercase tracking-wider">Filter by Priority</label>
          <div className="flex flex-wrap gap-1.5">
            {(['all', 'low', 'medium', 'high', 'critical'] as const).map(option => (
              <button
                key={option}
                onClick={() => setPriorityFilter(option)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold capitalize transition-all duration-150 border ${
                  priorityFilter === option
                    ? 'bg-vodacom-blue/15 border-vodacom-blue text-white'
                    : 'bg-white/5 border-transparent text-vodacom-muted hover:text-white hover:bg-white/10'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Table headers={['Ticket ID', 'Client', 'Product/Service', 'Issue Title', 'Priority', 'Status', 'Due Date']}>
        {filteredTickets.map((ticket: any) => (
          <tr 
            key={ticket.id} 
            className="hover:bg-white/5 transition-colors duration-150 cursor-pointer"
            onClick={() => router.push(`/service-work/${ticket.id}`)}
          >
            <td className="px-6 py-4 font-mono font-bold text-vodacom-blue tracking-wide">SW-{ticket.id.toString().padStart(4, '0')}</td>
            <td className="px-6 py-4 text-slate-300 font-semibold">{customerMap[ticket.customer_id] || 'Unknown Customer'}</td>
            <td className="px-6 py-4 text-slate-300">{ticket.product_id ? productMap[ticket.product_id] : <span className="text-vodacom-muted text-xs italic">N/A</span>}</td>
            <td className="px-6 py-4 text-white">{ticket.title}</td>
            <td className="px-6 py-4">
              <Badge variant={getPriorityBadgeVariant(ticket.priority)}>
                <span className="uppercase text-[9px] font-bold">{ticket.priority}</span>
              </Badge>
            </td>
            <td className="px-6 py-4">
               <Badge variant={getStatusBadgeVariant(ticket.status)}>
                 {ticket.status.replace('_', ' ')}
               </Badge>
            </td>
            <td className="px-6 py-4 text-vodacom-muted text-xs">
              {ticket.due_date ? new Date(ticket.due_date).toLocaleDateString('en-IN') : '-'}
            </td>
          </tr>
        ))}
        {filteredTickets.length === 0 && (
          <tr>
            <td colSpan={7} className="px-6 py-8 text-center text-vodacom-muted text-sm">
              No service work tickets found matching these filters.
            </td>
          </tr>
        )}
      </Table>
    </div>
  );
}
