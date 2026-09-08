'use client';
import { useEffect, useState, useRef } from 'react';
import { 
  Mail, Send, Clock, History, ExternalLink, X, ChevronRight, 
  Paperclip, FileText, CheckCircle2, AlertTriangle, Settings, RefreshCw, Trash2, Search 
} from 'lucide-react';
import api from '../../lib/api';
import { usePermissions } from '../../hooks/usePermissions';
import { useCustomers } from '../../hooks/useCustomers';
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

const OFFICIAL_EMAIL_CLOSING = 
  `Thanks & Regards,\n` +
  `Geeta Rawat\n` +
  `9716146816\n` +
  `Vodacom Technologies Pvt. Ltd.\n` +
  `205 LGF, Sant Nagar, East of Kailash, New Delhi - 110065.\n` +
  `011-42032009- 42032010. sales@vodacom.in, www.vodacom.in\n` +
  `Vodacom GST # 07AACCV8995J1ZI`;

export default function RemindersPage() {
  const { canAccess, isSuperadmin } = usePermissions();
  const { customers } = useCustomers();
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  // File Attachments State
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // SMTP Settings & Diagnostic State
  const [smtpStatus, setSmtpStatus] = useState<any>(null);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configFormData, setConfigFormData] = useState({
    smtp_server: 'smtp.office365.com',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: '',
    smtp_from_email: '',
    smtp_from_name: 'Vodacom Technologies'
  });

  // Available categories strictly segregated according to granted section permissions
  const availableCategories = ALL_CATEGORIES.filter(cat => {
    if (isSuperadmin) return true;
    if (cat.value === 'General') return canAccess('reminders');
    return canAccess(cat.module);
  });

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [recipientEmail, setRecipientEmail] = useState<string>('');
  const [category, setCategory] = useState<string>(availableCategories[0]?.value || 'General');
  const [selectedRefText, setSelectedRefText] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [sending, setSending] = useState(false);
  const [logSearch, setLogSearch] = useState<string>('');

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

  const fetchSmtpStatus = async () => {
    try {
      const res = await api.get('/api/reminders/smtp-status');
      setSmtpStatus(res.data);
      setConfigFormData({
        smtp_server: res.data.smtp_server || 'smtp.office365.com',
        smtp_port: res.data.smtp_port || 587,
        smtp_username: res.data.smtp_username || '',
        smtp_password: '',
        smtp_from_email: res.data.smtp_from_email || '',
        smtp_from_name: res.data.smtp_from_name || 'Vodacom Technologies'
      });
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchSmtpStatus();
  }, []);

  const handleTestSmtp = async () => {
    setTestingSmtp(true);
    setTestResult(null);
    try {
      const res = await api.post('/api/reminders/test-smtp', {
        test_email: recipientEmail || undefined
      });
      setTestResult(res.data);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.response?.data?.detail || 'SMTP test failed',
        detail: err.message
      });
    } finally {
      setTestingSmtp(false);
    }
  };

  const handleSaveSmtpConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      await api.post('/api/reminders/smtp-config', configFormData);
      alert('SMTP settings saved successfully! New credentials are now active.');
      setShowConfigModal(false);
      fetchSmtpStatus();
      setTestResult(null);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update SMTP settings');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = Array.from(e.target.files);
      setAttachments(prev => [...prev, ...selected]);
    }
  };

  const removeAttachment = (idx: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

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
        `${OFFICIAL_EMAIL_CLOSING}`
      );
    } else if (category === 'Invoice') {
      setSubject(`Payment Reminder: Outstanding Tax Invoice - Vodacom Technologies`);
      setMessage(
        `Dear ${contactName},\n\n` +
        `We hope this email finds you well.\n` +
        `This is a payment reminder for your pending invoice with Vodacom Technologies Pvt. Ltd.\n` +
        `Details: ${selectedRefText || 'Pending Invoice'}\n\n` +
        `Kindly process the payment at your earliest convenience. If payment has already been remitted, please disregard this email.\n\n` +
        `${OFFICIAL_EMAIL_CLOSING}`
      );
    } else if (category === 'Challan') {
      setSubject(`Delivery Status: Delivery Challan Update - Vodacom Technologies`);
      setMessage(
        `Dear ${contactName},\n\n` +
        `This is a delivery status update regarding your Delivery Challan with Vodacom Technologies Pvt. Ltd.\n` +
        `Details: ${selectedRefText || 'Delivery Challan'}\n\n` +
        `Please verify receipt of items or contact our logistics team for any queries.\n\n` +
        `${OFFICIAL_EMAIL_CLOSING}`
      );
    } else if (category === 'PurchaseOrder') {
      setSubject(`Order Confirmation: Purchase Order Update - Vodacom Technologies`);
      setMessage(
        `Dear ${contactName},\n\n` +
        `This is a communication regarding Purchase Order with Vodacom Technologies Pvt. Ltd.\n` +
        `Details: ${selectedRefText || 'Purchase Order'}\n\n` +
        `Please confirm order processing and supply timelines.\n\n` +
        `${OFFICIAL_EMAIL_CLOSING}`
      );
    } else if (category === 'Enquiry') {
      setSubject(`Follow-up: Sales Enquiry & Quotation Status - Vodacom Technologies`);
      setMessage(
        `Dear ${contactName},\n\n` +
        `Thank you for reaching out to Vodacom Technologies Pvt. Ltd.\n` +
        `We are following up on your sales enquiry: ${selectedRefText || 'Sales Enquiry'}.\n\n` +
        `Please let us know if you need any adjustments to the quotation or additional information.\n\n` +
        `${OFFICIAL_EMAIL_CLOSING}`
      );
    } else if (category === 'ServiceWork') {
      setSubject(`Service Ticket Status Update - Vodacom Technologies`);
      setMessage(
        `Dear ${contactName},\n\n` +
        `This is an update regarding your open service ticket with Vodacom Technologies Pvt. Ltd.\n` +
        `Ticket Details: ${selectedRefText || 'Service Work'}\n\n` +
        `Our engineering team is actively working on your service request.\n\n` +
        `${OFFICIAL_EMAIL_CLOSING}`
      );
    } else {
      setSubject(`Notice from Vodacom Technologies`);
      setMessage(
        `Dear ${contactName},\n\n` +
        `We hope this email finds you well.\n` +
        `This is a communication from Vodacom Technologies Pvt. Ltd.\n` +
        `${selectedRefText ? 'Reference: ' + selectedRefText + '\n\n' : '\n'}` +
        `Please feel free to reach out to us if you have any questions.\n\n` +
        `${OFFICIAL_EMAIL_CLOSING}`
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
      const formData = new FormData();
      if (selectedCustomerId) formData.append('customer_id', selectedCustomerId);
      formData.append('recipient_email', recipientEmail);
      formData.append('category', category);
      formData.append('reference_text', selectedRefText || 'General Reminder');
      formData.append('subject', subject);
      formData.append('message', message);
      attachments.forEach(file => {
        formData.append('files', file);
      });

      await api.post('/api/reminders/send', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert(`Reminder email dispatched successfully!${attachments.length > 0 ? ` (${attachments.length} file(s) attached)` : ''}`);
      setAttachments([]);
      fetchLogs();
    } catch (err: any) {
      console.error(err);
      const errDetail = err.response?.data?.detail || err.message || 'Failed to dispatch email.';
      alert(errDetail);
    } finally {
      setSending(false);
    }
  };

  const filteredLogs = logs.filter((log: any) => {
    const matchCat = filterCategory === 'all' || log.category.toLowerCase() === filterCategory.toLowerCase();
    if (!matchCat) return false;
    if (!logSearch.trim()) return true;
    const q = logSearch.toLowerCase().trim();
    return (
      log.recipient_email?.toLowerCase().includes(q) ||
      log.subject?.toLowerCase().includes(q) ||
      log.reference_text?.toLowerCase().includes(q)
    );
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

      {/* Outgoing Mailbox Diagnostic & Credentials Control Bar */}
      <div className="bg-vodacom-surface border border-white/5 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full shrink-0 ${smtpStatus?.is_configured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-2 flex-wrap">
              <span>Designated Outgoing Mailbox:</span>
              <span className="font-mono text-vodacom-blue">{smtpStatus?.smtp_from_email || 'Not Configured'}</span>
              <span className="text-[10px] text-vodacom-muted font-normal">({smtpStatus?.smtp_from_name || 'Vodacom Technologies'})</span>
            </div>
            <div className="text-[10px] text-vodacom-muted mt-0.5">
              Host: <span className="font-mono text-slate-300">{smtpStatus?.smtp_server}:{smtpStatus?.smtp_port}</span> | Credentials: {smtpStatus?.has_password ? <span className="text-emerald-400 font-semibold">Configured</span> : <span className="text-amber-400 font-semibold">Missing Password</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            disabled={testingSmtp}
            onClick={handleTestSmtp}
            className="px-3.5 py-1.5 bg-vodacom-darker hover:bg-white/10 border border-white/10 rounded-xl text-xs text-white font-medium inline-flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            title="Test connection and credentials with mail server"
          >
            <RefreshCw size={13} className={testingSmtp ? 'animate-spin text-vodacom-blue' : 'text-vodacom-muted'} />
            <span>{testingSmtp ? 'Testing SMTP...' : 'Test Mail Connection'}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowConfigModal(true)}
            className="px-3.5 py-1.5 bg-vodacom-blue/15 hover:bg-vodacom-blue/25 border border-vodacom-blue/30 rounded-xl text-xs text-vodacom-blue font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Settings size={13} />
            <span>Change Mail / Password</span>
          </button>
        </div>
      </div>

      {/* Test Result Alert Banner if active */}
      {testResult && (
        <div className={`p-4 rounded-2xl border text-xs flex items-start justify-between gap-3 ${
          testResult.success 
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' 
            : 'bg-amber-500/10 border-amber-500/20 text-amber-200'
        }`}>
          <div className="flex items-start gap-2.5">
            {testResult.success ? <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" /> : <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />}
            <div className="space-y-1">
              <div className="font-bold">{testResult.message}</div>
              {testResult.detail && <div className="text-[11px] font-mono opacity-80">{testResult.detail}</div>}
              {testResult.hint && (
                <div className="text-[11px] text-white/90 pt-1">
                  💡 <strong>How to fix:</strong> {testResult.hint}{' '}
                  <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="underline text-vodacom-blue font-bold ml-1">
                    Open Google App Passwords
                  </a>
                </div>
              )}
            </div>
          </div>
          <button onClick={() => setTestResult(null)} className="p-1 hover:bg-white/10 rounded text-vodacom-muted hover:text-white cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

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
                <label className="block text-[10px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Select Customer</span>
                  {customerSearch && (
                    <span className="text-[10px] text-vodacom-blue font-normal font-mono">
                      {filteredCustomers.length} matched
                    </span>
                  )}
                </label>
                <div className="relative mb-2">
                  <input
                    type="text"
                    placeholder="Search customers..."
                    className="w-full bg-vodacom-darker/60 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-[12px] text-white placeholder-vodacom-muted focus:outline-none focus:ring-1 focus:ring-vodacom-blue transition-all duration-200"
                    value={customerSearch}
                    onChange={e => setCustomerSearch(e.target.value)}
                  />
                  <Search className="absolute left-3 top-2.5 text-vodacom-muted" size={13} />
                </div>
                <select
                  required
                  className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue transition-all"
                  value={selectedCustomerId}
                  onChange={e => setSelectedCustomerId(e.target.value)}
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
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[10px] font-bold text-vodacom-muted uppercase tracking-wider">
                  Message Body (Editable Template)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (!message.includes('Geeta Rawat')) {
                      setMessage(prev => `${prev.trim()}\n\n${OFFICIAL_EMAIL_CLOSING}`);
                    }
                  }}
                  className="text-[10px] text-vodacom-blue hover:underline cursor-pointer font-medium"
                >
                  + Add Official Signature
                </button>
              </div>
              <textarea
                required
                rows={8}
                className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue transition-all font-sans leading-relaxed"
                value={message}
                onChange={e => setMessage(e.target.value)}
              />
            </div>

            {/* File Attachments Section */}
            <div className="space-y-2.5 pt-2 border-t border-white/5">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-bold text-vodacom-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Paperclip size={12} className="text-vodacom-blue" />
                  <span>File Attachments {attachments.length > 0 ? `(${attachments.length})` : ''}</span>
                </label>
                {attachments.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setAttachments([])}
                    className="text-[10px] text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                  >
                    Clear all ({attachments.length})
                  </button>
                )}
              </div>

              <input
                type="file"
                multiple
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.zip"
              />

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-2 bg-vodacom-darker hover:bg-white/10 border border-dashed border-white/20 hover:border-vodacom-blue/70 rounded-xl text-xs text-white font-medium inline-flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                >
                  <Paperclip size={13} className="text-vodacom-blue" />
                  <span>Attach Document / File</span>
                </button>
                <span className="text-[11px] text-vodacom-muted">
                  Supports PDF, Word, Excel, Images, Contracts &amp; Invoices
                </span>
              </div>

              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1 max-h-[140px] overflow-y-auto">
                  {attachments.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 px-3 py-1.5 bg-vodacom-darker/90 border border-white/10 rounded-xl text-xs text-white shadow-sm"
                    >
                      <FileText size={13} className="text-vodacom-blue shrink-0" />
                      <span className="max-w-[170px] truncate font-mono text-[11px]">{file.name}</span>
                      <span className="text-[10px] text-vodacom-muted">
                        ({(file.size / 1024).toFixed(0)} KB)
                      </span>
                      <button
                        type="button"
                        onClick={() => removeAttachment(idx)}
                        className="p-1 hover:bg-white/10 rounded text-vodacom-muted hover:text-red-400 transition-colors cursor-pointer"
                        title="Remove file"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
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

          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative w-64">
              <input
                type="text"
                placeholder="Search recipient, subject, reference..."
                value={logSearch}
                onChange={e => setLogSearch(e.target.value)}
                className="w-full bg-vodacom-darker border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-[11px] text-white placeholder-vodacom-muted focus:outline-none focus:ring-1 focus:ring-vodacom-blue transition-all"
              />
              <Search className="absolute left-2.5 top-2 text-vodacom-muted" size={12} />
            </div>

            <div className="flex gap-1.5 flex-wrap">
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
                <td className="px-6 py-4 text-slate-300 text-xs max-w-[220px]">
                  <div className="truncate">{log.reference_text || 'General'}</div>
                  {log.reference_text && log.reference_text.includes('[Attached:') && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-vodacom-blue font-semibold mt-0.5">
                      <Paperclip size={10} /> Attached File(s)
                    </span>
                  )}
                </td>
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
              <button onClick={() => setSelectedLog(null)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-vodacom-muted hover:text-white transition-colors cursor-pointer">
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

              {selectedLog.reference_text && selectedLog.reference_text.includes('[Attached:') && (
                <div>
                  <div className="text-[10px] uppercase font-bold text-vodacom-muted tracking-wider mb-1 flex items-center gap-1">
                    <Paperclip size={11} className="text-vodacom-blue" />
                    <span>Attached Document(s)</span>
                  </div>
                  <div className="p-3 bg-vodacom-darker/90 border border-white/10 rounded-xl text-vodacom-blue font-mono text-xs flex items-center gap-2">
                    <FileText size={14} className="shrink-0" />
                    <span>{selectedLog.reference_text.split('[Attached:')[1]?.replace(']', '') || 'Files attached'}</span>
                  </div>
                </div>
              )}

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
              <button onClick={() => setSelectedLog(null)} className="px-5 py-2 bg-vodacom-blue hover:bg-blue-600 text-white font-bold text-xs uppercase rounded-xl transition-all cursor-pointer">
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SMTP Mailbox Configuration Modal ── */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setShowConfigModal(false)} />
          <div className="relative w-full max-w-lg bg-vodacom-surface border border-white/10 rounded-2xl shadow-2xl p-6 overflow-hidden z-10 animate-in fade-in zoom-in duration-200 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Settings size={18} className="text-vodacom-blue" />
                <h3 className="text-base font-bold text-white">Configure Outgoing Mailbox &amp; Password</h3>
              </div>
              <button onClick={() => setShowConfigModal(false)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-vodacom-muted hover:text-white transition-colors cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveSmtpConfig} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-vodacom-muted uppercase tracking-wider mb-1">
                  Choose Mail Provider Preset
                </label>
                <select
                  className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue"
                  onChange={e => {
                    const val = e.target.value;
                    if (val === 'godaddy-m365') {
                      setConfigFormData(prev => ({ ...prev, smtp_server: 'smtp.office365.com', smtp_port: 587 }));
                    } else if (val === 'godaddy-workspace') {
                      setConfigFormData(prev => ({ ...prev, smtp_server: 'smtpout.secureserver.net', smtp_port: 587 }));
                    } else if (val === 'gmail') {
                      setConfigFormData(prev => ({ ...prev, smtp_server: 'smtp.gmail.com', smtp_port: 587 }));
                    } else if (val === 'zoho') {
                      setConfigFormData(prev => ({ ...prev, smtp_server: 'smtp.zoho.in', smtp_port: 587 }));
                    }
                  }}
                  defaultValue="godaddy-m365"
                >
                  <option value="godaddy-m365">GoDaddy (Microsoft 365 / Outlook) — Recommended</option>
                  <option value="godaddy-workspace">GoDaddy (Standard Webmail / cPanel / Secureserver)</option>
                  <option value="zoho">Zoho Mail (@vodacom.in)</option>
                  <option value="gmail">Google Workspace / Gmail</option>
                  <option value="custom">Custom SMTP Server</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-vodacom-muted uppercase tracking-wider mb-1">
                    SMTP Server Host
                  </label>
                  <input
                    required
                    type="text"
                    className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue font-mono"
                    value={configFormData.smtp_server}
                    onChange={e => setConfigFormData({ ...configFormData, smtp_server: e.target.value })}
                    placeholder="smtp.office365.com"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-vodacom-muted uppercase tracking-wider mb-1">
                    Port
                  </label>
                  <input
                    required
                    type="number"
                    className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue font-mono"
                    value={configFormData.smtp_port}
                    onChange={e => setConfigFormData({ ...configFormData, smtp_port: Number(e.target.value) })}
                    placeholder="587"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-vodacom-muted uppercase tracking-wider mb-1">
                  Custom Domain Email Address
                </label>
                <input
                  required
                  type="email"
                  className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue font-mono"
                  value={configFormData.smtp_username}
                  onChange={e => setConfigFormData({ ...configFormData, smtp_username: e.target.value, smtp_from_email: e.target.value })}
                  placeholder="sales@vodacom.in"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-vodacom-muted uppercase tracking-wider mb-1">
                  Mailbox Password
                </label>
                <input
                  required
                  type="password"
                  className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue font-mono"
                  value={configFormData.smtp_password}
                  onChange={e => setConfigFormData({ ...configFormData, smtp_password: e.target.value })}
                  placeholder="Password for sales@vodacom.in"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-vodacom-muted uppercase tracking-wider mb-1">
                  Company Sender Display Name
                </label>
                <input
                  required
                  type="text"
                  className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue"
                  value={configFormData.smtp_from_name}
                  onChange={e => setConfigFormData({ ...configFormData, smtp_from_name: e.target.value })}
                  placeholder="Vodacom Technologies"
                />
              </div>

              <div className="p-3 bg-vodacom-blue/10 border border-vodacom-blue/20 rounded-xl text-[11px] text-slate-300 space-y-1">
                <p className="font-bold text-white">💡 GoDaddy Tip:</p>
                <p className="text-vodacom-muted leading-relaxed">
                  If using GoDaddy Microsoft 365, ensure <strong>SMTP Authentication</strong> is enabled in your GoDaddy Email dashboard for <code className="text-vodacom-blue">sales@vodacom.in</code>.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-xs font-semibold text-white rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="px-5 py-2 bg-vodacom-green hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {savingConfig ? 'Saving & Updating...' : 'Save & Activate Credentials'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
