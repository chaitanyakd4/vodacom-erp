'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Wrench, Save, PenLine, Trash2, CheckCircle2, UserCheck, ShieldCheck, X, Lock, Phone } from 'lucide-react';
import api from '../../../lib/api';
import { Badge } from '../../../components/ui/Badge';

export default function ServiceWorkDetailPage({ params }: any) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    customer_id: 0,
    product_id: '',
    title: '',
    person_on_duty: '',
    technician_mobile: '',
    priority: 'medium',
    status: 'open',
    due_date: '',
    resolution_notes: '',
    signature_data: '',
    signer_name: '',
    signer_designation: '',
    signed_at: ''
  });
  const [customer, setCustomer] = useState<any>(null);
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resolvingApi, setResolvingApi] = useState(false);

  const [showSigPanel, setShowSigPanel] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [signerDesig, setSignerDesig] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<'resolved' | 'closed' | null>(null);

  useEffect(() => {
    Promise.resolve(params).then((p: any) => {
      if (p && p.id) setTicketId(p.id);
    });
  }, [params]);

  const fetchData = async () => {
    if (!ticketId) return;
    setLoading(true);
    try {
      const swRes = await api.get(`/api/service-work/${ticketId}`);
      const swData = swRes.data;
      setFormData({
        customer_id: swData.customer_id,
        product_id: swData.product_id || '',
        title: swData.title,
        person_on_duty: swData.person_on_duty || '',
        technician_mobile: swData.technician_mobile || '',
        priority: swData.priority,
        status: swData.status,
        due_date: swData.due_date || '',
        resolution_notes: swData.resolution_notes || '',
        signature_data: swData.signature_data || '',
        signer_name: swData.signer_name || '',
        signer_designation: swData.signer_designation || '',
        signed_at: swData.signed_at || ''
      });
      const custRes = await api.get(`/api/customers/${swData.customer_id}`);
      setCustomer(custRes.data);
      if (swData.product_id) {
        const prodRes = await api.get(`/api/products/${swData.product_id}`);
        setProduct(prodRes.data);
      }
    } catch (err) {
      console.error(err);
      alert(formatApiError(err, 'Failed to load service ticket details from server.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [ticketId]);

  const getPos = (e: any, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches && e.touches[0]) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDraw = useCallback((e: any) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    setIsDrawing(true); setHasDrawn(true);
    const pos = getPos(e.nativeEvent || e, canvas);
    ctx.beginPath(); ctx.moveTo(pos.x, pos.y);
  }, []);

  const draw = useCallback((e: any) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.strokeStyle = '#ffffff';
    const pos = getPos(e.nativeEvent || e, canvas);
    ctx.lineTo(pos.x, pos.y); ctx.stroke();
  }, [isDrawing]);

  const stopDraw = useCallback(() => {
    setIsDrawing(false);
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (ctx) ctx.closePath();
  }, []);

  const clearCanvas = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleStatusRequest = (newStatus: 'open' | 'in_progress' | 'resolved' | 'closed') => {
    if (formData.status === 'resolved' || formData.status === 'closed') {
      alert('This service ticket is already resolved/closed and cannot be modified.');
      return;
    }
    if ((newStatus === 'resolved' || newStatus === 'closed') && !formData.signature_data) {
      setPendingStatus(newStatus); setShowSigPanel(true);
    } else {
      setFormData(prev => ({ ...prev, status: newStatus }));
    }
  };

  function formatApiError(err: any, fallbackMessage: string): string {
    if (!err) return fallbackMessage;
    const data = err?.response?.data;
    if (!data) return err?.message || fallbackMessage;
    if (typeof data.detail === 'string') return data.detail;
    if (Array.isArray(data.detail)) {
      return data.detail.map((d: any) => {
        const field = Array.isArray(d.loc) ? d.loc.filter((x: any) => x !== 'body').join('.') : '';
        return field ? `${field}: ${d.msg}` : d.msg;
      }).join('\n');
    }
    if (typeof data.detail === 'object' && data.detail !== null) {
      return JSON.stringify(data.detail);
    }
    if (typeof data.message === 'string') return data.message;
    if (typeof data === 'string') return data;
    return JSON.stringify(data);
  }

  const handleSignAndResolve = async () => {
    if (!hasDrawn) { alert('Please draw the client signature on the pad.'); return; }
    if (!signerName.trim()) { alert("Please enter the signer's full name."); return; }
    if (!signerDesig.trim()) { alert("Please enter the signer's designation."); return; }
    if (!formData.title.trim()) { alert("Issue Summary title is required."); return; }
    const canvas = canvasRef.current; if (!canvas) return;
    const sig = canvas.toDataURL('image/png');

    setResolvingApi(true);
    try {
      const payload = {
        customer_id: Number(formData.customer_id),
        product_id: formData.product_id ? Number(formData.product_id) : null,
        title: formData.title.trim(),
        person_on_duty: formData.person_on_duty.trim() || null,
        technician_mobile: formData.technician_mobile.trim() || null,
        priority: formData.priority,
        status: pendingStatus!,
        signature_data: sig,
        signer_name: signerName.trim(),
        signer_designation: signerDesig.trim(),
        signed_at: new Date().toISOString(),
        due_date: formData.due_date || null,
        resolution_notes: formData.resolution_notes.trim() || null,
      };

      await api.put(`/api/service-work/${ticketId}`, payload);
      alert(`Service ticket SW-${ticketId?.padStart(4, '0')} has been successfully marked ${pendingStatus!.toUpperCase()} and saved!`);
      setShowSigPanel(false);
      fetchData();
    } catch (err: any) {
      console.error('Sign & Resolve error:', err?.response?.data ?? err);
      alert(formatApiError(err, 'Failed to save ticket resolution.'));
    } finally {
      setResolvingApi(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketId) return;
    if (formData.status === 'resolved' || formData.status === 'closed') {
      alert('This service ticket is already resolved/closed and cannot be modified.');
      return;
    }
    if (!formData.title.trim()) {
      alert('Issue Summary title is required.');
      return;
    }
    if (!formData.customer_id) {
      alert('Client Customer selection is required.');
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, any> = {
        customer_id:         Number(formData.customer_id),
        product_id:          formData.product_id ? Number(formData.product_id) : null,
        title:               formData.title.trim(),
        person_on_duty:      formData.person_on_duty.trim() || null,
        technician_mobile:   formData.technician_mobile.trim() || null,
        priority:            formData.priority,
        status:              formData.status,
        due_date:            formData.due_date || null,
        resolution_notes:    formData.resolution_notes.trim() || null,
        signed_at:           formData.signed_at || null,
        signature_data:      formData.signature_data || null,
        signer_name:         formData.signer_name.trim() || null,
        signer_designation:  formData.signer_designation.trim() || null,
      };

      await api.put(`/api/service-work/${ticketId}`, payload);
      router.push('/service-work');
    } catch (err: any) {
      console.error('Update ticket error:', err?.response?.data ?? err);
      alert(formatApiError(err, 'Failed to update service ticket.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !ticketId) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="w-8 h-8 border-2 border-vodacom-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isResolvedOrClosed = formData.status === 'resolved' || formData.status === 'closed';
  const isSigned = !!formData.signature_data;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => router.push('/service-work')} className="text-vodacom-muted hover:text-white p-1 rounded-lg transition-colors">
          <ArrowLeft size={16} />
        </button>
        <span className="text-xs text-vodacom-muted">Back to tickets</span>
      </div>

      {/* ── LOCKED BANNER FOR RESOLVED OR CLOSED TICKETS ── */}
      {isResolvedOrClosed && (
        <div className="p-4 bg-vodacom-blue/10 border border-vodacom-blue/30 rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Lock size={22} className="text-vodacom-blue shrink-0" />
            <div>
              <div className="text-sm font-bold text-white uppercase tracking-wide flex items-center gap-2">
                <span>Service Ticket Locked ({formData.status.toUpperCase()})</span>
              </div>
              <p className="text-xs text-slate-300">
                This service ticket has been marked {formData.status.toUpperCase()} and is permanently locked to preserve service audit records.
              </p>
            </div>
          </div>
          <Badge variant={formData.status === 'resolved' ? 'success' : 'default'}>
            {formData.status.toUpperCase()}
          </Badge>
        </div>
      )}

      <div className="bg-vodacom-surface border border-white/5 p-8 rounded-2xl shadow-2xl">
        <div className="flex justify-between items-start pb-4 border-b border-white/5 mb-6">
          <h1 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
            <Wrench size={18} className="text-vodacom-green" />
            <span>Manage Service Ticket SW-{ticketId.padStart(4, '0')}</span>
          </h1>
          <Badge variant={formData.status === 'resolved' ? 'success' : formData.status === 'in_progress' ? 'warning' : 'default'}>
            {formData.status.replace('_', ' ')}
          </Badge>
        </div>

        {customer && (
          <div className="mb-6 p-4 bg-vodacom-darker/60 border border-white/5 rounded-xl text-xs flex gap-6">
            <div className="flex-1 space-y-1">
              <div className="text-[10px] font-bold text-vodacom-muted uppercase tracking-wider">Client Customer</div>
              <div className="text-white font-semibold pt-0.5">{customer.company_name}</div>
              <div className="text-vodacom-muted">Contact: {customer.contact_person} | Phone: {customer.phone}</div>
            </div>
            {product && (
              <div className="flex-1 space-y-1 border-l border-white/5 pl-6">
                <div className="text-[10px] font-bold text-vodacom-muted uppercase tracking-wider">Related Product</div>
                <div className="text-white font-semibold pt-0.5">{product.name}</div>
              </div>
            )}
            {formData.technician_mobile && (
              <div className="flex-1 space-y-1 border-l border-white/5 pl-6">
                <div className="text-[10px] font-bold text-vodacom-muted uppercase tracking-wider flex items-center gap-1">
                  <Phone size={9} className="text-vodacom-green" /> Technician Contact
                </div>
                <div className="text-white font-semibold pt-0.5">{formData.person_on_duty || 'Assigned Tech'}</div>
                <a href={`tel:${formData.technician_mobile}`} className="text-vodacom-green hover:underline flex items-center gap-1">
                  <Phone size={10} /> {formData.technician_mobile}
                </a>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">Issue Summary <span className="text-red-400">*</span></label>
            <input
              required
              disabled={isResolvedOrClosed}
              type="text"
              className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <UserCheck size={12} className="text-vodacom-blue" /> Person on Duty
            </label>
            <input
              type="text"
              disabled={isResolvedOrClosed}
              className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              placeholder="Technician / engineer assigned"
              value={formData.person_on_duty}
              onChange={e => setFormData({ ...formData, person_on_duty: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Phone size={12} className="text-vodacom-green" /> Technician Mobile
              <span className="text-[9px] text-vodacom-muted/70 ml-1 font-normal normal-case">(SMS &amp; WhatsApp on updates)</span>
            </label>
            <input
              type="tel"
              disabled={isResolvedOrClosed}
              className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-green focus:border-vodacom-green transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              placeholder="e.g. 9876543210 or +919876543210"
              value={formData.technician_mobile}
              onChange={e => setFormData({ ...formData, technician_mobile: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">Priority</label>
              <select
                disabled={isResolvedOrClosed}
                className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                value={formData.priority}
                onChange={e => setFormData({ ...formData, priority: e.target.value })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical (ASAP)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">Due Date</label>
              <input
                type="date"
                disabled={isResolvedOrClosed}
                className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                value={formData.due_date}
                onChange={e => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
          </div>

          <div className="pt-4 pb-2 border-b border-white/5">
            <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-3">Ticket Lifecycle</label>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                disabled={isResolvedOrClosed}
                onClick={() => handleStatusRequest('open')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${formData.status === 'open' ? 'bg-white/10 text-white' : 'bg-transparent border border-white/10 text-vodacom-muted hover:text-white'}`}
              >
                Open
              </button>
              <button
                type="button"
                disabled={isResolvedOrClosed}
                onClick={() => handleStatusRequest('in_progress')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${formData.status === 'in_progress' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-transparent border border-white/10 text-vodacom-muted hover:text-white'}`}
              >
                In Progress
              </button>
              <button
                type="button"
                disabled={isResolvedOrClosed}
                onClick={() => handleStatusRequest('resolved')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${formData.status === 'resolved' ? 'bg-vodacom-green/20 text-vodacom-green border border-vodacom-green/30' : 'bg-transparent border border-vodacom-green/20 text-vodacom-green/70 hover:text-vodacom-green'}`}
              >
                <ShieldCheck size={12} /> Mark Resolved
              </button>
              <button
                type="button"
                disabled={isResolvedOrClosed}
                onClick={() => handleStatusRequest('closed')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${formData.status === 'closed' ? 'bg-white/20 text-white' : 'bg-transparent border border-white/10 text-vodacom-muted hover:text-white'}`}
              >
                <ShieldCheck size={12} /> Close Ticket
              </button>
            </div>
            {!isSigned && !isResolvedOrClosed && (
              <p className="text-[10px] text-amber-400/80 mt-2 flex items-center gap-1">
                <PenLine size={10} /> Resolving or closing requires a client digital signature
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">Resolution Notes</label>
            <textarea
              rows={3}
              disabled={isResolvedOrClosed}
              className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-3 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              placeholder="Document the technical fix provided to the client..."
              value={formData.resolution_notes}
              onChange={e => setFormData({ ...formData, resolution_notes: e.target.value })}
            />
          </div>

          {isSigned && (
            <div className="bg-vodacom-green/5 border border-vodacom-green/20 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 size={15} className="text-vodacom-green" />
                <span className="text-[11px] font-bold text-vodacom-green uppercase tracking-wider">Client Signature – Verified</span>
              </div>
              <div className="bg-vodacom-darker/60 rounded-xl p-3 flex justify-center border border-white/5">
                <img src={formData.signature_data} alt="Client Signature" className="max-h-28 object-contain" />
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="text-[10px] text-vodacom-muted uppercase tracking-wider mb-0.5">Signer Name</div>
                  <div className="text-white font-semibold">{formData.signer_name}</div>
                </div>
                <div>
                  <div className="text-[10px] text-vodacom-muted uppercase tracking-wider mb-0.5">Designation</div>
                  <div className="text-white font-semibold">{formData.signer_designation}</div>
                </div>
              </div>
              {formData.signed_at && (
                <div className="text-[10px] text-vodacom-muted">
                  Signed on: {new Date(formData.signed_at).toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 text-[12px] font-bold uppercase tracking-wider">
            <button
              type="button"
              onClick={() => router.push('/service-work')}
              className="px-5 py-2.5 border border-white/10 hover:bg-white/5 text-vodacom-text rounded-xl transition-all"
            >
              {isResolvedOrClosed ? 'Back to Tickets' : 'Cancel'}
            </button>
            {!isResolvedOrClosed && (
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-vodacom-green hover:bg-emerald-500 text-white rounded-xl transition-all shadow-lg shadow-vodacom-green/15 flex items-center justify-center gap-1.5 border-none cursor-pointer disabled:opacity-50"
              >
                <Save size={14} />
                <span>{saving ? 'Saving...' : 'Update Ticket'}</span>
              </button>
            )}
          </div>
        </form>
      </div>

      {showSigPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
          <div className="bg-vodacom-surface border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PenLine size={18} className="text-vodacom-blue" />
                <h2 className="text-[15px] font-bold text-white tracking-wide">Client Digital Signature &amp; Resolution</h2>
              </div>
              <button onClick={() => { setShowSigPanel(false); setPendingStatus(null); }} className="text-vodacom-muted hover:text-white p-1 rounded-lg transition-colors">
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-vodacom-muted leading-relaxed">
              The client must sign below to confirm the reported issue has been resolved to their satisfaction.
              Clicking <strong>Confirm &amp; Save Resolution</strong> will save the signature and mark the ticket as <strong className="text-white">{pendingStatus?.toUpperCase()}</strong> in the database.
            </p>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-vodacom-muted uppercase tracking-wider">Signature Pad</label>
                <button type="button" onClick={clearCanvas} className="flex items-center gap-1 text-[10px] text-vodacom-muted hover:text-red-400 transition-colors">
                  <Trash2 size={10} /> Clear
                </button>
              </div>
              <div className="relative border-2 border-dashed rounded-xl overflow-hidden"
                style={{ borderColor: hasDrawn ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.45)' }}>
                <canvas ref={canvasRef} width={520} height={180} className="w-full touch-none cursor-crosshair" style={{ display: 'block' }}
                  onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                  onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw} />
                {!hasDrawn && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-vodacom-muted/40 text-sm font-medium select-none">✍ Sign here</span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">Signer Full Name <span className="text-red-400">*</span></label>
                <input type="text" placeholder="e.g. Rajesh Kumar"
                  className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-2.5 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue transition-all duration-200"
                  value={signerName} onChange={e => setSignerName(e.target.value)} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">Designation <span className="text-red-400">*</span></label>
                <input type="text" placeholder="e.g. IT Manager"
                  className="w-full bg-vodacom-darker border border-white/10 rounded-xl p-2.5 text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-vodacom-blue transition-all duration-200"
                  value={signerDesig} onChange={e => setSignerDesig(e.target.value)} />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => { setShowSigPanel(false); setPendingStatus(null); }}
                className="px-4 py-2 border border-white/10 hover:bg-white/5 text-vodacom-muted text-xs font-bold rounded-xl transition-all duration-200">Cancel</button>
              <button
                type="button"
                onClick={handleSignAndResolve}
                disabled={!hasDrawn || !signerName.trim() || !signerDesig.trim() || resolvingApi}
                className="flex items-center gap-2 px-5 py-2.5 bg-vodacom-green hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all duration-200 shadow-lg shadow-vodacom-green/20 border-none cursor-pointer"
              >
                <CheckCircle2 size={14} />
                <span>{resolvingApi ? 'Saving Resolution to Database...' : `Confirm & Save ${pendingStatus === 'resolved' ? 'Resolution' : 'Closure'} Now`}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}