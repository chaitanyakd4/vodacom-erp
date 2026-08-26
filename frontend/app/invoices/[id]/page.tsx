'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, FileText, Landmark, Printer, CreditCard, Download, Edit3, Plus, Trash2, Save, X } from 'lucide-react';
import api from '../../../lib/api';
import { Badge } from '../../../components/ui/Badge';

export default function InvoiceDetailPage({ params }: any) {
  const router = useRouter();
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  
  const [invoice, setInvoice] = useState<any>(null);
  const [customer, setCustomer] = useState<any>(null);
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editCustomerId, setEditCustomerId] = useState<string>('');
  const [editStatus, setEditStatus] = useState<string>('pending');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editItems, setEditItems] = useState<any[]>([]);

  useEffect(() => {
    Promise.resolve(params).then(p => {
      if (p && p.id) setInvoiceId(p.id);
    });
  }, [params]);

  const fetchData = async () => {
    if (!invoiceId) return;
    setLoading(true);
    try {
      const invRes = await api.get(`/api/invoices/${invoiceId}`);
      const invData = invRes.data;
      setInvoice(invData);

      // Only fetch customer if customer_id is a real number (not null/undefined)
      if (invData.customer_id != null) {
        try {
          const custRes = await api.get(`/api/customers/${invData.customer_id}`);
          setCustomer(custRes.data);
        } catch {
          setCustomer(null);
        }
      } else {
        setCustomer(null);
      }

      const prodRes = await api.get('/api/products/');
      setProducts(prodRes.data);

      const custsRes = await api.get('/api/customers/');
      setCustomersList(custsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [invoiceId]);

  const startEditing = () => {
    if (!invoice) return;
    setEditCustomerId(invoice.customer_id ? String(invoice.customer_id) : '');
    setEditStatus(invoice.status || 'pending');
    setEditNotes(invoice.notes || '');
    setEditItems((invoice.items || []).map((item: any) => ({
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      cost_price: item.cost_price || 0,
      profit_margin: item.profit_margin || 0,
      tax_rate: item.tax_rate || 18,
      total_amount: item.total_amount
    })));
    setIsEditing(true);
  };

  const handleEditItemChange = (index: number, field: string, value: any) => {
    const updated = [...editItems];
    const item = { ...updated[index], [field]: value };
    
    if (field === 'product_id') {
      const prod = products.find(p => p.id === Number(value));
      if (prod) {
        item.unit_price = prod.price || 0;
        item.cost_price = prod.cost_price || prod.price || 0;
        item.tax_rate = prod.tax_rate || 18;
      }
    }
    
    const qty = Number(item.quantity) || 1;
    const price = Number(item.unit_price) || 0;
    const tax = Number(item.tax_rate) || 0;
    item.total_amount = roundTo2(qty * price * (1 + tax / 100));
    
    updated[index] = item;
    setEditItems(updated);
  };

  const handleAddEditItem = () => {
    const defaultProd = products[0];
    const newItem = {
      product_id: defaultProd ? defaultProd.id : 0,
      quantity: 1,
      unit_price: defaultProd ? defaultProd.price : 0,
      cost_price: defaultProd ? (defaultProd.cost_price || defaultProd.price) : 0,
      profit_margin: 0,
      tax_rate: defaultProd ? defaultProd.tax_rate : 18,
      total_amount: defaultProd ? roundTo2(defaultProd.price * (1 + (defaultProd.tax_rate || 18) / 100)) : 0
    };
    setEditItems([...editItems, newItem]);
  };

  const handleRemoveEditItem = (index: number) => {
    if (editItems.length === 1) {
      alert('Invoice must have at least one line item.');
      return;
    }
    setEditItems(editItems.filter((_, i) => i !== index));
  };

  const roundTo2 = (n: number) => Math.round(n * 100) / 100;

  const calculateEditTotals = () => {
    let sub = 0;
    let tax = 0;
    editItems.forEach(it => {
      const q = Number(it.quantity) || 0;
      const p = Number(it.unit_price) || 0;
      const tr = Number(it.tax_rate) || 0;
      sub += q * p;
      tax += (q * p) * (tr / 100);
    });
    return {
      subtotal: roundTo2(sub),
      taxTotal: roundTo2(tax),
      grandTotal: roundTo2(sub + tax)
    };
  };

  const handleSaveInvoiceEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceId) return;
    if (editItems.length === 0) {
      alert('Please add at least one line item.');
      return;
    }

    setSavingEdit(true);
    try {
      const totals = calculateEditTotals();
      const payload = {
        customer_id: editCustomerId ? Number(editCustomerId) : null,
        status: editStatus,
        notes: editNotes.trim() || null,
        subtotal: totals.subtotal,
        tax_total: totals.taxTotal,
        grand_total: totals.grandTotal,
        items: editItems.map(it => ({
          product_id: Number(it.product_id),
          quantity: Number(it.quantity) || 1,
          unit_price: Number(it.unit_price) || 0,
          cost_price: Number(it.cost_price) || 0,
          profit_margin: Number(it.profit_margin) || 0,
          tax_rate: Number(it.tax_rate) || 0,
          total_amount: roundTo2((Number(it.quantity) || 1) * (Number(it.unit_price) || 0) * (1 + (Number(it.tax_rate) || 0) / 100))
        }))
      };

      const res = await api.put(`/api/invoices/${invoiceId}`, payload);
      setInvoice(res.data);
      setIsEditing(false);
      alert('✅ Invoice updated successfully!');
      fetchData();
    } catch (err: any) {
      console.error('Failed to update invoice:', err);
      alert('Failed to save invoice changes. Please try again.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!invoiceId) return;
    setPaying(true);
    try {
      const res = await api.post(`/api/invoices/${invoiceId}/pay`);
      setInvoice(res.data);
    } catch (err) {
      console.error(err);
      alert('Failed to mark invoice as paid');
    } finally {
      setPaying(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!invoiceId) return;
    setDownloading(true);
    try {
      const res = await api.get(`/api/invoices/${invoiceId}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Invoice_${invoice?.invoice_number || invoiceId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to download PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading || !invoiceId) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="w-8 h-8 border-2 border-vodacom-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12 bg-vodacom-surface/10 rounded-2xl">
        <p className="text-xs text-vodacom-muted">Invoice not found or deleted.</p>
      </div>
    );
  }

  const productMap = products.reduce((acc: Record<number, any>, p: any) => {
    acc[p.id] = p;
    return acc;
  }, {});

  const subtotal = invoice.subtotal;
  const taxTotal = invoice.tax_total;
  const grandTotal = invoice.grand_total;

  // Group items by tax rate to show like Tally
  const taxGroups: Record<number, { taxable: number; tax: number }> = {};
  (invoice.items || []).forEach((item: any) => {
    const r = item.tax_rate;
    if (!taxGroups[r]) taxGroups[r] = { taxable: 0, tax: 0 };
    taxGroups[r].taxable += item.total_amount;
    taxGroups[r].tax += item.total_amount * r / 100;
  });

  // Calculate internal profit for ERP portal users
  const totalCost = (invoice.items || []).reduce((sum: number, item: any) => {
    const cost = item.cost_price || (productMap[item.product_id]?.price || 0);
    return sum + (cost * item.quantity);
  }, 0);
  const totalProfit = (invoice.items || []).reduce((sum: number, item: any) => {
    const cost = item.cost_price || 0;
    if (cost > 0) return sum + ((item.unit_price - cost) * item.quantity);
    return sum;
  }, 0);
  const overallMargin = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Top action header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/invoices')}
            className="text-vodacom-muted hover:text-white p-1 rounded-lg transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <span className="text-xs text-vodacom-muted">Back to invoices log</span>
        </div>
        
        <div className="flex gap-2.5">
          {!isEditing ? (
            <>
              <button
                type="button"
                onClick={startEditing}
                className="border border-white/10 bg-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-1.5"
              >
                <Edit3 size={14} className="text-amber-400" />
                <span>Edit Invoice</span>
              </button>

              <button
                onClick={handleDownloadPdf}
                disabled={downloading}
                className="border border-vodacom-blue/30 bg-vodacom-blue/10 hover:bg-vodacom-blue/20 text-vodacom-blue text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-1.5 disabled:opacity-50"
              >
                <Download size={14} />
                <span>{downloading ? 'Generating...' : 'Download Tally PDF'}</span>
              </button>
              
              {invoice.status === 'pending' && (
                <button
                  onClick={handleMarkAsPaid}
                  disabled={paying}
                  className="bg-vodacom-green hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all duration-200 shadow-lg shadow-vodacom-green/15 flex items-center gap-1.5"
                >
                  <CreditCard size={14} />
                  <span>{paying ? 'Processing...' : 'Mark as Paid'}</span>
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-1.5"
            >
              <X size={14} />
              <span>Cancel Edit</span>
            </button>
          )}
        </div>
      </div>

      {/* ── EDITING FORM VIEW ── */}
      {isEditing ? (
        <form onSubmit={handleSaveInvoiceEdit} className="bg-vodacom-surface border border-amber-500/30 rounded-2xl p-8 shadow-2xl space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-white/10">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit3 size={18} className="text-amber-400" />
                <span>Editing Invoice {invoice.invoice_number}</span>
              </h2>
              <p className="text-xs text-vodacom-muted">Make changes to customer, items, prices, or taxes and click Save</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 border border-white/10 hover:bg-white/5 text-slate-300 text-xs font-bold uppercase rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingEdit}
                className="px-5 py-2 bg-vodacom-green hover:bg-emerald-500 text-white text-xs font-bold uppercase rounded-xl transition-all shadow-lg shadow-vodacom-green/20 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Save size={14} />
                <span>{savingEdit ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">
                Customer / Client <span className="text-red-400">*</span>
              </label>
              <select
                className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue"
                value={editCustomerId}
                onChange={e => setEditCustomerId(e.target.value)}
              >
                <option value="">-- No Customer (Dummy) --</option>
                {customersList.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.company_name} ({c.contact_person})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">
                Payment Status
              </label>
              <select
                className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue"
                value={editStatus}
                onChange={e => setEditStatus(e.target.value)}
              >
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold text-vodacom-muted uppercase tracking-wider">Line Items</span>
              <button
                type="button"
                onClick={handleAddEditItem}
                className="px-3 py-1.5 bg-vodacom-blue/10 hover:bg-vodacom-blue/20 border border-vodacom-blue/30 text-vodacom-blue text-xs font-bold rounded-lg flex items-center gap-1 transition-all"
              >
                <Plus size={13} /> Add Product
              </button>
            </div>

            <div className="overflow-x-auto border border-white/10 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-vodacom-darker text-[10px] uppercase text-vodacom-muted">
                  <tr>
                    <th className="p-3">Product</th>
                    <th className="p-3 w-20 text-center">Qty</th>
                    <th className="p-3 w-28 text-right">Unit Price (₹)</th>
                    <th className="p-3 w-24 text-center">GST %</th>
                    <th className="p-3 w-28 text-right">Total (₹)</th>
                    <th className="p-3 w-12 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 bg-vodacom-surface/50">
                  {editItems.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-2.5">
                        <select
                          className="w-full bg-vodacom-darker border border-white/10 rounded-lg p-2 text-xs text-white"
                          value={item.product_id}
                          onChange={e => handleEditItemChange(idx, 'product_id', Number(e.target.value))}
                        >
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2.5 text-center">
                        <input
                          type="number"
                          min="1"
                          className="w-16 bg-vodacom-darker border border-white/10 rounded-lg p-2 text-xs text-white text-center"
                          value={item.quantity}
                          onChange={e => handleEditItemChange(idx, 'quantity', Number(e.target.value))}
                        />
                      </td>
                      <td className="p-2.5 text-right">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-24 bg-vodacom-darker border border-white/10 rounded-lg p-2 text-xs text-white text-right"
                          value={item.unit_price}
                          onChange={e => handleEditItemChange(idx, 'unit_price', Number(e.target.value))}
                        />
                      </td>
                      <td className="p-2.5 text-center">
                        <select
                          className="w-20 bg-vodacom-darker border border-white/10 rounded-lg p-2 text-xs text-white text-center"
                          value={item.tax_rate}
                          onChange={e => handleEditItemChange(idx, 'tax_rate', Number(e.target.value))}
                        >
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                          <option value="28">28%</option>
                        </select>
                      </td>
                      <td className="p-2.5 text-right font-bold text-white">
                        ₹{(Number(item.quantity || 1) * Number(item.unit_price || 0) * (1 + (Number(item.tax_rate) || 0) / 100)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveEditItem(idx)}
                          className="p-1 text-red-400 hover:bg-red-400/10 rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Edit Totals Summary */}
          {(() => {
            const totals = calculateEditTotals();
            return (
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-4 border-t border-white/10">
                <div className="w-full sm:w-1/2">
                  <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">Notes</label>
                  <textarea
                    rows={3}
                    className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue"
                    placeholder="Invoice remarks or notes..."
                    value={editNotes}
                    onChange={e => setEditNotes(e.target.value)}
                  />
                </div>
                <div className="w-full sm:w-64 space-y-2 text-xs text-right bg-vodacom-darker/60 p-4 rounded-xl border border-white/5">
                  <div className="flex justify-between text-vodacom-muted">
                    <span>Subtotal:</span>
                    <span className="text-white font-semibold">₹{totals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-vodacom-muted">
                    <span>GST Tax:</span>
                    <span className="text-white font-semibold">₹{totals.taxTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-white pt-2 border-t border-white/10">
                    <span>Grand Total:</span>
                    <span className="text-vodacom-green">₹{totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-5 py-2.5 border border-white/10 hover:bg-white/5 text-slate-300 text-xs font-bold uppercase rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingEdit}
              className="px-6 py-2.5 bg-vodacom-green hover:bg-emerald-500 text-white text-xs font-bold uppercase rounded-xl transition-all shadow-lg shadow-vodacom-green/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save size={15} />
              <span>{savingEdit ? 'Saving Changes...' : 'Save Invoice Changes'}</span>
            </button>
          </div>
        </form>
      ) : (
        <>
      {/* Internal Profit Analysis Banner (Portal Only - Hidden from Print) */}
      {totalProfit > 0 && (
        <div className="no-print p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <FileText size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">Internal ERP Profit Breakdown</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded border border-emerald-500/30">
                  +{overallMargin.toFixed(1)}% Margin
                </span>
              </div>
              <p className="text-xs text-emerald-300/80">Visible to internal staff only — omitted from printed invoices and PDFs.</p>
            </div>
          </div>
          <div className="sm:text-right shrink-0">
            <div className="text-[10px] uppercase font-bold text-emerald-400/80 tracking-wider">Internal Gross Profit</div>
            <div className="text-xl font-black text-emerald-400">₹{totalProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>
      )}

      {/* Main Invoice Card */}
      <div className="bg-vodacom-surface border border-white/5 rounded-2xl p-8 shadow-2xl space-y-8">

        
        {/* Invoice Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-start pb-6 border-b border-white/5 gap-6">
          <div>
            <div className="text-[17px] font-bold text-white leading-none mb-1">
              <span>Voda</span><span className="text-vodacom-green">com</span> Technologies Pvt. Ltd.
            </div>
            <div className="text-[11px] text-vodacom-muted">Tax Invoice | Delhi Central Office</div>
            <div className="text-[10px] text-vodacom-muted mt-1">GSTIN: 07AACC... | State: Delhi (07)</div>
          </div>
          
          <div className="sm:text-right space-y-1">
            <h2 className="text-[20px] font-black text-white font-mono tracking-wide">
              {invoice.invoice_number}
            </h2>
            <div className="text-xs text-vodacom-muted">
              {new Date(invoice.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            <Badge variant={invoice.status === 'paid' ? 'success' : 'warning'}>
              {invoice.status}
            </Badge>
          </div>
        </div>

        {/* Bill To / Ship To */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-[12px]">
          <div>
            <div className="text-vodacom-muted font-bold uppercase tracking-wider mb-2 flex items-center gap-1 text-[10px]">
              <Landmark size={12} className="text-vodacom-blue" />
              <span>Buyer (Bill To)</span>
            </div>
            {customer ? (
              <div className="space-y-1 text-slate-300">
                <div className="text-[13px] font-bold text-white">{customer.company_name}</div>
                <div>Contact: {customer.contact_person}</div>
                {customer.phone && <div>Phone: {customer.phone}</div>}
                {customer.email && <div>Email: {customer.email}</div>}
                <div>GSTIN: <span className="font-mono text-vodacom-blue font-bold">{customer.gstin || 'N/A'}</span></div>
                <div className="pt-1 text-[11px] leading-relaxed text-vodacom-muted">
                  {customer.address}
                </div>
                {customer.state_name && (
                  <div className="text-[11px] text-vodacom-muted">
                    State: {customer.state_name} ({customer.state_code})
                  </div>
                )}
              </div>
            ) : (
              <div className="text-vodacom-muted text-[11px] italic">
                {invoice.is_dummy ? 'Dummy Invoice — no customer assigned' : 'Customer details unavailable'}
              </div>
            )}
          </div>

          <div>
            <div className="text-vodacom-muted font-bold uppercase tracking-wider mb-2 text-[10px]">
              Consignee (Ship To)
            </div>
            {customer ? (
              <div className="space-y-1 text-slate-300">
                <div className="text-[13px] font-bold text-white">{customer.company_name}</div>
                <div className="pt-1 text-[11px] leading-relaxed text-vodacom-muted">
                  {customer.shipping_address || customer.address}
                </div>
                {customer.state_name && (
                  <div className="text-[11px] text-vodacom-muted">
                    State: {customer.state_name} ({customer.state_code})
                  </div>
                )}
              </div>
            ) : (
              <div className="text-vodacom-muted text-[11px] italic">—</div>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-white/10 text-vodacom-muted font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 pr-3 w-8">Sl.</th>
                <th className="py-3 px-3">Description of Goods</th>
                <th className="py-3 px-3 text-center">HSN/SAC</th>
                <th className="py-3 px-3 text-right">Qty</th>
                <th className="py-3 px-3 text-right">Rate (₹)</th>
                <th className="py-3 pl-3 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {(invoice.items || []).map((item: any, idx: number) => {
                const prod = productMap[item.product_id];
                return (
                  <tr key={item.id}>
                    <td className="py-3.5 pr-3 font-mono text-vodacom-muted">{idx + 1}</td>
                    <td className="py-3.5 px-3 font-semibold text-white break-words whitespace-pre-wrap">
                      {prod?.name || `Product #${item.product_id}`}
                      {prod?.hsn_code && <span className="ml-2 text-[10px] text-vodacom-muted font-normal">HSN: {prod.hsn_code}</span>}
                    </td>
                    <td className="py-3.5 px-3 text-center text-vodacom-muted">{prod?.hsn_code || '—'}</td>
                    <td className="py-3.5 px-3 text-right">{item.quantity} Nos</td>
                    <td className="py-3.5 px-3 text-right">₹{item.unit_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="py-3.5 pl-3 text-right font-bold text-white">
                      ₹{item.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Tax Breakdown + Totals */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-white/5">
          
          {/* Tax Detail Table (Tally style) */}
          <div>
            <div className="text-[10px] font-bold text-vodacom-muted uppercase tracking-wider mb-3">Tax Breakdown</div>
            <table className="w-full text-[11px] border border-white/10 rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-vodacom-darker/60 text-vodacom-muted text-[10px] font-bold uppercase">
                  <th className="px-3 py-2 text-left">GST Rate</th>
                  <th className="px-3 py-2 text-right">Taxable Value</th>
                  <th className="px-3 py-2 text-right">CGST</th>
                  <th className="px-3 py-2 text-right">SGST</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {Object.entries(taxGroups).map(([rate, vals]) => {
                  const r = Number(rate);
                  const half = vals.tax / 2;
                  return (
                    <tr key={rate} className="text-slate-300">
                      <td className="px-3 py-2">{r}%</td>
                      <td className="px-3 py-2 text-right">₹{vals.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="px-3 py-2 text-right">₹{half.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="px-3 py-2 text-right">₹{half.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  );
                })}
                <tr className="font-bold text-white bg-vodacom-darker/40">
                  <td className="px-3 py-2">Total</td>
                  <td className="px-3 py-2 text-right">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="px-3 py-2 text-right">₹{(taxTotal / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="px-3 py-2 text-right">₹{(taxTotal / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
              </tbody>
            </table>

            {invoice.notes && (
              <div className="mt-4 p-3 bg-vodacom-darker/60 border border-white/5 rounded-xl">
                <div className="text-[10px] font-bold text-vodacom-muted uppercase tracking-wider mb-1">Notes</div>
                <p className="text-[11px] text-slate-300 leading-relaxed">{invoice.notes}</p>
              </div>
            )}
          </div>

          {/* Totals Summary */}
          <div className="space-y-2.5 text-[13px] md:text-right">
            <div className="flex justify-between md:justify-end gap-12 text-vodacom-muted">
              <span>Subtotal (excl. GST):</span>
              <span className="font-semibold text-white">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between md:justify-end gap-12 text-vodacom-muted text-[11px]">
              <span>CGST:</span>
              <span>₹{(taxTotal / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between md:justify-end gap-12 text-vodacom-muted text-[11px] pb-3 border-b border-white/5">
              <span>SGST:</span>
              <span>₹{(taxTotal / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between md:justify-end gap-12 text-white font-black text-[17px] pt-1">
              <span>Grand Total:</span>
              <span className="text-vodacom-green">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="text-[10px] text-vodacom-muted text-right pt-1">
              Amount Chargeable (in words): <br />
              <span className="text-white font-semibold">
                {/* Simple conversion */}
                ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Declaration */}
            <div className="mt-6 p-4 bg-vodacom-darker/40 border border-white/5 rounded-xl text-left">
              <div className="text-[10px] font-bold text-vodacom-muted uppercase tracking-wider mb-2">Declaration</div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
              </p>
              <div className="mt-4 text-right">
                <div className="text-[11px] text-vodacom-muted">for <span className="text-white font-bold">Vodacom Technologies Pvt Ltd</span></div>
                <div className="text-[10px] text-vodacom-muted mt-4">Authorised Signatory</div>
              </div>
            </div>
          </div>
        </div>

      </div>
      </>
      )}
    </div>
  );
}
