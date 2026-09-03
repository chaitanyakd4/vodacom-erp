'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, FileText, Landmark, Search, TrendingUp, EyeOff } from 'lucide-react';
import { useCustomers } from '../../../hooks/useCustomers';
import { useProducts } from '../../../hooks/useProducts';
import api from '../../../lib/api';

interface BillingItem {
  product_id: number;
  name: string;
  quantity: number;
  cost_price: number;
  profit_margin: number;
  unit_price: number;
  tax_rate: number;
  total_amount: number;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const { customers, loading: custLoading } = useCustomers();
  const { products, loading: prodLoading } = useProducts();

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [productSearch, setProductSearch] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');
  const [items, setItems] = useState<BillingItem[]>([]);
  const [saving, setSaving] = useState(false);

  // Auto-fill selected product details + profit margin pricing
  const [costPrice, setCostPrice] = useState<number>(0);
  const [profitMargin, setProfitMargin] = useState<number>(0);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [currentTax, setCurrentTax] = useState<number>(18);

  useEffect(() => {
    if (selectedProductId) {
      const prod = products.find(p => p.id === Number(selectedProductId));
      if (prod) {
        const baseCost = prod.cost_price || prod.price;
        setCostPrice(baseCost);
        setCurrentTax(prod.tax_rate);
        const margin = prod.price > baseCost && baseCost > 0
          ? ((prod.price - baseCost) / baseCost) * 100
          : 0;
        setProfitMargin(Math.round(margin * 10) / 10);
        setCurrentPrice(prod.price);
      }
    } else {
      setCostPrice(0);
      setProfitMargin(0);
      setCurrentPrice(0);
      setCurrentTax(18);
    }
  }, [selectedProductId, products]);

  // Bi-directional profit margin & price calculations
  const handleProfitMarginChange = (margin: number) => {
    setProfitMargin(margin);
    if (costPrice > 0) {
      const calculatedPrice = costPrice * (1 + margin / 100);
      setCurrentPrice(Math.round(calculatedPrice * 100) / 100);
    }
  };

  const handleCostPriceChange = (cost: number) => {
    setCostPrice(cost);
    if (cost > 0) {
      const calculatedPrice = cost * (1 + profitMargin / 100);
      setCurrentPrice(Math.round(calculatedPrice * 100) / 100);
    }
  };

  const handleUnitPriceChange = (price: number) => {
    setCurrentPrice(price);
    if (costPrice > 0) {
      const margin = ((price - costPrice) / costPrice) * 100;
      setProfitMargin(Math.round(margin * 10) / 10);
    }
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) return;

    const prod = products.find(p => p.id === Number(selectedProductId));
    if (!prod) return;

    // Check if item already exists, if so merge quantity
    const existingIndex = items.findIndex(item => item.product_id === prod.id);
    if (existingIndex > -1) {
      const updated = [...items];
      updated[existingIndex].quantity += quantity;
      updated[existingIndex].total_amount = updated[existingIndex].quantity * updated[existingIndex].unit_price;
      setItems(updated);
    } else {
      const newItem: BillingItem = {
        product_id: prod.id,
        name: prod.name,
        quantity: quantity,
        cost_price: costPrice,
        profit_margin: profitMargin,
        unit_price: currentPrice,
        tax_rate: currentTax,
        total_amount: quantity * currentPrice,
      };
      setItems([...items, newItem]);
    }

