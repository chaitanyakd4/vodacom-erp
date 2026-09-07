'use client';
import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import api from '../../lib/api';
import { Building2, User, Phone, Mail, MapPin, Hash, Save } from 'lucide-react';

interface EditCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: any;
  onSuccess: (updatedCustomer: any) => void;
}

export function EditCustomerModal({ isOpen, onClose, customer, onSuccess }: EditCustomerModalProps) {
  const [formData, setFormData] = useState({
    company_name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    gstin: '',
    state_name: '',
    state_code: '',
    shipping_address: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (customer) {
      setFormData({
        company_name: customer.company_name || '',
        contact_person: customer.contact_person || '',
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || '',
        gstin: customer.gstin || '',
        state_name: customer.state_name || '',
        state_code: customer.state_code || '',
        shipping_address: customer.shipping_address || '',
      });
      setError('');
    }
  }, [customer]);

  if (!customer) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.company_name.trim()) {
      setError('Company name is required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...formData,
        company_name: formData.company_name.trim(),
        contact_person: formData.contact_person.trim() || 'Unknown Contact',
        phone: formData.phone.trim() || 'N/A',
        email: formData.email.trim() || null,
        address: formData.address.trim() || 'N/A',
      };
      const res = await api.put(`/api/customers/${customer.id}`, payload);
      onSuccess(res.data);
      onClose();
    } catch (err: any) {
      console.error('Failed to update customer:', err);
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Failed to update client profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Client Information">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">
            {error}
          </div>
        )}

        <div>
          <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Building2 size={12} className="text-vodacom-blue" />
            Client Company Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.company_name}
            onChange={e => setFormData({ ...formData, company_name: e.target.value })}
            className="w-full bg-vodacom-darker border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue"
            placeholder="e.g. Fraser Suites New Delhi"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <User size={12} className="text-vodacom-blue" />
              Contact Person
            </label>
            <input
              type="text"
              value={formData.contact_person}
              onChange={e => setFormData({ ...formData, contact_person: e.target.value })}
              className="w-full bg-vodacom-darker border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue"
              placeholder="Contact person name"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Phone size={12} className="text-vodacom-green" />
              Phone / Mobile
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              className="w-full bg-vodacom-darker border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-vodacom-green"
              placeholder="e.g. 9876543210"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Mail size={12} className="text-vodacom-blue" />
            Contact Email
          </label>
          <input
            type="text"
            value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value })}
            className="w-full bg-vodacom-darker border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue"
            placeholder="e.g. client@example.com"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <MapPin size={12} className="text-amber-400" />
            Site / Company Address
            <span className="text-[9px] text-amber-400/80 font-normal normal-case">(Used for Google Maps)</span>
          </label>
          <textarea
            rows={2}
            value={formData.address}
            onChange={e => setFormData({ ...formData, address: e.target.value })}
            className="w-full bg-vodacom-darker border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue"
            placeholder="Complete address for navigation"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Hash size={12} className="text-vodacom-muted" />
            GSTIN (Optional)
          </label>
          <input
            type="text"
            value={formData.gstin}
            onChange={e => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
            className="w-full bg-vodacom-darker border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-vodacom-blue"
            placeholder="e.g. 07AAAAA0000A1Z5"
          />
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-vodacom-darker hover:bg-white/5 border border-white/10 rounded-xl text-xs text-vodacom-muted hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 px-5 py-2 bg-vodacom-green hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-vodacom-green/10 cursor-pointer"
          >
            <Save size={13} />
            <span>{saving ? 'Saving...' : 'Save Client Info'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
