'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '../../../lib/api'
import { Upload, FileSpreadsheet, ArrowLeft, CheckCircle2, X, AlertTriangle } from 'lucide-react'

export default function ImportAMCPage() {
  const router = useRouter()
  
  const [step, setStep] = useState<1 | 2>(1)
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  
  const [previewData, setPreviewData] = useState<any[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await api.get('/api/customers/')
        // Assuming API returns array of customers or { data: customers }
        const data = Array.isArray(res.data) ? res.data : res.data?.data || []
        setCustomers(data)
      } catch (err) {
        console.error('Failed to fetch customers:', err)
      }
    }
    fetchCustomers()
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile.name.endsWith('.xlsx')) {
        setFile(droppedFile)
      }
    }
  }

  const handleUpload = async () => {
    if (!file) return
    setIsUploading(true)
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const res = await api.post('/api/amc/import/preview', formData)
      
      setPreviewData(res.data.rows || [])
      setWarnings(res.data.warnings || [])
      setStep(2)
    } catch (err: any) {
      console.error(err)
      alert(err.response?.data?.error || err.message || 'Failed to preview file')
    } finally {
      setIsUploading(false)
    }
  }

  const handleUpdateRow = (index: number, field: string, value: any) => {
    const newData = [...previewData]
    newData[index] = { ...newData[index], [field]: value }
    setPreviewData(newData)
  }

  const handleDeleteRow = (index: number) => {
    const newData = [...previewData]
    newData.splice(index, 1)
    setPreviewData(newData)
  }

  const handleSave = async () => {
    const invalidRow = previewData.find(r => !r.client_company && !r.customer_id)
    if (invalidRow) {
      alert('Please ensure all records have a Client Company name before importing.')
      return
    }

    setIsSaving(true)
    try {
      const sanitized = previewData.map(r => {
        const cStart = r.coverage_start || r.start_date
        const cEnd = r.coverage_end || r.end_date
        return {
          customer_id: r.customer_id ? Number(r.customer_id) : null,
          client_company: r.client_company || '',
          contact_person: r.contact_person || '',
          contact_phone: r.contact_phone || '',
          contact_email: r.contact_email || '',
          company_address: r.company_address || '',
          coverage_start: cStart && String(cStart).trim() ? String(cStart).split('T')[0] : null,
          coverage_end: cEnd && String(cEnd).trim() ? String(cEnd).split('T')[0] : null,
          contract_amount: r.contract_amount ?? r.amount ?? null,
          status: (r.status || 'active').toLowerCase(),
          additional_notes: r.additional_notes ?? r.notes ?? null,
        }
      })
      await api.post('/api/amc/import/save', { contracts: sanitized })
      setSuccess(true)
    } catch (err: any) {
      console.error(err)
      const detail = err.response?.data?.detail
      let msg = 'Failed to import contracts'
      if (typeof detail === 'string') {
        msg = detail
      } else if (Array.isArray(detail)) {
        msg = detail.map((d: any) => `${d.loc ? d.loc.join('.') + ': ' : ''}${d.msg}`).join('\n')
      } else if (detail && typeof detail === 'object') {
        msg = JSON.stringify(detail)
      } else if (err.message) {
        msg = err.message
      }
      alert(msg)
    } finally {
      setIsSaving(false)
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[50vh] bg-vodacom-surface rounded-2xl border border-white/5">
        <CheckCircle2 className="w-16 h-16 text-vodacom-green mb-6" />
        <h2 className="text-2xl font-bold text-white mb-2">Import Successful!</h2>
        <p className="text-vodacom-muted mb-8">All AMC contracts and client profiles have been imported successfully.</p>
        <button 
          onClick={() => router.push('/amc')}
          className="bg-vodacom-surface hover:bg-white/5 border border-white/10 text-white px-6 py-3 rounded-xl transition-colors"
        >
          Return to AMC List
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <Link 
          href="/amc" 
          className="p-2 bg-vodacom-surface hover:bg-white/5 border border-white/10 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-vodacom-muted" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Import AMC Contracts</h1>
          <p className="text-[13px] text-vodacom-muted mt-1">Upload an Excel spreadsheet (.xlsx) to bulk import maintenance contracts and clients</p>
        </div>
      </div>

      {step === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div 
              className={`border-2 border-dashed border-white/10 rounded-2xl p-12 flex flex-col items-center justify-center bg-vodacom-surface hover:bg-vodacom-darker/30 transition-colors cursor-pointer ${file ? 'bg-vodacom-darker/60' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".xlsx" 
                onChange={handleFileChange}
              />
              
              <FileSpreadsheet className={`w-12 h-12 mb-4 ${file ? 'text-vodacom-green' : 'text-vodacom-muted'}`} />
              
              {file ? (
                <div className="text-center">
                  <p className="text-white font-medium mb-1">{file.name}</p>
                  <p className="text-xs text-vodacom-muted">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-white font-medium mb-1">Click to browse or drag and drop</p>
                  <p className="text-[13px] text-vodacom-muted">Supports Microsoft Excel (.xlsx) formats</p>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-4">
              <button 
                onClick={handleUpload}
                disabled={!file || isUploading}
                className="flex items-center gap-2 bg-vodacom-green hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl transition-colors text-[13px] font-medium"
              >
                {isUploading ? 'Uploading...' : 'Preview Data'}
                {!isUploading && <Upload className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="bg-vodacom-surface border border-white/5 rounded-2xl p-6 h-fit">
            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-vodacom-blue" />
              Supported Columns (Excel)
            </h3>
            <div className="space-y-2">
              {[
                { name: 'Client company', req: true, note: 'Company or client firm name' },
                { name: 'contact person', req: false, note: 'Primary contact name' },
                { name: 'contact person ph.', req: false, note: 'Phone / mobile number' },
                { name: 'contact email.', req: false, note: 'Contact email address' },
                { name: 'company address', req: false, note: 'Billing / site address' },
                { name: 'coverage start', req: true, note: 'Start date (YYYY-MM-DD or DD/MM/YYYY)' },
                { name: 'coverage end', req: true, note: 'End date (YYYY-MM-DD or DD/MM/YYYY)' },
                { name: 'contract amount', req: true, note: 'AMC billing value (₹)' },
                { name: 'status', req: false, note: 'active, expired, cancelled' },
                { name: 'additional notes', req: false, note: 'Remarks / special terms' },
              ].map(col => (
                <div key={col.name} className="bg-vodacom-darker/60 p-2.5 rounded-xl border border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-white font-mono">{col.name}</span>
                    <p className="text-[10px] text-vodacom-muted mt-0.5">{col.note}</p>
                  </div>
                  {col.req && <span className="text-[10px] text-vodacom-green font-bold uppercase tracking-wider">Required</span>}
                </div>
              ))}
              <div className="p-3 bg-vodacom-blue/10 border border-vodacom-blue/20 rounded-xl mt-3 text-[11px] text-vodacom-blue space-y-1">
                <p>✓ <strong>Contract #</strong> is auto-generated by the system.</p>
                <p>✓ New client profiles will be auto-created upon import.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="bg-vodacom-surface border border-white/5 rounded-2xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <div>
              <h2 className="text-white font-medium">Review &amp; Edit Data</h2>
              <p className="text-xs text-vodacom-muted">{previewData.length} records parsed — verify or edit before importing</p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setStep(1)}
                className="bg-vodacom-darker/60 hover:bg-white/5 border border-white/10 text-white px-4 py-2 rounded-xl transition-colors text-xs"
              >
                Back
              </button>
              <button 
                onClick={handleSave}
                disabled={isSaving || previewData.length === 0}
                className="bg-vodacom-green hover:bg-emerald-500 disabled:opacity-50 text-white px-6 py-2 rounded-xl transition-colors text-xs font-medium shadow-lg shadow-vodacom-green/15"
              >
                {isSaving ? 'Importing...' : 'Import All'}
              </button>
            </div>
          </div>

          {warnings.length > 0 && (
            <div className="m-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-yellow-500 mb-1">Warnings / Notices</h4>
                <ul className="list-disc pl-4 text-xs text-yellow-500/80 space-y-1">
                  {warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1200px]">
              <thead>
                <tr className="bg-vodacom-darker/60 text-[10px] uppercase tracking-wider text-vodacom-muted">
                  <th className="px-3 py-3 border-b border-white/5 font-medium w-10">#</th>
                  <th className="px-3 py-3 border-b border-white/5 font-medium min-w-[160px]">Client Company</th>
                  <th className="px-3 py-3 border-b border-white/5 font-medium min-w-[130px]">Contact Person</th>
                  <th className="px-3 py-3 border-b border-white/5 font-medium min-w-[120px]">Contact Person Ph.</th>
                  <th className="px-3 py-3 border-b border-white/5 font-medium min-w-[130px]">Contact Email</th>
                  <th className="px-3 py-3 border-b border-white/5 font-medium min-w-[160px]">Company Address</th>
                  <th className="px-3 py-3 border-b border-white/5 font-medium min-w-[120px]">Coverage Start</th>
                  <th className="px-3 py-3 border-b border-white/5 font-medium min-w-[120px]">Coverage End</th>
                  <th className="px-3 py-3 border-b border-white/5 font-medium min-w-[110px]">Contract Amount (₹)</th>
                  <th className="px-3 py-3 border-b border-white/5 font-medium min-w-[90px]">Status</th>
                  <th className="px-3 py-3 border-b border-white/5 font-medium min-w-[150px]">Additional Notes</th>
                  <th className="px-3 py-3 border-b border-white/5 font-medium text-right w-16">Actions</th>
                </tr>
              </thead>
              <tbody className="text-xs text-white divide-y divide-white/5">
                {previewData.map((row, i) => (
                  <tr key={i} className="hover:bg-vodacom-darker/30">
                    <td className="px-3 py-2 text-vodacom-muted">{i + 1}</td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={row.client_company || row.customer_name || ''}
                        onChange={(e) => handleUpdateRow(i, 'client_company', e.target.value)}
                        className="w-full bg-vodacom-darker border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-vodacom-blue"
                        placeholder="Company name"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={row.contact_person || ''}
                        onChange={(e) => handleUpdateRow(i, 'contact_person', e.target.value)}
                        className="w-full bg-vodacom-darker border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-vodacom-blue"
                        placeholder="Contact person"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={row.contact_phone || ''}
                        onChange={(e) => handleUpdateRow(i, 'contact_phone', e.target.value)}
                        className="w-full bg-vodacom-darker border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-vodacom-blue font-mono"
                        placeholder="Phone"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="email"
                        value={row.contact_email || ''}
                        onChange={(e) => handleUpdateRow(i, 'contact_email', e.target.value)}
                        className="w-full bg-vodacom-darker border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-vodacom-blue"
                        placeholder="Email"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={row.company_address || ''}
                        onChange={(e) => handleUpdateRow(i, 'company_address', e.target.value)}
                        className="w-full bg-vodacom-darker border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-vodacom-blue"
                        placeholder="Address"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="date"
                        value={row.coverage_start || row.start_date || ''}
                        onChange={(e) => handleUpdateRow(i, 'coverage_start', e.target.value)}
                        className="w-full bg-vodacom-darker border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-vodacom-blue"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="date"
                        value={row.coverage_end || row.end_date || ''}
                        onChange={(e) => handleUpdateRow(i, 'coverage_end', e.target.value)}
                        className="w-full bg-vodacom-darker border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-vodacom-blue"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={row.contract_amount ?? row.amount ?? ''}
                        onChange={(e) => handleUpdateRow(i, 'contract_amount', e.target.value)}
                        className="w-full bg-vodacom-darker border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-vodacom-blue"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={row.status || 'active'}
                        onChange={(e) => handleUpdateRow(i, 'status', e.target.value)}
                        className="w-full bg-vodacom-darker border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-vodacom-blue"
                      >
                        <option value="active">Active</option>
                        <option value="expired">Expired</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={row.additional_notes || row.notes || ''}
                        onChange={(e) => handleUpdateRow(i, 'additional_notes', e.target.value)}
                        className="w-full bg-vodacom-darker border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-vodacom-blue"
                        placeholder="Notes"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button 
                        onClick={() => handleDeleteRow(i)}
                        className="p-1.5 hover:bg-red-400/10 rounded-lg text-vodacom-muted hover:text-red-400 transition-colors"
                        title="Remove row"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {previewData.length === 0 && (
                  <tr>
                    <td colSpan={12} className="px-4 py-8 text-center text-vodacom-muted">
                      No data to preview.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