    // Reset picker
    setSelectedProductId('');
    setProductSearch('');
    setQuantity(1);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const filteredProducts = products.filter((p: any) => {
    const q = productSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q))
    );
  });

  // Tax & Profit calculations
  const selectedCustomer = customers.find(c => c.id === Number(selectedCustomerId));
  const customerGstin = selectedCustomer?.gstin || '';
  const isDelhi = !customerGstin || customerGstin.startsWith('07');

  const subtotal = items.reduce((sum, item) => sum + item.total_amount, 0);
  const taxTotal = items.reduce((sum, item) => sum + (item.total_amount * item.tax_rate / 100), 0);

  const cgst = isDelhi ? taxTotal / 2 : 0;
  const sgst = isDelhi ? taxTotal / 2 : 0;
  const igst = !isDelhi ? taxTotal : 0;
  const grandTotal = subtotal + taxTotal;

  // Internal Profit calculations (ERP Portal Only)
  const totalCost = items.reduce((sum, item) => sum + ((item.cost_price || 0) * item.quantity), 0);
  const totalProfit = items.reduce((sum, item) => sum + ((item.unit_price - (item.cost_price || 0)) * item.quantity), 0);
  const overallMarginPercent = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

  const handleSaveInvoice = async () => {
    if (!selectedCustomerId) {
      alert('Please select a customer.');
      return;
    }
    if (items.length === 0) {
      alert('Please add at least one item.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        customer_id: Number(selectedCustomerId),
        status: 'pending',
        notes: notes,
        subtotal: subtotal,
        tax_total: taxTotal,
        grand_total: grandTotal,
        items: items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          cost_price: item.cost_price,
          profit_margin: item.profit_margin,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate,
          total_amount: item.total_amount,
        })),
      };

      await api.post('/api/invoices/', payload);
      router.push('/invoices');
    } catch (err) {
      console.error(err);
      alert('Failed to generate invoice.');
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* LEFT COLUMN: Controls */}
      <div className="lg:col-span-5 space-y-6">
        {/* Customer select card */}
        <div className="bg-vodacom-surface border border-white/5 rounded-2xl p-6 shadow-xl">
          <h2 className="text-[14px] font-bold text-white tracking-wide mb-4 flex items-center gap-2">
            <Landmark size={15} className="text-vodacom-blue" />
            <span>Select Customer</span>
          </h2>
          <div>
            <label className="block text-[10px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">
              Billing Customer
            </label>
            <select
              required
              className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue focus:border-vodacom-blue transition-all duration-200"
              value={selectedCustomerId}
              onChange={e => setSelectedCustomerId(e.target.value)}
            >
              <option value="">-- Choose Customer --</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.company_name} ({c.contact_person})
                </option>
              ))}
            </select>
          </div>

          {selectedCustomer && (
            <div className="mt-4 p-3.5 bg-vodacom-darker/50 border border-white/5 rounded-xl text-xs space-y-1">
              <div className="text-white font-semibold">{selectedCustomer.company_name}</div>
              <div className="text-vodacom-muted">GSTIN: <span className="font-mono text-vodacom-blue font-bold">{selectedCustomer.gstin || 'None'}</span></div>
              <div className="text-vodacom-muted">State Type: <span>{isDelhi ? 'Intrastate (Delhi CGST/SGST)' : 'Interstate (IGST)'}</span></div>
              <div className="text-vodacom-muted truncate">Address: {selectedCustomer.address}</div>
            </div>
          )}
        </div>

        {/* Add Line item card */}
        <div className="bg-vodacom-surface border border-white/5 rounded-2xl p-6 shadow-xl">
          <h2 className="text-[14px] font-bold text-white tracking-wide mb-4 flex items-center gap-2">
            <Plus size={15} className="text-vodacom-green" />
            <span>Add Invoice Item</span>
          </h2>

          <form onSubmit={handleAddItem} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">
                Product / Service
              </label>
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
                value={selectedProductId}
                onChange={e => setSelectedProductId(e.target.value)}
              >
                <option value="">-- Select Inventory Item --</option>
                {filteredProducts.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Profit Margin & Pricing Calculator */}
            <div className="p-3.5 bg-vodacom-darker/60 border border-white/10 rounded-xl space-y-3">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <TrendingUp size={13} className="text-emerald-400" />
                  <span>Profit &amp; Pricing Calculator</span>
                </span>
                <span className="text-[9px] text-amber-400 font-semibold flex items-center gap-1">
                  <EyeOff size={10} /> Hidden from Print
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[9px] font-bold text-vodacom-muted uppercase tracking-wider mb-1">
                    Cost Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-[12px] text-slate-200 focus:outline-none focus:border-vodacom-blue"
                    value={costPrice || ''}
                    onChange={e => handleCostPriceChange(parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-emerald-400 uppercase tracking-wider mb-1">
                    Profit %
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      className="w-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold rounded-lg p-2 pr-6 text-[12px] focus:outline-none focus:border-emerald-400"
                      value={profitMargin || ''}
                      onChange={e => handleProfitMarginChange(parseFloat(e.target.value) || 0)}
                    />
                    <span className="absolute right-2 top-2 text-[10px] text-emerald-400 font-bold">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-white uppercase tracking-wider mb-1">
                    Selling Rate (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-[12px] text-white font-bold focus:outline-none focus:border-vodacom-blue"
                    value={currentPrice || ''}
                    onChange={e => handleUnitPriceChange(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">
                  GST Rate (%)
                </label>
                <input
                  type="number"
                  className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue focus:border-vodacom-blue transition-all duration-200"
                  value={currentTax || 0}
                  onChange={e => setCurrentTax(parseInt(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">
                  Quantity
                </label>
                <input
                  required
                  type="number"
                  min="1"
                  className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue focus:border-vodacom-blue transition-all duration-200"
                  value={quantity}
                  onChange={e => setQuantity(parseInt(e.target.value) || 1)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!selectedProductId}
              className="w-full py-3 bg-vodacom-blue/20 hover:bg-vodacom-blue/35 text-vodacom-blue hover:text-white border border-vodacom-blue/30 text-xs font-bold uppercase tracking-wider rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-1.5"
            >
              <Plus size={14} />
              <span>Add to Invoice</span>
            </button>
          </form>
        </div>
      </div>

      {/* RIGHT COLUMN: Invoice Layout Summary */}
      <div className="lg:col-span-7 bg-vodacom-surface border border-white/5 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-center pb-4 border-b border-white/5 mb-6">
            <h2 className="text-[14px] font-bold text-white tracking-wide flex items-center gap-2">
              <FileText size={15} className="text-vodacom-blue" />
              <span>Invoice Preview Summary</span>
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-vodacom-blue font-mono font-bold uppercase tracking-wider bg-vodacom-blue/10 border border-vodacom-blue/20 px-2.5 py-1 rounded-lg">
                Invoice #: Auto-Generated
              </span>
              <span className="text-[10px] text-vodacom-muted font-bold uppercase tracking-widest bg-vodacom-darker/80 px-2.5 py-1 rounded-lg border border-white/5">
                Draft
              </span>
            </div>
          </div>

          {/* Line items list */}
          <div className="space-y-3 mb-6 max-h-[300px] overflow-y-auto pr-1">
            {items.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-white/5 rounded-2xl">
                <FileText size={28} className="text-vodacom-muted/50 mx-auto mb-2" />
                <p className="text-xs text-vodacom-muted">No items added to invoice draft yet</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-3 bg-vodacom-darker/40 border border-white/5 rounded-xl text-[12px] group"
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-semibold truncate">{item.name}</span>
                        {item.profit_margin > 0 && (
                          <span className="no-print px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-[10px] text-emerald-400 font-bold shrink-0">
                            +{item.profit_margin.toFixed(1)}% profit
                          </span>
                        )}
                      </div>
                      <div className="text-vodacom-muted text-[11px] mt-0.5">
                        {item.quantity} x ₹{item.unit_price} — {item.tax_rate}% GST
                        {item.cost_price > 0 && (
                          <span className="no-print text-emerald-400/80 ml-2">
                            (Profit: ₹{((item.unit_price - item.cost_price) * item.quantity).toLocaleString('en-IN')})
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-white font-bold">₹{item.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      <button
                        onClick={() => handleRemoveItem(idx)}
                        className="text-vodacom-muted hover:text-red-400 p-1 rounded transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes field */}
          <div className="mb-6">
            <label className="block text-[10px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">
              Invoice Notes (Optional)
            </label>
            <textarea
              rows={2}
              className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue focus:border-vodacom-blue transition-all duration-200"
              placeholder="Terms, bank account info, or delivery updates..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Invoice calculations block */}
        <div className="border-t border-white/5 pt-5 space-y-4">

          {/* ERP Portal Internal Profit Summary Box (Hidden from Print) */}
          {items.length > 0 && totalProfit > 0 && (
            <div className="no-print p-3.5 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-xs flex justify-between items-center">
              <div className="flex items-center gap-2">
                <TrendingUp size={15} className="text-emerald-400 shrink-0" />
                <div>
                  <span className="text-emerald-300 font-semibold">ERP Internal Profit Margin ({overallMarginPercent.toFixed(1)}%):</span>
                  <p className="text-[10px] text-emerald-400/70">Visible in portal only — excluded from customer invoice &amp; printouts</p>
                </div>
              </div>
              <span className="text-emerald-400 font-extrabold text-sm whitespace-nowrap">
                +₹{totalProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}

          <div className="space-y-2.5 text-[13px]">
            <div className="flex justify-between text-vodacom-muted">
              <span>Subtotal:</span>
              <span className="font-semibold text-white">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>

            {isDelhi ? (
              <>
                <div className="flex justify-between text-vodacom-muted text-xs">
                  <span>CGST (Delhi Central Tax):</span>
                  <span>₹{cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-vodacom-muted text-xs pb-2 border-b border-white/5">
                  <span>SGST (Delhi State Tax):</span>
                  <span>₹{sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-vodacom-muted text-xs pb-2 border-b border-white/5">
                <span>IGST (Integrated Tax):</span>
                <span>₹{igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            )}

            <div className="flex justify-between text-white font-extrabold text-[15px] pt-1">
              <span>Grand Total:</span>
              <span className="text-vodacom-green">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 text-[12px] font-bold uppercase tracking-wider pt-2">
            <button
              onClick={() => router.push('/invoices')}
              className="px-5 py-3 border border-white/10 hover:bg-white/5 text-vodacom-text rounded-xl transition-all duration-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveInvoice}
              disabled={saving || items.length === 0 || !selectedCustomerId}
              className="px-6 py-3 bg-vodacom-green hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl transition-all duration-200 shadow-lg shadow-vodacom-green/15 disabled:cursor-not-allowed border-none"
            >
              {saving ? 'Generating...' : 'Generate Invoice'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

