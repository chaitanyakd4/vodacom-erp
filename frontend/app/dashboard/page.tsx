'use client';
import { useEffect, useState } from 'react';
import { Users, Package, FileText, ShieldCheck, TrendingUp, Wrench, AlertTriangle, Clock, Megaphone, X, ExternalLink } from 'lucide-react';
import api from '../../lib/api';
import { useRouter } from 'next/navigation';
import { Badge } from '../../components/ui/Badge';

export default function Dashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [reminders, setReminders] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modal stats list states
  const [activeModal, setActiveModal] = useState<'customers' | 'products' | 'invoices' | 'amc' | 'service-work' | 'enquiries' | null>(null);
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

  const openDetailsModal = async (type: 'customers' | 'products' | 'invoices' | 'amc' | 'service-work' | 'enquiries') => {
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
        // Filter pending invoices
        setModalData(res.data.filter((inv: any) => inv.status === 'pending'));
      } else if (type === 'amc') {
        const res = await api.get('/api/amc/');
        // Filter active AMCs
        setModalData(res.data.filter((amc: any) => amc.status === 'active'));
      } else if (type === 'service-work') {
        const res = await api.get('/api/service-work/');
        // Filter open/in_progress tickets
        setModalData(res.data.filter((sw: any) => sw.status === 'open' || sw.status === 'in_progress'));
      } else if (type === 'enquiries') {
        const res = await api.get('/api/sales/enquiries');
        // Filter active enquiries
        setModalData(res.data.filter((enq: any) => enq.status === 'new' || enq.status === 'quoted'));
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
      type: 'service-work' as const,
      label: 'Open Service Work',
      value: stats?.open_service_work ?? 0,
      icon: Wrench,
      colorClass: 'text-rose-400',
      glowClass: 'hover:shadow-rose-500/5',
      borderClass: 'border-l-4 border-rose-500',
    },
    {
      type: 'enquiries' as const,
      label: 'Active Enquiries',
      value: stats?.active_enquiries ?? 0,
      icon: Megaphone,
      colorClass: 'text-amber-400',
      glowClass: 'hover:shadow-amber-500/5',
      borderClass: 'border-l-4 border-amber-500',
    },
  ];

  return (
    <div>
      {/* Welcome banner */}
      <div className="mb-8 p-6 bg-gradient-to-r from-vodacom-surface to-vodacom-darker border border-white/5 rounded-2xl flex items-center justify-between shadow-xl">
        <div>
          <h2 className="text-[18px] font-bold text-white tracking-wide">Welcome to Vodacom ERP</h2>
          <p className="text-xs text-vodacom-muted mt-1 leading-relaxed">
            Manage your company customers, product inventory, invoices, and AMC contracts effortlessly.
          </p>
        </div>
        <div className="w-10 h-10 bg-vodacom-green/10 border border-vodacom-green/20 rounded-xl flex items-center justify-center text-vodacom-green hidden sm:flex">
          <TrendingUp size={20} />
        </div>
      </div>

      {/* Grid of clickable cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              onClick={() => openDetailsModal(card.type)}
              className={`bg-vodacom-surface border border-white/5 ${card.borderClass} ${card.glowClass} hover:border-white/10 hover:-translate-y-0.5 rounded-2xl p-6 transition-all duration-300 shadow-xl flex items-center justify-between cursor-pointer group`}
            >
              <div>
                <dt className="text-[11px] font-bold text-vodacom-muted uppercase tracking-wider group-hover:text-white transition-colors">
                  {card.label}
                </dt>
                <dd className="mt-2 text-2xl font-black text-white font-sans tracking-tight flex items-baseline gap-2">
                  {card.value}
                  <span className="text-[10px] text-vodacom-blue font-semibold tracking-wide opacity-0 group-hover:opacity-100 transition-opacity">View details →</span>
                </dd>
              </div>
              <div className={`w-11 h-11 bg-vodacom-darker/60 rounded-xl flex items-center justify-center border border-white/5 transition-transform duration-300 group-hover:scale-110 ${card.colorClass}`}>
                <Icon size={20} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Reminders Panel */}
      {reminders && (
        <div className="mt-10">
          <h2 className="text-sm font-bold text-white tracking-wide mb-4 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-400" />
            Action Required & Reminders
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Overdue Service Work */}
            {reminders.service_work_overdue?.map((sw: any) => (
              <div key={`sw-overdue-${sw.id}`} onClick={() => router.push(`/service-work/${sw.id}`)} className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl cursor-pointer hover:bg-red-500/15 transition-colors flex items-start gap-4">
                <div className="mt-1"><AlertTriangle size={18} className="text-red-400" /></div>
                <div>
                  <div className="text-xs font-bold text-red-400 uppercase">Overdue Service Ticket</div>
                  <div className="text-sm font-semibold text-white mt-0.5">{sw.title}</div>
                  <div className="text-xs text-red-300 mt-1">Due Date: {new Date(sw.due_date).toLocaleDateString('en-IN')}</div>
                </div>
              </div>
            ))}

            {/* Expired AMC */}
            {reminders.amc_expired?.map((amc: any) => (
              <div key={`amc-expired-${amc.id}`} onClick={() => router.push(`/amc/${amc.id}`)} className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl cursor-pointer hover:bg-red-500/15 transition-colors flex items-start gap-4">
                <div className="mt-1"><AlertTriangle size={18} className="text-red-400" /></div>
                <div>
                  <div className="text-xs font-bold text-red-400 uppercase">Expired AMC Contract</div>
                  <div className="text-sm font-semibold text-white mt-0.5">{amc.contract_number}</div>
                  <div className="text-xs text-red-300 mt-1">Expired on: {new Date(amc.end_date).toLocaleDateString('en-IN')}</div>
                </div>
              </div>
            ))}

            {/* Due Soon Service Work */}
            {reminders.service_work_due_soon?.map((sw: any) => (
              <div key={`sw-due-${sw.id}`} onClick={() => router.push(`/service-work/${sw.id}`)} className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl cursor-pointer hover:bg-amber-500/15 transition-colors flex items-start gap-4">
                <div className="mt-1"><Clock size={18} className="text-amber-400" /></div>
                <div>
                  <div className="text-xs font-bold text-amber-400 uppercase">Service Ticket Due Soon</div>
                  <div className="text-sm font-semibold text-white mt-0.5">{sw.title}</div>
                  <div className="text-xs text-amber-300 mt-1">Due Date: {new Date(sw.due_date).toLocaleDateString('en-IN')}</div>
                </div>
              </div>
            ))}

            {/* Expiring Soon AMC */}
            {reminders.amc_expiring_soon?.map((amc: any) => (
              <div key={`amc-expiring-${amc.id}`} onClick={() => router.push(`/amc/${amc.id}`)} className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl cursor-pointer hover:bg-amber-500/15 transition-colors flex items-start gap-4">
                <div className="mt-1"><Clock size={18} className="text-amber-400" /></div>
                <div>
                  <div className="text-xs font-bold text-amber-400 uppercase">AMC Expiring Soon</div>
                  <div className="text-sm font-semibold text-white mt-0.5">{amc.contract_number}</div>
                  <div className="text-xs text-amber-300 mt-1">Expires on: {new Date(amc.end_date).toLocaleDateString('en-IN')}</div>
                </div>
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
                   activeModal === 'enquiries' ? 'Active Sales Enquiries' : 
                   activeModal === 'invoices' ? 'Pending Invoices' : 
                   activeModal === 'service-work' ? 'Open Service Tickets' : 
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
                  No items found under this status.
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
                        {activeModal === 'amc' && (
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
                            <th className="pb-3">Date</th>
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
                          {activeModal === 'amc' && (
                            <>
                              <td className="py-4 pl-4 font-mono font-bold text-white">{item.contract_number}</td>
                              <td className="py-4 text-vodacom-muted">{new Date(item.end_date).toLocaleDateString('en-IN')}</td>
                              <td className="py-4 text-white font-semibold">₹{item.amount.toLocaleString('en-IN')}</td>
                              <td className="py-4 pr-4 text-right">
                                <button onClick={() => { setActiveModal(null); router.push(`/amc/${item.id}`); }} className="text-vodacom-blue hover:text-white inline-flex items-center gap-1">
                                  View <ExternalLink size={12} />
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
                              <td className="py-4 text-vodacom-muted">{new Date(item.created_at).toLocaleDateString('en-IN')}</td>
                              <td className="py-4 pr-4 text-right">
                                <button onClick={() => { setActiveModal(null); router.push(`/enquiries/${item.id}`); }} className="text-vodacom-blue hover:text-white inline-flex items-center gap-1">
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
