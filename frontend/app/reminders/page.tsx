'use client';
import { useEffect, useState } from 'react';
import { Mail, Send, Clock, History, ExternalLink, X, ChevronRight } from 'lucide-react';
import api from '../../lib/api';
import { usePermissions } from '../../hooks/usePermissions';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';

const ALL_CATEGORIES = [
  { value: 'AMC', label: 'AMC Contract Expiry / Renewal', module: 'amc' },
  { value: 'Invoice', label: 'Pending Invoice Payment', module: 'invoices' },
  { value: 'Challan', label: 'Delivery Challan Update', module: 'challan' },
  { value: 'PurchaseOrder', label: 'Purchase Order Tracking', module: 'purchase-orders' },
  { value: 'Enquiry', label: 'Sales Enquiry Follow-up', module: 'enquiries' },
  { value: 'ServiceWork', label: 'Service Work Ticket Update', module: 'service-work' },
  { value: 'General', label: 'General Client Notice / Custom Reminder', module: 'reminders' },
];

export default function RemindersPage() {
  const { canAccess, isSuperadmin } = usePermissions();
  const { customers } = useCustomers();
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  // Available categories strictly segregated according to granted section permissions
  const availableCategories = ALL_CATEGORIES.filter(cat => {
    if (isSuperadmin) return true;
    if (cat.value === 'General') return canAccess('reminders');
    return canAccess(cat.module);
  });

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [recipientEmail, setRecipientEmail] = useState<string>('');
  const [category, setCategory] = useState<string>(availableCategories[0]?.value || 'General');
  const [selectedRefText, setSelectedRefText] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [sending, setSending] = useState(false);

  // Keep category in sync with permissions if allowed modules change
  useEffect(() => {
    if (!availableCategories.some(c => c.value === category)) {
      setCategory(availableCategories[0]?.value || 'General');
    }
  }, [availableCategories, category]);

  // Modal Preview State for clickable log rows
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  // Linked items for selected customer
  const [linkedItems, setLinkedItems] = useState<any>({
    amcs: [],
    invoices: [],
    enquiries: [],
    service_work: [],
    challans: [],
    purchase_orders: []
  });
  const [fetchingItems, setFetchingItems] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await api.get('/api/reminders/logs');
      setLogs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // When customer changes, fetch their linked items & update email
  useEffect(() => {
    if (!selectedCustomerId) {
      setRecipientEmail('');
      setLinkedItems({ amcs: [], invoices: [], enquiries: [], service_work: [] });
      setSelectedRefText('');
      return;
    }

    const cust = customers.find((c: any) => c.id === Number(selectedCustomerId));
    if (cust) {
      setRecipientEmail(cust.email || '');
    }

    setFetchingItems(true);
    api.get(`/api/reminders/customer-items/${selectedCustomerId}`)
      .then(res => {
        setLinkedItems(res.data);
      })
      .catch(console.error)
      .finally(() => setFetchingItems(false));
  }, [selectedCustomerId, customers]);

  // Update default Subject & Message template when category or linked item changes
  useEffect(() => {
    const cust = customers.find((c: any) => c.id === Number(selectedCustomerId));
    const custName = cust ? cust.company_name : 'Valued Client';
    const contactName = cust ? cust.contact_person : 'Sir/Madam';

    if (category === 'AMC') {
      setSubject(`Action Required: Annual Maintenance Contract (AMC) Renewal - Vodacom`);
      setMessage(
        `Dear ${contactName},\n\n` +
        `This is a friendly reminder from Vodacom Technologies Pvt. Ltd. regarding your Annual Maintenance Contract (AMC).\n` +
        `Selected Contract: ${selectedRefText || 'AMC Contract'}\n\n` +
        `Please renew your coverage at your earliest convenience to ensure uninterrupted hardware and server support.\n\n` +
        `Best regards,\nVodacom Technologies Team`
      );
    } else if (category === 'Invoice') {
      setSubject(`Payment Reminder: Outstanding Tax Invoice - Vodacom Technologies`);
      setMessage(
        `Dear ${contactName},\n\n` +
        `We hope this email finds you well.\n` +
        `This is a payment reminder for your pending invoice with Vodacom Technologies Pvt. Ltd.\n` +
        `Details: ${selectedRefText || 'Pending Invoice'}\n\n` +
        `Kindly process the payment at your earliest convenience. If payment has already been remitted, please disregard this email.\n\n` +
        `Best regards,\nVodacom Accounts Department`
      );
    } else if (category === 'Challan') {
      setSubject(`Delivery Status: Delivery Challan Update - Vodacom Technologies`);
      setMessage(
        `Dear ${contactName},\n\n` +
        `This is a delivery status update regarding your Delivery Challan with Vodacom Technologies Pvt. Ltd.\n` +
        `Details: ${selectedRefText || 'Delivery Challan'}\n\n` +
        `Please verify receipt of items or contact our logistics team for any queries.\n\n` +
        `Best regards,\nVodacom Operations & Logistics`
      );
    } else if (category === 'PurchaseOrder') {
      setSubject(`Order Confirmation: Purchase Order Update - Vodacom Technologies`);
      setMessage(
        `Dear ${contactName},\n\n` +
        `This is a communication regarding Purchase Order with Vodacom Technologies Pvt. Ltd.\n` +
        `Details: ${selectedRefText || 'Purchase Order'}\n\n` +
        `Please confirm order processing and supply timelines.\n\n` +
        `Best regards,\nVodacom Procurement Team`
      );
    } else if (category === 'Enquiry') {
      setSubject(`Follow-up: Sales Enquiry & Quotation Status - Vodacom Technologies`);
      setMessage(
        `Dear ${contactName},\n\n` +
        `Thank you for reaching out to Vodacom Technologies Pvt. Ltd.\n` +
        `We are following up on your sales enquiry: ${selectedRefText || 'Sales Enquiry'}.\n\n` +
        `Please let us know if you need any adjustments to the quotation or additional information.\n\n` +
        `Best regards,\nVodacom Sales Team`
      );
    } else if (category === 'ServiceWork') {
      setSubject(`Service Ticket Status Update - Vodacom Technologies`);
      setMessage(
        `Dear ${contactName},\n\n` +
        `This is an update regarding your open service ticket with Vodacom Technologies Pvt. Ltd.\n` +
        `Ticket Details: ${selectedRefText || 'Service Work'}\n\n` +
        `Our engineering team is actively working on your service request.\n\n` +
        `Best regards,\nVodacom Support Team`
      );
    } else {
      setSubject(`Notice from Vodacom Technologies`);
      setMessage(
        `Dear ${contactName},\n\n` +
        `We hope this email finds you well.\n` +
        `This is a communication from Vodacom Technologies Pvt. Ltd.\n` +
        `${selectedRefText ? 'Reference: ' + selectedRefText + '\n\n' : '\n'}` +
        `Please feel free to reach out to us if you have any questions.\n\n` +
        `Best regards,\nVodacom Technologies Team`
      );
    }
  }, [category, selectedCustomerId, selectedRefText, customers]);

  const handleSendReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail) {
      alert('Please enter a recipient email address.');
      return;
    }

    setSending(true);
    try {
      await api.post('/api/reminders/send', {
        customer_id: selectedCustomerId ? Number(selectedCustomerId) : null,
        recipient_email: recipientEmail,
        category: category,
        reference_text: selectedRefText || 'General Reminder',
        subject: subject,
        message: message
      });
      alert('Reminder email dispatched successfully!');
      fetchLogs();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to dispatch email.');
    } finally {
      setSending(false);
    }
  };

  const filteredLogs = logs.filter((log: any) => {
    if (filterCategory === 'all') return true;
    return log.category.toLowerCase() === filterCategory.toLowerCase();
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
            <Mail size={22} className="text-vodacom-blue" />
            <span>Reminders &amp; Email Dispatch Center</span>
          </h1>
          <p className="text-[11px] text-vodacom-muted mt-0.5">
            Send client reminders for AMC renewals, pending invoices, sales leads, and service tickets with complete sent history records
          </p>
        </div>
      </div>

      {/* Main Grid: Send Form + Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT: Send Reminder Form */}
        <div className="lg:col-span-7 bg-vodacom-surface border border-white/5 rounded-2xl p-6 shadow-xl space-y-5">
          <h2 className="text-sm font-bold text-white tracking-wide border-b border-white/5 pb-3 flex items-center gap-2">
            <Send size={16} className="text-vodacom-green" />
            <span>Compose Client Email Reminder</span>
          </h2>

          <form onSubmit={handleSendReminder} className="space-y-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">
                  Select Customer
                </label>
                <select
                  required
                  className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue transition-all"
                  value={selectedCustomerId}
                  onChange={e => setSelectedCustomerId(e.target.value)}
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
                <label className="block text-[10px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">
                  Designated Recipient Email
                </label>
                <input
                  required
                  type="email"
                  placeholder="name@company.com"
                  className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue transition-all font-mono"
                  value={recipientEmail}
                  onChange={e => setRecipientEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">
                  Reminder Category
                </label>
                <select
                  className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue transition-all"
                  value={category}
                  onChange={e => { setCategory(e.target.value); setSelectedRefText(''); }}
                >
                  {availableCategories.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Linked Task / Item</span>
                  {fetchingItems && <span className="text-[9px] text-vodacom-blue animate-pulse">Loading items...</span>}
                </label>
                <select
                  className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue transition-all"
                  value={selectedRefText}
                  onChange={e => setSelectedRefText(e.target.value)}
                >
                  <option value="">-- Choose Linked Item (Optional) --</option>
                  {category === 'AMC' && linkedItems.amcs?.map((item: any) => (
                    <option key={item.id} value={item.ref_text}>{item.ref_text}</option>
                  ))}
                  {category === 'Invoice' && linkedItems.invoices?.map((item: any) => (
                    <option key={item.id} value={item.ref_text}>{item.ref_text}</option>
                  ))}
                  {category === 'Challan' && linkedItems.challans?.map((item: any) => (
                    <option key={item.id} value={item.ref_text}>{item.ref_text}</option>
                  ))}
                  {category === 'PurchaseOrder' && linkedItems.purchase_orders?.map((item: any) => (
                    <option key={item.id} value={item.ref_text}>{item.ref_text}</option>
                  ))}
                  {category === 'Enquiry' && linkedItems.enquiries?.map((item: any) => (
                    <option key={item.id} value={item.ref_text}>{item.ref_text}</option>
                  ))}
                  {category === 'ServiceWork' && linkedItems.service_work?.map((item: any) => (
                    <option key={item.id} value={item.ref_text}>{item.ref_text}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">
                Email Subject
              </label>
              <input
                required
                type="text"
                className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue transition-all"
                value={subject}
                onChange={e => setSubject(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">
                Message Body (Editable Template)
              </label>
              <textarea
                required
                rows={6}
                className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue transition-all font-sans leading-relaxed"
                value={message}
                onChange={e => setMessage(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={sending}
              className="w-full py-3.5 bg-vodacom-green hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-vodacom-green/15 flex items-center justify-center gap-2 border-none cursor-pointer disabled:opacity-40"
            >
              <Send size={15} />
              <span>{sending ? 'Dispatching Email via SMTP...' : 'Dispatch Email Reminder'}</span>
            </button>

          </form>
        </div>

        {/* RIGHT: Quick Reference Helper */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-vodacom-surface border border-white/5 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
              <Clock size={16} className="text-amber-400" />
              <span>Automated Dispatch Summary</span>
            </h3>
            <p className="text-xs text-vodacom-muted leading-relaxed">
              Every dispatched email is delivered to the recipient and logged below in your permanent mail records. Click any record row to inspect full details.
            </p>

            <div className="space-y-3 pt-2">
              <div className="p-3 bg-vodacom-darker/60 border border-white/5 rounded-xl text-xs flex justify-between items-center">
                <span className="text-vodacom-muted">Total Reminders Sent:</span>
                <span className="text-white font-bold font-mono">{logs.length}</span>
              </div>
              <div className="p-3 bg-vodacom-darker/60 border border-white/5 rounded-xl text-xs flex justify-between items-center">
                <span className="text-vodacom-muted">Successful Deliveries:</span>
                <span className="text-emerald-400 font-bold font-mono">{logs.filter(l => l.status === 'sent').length}</span>
              </div>
              <div className="p-3 bg-vodacom-darker/60 border border-white/5 rounded-xl text-xs flex justify-between items-center">
                <span className="text-vodacom-muted">Failed Deliveries:</span>
                <span className="text-red-400 font-bold font-mono">{logs.filter(l => l.status === 'failed').length}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Sent Reminders History Log Table */}
      <div className="bg-vodacom-surface border border-white/5 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
              <History size={16} className="text-vodacom-blue" />
              <span>Sent Reminders Log History</span>
            </h2>
            <p className="text-[10px] text-vodacom-muted mt-0.5">Click any log row below to inspect full email subject, message body &amp; delivery record</p>
          </div>

          <div className="flex gap-2 flex-wrap">
            {['all', ...availableCategories.map(c => c.value)].map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all border ${
                  filterCategory === cat
                    ? 'bg-vodacom-blue/15 border-vodacom-blue text-white'
                    : 'bg-vodacom-darker/50 border-white/5 text-vodacom-muted hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {logsLoading ? (
          <div className="py-12 flex justify-center">
            <div className="w-8 h-8 border-2 border-vodacom-blue border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-12 text-center text-xs text-vodacom-muted border border-dashed border-white/5 rounded-xl">
            No dispatched reminders found in log history.
          </div>
        ) : (
          <Table headers={['Sent Time', 'Recipient Email', 'Category', 'Linked Reference', 'Subject / Snippet', 'Status', '']}>
            {filteredLogs.map(log => (
              <tr
                key={log.id}
                onClick={() => setSelectedLog(log)}
                className="hover:bg-white/[0.04] transition-colors cursor-pointer group"
              >
                <td className="px-6 py-4 text-vodacom-muted text-[11px] font-mono whitespace-nowrap">
                  {new Date(log.sent_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                </td>
                <td className="px-6 py-4 font-semibold text-white font-mono text-xs">{log.recipient_email}</td>
                <td className="px-6 py-4 text-slate-300 text-xs">
                  <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 font-bold uppercase text-[10px]">
                    {log.category}
                  </span>
                </td>
                <td className="px-6 py-4 text-vodacom-muted text-xs truncate max-w-[200px]">{log.reference_text || 'General'}</td>
                <td className="px-6 py-4 text-slate-300 text-xs truncate max-w-[250px]">{log.subject}</td>
                <td className="px-6 py-4">
                  <Badge variant={log.status === 'sent' ? 'success' : 'danger'}>
                    {log.status}
                  </Badge>
                </td>
                <td className="px-4 py-4 text-right">
                  <ChevronRight size={14} className="text-vodacom-muted group-hover:text-white transition-colors" />
                </td>
              </tr>
            ))}
          </Table>
        )}
      </div>

      {/* ── Sent Mail Detail Preview Modal ── */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedLog(null)} />

          <div className="relative w-full max-w-2xl bg-vodacom-surface border border-white/10 rounded-2xl shadow-2xl p-6 overflow-hidden z-10 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-start pb-4 border-b border-white/10 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-white">Mail Dispatch Record #{selectedLog.id}</span>
                  <Badge variant={selectedLog.status === 'sent' ? 'success' : 'danger'}>{selectedLog.status}</Badge>
                </div>
                <div className="text-xs text-vodacom-muted mt-1">Dispatched on {new Date(selectedLog.sent_at).toLocaleString('en-IN')}</div>
              </div>
              <button onClick={() => setSelectedLog(null)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-vodacom-muted hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 p-3.5 bg-vodacom-darker/60 border border-white/5 rounded-xl">
                <div>
                  <div className="text-[10px] uppercase font-bold text-vodacom-muted tracking-wider">Recipient Email</div>
                  <div className="text-white font-mono font-semibold mt-0.5">{selectedLog.recipient_email}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-vodacom-muted tracking-wider">Category &amp; Reference</div>
                  <div className="text-vodacom-blue font-bold mt-0.5">{selectedLog.category} — {selectedLog.reference_text || 'General'}</div>
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase font-bold text-vodacom-muted tracking-wider mb-1">Subject</div>
                <div className="p-3 bg-vodacom-darker/80 border border-white/5 rounded-xl text-white font-semibold text-sm">
                  {selectedLog.subject}
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase font-bold text-vodacom-muted tracking-wider mb-1">Full Email Message Body</div>
                <div className="p-4 bg-vodacom-darker/90 border border-white/10 rounded-xl text-slate-200 font-sans whitespace-pre-wrap leading-relaxed max-h-[250px] overflow-y-auto">
                  {selectedLog.message}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 mt-4 border-t border-white/5">
              <button onClick={() => setSelectedLog(null)} className="px-5 py-2 bg-vodacom-blue hover:bg-blue-600 text-white font-bold text-xs uppercase rounded-xl transition-all">
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
