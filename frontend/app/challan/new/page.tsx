'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, PackageCheck, MapPin, Search } from 'lucide-react';
import { useProducts } from '../../../hooks/useProducts';
import api from '../../../lib/api';

interface ChallanItem {
  product_id: number | null;
  description: string;
  hsn_sac: string;
  uom: string;
  quantity: number;
  rate: number;
  total_amount: number;
}

export default function NewChallanPage() {
  const router = useRouter();
  const { products, loading: prodLoading } = useProducts();

  const [saving, setSaving] = useState(false);

  // Form Fields
  const [reverseCharge, setReverseCharge] = useState(false);
  const [invoiceRef, setInvoiceRef] = useState('');
  const [transportationMode, setTransportationMode] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [dateOfSupply, setDateOfSupply] = useState('');
  const [placeOfSupply, setPlaceOfSupply] = useState('');

  const [receiverName, setReceiverName] = useState('');
  const [receiverAddress, setReceiverAddress] = useState('');
  const [receiverGstin, setReceiverGstin] = useState('');
  const [receiverState, setReceiverState] = useState('');
  const [receiverStateCode, setReceiverStateCode] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');

  const [consigneeName, setConsigneeName] = useState('');
  const [consigneeAddress, setConsigneeAddress] = useState('');
  const [consigneeGstin, setConsigneeGstin] = useState('');
  const [consigneeState, setConsigneeState] = useState('');
  const [consigneeStateCode, setConsigneeStateCode] = useState('');
  const [otherReference, setOtherReference] = useState('SALE');

  const [items, setItems] = useState<ChallanItem[]>([]);

  // Item entry fields
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [productSearch, setProductSearch] = useState<string>('');
  const [desc, setDesc] = useState('');
  const [hsn, setHsn] = useState('');
  const [uom, setUom] = useState('Nos');
  const [qty, setQty] = useState(1);
  const [rate, setRate] = useState(0);

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
    const prod = products.find(p => p.id === Number(pid));
    if (prod) {
      setDesc(prod.name);
      setHsn(prod.hsn_code || '');
      setUom(prod.unit || 'Nos');
      setRate(prod.price || 0);
    }
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc && !selectedProductId) {
      alert("Provide a description or select a product.");
      return;
    }
    const newItem: ChallanItem = {
      product_id: selectedProductId ? Number(selectedProductId) : null,
      description: desc,
      hsn_sac: hsn,
      uom: uom,
      quantity: qty,
      rate: rate,
      total_amount: qty * rate,
    };
    setItems([...items, newItem]);
    
    // reset
    setSelectedProductId('');
    setProductSearch('');
    setDesc('');
    setHsn('');
    setUom('Nos');
    setQty(1);
    setRate(0);
  };

  const copyReceiverToConsignee = () => {
    setConsigneeName(receiverName);
    setConsigneeAddress(receiverAddress);
    setConsigneeGstin(receiverGstin);
    setConsigneeState(receiverState);
    setConsigneeStateCode(receiverStateCode);
  };

  const handleSave = async () => {
    if (!receiverName) {
      alert('Receiver Name is required.');
      return;
    }
    if (items.length === 0) {
      alert('Add at least one item before saving.');
      return;
    }
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
        total_qty: items.reduce((sum, i) => sum + i.quantity, 0),
        total_amount: items.reduce((sum, i) => sum + i.total_amount, 0),
        notes: null,
        status: 'draft',
        items: items.map(i => ({
          product_id: i.product_id,
          description: i.description,
          hsn_sac: i.hsn_sac,
          uom: i.uom,
          quantity: i.quantity,
          rate: i.rate,
          total_amount: i.total_amount,
        }))
      };

      await api.post('/api/challan/', payload);
      router.push('/challan');
    } catch (err: any) {
      console.error(err);
      const detail = err?.response?.data?.detail;
      const msg = Array.isArray(detail)
        ? detail.map((d: any) => `${d.loc?.join('.')} — ${d.msg}`).join('\n')
        : (detail || 'Failed to generate challan. Please check all required fields.');
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide">Create Delivery Challan</h1>
          <p className="text-[11px] text-vodacom-muted mt-0.5">Generate a new delivery challan</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Col: Details */}
        <div className="space-y-6">
          <div className="bg-vodacom-surface border border-white/5 rounded-2xl p-6 shadow-xl space-y-4">
             <h2 className="text-[14px] font-bold text-white tracking-wide mb-4">Meta Data & Transport</h2>
             <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-[11px] text-vodacom-muted cursor-pointer">
                    <input type="checkbox" checked={reverseCharge} onChange={e => setReverseCharge(e.target.checked)} className="rounded border-white/10 bg-vodacom-darker" />
                    Reverse Charge
                  </label>
                </div>
                <div>
                  <input placeholder="Invoice No. (if any)" className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-2.5 text-[12px] text-white" value={invoiceRef} onChange={e => setInvoiceRef(e.target.value)} />
                </div>
                <div>
                  <input placeholder="Transport Mode (e.g. VIJAY)" className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-2.5 text-[12px] text-white" value={transportationMode} onChange={e => setTransportationMode(e.target.value)} />
                </div>
                <div>
                  <input placeholder="Vehicle No." className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-2.5 text-[12px] text-white" value={vehicleNo} onChange={e => setVehicleNo(e.target.value)} />
                </div>
                <div>
                  <input type="date" className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-2.5 text-[12px] text-white" value={dateOfSupply} onChange={e => setDateOfSupply(e.target.value)} />
                </div>
                <div>
                  <input placeholder="Place of Supply" className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-2.5 text-[12px] text-white" value={placeOfSupply} onChange={e => setPlaceOfSupply(e.target.value)} />
                </div>
             </div>
          </div>

          <div className="bg-vodacom-surface border border-white/5 rounded-2xl p-6 shadow-xl space-y-4">
             <h2 className="text-[14px] font-bold text-white tracking-wide mb-4">Receiver (Billed To)</h2>
             <input placeholder="Name *" required className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-2.5 text-[12px] text-white" value={receiverName} onChange={e => setReceiverName(e.target.value)} />
             <textarea placeholder="Address" rows={2} className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-2.5 text-[12px] text-white" value={receiverAddress} onChange={e => setReceiverAddress(e.target.value)} />
             <div className="grid grid-cols-2 gap-4">
                <input placeholder="GSTIN" className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-2.5 text-[12px] text-white" value={receiverGstin} onChange={e => setReceiverGstin(e.target.value)} />
                <input placeholder="Payment Terms" className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-2.5 text-[12px] text-white" value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} />
                <input placeholder="State Name" className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-2.5 text-[12px] text-white" value={receiverState} onChange={e => setReceiverState(e.target.value)} />
                <input placeholder="State Code" className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-2.5 text-[12px] text-white" value={receiverStateCode} onChange={e => setReceiverStateCode(e.target.value)} />
             </div>
          </div>

          <div className="bg-vodacom-surface border border-white/5 rounded-2xl p-6 shadow-xl space-y-4">
             <div className="flex justify-between items-center mb-4">
               <h2 className="text-[14px] font-bold text-white tracking-wide">Consignee (Shipped To)</h2>
               <button type="button" onClick={copyReceiverToConsignee} className="text-[10px] bg-white/5 hover:bg-white/10 px-2 py-1 rounded text-vodacom-muted transition-colors">Copy from Receiver</button>
             </div>
             <input placeholder="Name" className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-2.5 text-[12px] text-white" value={consigneeName} onChange={e => setConsigneeName(e.target.value)} />
             <textarea placeholder="Address" rows={2} className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-2.5 text-[12px] text-white" value={consigneeAddress} onChange={e => setConsigneeAddress(e.target.value)} />
             <div className="grid grid-cols-2 gap-4">
                <input placeholder="GSTIN" className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-2.5 text-[12px] text-white" value={consigneeGstin} onChange={e => setConsigneeGstin(e.target.value)} />
                <input placeholder="Other Ref (e.g. SALE)" className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-2.5 text-[12px] text-white" value={otherReference} onChange={e => setOtherReference(e.target.value)} />
                <input placeholder="State Name" className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-2.5 text-[12px] text-white" value={consigneeState} onChange={e => setConsigneeState(e.target.value)} />
                <input placeholder="State Code" className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-2.5 text-[12px] text-white" value={consigneeStateCode} onChange={e => setConsigneeStateCode(e.target.value)} />
             </div>
          </div>
        </div>

        {/* Right Col: Items */}
        <div className="space-y-6">
          <div className="bg-vodacom-surface border border-white/5 rounded-2xl p-6 shadow-xl">
             <h2 className="text-[14px] font-bold text-white tracking-wide mb-4">Add Item</h2>
             <form onSubmit={handleAddItem} className="space-y-4">
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
                 <select className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-2.5 text-[12px] text-white" value={selectedProductId} onChange={e => handleProductSelect(e.target.value)}>
                    <option value="">-- Custom Item or Select Inventory --</option>
                    {filteredProducts?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                 </select>
                 <textarea rows={2} placeholder="Description (e.g. Model, specs, serial no...)" className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-2.5 text-[12px] text-white resize-y" value={desc} onChange={e => setDesc(e.target.value)} required />
                
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-[10px] text-vodacom-muted">HSN/SAC</label><input className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-2 text-[12px] text-white" value={hsn} onChange={e => setHsn(e.target.value)} /></div>
                  <div><label className="text-[10px] text-vodacom-muted">UOM</label><input className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-2 text-[12px] text-white" value={uom} onChange={e => setUom(e.target.value)} /></div>
                  <div><label className="text-[10px] text-vodacom-muted">Qty</label><input type="number" min="0.1" step="0.1" className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-2 text-[12px] text-white" value={qty} onChange={e => setQty(parseFloat(e.target.value) || 1)} /></div>
                  <div><label className="text-[10px] text-vodacom-muted">Rate</label><input type="number" step="0.01" className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-2 text-[12px] text-white" value={rate} onChange={e => setRate(parseFloat(e.target.value) || 0)} /></div>
                </div>
                <button type="submit" className="w-full bg-vodacom-blue/20 text-vodacom-blue hover:bg-vodacom-blue/30 py-2.5 rounded-xl text-xs font-bold transition-colors">Add Item</button>
             </form>
          </div>

          <div className="bg-vodacom-surface border border-white/5 rounded-2xl p-6 shadow-xl">
             <h2 className="text-[14px] font-bold text-white tracking-wide mb-4">Item Summary</h2>
             {items.length === 0 ? (
               <p className="text-xs text-vodacom-muted text-center py-4">No items added.</p>
             ) : (
               <div className="space-y-2">
                 {items.map((it, idx) => (
                   <div key={idx} className="flex justify-between items-start bg-vodacom-darker/50 p-3 rounded-xl border border-white/5">
                     <div className="text-[12px] flex-1 min-w-0 pr-3">
                       <div className="text-white font-bold break-words whitespace-pre-wrap">{it.description}</div>
                       <div className="text-[10px] text-vodacom-muted">{it.quantity} {it.uom} @ ₹{it.rate}</div>
                     </div>
                     <div className="flex items-center gap-3">
                       <div className="text-white font-bold">₹{it.total_amount.toLocaleString('en-IN')}</div>
                       <button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-vodacom-muted hover:text-red-400">
                         <Trash2 size={14} />
                       </button>
                     </div>
                   </div>
                 ))}
               </div>
             )}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t border-white/5">
         <button onClick={() => router.back()} className="px-5 py-2.5 border border-white/10 rounded-xl text-xs text-vodacom-muted hover:bg-white/5">Cancel</button>
         <button onClick={handleSave} disabled={saving || items.length === 0} className="px-6 py-2.5 bg-vodacom-green hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-lg flex items-center gap-2">
            <PackageCheck size={14} /> {saving ? 'Saving...' : 'Generate Challan'}
         </button>
      </div>
    </div>
  );
}
