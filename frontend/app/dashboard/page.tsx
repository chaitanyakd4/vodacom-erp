'use client';
import { useEffect, useState } from 'react';
import { Users, Package, FileText, ShieldCheck, TrendingUp, Wrench, AlertTriangle, Clock, Megaphone, X, ExternalLink, RefreshCw, CheckCircle2, ClipboardList } from 'lucide-react';
import api from '../../lib/api';
import { useRouter } from 'next/navigation';
import { Badge } from '../../components/ui/Badge';

export default function Dashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [reminders, setReminders] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modal stats list states
  const [activeModal, setActiveModal] = useState<'customers' | 'products' | 'invoices' | 'amc' | 'expired-amc' | 'service-work' | 'enquiries' | 'purchase-orders' | null>(null);
  const [modalData, setModalData] = useState<any[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/api/dashboard/stats'),
      api.get('/api/dashboard/reminders')
    ])
      .then(([statsRes, remindersRes]) => {
        setStats(statsRes.data);
        setReminders(remindersRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const openDetailsModal = async (type: 'customers' | 'products' | 'invoices' | 'amc' | 'expired-amc' | 'service-work' | 'enquiries' | 'purchase-orders') => {
    setActiveModal(type);
    setModalLoading(true);
    setModalData([]);
    try {
      if (type === 'customers') {
        const res = await api.get('/api/customers/');
        setModalData(res.data);
      } else if (type === 'products') {
        const res = await api.get('/api/products/');
        setModalData(res.data);
      } else if (type === 'invoices') {
        const res = await api.get('/api/invoices/');
        setModalData(res.data.filter((inv: any) => inv.status === 'pending'));
      } else if (type === 'amc') {
        const res = await api.get('/api/amc/');
        setModalData(res.data.filter((amc: any) => amc.status === 'active'));
      } else if (type === 'expired-amc') {
        const res = await api.get('/api/amc/');
        setModalData(res.data.filter((amc: any) => amc.status === 'expired'));
      } else if (type === 'service-work') {
        const res = await api.get('/api/service-work/');
        setModalData(res.data.filter((sw: any) => sw.status === 'open' || sw.status === 'in_progress' || sw.status === 'pending'));
      } else if (type === 'enquiries') {
        const res = await api.get('/api/sales/enquiries');
        setModalData(res.data.filter((enq: any) => enq.status === 'new' || enq.status === 'quoted' || enq.status === 'pending' || enq.status === 'approved'));
      } else if (type === 'purchase-orders') {
        const res = await api.get('/api/purchase-orders/');
        setModalData(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setModalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="w-8 h-8 border-2 border-vodacom-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const cards = [
    {
      type: 'customers' as const,
      label: 'Total Customers',
      value: stats?.total_customers ?? 0,
      icon: Users,
      colorClass: 'text-vodacom-blue',
      glowClass: 'hover:shadow-vodacom-blue/5',
      borderClass: 'border-l-4 border-vodacom-blue',
    },
    {
      type: 'products' as const,
      label: 'Total Products',
      value: stats?.total_products ?? 0,
      icon: Package,
      colorClass: 'text-vodacom-green',
      glowClass: 'hover:shadow-vodacom-green/5',
      borderClass: 'border-l-4 border-vodacom-green',
    },
    {
      type: 'invoices' as const,
      label: 'Pending Invoices',
      value: stats?.pending_invoices ?? 0,
      icon: FileText,
      colorClass: 'text-amber-400',
      glowClass: 'hover:shadow-amber-500/5',
      borderClass: 'border-l-4 border-amber-500',
    },
    {
      type: 'amc' as const,
      label: 'Active AMCs',
      value: stats?.active_amcs ?? 0,
      icon: ShieldCheck,
      colorClass: 'text-purple-400',
      glowClass: 'hover:shadow-purple-500/5',
      borderClass: 'border-l-4 border-purple-500',
    },
    {
      type: 'expired-amc' as const,
      label: 'Expired AMCs',
      value: stats?.expired_amcs ?? 0,
      icon: AlertTriangle,
      colorClass: 'text-rose-400',
      glowClass: 'hover:shadow-rose-500/5',
      borderClass: 'border-l-4 border-rose-500',
    },
    {
      type: 'service-work' as const,
      label: 'Pending Service Work',
      value: stats?.open_service_work ?? 0,
      icon: Wrench,
      colorClass: 'text-rose-400',
      glowClass: 'hover:shadow-rose-500/5',
      borderClass: 'border-l-4 border-rose-500',
    },
    {
      type: 'enquiries' as const,
      label: 'Pending Enquiries',
      value: stats?.active_enquiries ?? 0,
      icon: Megaphone,
      colorClass: 'text-amber-400',
      glowClass: 'hover:shadow-amber-500/5',
      borderClass: 'border-l-4 border-amber-500',
    },
    {
      type: 'purchase-orders' as const,
      label: 'Purchase Orders',
      value: stats?.total_purchase_orders ?? 0,
      icon: ClipboardList,
      colorClass: 'text-vodacom-blue',
      glowClass: 'hover:shadow-vodacom-blue/5',
      borderClass: 'border-l-4 border-vodacom-blue',
    },
  ];

  const hasActionableItems = reminders && (
    (reminders.amc_expired?.length > 0) ||
    (reminders.amc_expiring_soon?.length > 0) ||
    (reminders.service_work_in_progress?.length > 0) ||
    (reminders.pending_enquiries?.length > 0)
  );

  return (
    <div className="space-y-8">
      {/* Welcome banner */}
      <div className="p-6 bg-gradient-to-r from-vodacom-surface to-vodacom-darker border border-white/5 rounded-2xl flex items-center justify-between shadow-xl">
        <div>
          <h2 className="text-[18px] font-bold text-white tracking-wide">Vodacom ERP Command Dashboard</h2>
          <p className="text-xs text-vodacom-muted mt-1 leading-relaxed">
            Real-time dashboard monitoring pending enquiries, AMC contract renewals, active service work, and billing.
          </p>
        </div>
        <div className="w-10 h-10 bg-vodacom-green/10 border border-vodacom-green/20 rounded-xl flex items-center justify-center text-vodacom-green hidden sm:flex">
          <TrendingUp size={20} />
        </div>
      </div>

      {/* Grid of clickable cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              onClick={() => openDetailsModal(card.type)}
              className={`bg-vodacom-surface border border-white/5 ${card.borderClass} ${card.glowClass} hover:border-white/10 hover:-translate-y-0.5 rounded-2xl p-5 transition-all duration-300 shadow-xl flex items-center justify-between cursor-pointer group`}
            >
              <div>
                <dt className="text-[10px] font-bold text-vodacom-muted uppercase tracking-wider group-hover:text-white transition-colors">
                  {card.label}
                </dt>
                <dd className="mt-1.5 text-2xl font-black text-white font-sans tracking-tight flex items-baseline gap-2">
                  {card.value}
                  <span className="text-[9px] text-vodacom-blue font-semibold tracking-wide opacity-0 group-hover:opacity-100 transition-opacity">View →</span>
                </dd>
              </div>
              <div className={`w-10 h-10 bg-vodacom-darker/60 rounded-xl flex items-center justify-center border border-white/5 transition-transform duration-300 group-hover:scale-110 ${card.colorClass}`}>
                <Icon size={18} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Reminders Panel */}
      {hasActionableItems && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-400" />
            <span>Action Items Needing Immediate Attention</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
            
            {/* Expired AMC Contracts */}
            {reminders.amc_expired?.map((amc: any) => (
              <div
                key={`amc-expired-${amc.id}`}
                onClick={() => router.push(`/amc/${amc.id}`)}
                className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl cursor-pointer hover:bg-red-500/15 transition-colors flex items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5"><AlertTriangle size={18} className="text-red-400" /></div>
                  <div>
                    <div className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Expired AMC Contract</div>
                    <div className="text-sm font-bold text-white mt-0.5">{amc.contract_number} ({amc.customer_name})</div>
                    <div className="text-xs text-red-300/80 mt-0.5">Expired on: {new Date(amc.end_date).toLocaleDateString('en-IN')} — ₹{amc.amount.toLocaleString('en-IN')}</div>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); router.push(`/amc/${amc.id}`); }}
                  className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500 text-white font-bold text-[10px] uppercase rounded-lg transition-all shrink-0 flex items-center gap-1"
                >
                  <RefreshCw size={11} /> Renew
                </button>
              </div>
            ))}

            {/* Soon-to-Expire AMCs */}
            {reminders.amc_expiring_soon?.map((amc: any) => (
              <div
                key={`amc-expiring-${amc.id}`}
                onClick={() => router.push(`/amc/${amc.id}`)}
                className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl cursor-pointer hover:bg-amber-500/15 transition-colors flex items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5"><Clock size={18} className="text-amber-400" /></div>
                  <div>
                    <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">AMC Expiring Soon</div>
                    <div className="text-sm font-bold text-white mt-0.5">{amc.contract_number} ({amc.customer_name})</div>
                    <div className="text-xs text-amber-300/80 mt-0.5">Expires on: {new Date(amc.end_date).toLocaleDateString('en-IN')} ({amc.days_left} days left)</div>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); router.push(`/amc/${amc.id}`); }}
                  className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500 text-white font-bold text-[10px] uppercase rounded-lg transition-all shrink-0 flex items-center gap-1"
                >
                  View
                </button>
              </div>
            ))}

            {/* Pending Sales Enquiries */}
            {reminders.pending_enquiries?.map((enq: any) => (
              <div
                key={`enq-pending-${enq.id}`}
                onClick={() => router.push(`/enquiries/${enq.id}`)}
                className="bg-vodacom-blue/10 border border-vodacom-blue/20 p-4 rounded-xl cursor-pointer hover:bg-vodacom-blue/15 transition-colors flex items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5"><Megaphone size={18} className="text-vodacom-blue" /></div>
                  <div>
                    <div className="text-[10px] font-bold text-vodacom-blue uppercase tracking-wider">Pending Sales Enquiry</div>
                    <div className="text-sm font-bold text-white mt-0.5">{enq.company_name}</div>
                    <div className="text-xs text-vodacom-muted mt-0.5">Contact: {enq.contact_person} | Status: <span className="text-amber-400 font-semibold">{enq.status}</span></div>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); router.push(`/enquiries/${enq.id}`); }}
                  className="px-3 py-1.5 bg-vodacom-blue/20 hover:bg-vodacom-blue text-white font-bold text-[10px] uppercase rounded-lg transition-all shrink-0"
                >
                  Open Lead
                </button>
              </div>
            ))}

            {/* In-Progress / Pending Service Work */}
            {reminders.service_work_in_progress?.map((sw: any) => (
              <div
                key={`sw-progress-${sw.id}`}
                onClick={() => router.push(`/service-work/${sw.id}`)}
                className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl cursor-pointer hover:bg-rose-500/15 transition-colors flex items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5"><Wrench size={18} className="text-rose-400" /></div>
                  <div>
                    <div className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Service Work ({sw.status})</div>
                    <div className="text-sm font-bold text-white mt-0.5">{sw.ticket_number}: {sw.title}</div>
                    <div className="text-xs text-rose-300/80 mt-0.5">Due Date: {sw.due_date ? new Date(sw.due_date).toLocaleDateString('en-IN') : 'No Due Date'}</div>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); router.push(`/service-work/${sw.id}`); }}
                  className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500 text-white font-bold text-[10px] uppercase rounded-lg transition-all shrink-0"
                >
                  Manage Ticket
                </button>
              </div>
            ))}

          </div>
        </div>
      )}

      {/* ── Modal overlay for stats details ── */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActiveModal(null)} />
          
          <div className="relative w-full max-w-4xl max-h-[85vh] bg-vodacom-surface border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-10 animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-white/5 bg-vodacom-darker/50 flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-white tracking-wide capitalize">
                  {activeModal === 'amc' ? 'Active AMC Contracts' : 
                   activeModal === 'expired-amc' ? 'Expired AMC Contracts' :
                   activeModal === 'enquiries' ? 'Pending Sales Enquiries' : 
                   activeModal === 'invoices' ? 'Pending Invoices' : 
                   activeModal === 'service-work' ? 'Open Service Work Tickets' : 
                   activeModal === 'purchase-orders' ? 'Purchase Orders' :
                   `${activeModal} list`}
                </h3>
                <p className="text-[10px] text-vodacom-muted mt-0.5">Quick view of items needing attention</p>
              </div>
              <button 
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-vodacom-muted hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {modalLoading ? (
                <div className="py-20 flex justify-center items-center">
                  <div className="w-8 h-8 border-2 border-vodacom-blue border-t-transparent rounded-full animate-spin" />
                </div>
              ) : modalData.length === 0 ? (
                <div className="py-20 text-center text-sm text-vodacom-muted">
                  No pending items found under this category.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px] text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 text-[10px] font-bold text-vodacom-muted uppercase tracking-wider">
                        {activeModal === 'customers' && (
                          <>
                            <th className="pb-3 pl-4">Company Name</th>
                            <th className="pb-3">Contact</th>
                            <th className="pb-3">Email Address</th>
                            <th className="pb-3 pr-4 text-right">Actions</th>
                          </>
                        )}
                        {activeModal === 'products' && (
                          <>
                            <th className="pb-3 pl-4">SKU / Model</th>
                            <th className="pb-3">Product Name</th>
                            <th className="pb-3">Category</th>
                            <th className="pb-3 pr-4 text-right">Actions</th>
                          </>
                        )}
                        {activeModal === 'invoices' && (
                          <>
                            <th className="pb-3 pl-4">Invoice #</th>
                            <th className="pb-3">Client</th>
                            <th className="pb-3">Date</th>
                            <th className="pb-3">Amount</th>
                            <th className="pb-3 pr-4 text-right">Actions</th>
                          </>
                        )}
                        {(activeModal === 'amc' || activeModal === 'expired-amc') && (
                          <>
                            <th className="pb-3 pl-4">Contract #</th>
                            <th className="pb-3">Coverage End</th>
                            <th className="pb-3">Amount</th>
                            <th className="pb-3 pr-4 text-right">Actions</th>
                          </>
                        )}
                        {activeModal === 'service-work' && (
                          <>
                            <th className="pb-3 pl-4">Ticket</th>
                            <th className="pb-3">Issue Title</th>
                            <th className="pb-3">Priority</th>
                            <th className="pb-3">Due Date</th>
                            <th className="pb-3 pr-4 text-right">Actions</th>
                          </>
                        )}
                        {activeModal === 'enquiries' && (
                          <>
                            <th className="pb-3 pl-4">Company</th>
                            <th className="pb-3">Contact Person</th>
                            <th className="pb-3">Status</th>
                            <th className="pb-3 pr-4 text-right">Actions</th>
                          </>
                        )}
                        {activeModal === 'purchase-orders' && (
                          <>
                            <th className="pb-3 pl-4">PO Number</th>
                            <th className="pb-3">Supplier</th>
                            <th className="pb-3">Total Amount</th>
                            <th className="pb-3">Status</th>
                            <th className="pb-3 pr-4 text-right">Actions</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {modalData.map((item) => (
                        <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                          {activeModal === 'customers' && (
                            <>
                              <td className="py-4 pl-4 font-semibold text-white">{item.company_name}</td>
                              <td className="py-4 text-slate-300">{item.contact_person}</td>
                              <td className="py-4 text-vodacom-muted">{item.email}</td>
                              <td className="py-4 pr-4 text-right">
                                <button onClick={() => { setActiveModal(null); router.push(`/customers/${item.id}`); }} className="text-vodacom-blue hover:text-white inline-flex items-center gap-1">
                                  View <ExternalLink size={12} />
                                </button>
                              </td>
                            </>
                          )}
                          {activeModal === 'products' && (
                            <>
                              <td className="py-4 pl-4 font-mono text-white">{item.sku || `PROD-${item.id}`}</td>
                              <td className="py-4 text-slate-300 font-semibold">{item.name}</td>
                              <td className="py-4 text-vodacom-muted">{item.category}</td>
                              <td className="py-4 pr-4 text-right">
                                <button onClick={() => { setActiveModal(null); router.push(`/products/${item.id}`); }} className="text-vodacom-blue hover:text-white inline-flex items-center gap-1">
                                  View <ExternalLink size={12} />
                                </button>
                              </td>
                            </>
                          )}
                          {activeModal === 'invoices' && (
                            <>
                              <td className="py-4 pl-4 font-mono font-bold text-white">{item.invoice_number}</td>
                              <td className="py-4 text-slate-300">{item.customer?.company_name || `Company #${item.customer_id}`}</td>
                              <td className="py-4 text-vodacom-muted">{new Date(item.date).toLocaleDateString('en-IN')}</td>
                              <td className="py-4 text-white font-semibold">₹{item.grand_total.toLocaleString('en-IN')}</td>
                              <td className="py-4 pr-4 text-right">
                                <button onClick={() => { setActiveModal(null); router.push(`/invoices/${item.id}`); }} className="text-vodacom-blue hover:text-white inline-flex items-center gap-1">
                                  View <ExternalLink size={12} />
                                </button>
                              </td>
                            </>
                          )}
                          {(activeModal === 'amc' || activeModal === 'expired-amc') && (
                            <>
                              <td className="py-4 pl-4 font-mono font-bold text-white">{item.contract_number}</td>
                              <td className="py-4 text-vodacom-muted">{new Date(item.end_date).toLocaleDateString('en-IN')}</td>
                              <td className="py-4 text-white font-semibold">₹{item.amount.toLocaleString('en-IN')}</td>
                              <td className="py-4 pr-4 text-right">
                                <button onClick={() => { setActiveModal(null); router.push(`/amc/${item.id}`); }} className="text-vodacom-blue hover:text-white inline-flex items-center gap-1">
                                  {activeModal === 'expired-amc' ? 'Renew' : 'View'} <ExternalLink size={12} />
                                </button>
                              </td>
                            </>
                          )}
                          {activeModal === 'service-work' && (
                            <>
                              <td className="py-4 pl-4 font-mono text-vodacom-blue">SW-{item.id.toString().padStart(4, '0')}</td>
                              <td className="py-4 text-white font-medium">{item.title}</td>
                              <td className="py-4">
                                <Badge variant={item.priority === 'high' || item.priority === 'critical' ? 'danger' : item.priority === 'medium' ? 'warning' : 'default'}>
                                  {item.priority}
                                </Badge>
                              </td>
                              <td className="py-4 text-vodacom-muted">{item.due_date ? new Date(item.due_date).toLocaleDateString('en-IN') : '-'}</td>
                              <td className="py-4 pr-4 text-right">
                                <button onClick={() => { setActiveModal(null); router.push(`/service-work/${item.id}`); }} className="text-vodacom-blue hover:text-white inline-flex items-center gap-1">
                                  View <ExternalLink size={12} />
                                </button>
                              </td>
                            </>
                          )}
                          {activeModal === 'enquiries' && (
                            <>
                              <td className="py-4 pl-4 font-semibold text-white">{item.company_name}</td>
                              <td className="py-4 text-slate-300">{item.contact_person}</td>
                              <td className="py-4">
                                <Badge variant={item.status === 'approved' ? 'success' : item.status === 'rejected' ? 'danger' : 'warning'}>
                                  {item.status}
                                </Badge>
                              </td>
                              <td className="py-4 pr-4 text-right">
                                <button onClick={() => { setActiveModal(null); router.push(`/enquiries/${item.id}`); }} className="text-vodacom-blue hover:text-white inline-flex items-center gap-1">
                                  View <ExternalLink size={12} />
                                </button>
                              </td>
                            </>
                          )}
                          {activeModal === 'purchase-orders' && (
                            <>
                              <td className="py-4 pl-4 font-mono font-bold text-vodacom-blue">{item.po_number}</td>
                              <td className="py-4 text-slate-300">{item.receiver_name}</td>
                              <td className="py-4 text-white font-semibold">₹{(item.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                              <td className="py-4">
                                <Badge variant={item.status === 'received' ? 'success' : item.status === 'sent' ? 'warning' : item.status === 'cancelled' ? 'danger' : 'default'}>
                                  {item.status}
                                </Badge>
                              </td>
                              <td className="py-4 pr-4 text-right">
                                <button onClick={() => { setActiveModal(null); router.push(`/purchase-orders/${item.id}`); }} className="text-vodacom-blue hover:text-white inline-flex items-center gap-1">
                                  View <ExternalLink size={12} />
                                </button>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-white/5 bg-vodacom-darker/30 flex justify-end gap-3">
              <button 
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 hover:text-white rounded-lg transition-colors"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
