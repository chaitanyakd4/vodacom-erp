'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, FileText, Landmark, Printer, CreditCard, Download } from 'lucide-react';
import api from '../../../lib/api';
import { Badge } from '../../../components/ui/Badge';

export default function InvoiceDetailPage({ params }: any) {
  const router = useRouter();
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  
  const [invoice, setInvoice] = useState<any>(null);
  const [customer, setCustomer] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    Promise.resolve(params).then(p => {
      if (p && p.id) setInvoiceId(p.id);
    });
  }, [params]);

  useEffect(() => {
    if (!invoiceId) return;
    const fetchData = async () => {
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
        }

        const prodRes = await api.get('/api/products/');
        setProducts(prodRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [invoiceId]);

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
        </div>
      </div>

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
                    <td className="py-3.5 px-3 font-semibold text-white">
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
    </div>
  );
}
