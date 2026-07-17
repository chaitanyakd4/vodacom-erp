'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Landmark, FileText, ShieldCheck, Mail, Phone } from 'lucide-react';
import api from '../../../lib/api';
import { Table } from '../../../components/ui/Table';
import { Badge } from '../../../components/ui/Badge';

export default function CustomerDetailPage({ params }: any) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState<string | null>(null);

  const [customer, setCustomer] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [amcs, setAmcs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.resolve(params).then(p => {
      if (p && p.id) setCustomerId(p.id);
    });
  }, [params]);

  useEffect(() => {
    if (!customerId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const custRes = await api.get(`/api/customers/${customerId}`);
        setCustomer(custRes.data);

        // Fetch and filter invoices
        const invRes = await api.get('/api/invoices/');
        setInvoices(invRes.data.filter((i: any) => i.customer_id === Number(customerId)));

        // Fetch and filter AMCs
        const amcRes = await api.get('/api/amc/');
        setAmcs(amcRes.data.filter((a: any) => a.customer_id === Number(customerId)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [customerId]);

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
      try {
        await api.delete(`/api/customers/${customerId}`);
        router.push('/customers');
      } catch (err) {
        console.error(err);
        alert('Failed to delete customer.');
      }
    }
  };

  if (loading || !customerId) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="w-8 h-8 border-2 border-vodacom-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-12 bg-vodacom-surface/10 rounded-2xl">
        <p className="text-xs text-vodacom-muted">Customer not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/customers')}
            className="text-vodacom-muted hover:text-white p-1 rounded-lg transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <span className="text-xs text-vodacom-muted">Back to customers</span>
        </div>
        <button
          onClick={handleDelete}
          className="px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-bold rounded-lg transition-colors"
        >
          Delete Customer
        </button>
      </div>

      {/* Info Card */}
      <div className="bg-vodacom-surface border border-white/5 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-vodacom-blue/10 border border-vodacom-blue/20 rounded-2xl flex items-center justify-center text-vodacom-blue shadow-lg shadow-vodacom-blue/5">
            <Landmark size={22} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-wide">{customer.company_name}</h1>
            <p className="text-xs text-vodacom-muted">Contact: {customer.contact_person}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-2">
          <div className="flex items-center gap-2 text-slate-300">
            <Mail size={14} className="text-vodacom-muted" />
            <span>{customer.email || 'No email registered'}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <Phone size={14} className="text-vodacom-muted" />
            <span>{customer.phone || 'No phone registered'}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="font-bold text-vodacom-muted uppercase tracking-wider text-[10px]">GSTIN:</span>
            <span className="font-mono text-vodacom-blue font-bold">{customer.gstin || 'N/A'}</span>
          </div>
        </div>

        <div className="pt-3 border-t border-white/5 text-xs text-vodacom-muted">
          <div className="font-bold uppercase text-[9px] tracking-wider mb-1">Billing Address</div>
          <p className="leading-relaxed text-slate-300">{customer.address}</p>
        </div>
      </div>

      {/* Sub-lists: Invoices & AMCs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Invoices List */}
        <div className="bg-vodacom-surface border border-white/5 rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2 pb-2 border-b border-white/5">
            <FileText size={15} className="text-vodacom-blue" />
            <span>Customer Invoices ({invoices.length})</span>
          </h2>
          {invoices.length === 0 ? (
            <p className="text-xs text-vodacom-muted text-center py-8">No invoices raised for this customer.</p>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {invoices.map((inv) => (
                <div
                  key={inv.id}
                  onClick={() => router.push(`/invoices/${inv.id}`)}
                  className="p-3 bg-vodacom-darker/40 border border-white/5 hover:border-white/10 rounded-xl flex items-center justify-between cursor-pointer transition-all duration-200"
                >
                  <div>
                    <div className="text-xs font-bold text-white font-mono">{inv.invoice_number}</div>
                    <div className="text-[10px] text-vodacom-muted mt-0.5">{new Date(inv.date).toLocaleDateString('en-IN')}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-white">₹{inv.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    <div className="mt-1"><Badge variant={inv.status === 'paid' ? 'success' : 'warning'}>{inv.status}</Badge></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AMCs List */}
        <div className="bg-vodacom-surface border border-white/5 rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2 pb-2 border-b border-white/5">
            <ShieldCheck size={15} className="text-vodacom-green" />
            <span>AMC Contracts ({amcs.length})</span>
          </h2>
          {amcs.length === 0 ? (
            <p className="text-xs text-vodacom-muted text-center py-8">No AMC contracts registered.</p>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {amcs.map((amc) => (
                <div
                  key={amc.id}
                  onClick={() => router.push(`/amc/${amc.id}`)}
                  className="p-3 bg-vodacom-darker/40 border border-white/5 hover:border-white/10 rounded-xl flex items-center justify-between cursor-pointer transition-all duration-200"
                >
                  <div>
                    <div className="text-xs font-bold text-white font-mono">{amc.contract_number}</div>
                    <div className="text-[10px] text-vodacom-muted mt-0.5">
                      Ends: {new Date(amc.end_date).toLocaleDateString('en-IN')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-white">₹{amc.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    <div className="mt-1"><Badge variant={amc.status === 'active' ? 'success' : 'danger'}>{amc.status}</Badge></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
