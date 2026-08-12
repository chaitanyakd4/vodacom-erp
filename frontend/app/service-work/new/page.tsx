'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wrench, Search, UserCheck, Phone } from 'lucide-react';
import { useCustomers } from '../../../hooks/useCustomers';
import { useProducts } from '../../../hooks/useProducts';
import api from '../../../lib/api';

export default function NewServiceWorkPage() {
  const router = useRouter();
  const { customers, loading: custLoading } = useCustomers();
  const { products, loading: prodLoading } = useProducts();

  const [formData, setFormData] = useState({
    customer_id: '',
    product_id: '',
    title: '',
    person_on_duty: '',
    technician_mobile: '',
    priority: 'medium',
    status: 'open',
    due_date: ''
  });
  const [productSearch, setProductSearch] = useState<string>('');
  const [saving, setSaving] = useState(false);

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
      alert('Please select a client customer.');
      return;
    }
    if (!formData.title.trim()) {
      alert('Please enter an issue summary title.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        customer_id: Number(formData.customer_id),
        product_id: formData.product_id ? Number(formData.product_id) : null,
        title: formData.title.trim(),
        person_on_duty: formData.person_on_duty.trim() || null,
        technician_mobile: formData.technician_mobile.trim() || null,
        priority: formData.priority,
        status: formData.status,
        due_date: formData.due_date ? formData.due_date : null
      };

      await api.post('/api/service-work', payload);
      alert('Service work ticket created successfully!');
      router.push('/service-work');
    } catch (err: any) {
      console.error('Failed to create ticket:', err);
      const detail = err?.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : (Array.isArray(detail) ? detail.map((d: any) => d.msg).join(', ') : 'Failed to create service ticket.');
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
    <div className="max-w-2xl mx-auto bg-vodacom-surface border border-white/5 p-8 rounded-2xl shadow-2xl space-y-6">
      <div>
        <h1 className="text-lg font-bold text-white tracking-wide mb-1 flex items-center gap-2">
          <Wrench size={20} className="text-vodacom-green" />
          <span>Create Service Work Ticket</span>
        </h1>
        <p className="text-xs text-vodacom-muted">Log a new client query, complaint, or hardware repair request</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">
              Client Customer <span className="text-red-400">*</span>
            </label>
            <select
              required
              className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue focus:border-vodacom-blue transition-all duration-200"
              value={formData.customer_id}
              onChange={e => setFormData({ ...formData, customer_id: e.target.value })}
            >
              <option value="">-- Choose Customer --</option>
              {customers.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.company_name} ({c.contact_person})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">
              Related Product/Service (Optional)
            </label>
            <div className="relative mb-2">
              <input
                type="text"
                placeholder="Search products..."
                className="w-full bg-vodacom-darker/60 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-[12px] text-white placeholder-vodacom-muted focus:outline-none focus:ring-1 focus:ring-vodacom-blue transition-all duration-200"
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
              />
              <Search className="absolute left-3 top-2.5 text-vodacom-muted" size={13} />
            </div>
            <select
              className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue focus:border-vodacom-blue transition-all duration-200"
              value={formData.product_id}
              onChange={e => setFormData({ ...formData, product_id: e.target.value })}
            >
              <option value="">-- None / General --</option>
              {filteredProducts.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">
            Issue Summary <span className="text-red-400">*</span>
          </label>
          <input
            required
            type="text"
            className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue focus:border-vodacom-blue transition-all duration-200"
            placeholder="e.g. Server not booting, Network Switch Port 5 failure"
            value={formData.title}
            onChange={e => setFormData({ ...formData, title: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <UserCheck size={12} className="text-vodacom-blue" />
            Person on Duty (Technician/Engineer)
          </label>
          <input
            type="text"
            className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue focus:border-vodacom-blue transition-all duration-200"
            placeholder="Name of the technician / engineer assigned to this ticket"
            value={formData.person_on_duty}
            onChange={e => setFormData({ ...formData, person_on_duty: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Phone size={12} className="text-vodacom-green" />
            Technician Mobile Number
            <span className="text-[9px] text-vodacom-muted/70 ml-1 font-normal normal-case">(SMS &amp; WhatsApp alert on ticket creation)</span>
          </label>
          <input
            type="tel"
            className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-green focus:border-vodacom-green transition-all duration-200"
            placeholder="e.g. 9876543210 or +919876543210"
            value={formData.technician_mobile}
            onChange={e => setFormData({ ...formData, technician_mobile: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">Priority</label>
            <select
              className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue focus:border-vodacom-blue transition-all duration-200"
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
            <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">Initial Status</label>
            <select
              className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue focus:border-vodacom-blue transition-all duration-200"
              value={formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="open">Open (New)</option>
              <option value="in_progress">In Progress</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">Due Date (Optional)</label>
            <input
              type="date"
              className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue focus:border-vodacom-blue transition-all duration-200"
              value={formData.due_date}
              onChange={e => setFormData({ ...formData, due_date: e.target.value })}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 text-[12px] font-bold uppercase tracking-wider">
          <button
            type="button"
            onClick={() => router.push('/service-work')}
            className="px-5 py-2.5 border border-white/10 hover:bg-white/5 text-vodacom-text rounded-xl transition-all duration-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-vodacom-green hover:bg-emerald-500 text-white rounded-xl transition-all duration-200 shadow-lg shadow-vodacom-green/15 border-none cursor-pointer disabled:opacity-50"
          >
            {saving ? 'Creating Ticket...' : 'Create Ticket'}
          </button>
        </div>
      </form>
    </div>
  );
}
