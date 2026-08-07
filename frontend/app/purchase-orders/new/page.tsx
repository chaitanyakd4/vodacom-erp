'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, ClipboardList, Search, Calculator, ArrowLeft } from 'lucide-react';
import { useProducts } from '../../../hooks/useProducts';
import api from '../../../lib/api';

interface POItem {
  product_id: number | null;
  description: string;
  hsn_sac: string;
  uom: string;
  quantity: number;
  rate: number;
  tax_rate: number;
  total_amount: number;
}

const INPUT = "w-full bg-vodacom-darker border border-white/10 rounded-xl p-2.5 text-[12px] text-white placeholder-vodacom-muted focus:outline-none focus:ring-1 focus:ring-vodacom-blue transition-all duration-200";
const LABEL = "block text-[10px] font-bold text-vodacom-muted uppercase tracking-wider mb-1";

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const { products, loading: prodLoading } = useProducts();
  const [saving, setSaving] = useState(false);

  // Header fields
  const [reverseCharge, setReverseCharge] = useState(false);
  const [invoiceRef, setInvoiceRef] = useState('');
  const [transportationMode, setTransportationMode] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [dateOfSupply, setDateOfSupply] = useState('');
  const [placeOfSupply, setPlaceOfSupply] = useState('');

  // Receiver = Supplier we're ordering from
  const [receiverName, setReceiverName] = useState('');
  const [receiverAddress, setReceiverAddress] = useState('');
  const [receiverGstin, setReceiverGstin] = useState('');
  const [receiverState, setReceiverState] = useState('');
  const [receiverStateCode, setReceiverStateCode] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');

  // Consignee = Vodacom (default pre-filled)
  const [consigneeName, setConsigneeName] = useState('Vodacom Technologies Pvt. Ltd.');
  const [consigneeAddress, setConsigneeAddress] = useState('205, Sant Nagar, East of Kailash, Near Sanatan Dharma Mandir, New Delhi-110065');
  const [consigneeGstin, setConsigneeGstin] = useState('07AACCV8995J1ZI');
  const [consigneeState, setConsigneeState] = useState('Delhi');
  const [consigneeStateCode, setConsigneeStateCode] = useState('07');
  const [otherReference, setOtherReference] = useState('Purchase');

  // GST
  const [taxRate, setTaxRate] = useState(18);

  // Notes
  const [notes, setNotes] = useState('');

  // Items
  const [items, setItems] = useState<POItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [desc, setDesc] = useState('');
  const [hsn, setHsn] = useState('');
  const [uom, setUom] = useState('Nos');
  const [qty, setQty] = useState(1);
  const [itemRate, setItemRate] = useState(0);
  const [itemTaxRate, setItemTaxRate] = useState(18);

  const filteredProducts = products.filter((p: any) => {
    const q = productSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q))
    );
  });

  const handleProductSelect = (pid: string) => {
    setSelectedProductId(pid);
    if (!pid) return;
    const prod = products.find((p: any) => p.id === Number(pid));
    if (prod) {
      setDesc(prod.name);
      setHsn(prod.hsn_code || '');
      setUom(prod.unit || 'Nos');
      setItemRate(prod.price || 0);
      setItemTaxRate(prod.tax_rate || 18);
    }
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc) { alert('Provide a description or select a product.'); return; }
    const newItem: POItem = {
      product_id: selectedProductId ? Number(selectedProductId) : null,
      description: desc, hsn_sac: hsn, uom, quantity: qty, rate: itemRate,
      tax_rate: itemTaxRate, total_amount: qty * itemRate,
    };
    setItems([...items, newItem]);
    setSelectedProductId(''); setProductSearch(''); setDesc(''); setHsn('');
    setUom('Nos'); setQty(1); setItemRate(0); setItemTaxRate(18);
  };

  // Calculations
  const subtotal = items.reduce((s, i) => s + i.total_amount, 0);
  const isSameState = placeOfSupply.toLowerCase().trim() === '' || placeOfSupply.toLowerCase().includes('delhi');
  const taxAmount = subtotal * (taxRate / 100);
  const cgst = isSameState ? taxAmount / 2 : 0;
  const sgst = isSameState ? taxAmount / 2 : 0;
  const igst = !isSameState ? taxAmount : 0;
  const grandTotal = subtotal + taxAmount;

  const handleSave = async () => {
    if (!receiverName) { alert('Supplier name is required.'); return; }
    if (items.length === 0) { alert('Add at least one item.'); return; }
    setSaving(true);
    try {
      const payload = {
        reverse_charge: reverseCharge,
        invoice_ref: invoiceRef || null,
        transportation_mode: transportationMode || null,
        vehicle_no: vehicleNo || null,
        date_of_supply: dateOfSupply ? new Date(dateOfSupply).toISOString() : null,
        place_of_supply: placeOfSupply || null,
        receiver_name: receiverName,
        receiver_address: receiverAddress || null,
        receiver_gstin: receiverGstin || null,
        receiver_state: receiverState || null,
        receiver_state_code: receiverStateCode || null,
        payment_terms: paymentTerms || null,
        consignee_name: consigneeName || null,
        consignee_address: consigneeAddress || null,
        consignee_gstin: consigneeGstin || null,
        consignee_state: consigneeState || null,
        consignee_state_code: consigneeStateCode || null,
        other_reference: otherReference || null,
        tax_rate: taxRate,
        cgst_amount: cgst, sgst_amount: sgst, igst_amount: igst,
        total_qty: items.reduce((s, i) => s + i.quantity, 0),
        subtotal, total_tax: taxAmount, total_amount: grandTotal,
        notes: notes || null,
        status: 'draft',
        items: items.map(i => ({
          product_id: i.product_id, description: i.description,
          hsn_sac: i.hsn_sac, uom: i.uom, quantity: i.quantity,
          rate: i.rate, tax_rate: i.tax_rate, total_amount: i.total_amount,
        })),
      };
      const res = await api.post('/api/purchase-orders/', payload);
      router.push(`/purchase-orders/${res.data.id}`);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const msg = Array.isArray(detail)
        ? detail.map((d: any) => `${d.loc?.join('.')} — ${d.msg}`).join('\n')
        : (detail || 'Failed to create Purchase Order.');
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/purchase-orders')} className="p-2 rounded-xl bg-white/5 border border-white/10 text-vodacom-muted hover:text-white transition-colors">
            <ArrowLeft size={15} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
              <ClipboardList size={18} className="text-vodacom-blue" />
              Create Purchase Order
            </h1>
            <p className="text-[11px] text-vodacom-muted mt-0.5">Generate a new purchase order for suppliers</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── LEFT COLUMN ─────────────────────────────────────── */}
        <div className="space-y-6">

          {/* Meta & Transport */}
          <div className="bg-vodacom-surface border border-white/5 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-[13px] font-bold text-white tracking-wide border-b border-white/5 pb-3 mb-4">
              📋 Meta Data &amp; Transport
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={LABEL}>Reverse Charge</label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={reverseCharge} onChange={e => setReverseCharge(e.target.checked)}
                    className="w-4 h-4 rounded border-white/10 bg-vodacom-darker accent-vodacom-blue" />
                  <span className="text-[12px] text-vodacom-muted">Applicable</span>
                </label>
              </div>
              <div>
                <label className={LABEL}>Invoice No. (Ref)</label>
                <input placeholder="e.g. INV-2026-001" className={INPUT} value={invoiceRef} onChange={e => setInvoiceRef(e.target.value)} />
              </div>
              <div>
                <label className={LABEL}>Transport Mode</label>
                <input placeholder="e.g. Road / Courier" className={INPUT} value={transportationMode} onChange={e => setTransportationMode(e.target.value)} />
              </div>
              <div>
                <label className={LABEL}>Vehicle No.</label>
                <input placeholder="e.g. DL01AB1234" className={INPUT} value={vehicleNo} onChange={e => setVehicleNo(e.target.value)} />
              </div>
              <div>
                <label className={LABEL}>Date of Supply</label>
                <input type="date" className={INPUT} value={dateOfSupply} onChange={e => setDateOfSupply(e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className={LABEL}>Place of Supply</label>
                <input placeholder="e.g. Maharashtra, Delhi..." className={INPUT} value={placeOfSupply} onChange={e => setPlaceOfSupply(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Supplier (Receiver / Billed To) */}
          <div className="bg-vodacom-surface border border-white/5 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-[13px] font-bold text-white tracking-wide border-b border-white/5 pb-3 mb-4">
              🏢 Supplier Details <span className="text-[10px] text-vodacom-muted font-normal">(Billed To / Receiver)</span>
            </h2>
            <div>
              <label className={LABEL}>Supplier Name *</label>
              <input placeholder="Arvind Limited Telecom Division" className={INPUT} value={receiverName} onChange={e => setReceiverName(e.target.value)} required />
            </div>
            <div>
              <label className={LABEL}>Address</label>
              <textarea rows={2} placeholder="Full address..." className={INPUT} value={receiverAddress} onChange={e => setReceiverAddress(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>GSTIN</label>
                <input placeholder="27XXXXX..." className={INPUT} value={receiverGstin} onChange={e => setReceiverGstin(e.target.value)} />
              </div>
              <div>
                <label className={LABEL}>Payment Terms</label>
                <input placeholder="e.g. Net 30" className={INPUT} value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} />
              </div>
              <div>
                <label className={LABEL}>State</label>
                <input placeholder="e.g. Maharashtra" className={INPUT} value={receiverState} onChange={e => setReceiverState(e.target.value)} />
              </div>
              <div>
                <label className={LABEL}>State Code</label>
                <input placeholder="e.g. 27" className={INPUT} value={receiverStateCode} onChange={e => setReceiverStateCode(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Consignee (Vodacom — pre-filled) */}
          <div className="bg-vodacom-surface border border-white/5 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-[13px] font-bold text-white tracking-wide border-b border-white/5 pb-3 mb-4">
              📦 Consignee <span className="text-[10px] text-vodacom-muted font-normal">(Shipped To — pre-filled as Vodacom)</span>
            </h2>
            <div>
              <label className={LABEL}>Name</label>
              <input className={INPUT} value={consigneeName} onChange={e => setConsigneeName(e.target.value)} />
            </div>
            <div>
              <label className={LABEL}>Address</label>
              <textarea rows={2} className={INPUT} value={consigneeAddress} onChange={e => setConsigneeAddress(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>GSTIN</label>
                <input className={INPUT} value={consigneeGstin} onChange={e => setConsigneeGstin(e.target.value)} />
              </div>
              <div>
                <label className={LABEL}>Other Reference</label>
                <input className={INPUT} value={otherReference} onChange={e => setOtherReference(e.target.value)} />
              </div>
              <div>
                <label className={LABEL}>State</label>
                <input className={INPUT} value={consigneeState} onChange={e => setConsigneeState(e.target.value)} />
              </div>
              <div>
                <label className={LABEL}>State Code</label>
                <input className={INPUT} value={consigneeStateCode} onChange={e => setConsigneeStateCode(e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN ─────────────────────────────────────── */}
        <div className="space-y-6">

          {/* Add Item */}
          <div className="bg-vodacom-surface border border-white/5 rounded-2xl p-6 shadow-xl">
            <h2 className="text-[13px] font-bold text-white tracking-wide border-b border-white/5 pb-3 mb-4">
              ➕ Add Line Item
            </h2>
            <form onSubmit={handleAddItem} className="space-y-4">
              {/* Product Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search inventory by name / SKU / category..."
                  className="w-full bg-vodacom-darker/60 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-[12px] text-white placeholder-vodacom-muted focus:outline-none focus:ring-1 focus:ring-vodacom-blue transition-all"
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                />
                <Search className="absolute left-3 top-2.5 text-vodacom-muted" size={13} />
              </div>
              <select
                className={INPUT}
                value={selectedProductId}
                onChange={e => handleProductSelect(e.target.value)}
              >
                <option value="">— Custom item or pick from inventory —</option>
                {filteredProducts.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              <div>
                <label className={LABEL}>Description *</label>
                <input placeholder="Item / service description" className={INPUT} value={desc} onChange={e => setDesc(e.target.value)} required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LABEL}>HSN / SAC</label>
                  <input className={INPUT} value={hsn} onChange={e => setHsn(e.target.value)} />
                </div>
                <div>
                  <label className={LABEL}>UOM</label>
                  <input placeholder="Nos / MTR / KG" className={INPUT} value={uom} onChange={e => setUom(e.target.value)} />
                </div>
                <div>
                  <label className={LABEL}>Quantity</label>
                  <input type="number" min="0.01" step="0.01" className={INPUT} value={qty} onChange={e => setQty(parseFloat(e.target.value) || 1)} />
                </div>
                <div>
                  <label className={LABEL}>Rate (₹)</label>
                  <input type="number" step="0.01" className={INPUT} value={itemRate} onChange={e => setItemRate(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="col-span-2">
                  <label className={LABEL}>Item GST Rate (%)</label>
                  <input type="number" step="1" className={INPUT} value={itemTaxRate} onChange={e => setItemTaxRate(parseFloat(e.target.value) || 0)} />
                </div>
              </div>

              <div className="flex items-center justify-between bg-vodacom-blue/5 border border-vodacom-blue/20 rounded-xl p-3">
                <span className="text-[11px] text-vodacom-muted">Line Total</span>
                <span className="text-[14px] font-extrabold text-vodacom-blue">
                  ₹{(qty * itemRate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-vodacom-blue/20 hover:bg-vodacom-blue/35 text-vodacom-blue hover:text-white border border-vodacom-blue/30 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Plus size={14} /> Add Line Item
              </button>
            </form>
          </div>

          {/* Items Summary */}
          <div className="bg-vodacom-surface border border-white/5 rounded-2xl p-6 shadow-xl">
            <h2 className="text-[13px] font-bold text-white tracking-wide border-b border-white/5 pb-3 mb-4 flex items-center gap-2">
              <Calculator size={14} className="text-vodacom-blue" /> Items &amp; Totals
            </h2>

            {items.length === 0 ? (
              <p className="text-xs text-vodacom-muted text-center py-8">No items added yet.</p>
            ) : (
              <div className="space-y-2 mb-4">
                {items.map((it, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-vodacom-darker/50 p-3 rounded-xl border border-white/5">
                    <div className="text-[12px] flex-1 min-w-0 pr-3">
                      <div className="text-white font-bold truncate">{it.description}</div>
                      <div className="text-[10px] text-vodacom-muted mt-0.5">
                        {it.quantity} {it.uom} @ ₹{it.rate} · {it.tax_rate}% GST
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-white font-bold">₹{it.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                      <button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-vodacom-muted hover:text-red-400 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* GST setting */}
            <div className="mb-4">
              <label className={LABEL}>Overall GST Rate (%)</label>
              <input type="number" step="1" min="0" className={INPUT} value={taxRate} onChange={e => setTaxRate(parseFloat(e.target.value) || 0)} />
            </div>

            {/* Tax summary */}
            {items.length > 0 && (
              <div className="border-t border-white/5 pt-4 space-y-2 text-[12px]">
                <div className="flex justify-between text-vodacom-muted">
                  <span>Subtotal (Before Tax)</span>
                  <span className="font-semibold text-white">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                {isSameState ? (
                  <>
                    <div className="flex justify-between text-vodacom-muted">
                      <span>CGST {taxRate / 2}%</span>
                      <span>₹{cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-vodacom-muted">
                      <span>SGST {taxRate / 2}%</span>
                      <span>₹{sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-vodacom-muted">
                    <span>IGST {taxRate}%</span>
                    <span>₹{igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between text-white font-extrabold text-[15px] pt-2 border-t border-white/5">
                  <span>Grand Total</span>
                  <span className="text-vodacom-blue">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-vodacom-surface border border-white/5 rounded-2xl p-6 shadow-xl">
            <label className={LABEL}>Notes / Remarks (Optional)</label>
            <textarea rows={3} className={INPUT} placeholder="Any special instructions or remarks..." value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
        <button
          onClick={() => router.back()}
          className="px-5 py-2.5 border border-white/10 rounded-xl text-xs text-vodacom-muted hover:bg-white/5 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving || items.length === 0}
          className="px-6 py-2.5 bg-vodacom-blue hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-lg flex items-center gap-2 transition-all duration-200"
        >
          <ClipboardList size={14} />
          {saving ? 'Saving...' : 'Generate Purchase Order'}
        </button>
      </div>
    </div>
  );
}
