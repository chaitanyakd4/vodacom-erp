'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Megaphone, Plus, Trash2, FileText, Briefcase, Calculator, Download, Check, X, FileOutput, Printer, Search } from 'lucide-react';
import { useProducts } from '../../../hooks/useProducts';
import api from '../../../lib/api';
import { Badge } from '../../../components/ui/Badge';

interface QuotationItem {
  product_id: number;
  name: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  total_amount: number;
  unit_cost: number;         // internal only — never in PDF
  profit_percent: number;    // internal only — never in PDF
}

export default function EnquiryDetailPage({ params }: any) {
  const router = useRouter();
  const [enquiryId, setEnquiryId] = useState<string | null>(null);
  
  const { products, loading: prodLoading } = useProducts();
  const [enquiry, setEnquiry] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Quotation Builder State
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [productSearch, setProductSearch] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [currentTax, setCurrentTax] = useState<number>(18);
  const [currentProfitPct, setCurrentProfitPct] = useState<number>(30); // internal profit %
  const [notes, setNotes] = useState<string>('');
  const [savingQuote, setSavingQuote] = useState(false);
  const [converting, setConverting] = useState(false);

  const filteredProducts = products.filter((p: any) => {
    const q = productSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q))
    );
  });

  // Dummy invoice tracking per quotation
  const [generatingInvoice, setGeneratingInvoice] = useState<number | null>(null);
  const [dummyInvoices, setDummyInvoices] = useState<Record<number, any>>({});

  useEffect(() => {
    Promise.resolve(params).then(p => {
      if (p && p.id) setEnquiryId(p.id);
    });
  }, [params]);

  const fetchEnquiry = async () => {
    if (!enquiryId) return;
    setLoading(true);
    try {
      const res = await api.get(`/api/sales/enquiries/${enquiryId}`);
      setEnquiry(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnquiry();
  }, [enquiryId]);

  useEffect(() => {
    if (selectedProductId) {
      const prod = products.find(p => p.id === Number(selectedProductId));
      if (prod) {
        setCurrentPrice(prod.price);
        setCurrentTax(prod.tax_rate ?? 18);
        setCurrentProfitPct(30); // default 30% profit margin
      }
    } else {
      setCurrentPrice(0);
      setCurrentTax(18);
      setCurrentProfitPct(30);
    }
  }, [selectedProductId, products]);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) return;
    const prod = products.find(p => p.id === Number(selectedProductId));
    if (!prod) return;
    const revenue = quantity * currentPrice;
    // cost derived from profit%: cost = price * (1 - profit%/100)
    const unitCost = currentPrice * (1 - currentProfitPct / 100);
    const newItem: QuotationItem = {
      product_id: prod.id, name: prod.name, quantity,
      unit_price: currentPrice, tax_rate: currentTax,
      total_amount: revenue, unit_cost: unitCost, profit_percent: currentProfitPct,
    };
    setItems([...items, newItem]);
    setSelectedProductId('');
    setProductSearch('');
    setQuantity(1);
    setCurrentProfitPct(30);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await api.put(`/api/sales/enquiries/${enquiryId}`, { status: newStatus });
      fetchEnquiry();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const handleConvert = async () => {
    if (confirm('Are you sure you want to convert this lead into a Customer?')) {
      setConverting(true);
      try {
        const res = await api.post(`/api/sales/enquiries/${enquiryId}/convert`);
        
        let successMsg = 'Successfully converted to Customer!';
        if (res.data.invoices_created && res.data.invoices_created.length > 0) {
          const invNums = res.data.invoices_created.map((inv: any) => inv.invoice_number).join(', ');
          successMsg += `\nAuto-created ${res.data.invoices_created.length} invoice(s): ${invNums}`;
        }
        
        alert(successMsg);
        router.push(`/customers/${res.data.customer_id}`);
      } catch (err) {
        console.error(err);
        alert('Failed to convert to customer');
        setConverting(false);
      }
    }
  };

  // --- Quotation Actions ---
  const handleQuotationStatusChange = async (qtId: number, newStatus: string) => {
    try {
      await api.put(`/api/sales/quotations/${qtId}`, { status: newStatus });
      fetchEnquiry();
    } catch (err) {
      alert('Failed to update quotation status');
    }
  };

  const handleDownloadQuotationPdf = async (qtId: number) => {
    try {
      const res = await api.get(`/api/sales/quotations/${qtId}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Quotation_${qtId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download PDF');
    }
  };

  const handleGenerateDummyInvoice = async (qtId: number) => {
    setGeneratingInvoice(qtId);
    try {
      const res = await api.post(`/api/sales/quotations/${qtId}/dummy-invoice`);
      setDummyInvoices(prev => ({ ...prev, [qtId]: res.data }));
      alert(`Dummy Invoice ${res.data.invoice_number} generated!`);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Failed to generate dummy invoice';
      alert(msg);
    } finally {
      setGeneratingInvoice(null);
    }
  };

  const handleDownloadInvoicePdf = async (invoiceId: number) => {
    try {
      const res = await api.get(`/api/sales/invoices/${invoiceId}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `DummyInvoice_${invoiceId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download invoice PDF');
    }
  };

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + item.total_amount, 0);
  const taxTotal = items.reduce((sum, item) => sum + (item.total_amount * item.tax_rate / 100), 0);
  const grandTotal = subtotal + taxTotal;
  const totalCost = items.reduce((sum, item) => sum + (item.unit_cost * item.quantity), 0);
  const totalProfit = subtotal - totalCost;
  const overallMargin = subtotal > 0 ? (totalProfit / subtotal) * 100 : 0;
  // derived unit cost for save payload
  const itemsForSave = items.map(item => ({
    product_id: item.product_id, quantity: item.quantity,
    unit_price: item.unit_price, tax_rate: item.tax_rate,
    total_amount: item.total_amount, unit_cost: item.unit_cost, margin_percent: item.profit_percent
  }));

  const handleSaveQuote = async () => {
    if (items.length === 0) { alert('Please add at least one item.'); return; }
    setSavingQuote(true);
    try {
      await api.post('/api/sales/quotations', {
        enquiry_id: Number(enquiryId),
        date: new Date().toISOString(),
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'draft', notes,
        subtotal, tax_total: taxTotal, grand_total: grandTotal,
        total_cost: totalCost, total_profit: totalProfit, overall_margin_percent: overallMargin,
        items: itemsForSave
      });
      if (enquiry.status === 'new') {
        await handleStatusChange('quoted');
      } else {
        fetchEnquiry();
      }
      setItems([]);
      setNotes('');
    } catch (err) {
      console.error(err);
      alert('Failed to generate quotation.');
    } finally {
      setSavingQuote(false);
    }
  };

  if (loading || prodLoading || !enquiry) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="w-8 h-8 border-2 border-vodacom-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isConverted = enquiry.status === 'converted';

  const getQtStatusVariant = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'danger';
      default: return 'warning';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <button onClick={() => router.push('/enquiries')} className="text-vodacom-muted hover:text-white p-1 rounded-lg transition-colors">
            <ArrowLeft size={16} />
          </button>
          <span className="text-xs text-vodacom-muted">Back to enquiries</span>
        </div>
        {isConverted ? (
          <Badge variant="success">Lead Converted to Customer</Badge>
        ) : enquiry.status === 'approved' ? (
          <button onClick={handleConvert} disabled={converting}
            className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/20">
            {converting ? 'Converting...' : 'Convert to Customer'}
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => handleStatusChange('approved')} className="px-4 py-2 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 text-xs font-bold uppercase rounded-lg">Mark Approved</button>
            <button onClick={() => handleStatusChange('rejected')} className="px-4 py-2 border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-bold uppercase rounded-lg">Mark Rejected</button>
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="bg-vodacom-surface border border-white/5 rounded-2xl p-6 shadow-xl">
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-vodacom-green/10 border border-vodacom-green/20 rounded-2xl flex items-center justify-center text-vodacom-green shadow-lg shadow-vodacom-green/5">
              <Megaphone size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-wide">{enquiry.company_name}</h1>
              <p className="text-xs text-vodacom-muted">Lead Contact: {enquiry.contact_person}</p>
            </div>
          </div>
          <Badge variant={enquiry.status === 'converted' ? 'success' : enquiry.status === 'rejected' ? 'danger' : 'warning'}>
            {enquiry.status}
          </Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-xs pt-6">
          <div><div className="font-bold text-vodacom-muted uppercase tracking-wider text-[9px] mb-1">Email Address</div><div className="text-slate-300">{enquiry.email || 'N/A'}</div></div>
          <div><div className="font-bold text-vodacom-muted uppercase tracking-wider text-[9px] mb-1">Phone Number</div><div className="text-slate-300">{enquiry.phone}</div></div>
          <div className="col-span-2"><div className="font-bold text-vodacom-muted uppercase tracking-wider text-[9px] mb-1">Billing Address</div><div className="text-slate-300 truncate">{enquiry.address}</div></div>
        </div>
        {enquiry.notes && (
          <div className="mt-4 pt-4 border-t border-white/5 text-xs">
            <div className="font-bold text-vodacom-muted uppercase tracking-wider text-[9px] mb-1">Lead Requirements / Notes</div>
            <p className="text-slate-300 leading-relaxed">{enquiry.notes}</p>
          </div>
        )}
      </div>

      {/* ═══════════════════ GENERATED QUOTATIONS ═══════════════════ */}
      {enquiry.quotations && enquiry.quotations.length > 0 && (
        <div className="bg-vodacom-surface border border-white/5 rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2 pb-2 border-b border-white/5">
            <Briefcase size={15} className="text-vodacom-blue" />
            <span>Generated Quotations ({enquiry.quotations.length})</span>
          </h2>
          <div className="space-y-4">
            {enquiry.quotations.map((qt: any) => {
              const dummyInv = dummyInvoices[qt.id];
              const canApprove = qt.status === 'draft' || qt.status === 'sent';
              const isApproved = qt.status === 'approved';

              return (
                <div key={qt.id} className="p-5 bg-vodacom-darker/40 border border-white/5 rounded-xl space-y-4 transition-all duration-200 hover:border-white/10">
                  {/* Row 1: Info + Status */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-bold text-white font-mono">{qt.quotation_number}</div>
                      <div className="text-[10px] text-vodacom-muted mt-1">Generated: {new Date(qt.date).toLocaleDateString('en-IN')}</div>
                      {qt.valid_until && (
                        <div className="text-[10px] text-vodacom-muted">Valid Until: {new Date(qt.valid_until).toLocaleDateString('en-IN')}</div>
                      )}
                    </div>
                    <div className="text-right space-y-1">
                      <Badge variant={getQtStatusVariant(qt.status)}>{qt.status}</Badge>
                      <div className="text-sm font-extrabold text-vodacom-green">₹{qt.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                      <div className="no-print text-[10px] font-bold text-amber-500 uppercase tracking-wider">
                        Profit: {qt.overall_margin_percent.toFixed(1)}% (₹{qt.total_profit.toLocaleString('en-IN', { minimumFractionDigits: 2 })})
                      </div>

                    </div>
                  </div>

                  {/* Row 2: Line items (collapsed) */}
                  {qt.items && qt.items.length > 0 && (
                    <div className="border-t border-white/5 pt-3">
                      <div className="text-[10px] text-vodacom-muted font-bold uppercase tracking-wider mb-2">Line Items ({qt.items.length})</div>
                      <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                        {qt.items.map((item: any, idx: number) => {
                          const prod = products.find(p => p.id === item.product_id);
                          return (
                            <div key={idx} className="flex justify-between text-[11px] text-slate-400 px-2 py-1 bg-vodacom-darker/30 rounded-lg">
                              <span className="text-white font-medium">{prod?.name || `Product #${item.product_id}`}</span>
                              <span>{item.quantity} × ₹{item.unit_price.toLocaleString('en-IN')} = ₹{item.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Row 3: Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5">
                    {/* Download PDF - always available */}
                    <button
                      onClick={() => handleDownloadQuotationPdf(qt.id)}
                      className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-vodacom-blue border border-vodacom-blue/30 hover:bg-vodacom-blue/10 rounded-lg transition-all duration-200"
                    >
                      <Download size={12} /> Download PDF
                    </button>

                    {/* Approve / Reject - only if draft or sent */}
                    {canApprove && (
                      <>
                        <button
                          onClick={() => handleQuotationStatusChange(qt.id, 'approved')}
                          className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10 rounded-lg transition-all duration-200"
                        >
                          <Check size={12} /> Approve
                        </button>
                        <button
                          onClick={() => handleQuotationStatusChange(qt.id, 'rejected')}
                          className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-red-400 border border-red-500/30 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                        >
                          <X size={12} /> Reject
                        </button>
                      </>
                    )}

                    {/* Generate Dummy Invoice - only if approved */}
                    {isApproved && !dummyInv && (
                      <button
                        onClick={() => handleGenerateDummyInvoice(qt.id)}
                        disabled={generatingInvoice === qt.id}
                        className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold uppercase tracking-wider bg-vodacom-green/15 text-vodacom-green border border-vodacom-green/30 hover:bg-vodacom-green/25 rounded-lg transition-all duration-200 disabled:opacity-50"
                      >
                        <FileOutput size={12} />
                        {generatingInvoice === qt.id ? 'Generating...' : 'Generate Dummy Invoice'}
                      </button>
                    )}

                    {/* Dummy Invoice exists - show it */}
                    {dummyInv && (
                      <div className="flex items-center gap-2 ml-auto">
                        <div className="flex items-center gap-2 px-3 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                          <FileText size={12} className="text-indigo-400" />
                          <span className="text-[11px] font-bold text-indigo-300 font-mono">{dummyInv.invoice_number}</span>
                        </div>
                        <button
                          onClick={() => handleDownloadInvoicePdf(dummyInv.id)}
                          className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/10 rounded-lg transition-all duration-200"
                        >
                          <Download size={12} /> Invoice PDF
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════ QUOTATION BUILDER ═══════════════════ */}
      {!isConverted && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
          {/* LEFT COLUMN: Controls */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-vodacom-surface border border-white/5 rounded-2xl p-6 shadow-xl">
              <h2 className="text-[14px] font-bold text-white tracking-wide mb-4 flex items-center gap-2">
                <Plus size={15} className="text-vodacom-green" />
                <span>Build New Quotation</span>
              </h2>
              <form onSubmit={handleAddItem} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">Inventory Item</label>
                  <div className="relative mb-2">
                    <input
                      type="text"
                      placeholder="Search products by name/SKU/category..."
                      className="w-full bg-vodacom-darker/60 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-[12px] text-white placeholder-vodacom-muted focus:outline-none focus:ring-1 focus:ring-vodacom-blue transition-all duration-200"
                      value={productSearch}
                      onChange={e => setProductSearch(e.target.value)}
                    />
                    <Search className="absolute left-3 top-2.5 text-vodacom-muted" size={13} />
                  </div>
                  <select
                    className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue focus:border-vodacom-blue transition-all duration-200"
                    value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)}
                  >
                    <option value="">-- Select Product --</option>
                    {filteredProducts.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">Quote Price to Client (₹)</label>
                    <input type="number" step="0.01" className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue focus:border-vodacom-blue transition-all duration-200" value={currentPrice || ''} onChange={e => setCurrentPrice(parseFloat(e.target.value) || 0)} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">GST Rate (%)</label>
                    <input type="number" className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue focus:border-vodacom-blue transition-all duration-200" value={currentTax || 0} onChange={e => setCurrentTax(parseInt(e.target.value) || 0)} />
                  </div>
                </div>

                {/* ── Internal Profit % — hidden from client ── */}
                <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">🔒 Profit Margin % (Internal Only)</label>
                    <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg">
                      Cost: ₹{(currentPrice * (1 - currentProfitPct / 100)).toLocaleString('en-IN', { maximumFractionDigits: 2 })} | Profit: ₹{(currentPrice * currentProfitPct / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range" min="0" max="90" step="1"
                      className="flex-1 accent-amber-500 cursor-pointer"
                      value={currentProfitPct}
                      onChange={e => setCurrentProfitPct(parseFloat(e.target.value))}
                    />
                    <input
                      type="number" min="0" max="90" step="0.1"
                      className="w-20 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 text-[13px] text-amber-400 font-bold text-center focus:outline-none focus:ring-1 focus:ring-amber-500"
                      value={currentProfitPct}
                      onChange={e => setCurrentProfitPct(parseFloat(e.target.value) || 0)}
                    />
                    <span className="text-amber-400 font-bold text-[13px]">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">Quantity</label>
                  <input required type="number" min="1" className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue focus:border-vodacom-blue transition-all duration-200" value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 1)} />
                </div>
                <button type="submit" disabled={!selectedProductId}
                  className="w-full py-3 bg-vodacom-blue/20 hover:bg-vodacom-blue/35 text-vodacom-blue hover:text-white border border-vodacom-blue/30 text-xs font-bold uppercase tracking-wider rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-1.5 mt-2">
                  <Plus size={14} /> <span>Add Line Item</span>
                </button>
              </form>
            </div>
          </div>

          {/* RIGHT COLUMN: Quotation Preview */}
          <div className="lg:col-span-7 bg-vodacom-surface border border-white/5 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center pb-4 border-b border-white/5 mb-6">
                <h2 className="text-[14px] font-bold text-white tracking-wide flex items-center gap-2">
                  <FileText size={15} className="text-vodacom-blue" /> <span>Quotation Preview</span>
                </h2>
                <span className="text-[10px] text-vodacom-muted font-bold uppercase tracking-widest bg-vodacom-darker/80 px-2.5 py-1 rounded-lg border border-white/5">Draft</span>
              </div>
              <div className="space-y-3 mb-6 max-h-[300px] overflow-y-auto pr-1">
                {items.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-white/5 rounded-2xl">
                    <Calculator size={28} className="text-vodacom-muted/50 mx-auto mb-2" />
                    <p className="text-xs text-vodacom-muted">Add items to build a quotation and calculate margins</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-vodacom-darker/40 border border-white/5 rounded-xl text-[12px]">
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="text-white font-semibold truncate">{item.name}</div>
                          <div className="text-vodacom-muted text-[11px] mt-0.5">{item.quantity} × ₹{item.unit_price.toLocaleString('en-IN')} — {item.tax_rate}% GST</div>
                          {/* Internal-only profit indicator */}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] font-bold text-amber-500/80 uppercase tracking-wider">🔒 Profit:</span>
                            <span className="text-[10px] font-mono text-amber-400">{item.profit_percent.toFixed(1)}% · ₹{(item.unit_price * item.profit_percent / 100 * item.quantity).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-white font-bold">₹{item.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                          <button onClick={() => handleRemoveItem(idx)} className="text-vodacom-muted hover:text-red-400 p-1 rounded transition-colors"><Trash2 size={13} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="mb-6">
                <label className="block text-[10px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">Client Notes (Optional)</label>
                <textarea rows={2} className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue focus:border-vodacom-blue transition-all duration-200" placeholder="Valid for 30 days..." value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
            </div>

            <div className="border-t border-white/5 pt-5 space-y-4">
              <div className="space-y-2.5 text-[13px]">
                <div className="flex justify-between text-vodacom-muted"><span>Subtotal:</span><span className="font-semibold text-white">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                <div className="flex justify-between text-vodacom-muted"><span>Total Tax:</span><span className="font-semibold text-white">₹{taxTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                <div className="flex justify-between text-white font-extrabold text-[15px] pt-1">
                  <span>Grand Total (For Client):</span>
                  <span className="text-vodacom-blue">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
              <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-2 mt-4">
                <div className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-2">Internal Profit Summary (Hidden from Client)</div>
                <div className="flex justify-between text-amber-500/80 text-[12px]"><span>Total Item Cost:</span><span className="font-mono">₹{totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                <div className="flex justify-between text-amber-400 text-[13px] font-bold pt-1 border-t border-amber-500/20">
                  <span>Projected Net Profit:</span>
                  <span>₹{totalProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })} ({overallMargin.toFixed(1)}%)</span>
                </div>
              </div>
              <div className="flex justify-end gap-3 text-[12px] font-bold uppercase tracking-wider pt-2">
                <button onClick={handleSaveQuote} disabled={savingQuote || items.length === 0} className="px-6 py-3 bg-vodacom-green hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl transition-all duration-200 shadow-lg shadow-vodacom-green/15 disabled:cursor-not-allowed border-none">
                  {savingQuote ? 'Saving...' : 'Save Quotation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
