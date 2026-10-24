'use client';
import { useEffect, useState } from 'react';
import { useServiceWork } from '../../hooks/useServiceWork';
import { useCustomers } from '../../hooks/useCustomers';
import { useProducts } from '../../hooks/useProducts';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import Link from 'next/link';
import { Wrench, Search, UserCheck, ShieldCheck, IndianRupee, MapPin, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import api from '../../lib/api';

export default function ServiceWorkPage() {
  const router = useRouter();
  const { serviceWork, loading: swLoading } = useServiceWork();
  const { customers, loading: custLoading } = useCustomers();
  const { products, loading: prodLoading } = useProducts();

  const [currentUser, setCurrentUser] = useState<any>(null);

  // Filter states
  const [viewMode, setViewMode] = useState<'all' | 'mine' | 'unassigned'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved' | 'closed'>('all');
  const [billingFilter, setBillingFilter] = useState<'all' | 'billable' | 'under_amc' | 'warranty' | 'free_service'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'low' | 'medium' | 'high' | 'critical'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    api
      .get('/api/auth/me')
      .then(res => setCurrentUser(res.data))
      .catch(() => {});
  }, []);

  const loading = swLoading || custLoading || prodLoading;

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="w-8 h-8 border-2 border-vodacom-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const myName =
    currentUser?.full_name ||
    (currentUser?.email
      ? currentUser.email.split('@')[0].replace(/[._]/g, ' ').toLowerCase()
      : '');
  const myEmail = (currentUser?.email || '').toLowerCase();

  const isMyTicket = (ticket: any) => {
    const duty = (ticket.person_on_duty || '').toLowerCase();
    const creator = (ticket.created_by_email || '').toLowerCase();
    if (myEmail && creator === myEmail) return true;
    if (myName && duty && (duty.includes(myName.toLowerCase()) || myName.toLowerCase().includes(duty))) return true;
    return false;
  };

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
      case 'low':
        return 'default';
      case 'medium':
        return 'warning';
      case 'high':
        return 'danger';
      case 'critical':
        return 'danger';
      default:
        return 'default';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'open':
        return 'default';
      case 'in_progress':
        return 'warning';
      case 'resolved':
        return 'success';
      case 'closed':
        return 'default';
      default:
        return 'default';
    }
  };

  const filteredTickets = serviceWork.filter((ticket: any) => {
    if (viewMode === 'mine' && !isMyTicket(ticket)) return false;
    if (viewMode === 'unassigned' && ticket.person_on_duty && ticket.person_on_duty.trim() !== '') return false;

    const statusMatch = statusFilter === 'all' || ticket.status === statusFilter;
    const priorityMatch = priorityFilter === 'all' || ticket.priority === priorityFilter;
    const ticketBilling = ticket.billing_type || 'billable';
    const billingMatch = billingFilter === 'all' || ticketBilling === billingFilter;

    if (!statusMatch || !priorityMatch || !billingMatch) return false;
    if (!searchQuery.trim()) return true;

    const q = searchQuery.toLowerCase().trim();
    const custName = (customerMap[ticket.customer_id] || '').toLowerCase();
    const title = (ticket.title || '').toLowerCase();
    const ticketRef = `sw-${String(ticket.id).padStart(4, '0')}`.toLowerCase();
    const dutyPerson = (ticket.person_on_duty || '').toLowerCase();
    return custName.includes(q) || title.includes(q) || ticketRef.includes(q) || dutyPerson.includes(q);
  });

  // Summary counts for Billable vs Under AMC & My Jobs
  const myTicketsCount = serviceWork.filter(isMyTicket).length;
  const underAmcCount = serviceWork.filter((t: any) => t.billing_type === 'under_amc').length;
  const billableTickets = serviceWork.filter((t: any) => (t.billing_type || 'billable') === 'billable');
  const billableTotalAmount = billableTickets.reduce(
    (sum: number, t: any) => sum + (Number(t.estimated_charge) || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide">Service Work &amp; Field Visit Tracker</h1>
          <p className="text-[11px] text-vodacom-muted mt-0.5">
            Engineer self-logged field visits, external client queries, on-site check-in &amp; AMC vs Billable tracking
          </p>
        </div>
        <Link
          href="/service-work/new"
          className="bg-vodacom-green hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all duration-200 shadow-lg shadow-vodacom-green/15 flex items-center gap-2 self-start sm:self-auto"
        >
          <Wrench size={16} />
          <span>Log Visit / New Ticket</span>
        </Link>
      </div>

      {/* ── SUMMARY CARDS: MY TICKETS + BILLABLE VS UNDER AMC ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => setViewMode(viewMode === 'mine' ? 'all' : 'mine')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            viewMode === 'mine'
              ? 'bg-vodacom-green/15 border-vodacom-green'
              : 'bg-vodacom-surface border-white/5 hover:border-white/15'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-vodacom-muted flex items-center gap-1.5">
              <UserCheck size={13} className="text-vodacom-green" /> My Logged / Assigned Jobs
            </span>
            <span className="text-lg font-extrabold text-white">{myTicketsCount}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {currentUser ? `Logged in as ${currentUser.full_name || currentUser.email}` : 'Click to filter your tickets'}
          </p>
        </button>

        <button
          type="button"
          onClick={() => setBillingFilter(billingFilter === 'under_amc' ? 'all' : 'under_amc')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            billingFilter === 'under_amc'
              ? 'bg-emerald-500/15 border-emerald-500'
              : 'bg-vodacom-surface border-white/5 hover:border-white/15'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <ShieldCheck size={13} /> Under AMC Visits
            </span>
            <span className="text-lg font-extrabold text-white">{underAmcCount}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Covered under active client AMC contracts</p>
        </button>

        <button
          type="button"
          onClick={() => setBillingFilter(billingFilter === 'billable' ? 'all' : 'billable')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            billingFilter === 'billable'
              ? 'bg-amber-500/15 border-amber-500'
              : 'bg-vodacom-surface border-white/5 hover:border-white/15'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <IndianRupee size={13} /> Billable Service Visits
            </span>
            <span className="text-lg font-extrabold text-white">{billableTickets.length}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {billableTotalAmount > 0
              ? `Est. Billable Charges: ₹${billableTotalAmount.toLocaleString('en-IN')}`
              : 'Chargeable client visits outside AMC'}
          </p>
        </button>
      </div>

      {/* ── VIEW ORIENTATION TABS + SEARCH BAR ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'All Team Tickets' },
            { id: 'mine', label: '👷 My Tickets' },
            { id: 'unassigned', label: '📥 Unassigned Queries' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setViewMode(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                viewMode === tab.id
                  ? 'bg-vodacom-blue text-white border-vodacom-blue shadow-md shadow-vodacom-blue/20'
                  : 'bg-vodacom-surface text-vodacom-muted border-white/10 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Search client, engineer, ticket title, SW-#..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-vodacom-darker border border-white/10 rounded-xl pl-9 pr-4 py-2 text-[12px] text-white placeholder-vodacom-muted focus:outline-none focus:ring-1 focus:ring-vodacom-blue transition-all"
          />
          <Search className="absolute left-3 top-2.5 text-vodacom-muted" size={13} />
        </div>
      </div>

      {/* ── FILTER BAR: STATUS + BILLABLE/AMC + PRIORITY ── */}
      <div className="glass-panel border border-white/5 p-4 rounded-2xl flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
        {/* Status Filter */}
        <div className="space-y-1.5">
          <label className="block text-[9px] font-bold text-vodacom-muted uppercase tracking-wider">Status</label>
          <div className="flex flex-wrap gap-1.5">
            {(['all', 'open', 'in_progress', 'resolved', 'closed'] as const).map(option => (
              <button
                key={option}
                onClick={() => setStatusFilter(option)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold capitalize transition-all duration-150 border cursor-pointer ${
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

        {/* Billing Category Filter (Billable vs Under AMC) */}
        <div className="space-y-1.5">
          <label className="block text-[9px] font-bold text-vodacom-muted uppercase tracking-wider">
            Billing Type (Billable vs Under AMC)
          </label>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'all', label: 'All' },
              { id: 'under_amc', label: '🛡️ Under AMC' },
              { id: 'billable', label: '💰 Billable' },
              { id: 'warranty', label: '🔧 Warranty' },
              { id: 'free_service', label: '🤝 Free' },
            ].map(option => (
              <button
                key={option.id}
                onClick={() => setBillingFilter(option.id as any)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-150 border cursor-pointer ${
                  billingFilter === option.id
                    ? 'bg-vodacom-green/20 border-vodacom-green text-white'
                    : 'bg-white/5 border-transparent text-vodacom-muted hover:text-white hover:bg-white/10'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Priority Filter */}
        <div className="space-y-1.5">
          <label className="block text-[9px] font-bold text-vodacom-muted uppercase tracking-wider">Priority</label>
          <div className="flex flex-wrap gap-1.5">
            {(['all', 'low', 'medium', 'high', 'critical'] as const).map(option => (
              <button
                key={option}
                onClick={() => setPriorityFilter(option)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold capitalize transition-all duration-150 border cursor-pointer ${
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

      {/* ── TICKETS TABLE ── */}
      <Table
        headers={[
          'Ticket ID',
          'Client',
          'Issue / Work Title',
          'Billing / AMC',
          'Engineer on Duty',
          'Site Check-In',
          'Priority',
          'Status',
        ]}
      >
        {filteredTickets.map((ticket: any) => {
          const bType = ticket.billing_type || 'billable';
          return (
            <tr
              key={ticket.id}
              className="hover:bg-white/5 transition-colors duration-150 cursor-pointer"
              onClick={() => router.push(`/service-work/${ticket.id}`)}
            >
              <td className="px-6 py-4 font-mono font-bold text-vodacom-blue tracking-wide">
                SW-{ticket.id.toString().padStart(4, '0')}
              </td>
              <td className="px-6 py-4">
                <div className="text-slate-200 font-semibold">{customerMap[ticket.customer_id] || 'Unknown Customer'}</div>
                {ticket.product_id && (
                  <div className="text-[10px] text-vodacom-muted mt-0.5">{productMap[ticket.product_id]}</div>
                )}
              </td>
              <td className="px-6 py-4 text-white max-w-xs truncate">{ticket.title}</td>
              <td className="px-6 py-4">
                {bType === 'under_amc' ? (
                  <div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      🛡️ UNDER AMC
                    </span>
                    {ticket.amc_contract_number && (
                      <div className="text-[10px] text-vodacom-muted font-mono mt-0.5">{ticket.amc_contract_number}</div>
                    )}
                  </div>
                ) : bType === 'warranty' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                    🔧 WARRANTY
                  </span>
                ) : bType === 'free_service' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-500/15 text-slate-300 border border-slate-500/30">
                    🤝 FREE VISIT
                  </span>
                ) : (
                  <div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      💰 BILLABLE
                    </span>
                    {Number(ticket.estimated_charge) > 0 && (
                      <div className="text-[11px] font-bold text-amber-300 mt-0.5">
                        ₹{Number(ticket.estimated_charge).toLocaleString('en-IN')}
                      </div>
                    )}
                  </div>
                )}
              </td>
              <td className="px-6 py-4">
                {ticket.person_on_duty ? (
                  <div>
                    <div className="text-slate-200 text-xs font-semibold">{ticket.person_on_duty}</div>
                    {ticket.technician_mobile && (
                      <a
                        href={`tel:${ticket.technician_mobile}`}
                        className="text-vodacom-green text-[10px] hover:underline flex items-center gap-0.5 mt-0.5"
                        onClick={e => e.stopPropagation()}
                      >
                        📞 {ticket.technician_mobile}
                      </a>
                    )}
                  </div>
                ) : (
                  <span className="text-amber-400 text-xs italic">Unassigned</span>
                )}
              </td>
              <td className="px-6 py-4 text-xs">
                {ticket.reached_at ? (
                  <div className="text-emerald-400 font-semibold flex items-center gap-1 text-[11px]">
                    <MapPin size={12} /> Checked In
                  </div>
                ) : (
                  <span className="text-vodacom-muted text-[11px]">Not Checked In</span>
                )}
                {ticket.signature_data && (
                  <div className="text-[10px] text-vodacom-blue mt-0.5">✍️ Client Signed</div>
                )}
              </td>
              <td className="px-6 py-4">
                <Badge variant={getPriorityBadgeVariant(ticket.priority)}>
                  <span className="uppercase text-[9px] font-bold">{ticket.priority}</span>
                </Badge>
              </td>
              <td className="px-6 py-4">
                <Badge variant={getStatusBadgeVariant(ticket.status)}>{ticket.status.replace('_', ' ')}</Badge>
              </td>
            </tr>
          );
        })}
        {filteredTickets.length === 0 && (
          <tr>
            <td colSpan={8} className="px-6 py-8 text-center text-vodacom-muted text-sm">
              No service work tickets found matching these filters.
            </td>
          </tr>
        )}
      </Table>
    </div>
  );
}
