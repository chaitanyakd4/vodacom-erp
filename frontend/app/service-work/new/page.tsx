'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Wrench,
  Search,
  UserCheck,
  Phone,
  ShieldCheck,
  IndianRupee,
  MapPin,
  Plus,
  Users,
  CheckCircle2,
  Sparkles,
  X,
} from 'lucide-react';
import { useCustomers } from '../../../hooks/useCustomers';
import { useProducts } from '../../../hooks/useProducts';
import api from '../../../lib/api';

export default function NewServiceWorkPage() {
  const router = useRouter();
  const { customers, loading: custLoading, refetch: refetchCustomers } = useCustomers();
  const { products, loading: prodLoading } = useProducts();

  // Ticket mode: 'self' (Engineer logging own visit) vs 'assign' (External query assigned to team)
  const [ticketMode, setTicketMode] = useState<'self' | 'assign'>('self');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [amcContracts, setAmcContracts] = useState<any[]>([]);

  // On-site check-in happens AFTER the ticket is generated and opened
  const [checkInOnSiteNow, setCheckInOnSiteNow] = useState<boolean>(false);
  const [notifyEngineerOnSelf, setNotifyEngineerOnSelf] = useState<boolean>(false);

  // Quick Walk-in Customer modal/inline form
  const [showQuickCustomer, setShowQuickCustomer] = useState<boolean>(false);
  const [creatingCustomer, setCreatingCustomer] = useState<boolean>(false);
  const [quickCust, setQuickCust] = useState({
    company_name: '',
    contact_person: '',
    phone: '',
    address: '',
  });

  const [formData, setFormData] = useState({
    customer_id: '',
    product_id: '',
    title: '',
    person_on_duty: '',
    technician_mobile: '',
    priority: 'medium',
    status: 'open',
    billing_type: 'billable',
    amc_contract_number: '',
    estimated_charge: '',
    due_date: '',
  });

  const [productSearch, setProductSearch] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // Fetch logged-in user, team directory, and AMC contracts
  useEffect(() => {
    const loadContext = async () => {
      try {
        const [meRes, teamRes, amcRes] = await Promise.allSettled([
          api.get('/api/auth/me'),
          api.get('/api/auth/team'),
          api.get('/api/amc'),
        ]);

        let derivedName = '';
        let derivedPhone = '';

        if (meRes.status === 'fulfilled' && meRes.value.data) {
          const me = meRes.value.data;
          setCurrentUser(me);
          derivedName =
            me.full_name ||
            (me.email ? me.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : '');
          derivedPhone = me.phone || '';
        }

        if (teamRes.status === 'fulfilled' && Array.isArray(teamRes.value.data)) {
          const team = teamRes.value.data;
          setTeamMembers(team);
          const myEntry = team.find((m: any) => m.is_current_user);
          if (myEntry) {
            if (!derivedName && myEntry.name) derivedName = myEntry.name;
            if (!derivedPhone && myEntry.phone) derivedPhone = myEntry.phone;
          }
        }

        if (amcRes.status === 'fulfilled' && Array.isArray(amcRes.value.data)) {
          setAmcContracts(amcRes.value.data);
        }

        if (derivedName || derivedPhone) {
          setFormData(prev => ({
            ...prev,
            person_on_duty: prev.person_on_duty || derivedName,
            technician_mobile: prev.technician_mobile || derivedPhone,
          }));
        }
      } catch (e) {
        console.warn('Could not load initial engineer context:', e);
      }
    };
    loadContext();
  }, []);

  // Switch between Self-Logged Visit vs External Assigned Query
  const handleModeSwitch = (mode: 'self' | 'assign') => {
    setTicketMode(mode);
    if (mode === 'self') {
      const myName =
        currentUser?.full_name ||
        (currentUser?.email
          ? currentUser.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
          : '');
      const myPhone = currentUser?.phone || teamMembers.find((m: any) => m.is_current_user)?.phone || '';
      setFormData(prev => ({
        ...prev,
        person_on_duty: myName || prev.person_on_duty,
        technician_mobile: myPhone || prev.technician_mobile,
        status: 'open',
      }));
      setCheckInOnSiteNow(false);
    } else {
      setFormData(prev => ({
        ...prev,
        status: 'open',
      }));
      setCheckInOnSiteNow(false);
    }
  };

  // Auto-detect active AMC when customer changes
  const selectedCustomerAmcs = amcContracts.filter(
    (a: any) => Number(a.customer_id) === Number(formData.customer_id) && a.status === 'active'
  );

  const handleCustomerChange = (customerId: string) => {
    const activeAmc = amcContracts.find(
      (a: any) => Number(a.customer_id) === Number(customerId) && a.status === 'active'
    );
    if (activeAmc) {
      setFormData(prev => ({
        ...prev,
        customer_id: customerId,
        billing_type: 'under_amc',
        amc_contract_number: activeAmc.contract_number || '',
        estimated_charge: '',
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        customer_id: customerId,
        billing_type: 'billable',
        amc_contract_number: '',
      }));
    }
  };

  // Quick-add walk-in customer handler
  const handleCreateQuickCustomer = async () => {
    if (!quickCust.company_name.trim()) {
      alert('Please enter the Client / Company Name.');
      return;
    }
    setCreatingCustomer(true);
    try {
      const res = await api.post('/api/customers/', {
        company_name: quickCust.company_name.trim(),
        contact_person: quickCust.contact_person.trim() || 'On-Site Contact',
        phone: quickCust.phone.trim() || 'N/A',
        address: quickCust.address.trim() || 'On-Site Walk-In',
      });
      const newCust = res.data;
      if (refetchCustomers) await refetchCustomers();
      setFormData(prev => ({
        ...prev,
        customer_id: String(newCust.id),
        billing_type: 'billable',
      }));
      setShowQuickCustomer(false);
      setQuickCust({ company_name: '', contact_person: '', phone: '', address: '' });
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to add walk-in customer.');
    } finally {
      setCreatingCustomer(false);
    }
  };

  const filteredCustomers = customers.filter((c: any) => {
    const q = customerSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      c.company_name?.toLowerCase().includes(q) ||
      c.contact_person?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.gstin?.toLowerCase().includes(q)
    );
  });

  const filteredProducts = products.filter((p: any) => {
    const q = productSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q))
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_id) {
      alert('Please select or quick-add a client customer.');
      return;
    }
    if (!formData.title.trim()) {
      alert('Please enter an issue summary title.');
      return;
    }

    setSaving(true);
    try {
      // Optional GPS capture if engineer is checking in on site right now
      let reachedAtIso: string | null = null;
      let reachedLocationUrl: string | null = null;

      if (checkInOnSiteNow) {
        reachedAtIso = new Date().toISOString();
        if (typeof window !== 'undefined' && 'geolocation' in navigator) {
          try {
            const pos: any = await new Promise((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                timeout: 5000,
                enableHighAccuracy: true,
                maximumAge: 0,
              });
            });
            reachedLocationUrl = `https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`;
          } catch {
            // Proceed with timestamp even if GPS permission/HTTP is unavailable
          }
        }
      }

      const shouldNotifyEngineer = ticketMode === 'assign' ? true : notifyEngineerOnSelf;

      const payload = {
        customer_id: Number(formData.customer_id),
        product_id: formData.product_id ? Number(formData.product_id) : null,
        title: formData.title.trim(),
        person_on_duty: formData.person_on_duty.trim() || null,
        technician_mobile: formData.technician_mobile.trim() || null,
        priority: formData.priority,
        status: checkInOnSiteNow ? 'in_progress' : formData.status,
        billing_type: formData.billing_type,
        amc_contract_number: formData.billing_type === 'under_amc' ? formData.amc_contract_number.trim() || null : null,
        estimated_charge:
          formData.billing_type === 'billable' && formData.estimated_charge
            ? Number(formData.estimated_charge)
            : 0.0,
        due_date: formData.due_date ? formData.due_date : null,
        reached_at: reachedAtIso,
        reached_location: reachedLocationUrl,
        notify_engineer: shouldNotifyEngineer,
      };

      const res = await api.post('/api/service-work', payload);
      const newTicket = res.data;
      const ticketRef = `SW-${String(newTicket.id).padStart(4, '0')}`;
      const techName = newTicket.person_on_duty ? ` technician ${newTicket.person_on_duty}` : ' the technician';

      if (shouldNotifyEngineer && newTicket.technician_mobile) {
        if (newTicket.whatsapp_sent) {
          alert(
            `✅ Service ticket ${ticketRef} created successfully!\n\n📲 WhatsApp notification sent via Meta API to${techName} (${newTicket.technician_mobile}).`
          );
        } else {
          const reason =
            newTicket.whatsapp_error ||
            'Recipient number is not yet verified in Meta Cloud API or outside 24h window.';
          const openDirect = window.confirm(
            `✅ Service ticket ${ticketRef} created!\n\n⚠️ Meta Cloud API could not deliver directly to ${newTicket.technician_mobile}:\n${reason}\n\nClick OK to send the job card & Google Maps link directly via WhatsApp App now.`
          );
          if (openDirect && newTicket.wa_direct_url) {
            window.open(newTicket.wa_direct_url, '_blank');
          }
        }
      } else {
        alert(
          `✅ Service ticket ${ticketRef} logged under ${newTicket.person_on_duty || 'Engineer'}${
            checkInOnSiteNow ? ' (On-Site Check-In Recorded)' : ''
          }!`
        );
      }
      router.push(`/service-work/${newTicket.id}`);
    } catch (err: any) {
      console.error('Failed to create ticket:', err);
      const detail = err?.response?.data?.detail;
      const msg =
        typeof detail === 'string'
          ? detail
          : Array.isArray(detail)
          ? detail.map((d: any) => d.msg).join(', ')
          : 'Failed to create service ticket.';
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  if (custLoading || prodLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="w-8 h-8 border-2 border-vodacom-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto bg-vodacom-surface border border-white/5 p-6 sm:p-8 rounded-2xl shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
        <div>
          <h1 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
            <Wrench size={20} className="text-vodacom-green" />
            <span>Create Service Work Ticket</span>
          </h1>
          <p className="text-xs text-vodacom-muted mt-0.5">
            Log your own field visit directly or assign an incoming external client query to the team
          </p>
        </div>
        {currentUser && (
          <div className="px-3 py-1.5 rounded-xl bg-vodacom-darker border border-white/10 text-[11px] text-slate-300 flex items-center gap-1.5 shrink-0">
            <UserCheck size={13} className="text-vodacom-green" />
            <span>Logged in:</span>
            <strong className="text-white">{currentUser.full_name || currentUser.email}</strong>
          </div>
        )}
      </div>

      {/* ── 1. ORIENTATION MODE SELECTOR: Self-Logged vs Assign External Query ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => handleModeSwitch('self')}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            ticketMode === 'self'
              ? 'bg-vodacom-green/10 border-vodacom-green text-white shadow-lg shadow-vodacom-green/10'
              : 'bg-vodacom-darker/60 border-white/10 text-vodacom-muted hover:text-white hover:border-white/20'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck size={14} className={ticketMode === 'self' ? 'text-vodacom-green' : 'text-vodacom-muted'} />
              Engineer Self-Log / Walk-In
            </span>
            {ticketMode === 'self' && (
              <span className="text-[10px] bg-vodacom-green text-black font-bold px-2 py-0.5 rounded-full">ACTIVE</span>
            )}
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Auto-fills your login details, marks ticket In-Progress, and records on-site check-in.
          </p>
        </button>

        <button
          type="button"
          onClick={() => handleModeSwitch('assign')}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            ticketMode === 'assign'
              ? 'bg-vodacom-blue/15 border-vodacom-blue text-white shadow-lg shadow-vodacom-blue/10'
              : 'bg-vodacom-darker/60 border-white/10 text-vodacom-muted hover:text-white hover:border-white/20'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Users size={14} className={ticketMode === 'assign' ? 'text-vodacom-blue' : 'text-vodacom-muted'} />
              External Query / Team Dispatch
            </span>
            {ticketMode === 'assign' && (
              <span className="text-[10px] bg-vodacom-blue text-white font-bold px-2 py-0.5 rounded-full">ACTIVE</span>
            )}
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Assign an incoming office/client complaint to another engineer &amp; send WhatsApp dispatch.
          </p>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── 2. CLIENT & WALK-IN QUICK ENTRY ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold text-vodacom-muted uppercase tracking-wider">
                Client Customer <span className="text-red-400">*</span>
              </label>
              <button
                type="button"
                onClick={() => setShowQuickCustomer(!showQuickCustomer)}
                className="text-[11px] font-semibold text-vodacom-green hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus size={12} />
                <span>{showQuickCustomer ? 'Close Walk-In Form' : 'Quick Add Walk-In Client'}</span>
              </button>
            </div>
            <div className="relative mb-2">
              <input
                type="text"
                placeholder="Search customers by name, phone..."
                className="w-full bg-vodacom-darker/60 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-[12px] text-white placeholder-vodacom-muted focus:outline-none focus:ring-1 focus:ring-vodacom-blue transition-all"
                value={customerSearch}
                onChange={e => setCustomerSearch(e.target.value)}
              />
              <Search className="absolute left-3 top-2.5 text-vodacom-muted" size={13} />
            </div>
            <select
              required
              className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue transition-all"
              value={formData.customer_id}
              onChange={e => handleCustomerChange(e.target.value)}
            >
              <option value="">-- Choose Customer --</option>
              {filteredCustomers.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.company_name} ({c.contact_person})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">
              Related Product / Equipment (Optional)
            </label>
            <div className="relative mb-2">
              <input
                type="text"
                placeholder="Search products..."
                className="w-full bg-vodacom-darker/60 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-[12px] text-white placeholder-vodacom-muted focus:outline-none focus:ring-1 focus:ring-vodacom-blue transition-all"
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
              />
              <Search className="absolute left-3 top-2.5 text-vodacom-muted" size={13} />
            </div>
            <select
              className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue transition-all"
              value={formData.product_id}
              onChange={e => setFormData({ ...formData, product_id: e.target.value })}
            >
              <option value="">-- None / General Service --</option>
              {filteredProducts.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Inline Walk-In Customer Quick Creation Box */}
        {showQuickCustomer && (
          <div className="p-4 rounded-xl bg-vodacom-darker border border-vodacom-green/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-vodacom-green uppercase tracking-wider flex items-center gap-1.5">
                <Plus size={13} /> New Walk-In / On-Site Client
              </span>
              <button
                type="button"
                onClick={() => setShowQuickCustomer(false)}
                className="text-vodacom-muted hover:text-white"
              >
                <X size={14} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Company / Client Name *"
                className="bg-vodacom-surface border border-white/10 rounded-lg p-2.5 text-xs text-white"
                value={quickCust.company_name}
                onChange={e => setQuickCust({ ...quickCust, company_name: e.target.value })}
              />
              <input
                type="text"
                placeholder="Contact Person Name"
                className="bg-vodacom-surface border border-white/10 rounded-lg p-2.5 text-xs text-white"
                value={quickCust.contact_person}
                onChange={e => setQuickCust({ ...quickCust, contact_person: e.target.value })}
              />
              <input
                type="tel"
                placeholder="Client Phone / WhatsApp Number"
                className="bg-vodacom-surface border border-white/10 rounded-lg p-2.5 text-xs text-white"
                value={quickCust.phone}
                onChange={e => setQuickCust({ ...quickCust, phone: e.target.value })}
              />
              <input
                type="text"
                placeholder="Site Location / Address"
                className="bg-vodacom-surface border border-white/10 rounded-lg p-2.5 text-xs text-white"
                value={quickCust.address}
                onChange={e => setQuickCust({ ...quickCust, address: e.target.value })}
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                disabled={creatingCustomer}
                onClick={handleCreateQuickCustomer}
                className="px-4 py-2 bg-vodacom-green hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
              >
                {creatingCustomer ? 'Saving Client...' : 'Save & Select Client'}
              </button>
            </div>
          </div>
        )}

        {/* ── 3. ISSUE SUMMARY & QUICK WORK TAGS ── */}
        <div>
          <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">
            Issue Summary / Work Description <span className="text-red-400">*</span>
          </label>
          <input
            required
            type="text"
            className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue transition-all"
            placeholder="e.g. CCTV DVR hard disk replacement, Network Switch Port failure, Routine AMC Checkup"
            value={formData.title}
            onChange={e => setFormData({ ...formData, title: e.target.value })}
          />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {[
              'AMC Routine Maintenance Visit',
              'New Installation & Setup',
              'Hardware Breakdown / Repair',
              'Network / Cable Troubleshooting',
              'Site Inspection & Survey',
            ].map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() =>
                  setFormData(prev => ({
                    ...prev,
                    title: prev.title ? `${prev.title} - ${tag}` : tag,
                  }))
                }
                className="text-[10px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors cursor-pointer"
              >
                + {tag}
              </button>
            ))}
          </div>
        </div>

        {/* ── 4. BILLABLE VS UNDER AMC SECTION ── */}
        <div className="p-4 rounded-2xl bg-vodacom-darker/70 border border-white/10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-vodacom-blue" />
              <span>Service Billing Category (Billable vs Under AMC)</span>
            </label>
            {formData.customer_id && (
              selectedCustomerAmcs.length > 0 ? (
                <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 size={11} /> Active AMC Found ({selectedCustomerAmcs[0].contract_number})
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
                  No Active AMC — Billable Client
                </span>
              )
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { id: 'under_amc', label: '🛡️ Under AMC', desc: 'Covered by AMC contract' },
              { id: 'billable', label: '💰 Billable Visit', desc: 'Chargeable service/spares' },
              { id: 'warranty', label: '🔧 Warranty', desc: 'Under product warranty' },
              { id: 'free_service', label: '🤝 Free / Goodwill', desc: 'No-charge support visit' },
            ].map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFormData({ ...formData, billing_type: opt.id })}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  formData.billing_type === opt.id
                    ? opt.id === 'under_amc'
                      ? 'bg-emerald-500/15 border-emerald-500 text-white'
                      : opt.id === 'billable'
                      ? 'bg-amber-500/15 border-amber-500 text-white'
                      : 'bg-vodacom-blue/15 border-vodacom-blue text-white'
                    : 'bg-vodacom-surface/60 border-white/10 text-vodacom-muted hover:text-white'
                }`}
              >
                <div className="text-xs font-bold">{opt.label}</div>
                <div className="text-[10px] opacity-80 mt-0.5">{opt.desc}</div>
              </button>
            ))}
          </div>

          {formData.billing_type === 'under_amc' && (
            <div className="pt-1">
              <label className="block text-[10px] font-bold text-vodacom-muted uppercase tracking-wider mb-1">
                AMC Contract Reference (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. AMC-2026-0001"
                className="w-full sm:w-72 bg-vodacom-surface border border-white/10 rounded-xl p-2.5 text-xs text-white"
                value={formData.amc_contract_number}
                onChange={e => setFormData({ ...formData, amc_contract_number: e.target.value })}
              />
            </div>
          )}

          {formData.billing_type === 'billable' && (
            <div className="pt-1">
              <label className="block text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <IndianRupee size={11} /> Estimated Visit / Service Charge (₹) (Optional)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 500 or 1500"
                className="w-full sm:w-72 bg-vodacom-surface border border-amber-500/30 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                value={formData.estimated_charge}
                onChange={e => setFormData({ ...formData, estimated_charge: e.target.value })}
              />
            </div>
          )}
        </div>

        {/* ── 5. ENGINEER DETAILS (AUTO-FILLED FROM LOGIN, CHANGEABLE FOR TEAM ASSIGNMENT) ── */}
        <div className="p-4 rounded-2xl bg-vodacom-darker/70 border border-white/10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck size={14} className="text-vodacom-green" />
                <span>Assigned Engineer / Person on Duty</span>
              </div>
              <p className="text-[10px] text-vodacom-muted mt-0.5">
                Auto-filled from your login, or click any team member below to assign/transfer this ticket
              </p>
            </div>
          </div>

          {/* Team Member Quick Selector Pills */}
          {teamMembers.length > 0 && (
            <div>
              <span className="block text-[10px] text-vodacom-muted uppercase tracking-wider mb-1.5">
                Quick Select Engineer from Team:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {teamMembers.map((member: any, idx: number) => {
                  const isSelected =
                    formData.person_on_duty.trim().toLowerCase() === (member.name || '').trim().toLowerCase();
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          person_on_duty: member.name || '',
                          technician_mobile: member.phone || prev.technician_mobile,
                        }));
                        if (!member.is_current_user) {
                          setTicketMode('assign');
                          setCheckInOnSiteNow(false);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-vodacom-green/20 border-vodacom-green text-white'
                          : 'bg-vodacom-surface border-white/10 text-slate-300 hover:border-white/30'
                      }`}
                    >
                      <span>{member.name}</span>
                      {member.is_current_user && (
                        <span className="text-[9px] bg-vodacom-green/30 text-vodacom-green px-1.5 py-0.2 rounded">
                          You
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">
                Engineer Name (Editable)
              </label>
              <input
                type="text"
                className="w-full bg-vodacom-surface border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue"
                placeholder="Type or edit engineer name..."
                value={formData.person_on_duty}
                onChange={e => setFormData({ ...formData, person_on_duty: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Phone size={12} className="text-vodacom-green" />
                <span>Engineer Mobile Number</span>
              </label>
              <input
                type="tel"
                className="w-full bg-vodacom-surface border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-green"
                placeholder="e.g. 9876543210"
                value={formData.technician_mobile}
                onChange={e => setFormData({ ...formData, technician_mobile: e.target.value })}
              />
            </div>
          </div>

          {ticketMode === 'self' && (
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={notifyEngineerOnSelf}
                onChange={e => setNotifyEngineerOnSelf(e.target.checked)}
                className="rounded border-white/20 bg-vodacom-darker text-vodacom-green focus:ring-vodacom-green"
              />
              <span>Also send WhatsApp job card alert to this engineer number</span>
            </label>
          )}
        </div>

        {/* ── 6. SITE CHECK-IN NOTE (CLICKABLE AFTER TICKET GENERATION) ── */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <MapPin size={18} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-white uppercase tracking-wide">
                Site Check-In &amp; Arrival Timing (Recorded After Ticket Generation)
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Ticket creation time is recorded now. Once generated, open the ticket upon reaching the client site and click <strong>&ldquo;Mark Reached Site&rdquo;</strong> to record or update your actual on-site arrival timestamp &amp; GPS.
              </p>
            </div>
          </div>
        </div>

        {/* ── 7. PRIORITY, STATUS & DUE DATE ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">
              Priority
            </label>
            <select
              className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue"
              value={formData.priority}
              onChange={e => setFormData({ ...formData, priority: e.target.value })}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical (ASAP)</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">
              Initial Status
            </label>
            <select
              className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue"
              value={checkInOnSiteNow ? 'in_progress' : formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="open">Open (New Query)</option>
              <option value="in_progress">In Progress (Active Visit)</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">
              Due Date (Optional)
            </label>
            <input
              type="date"
              className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue"
              value={formData.due_date}
              onChange={e => setFormData({ ...formData, due_date: e.target.value })}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 text-[12px] font-bold uppercase tracking-wider">
          <button
            type="button"
            onClick={() => router.push('/service-work')}
            className="px-5 py-2.5 border border-white/10 hover:bg-white/5 text-vodacom-text rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-vodacom-green hover:bg-emerald-500 text-white rounded-xl transition-all shadow-lg shadow-vodacom-green/15 border-none cursor-pointer disabled:opacity-50"
          >
            {saving
              ? 'Creating Ticket...'
              : ticketMode === 'self'
              ? 'Start & Log My Service Ticket'
              : 'Create & Assign Ticket'}
          </button>
        </div>
      </form>
    </div>
  );
}
