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
    const invalidRow = previewData.find(r => !r.customer_id || !r.start_date || !r.end_date)
    if (invalidRow) {
      alert('Please ensure all contracts have a customer assigned and valid start & end dates before importing.')
      return
    }

    setIsSaving(true)
    try {
      const sanitized = previewData.map(r => ({
        customer_id: Number(r.customer_id),
        start_date: typeof r.start_date === 'string' ? r.start_date.split('T')[0] : r.start_date,
        end_date: typeof r.end_date === 'string' ? r.end_date.split('T')[0] : r.end_date,
        amount: Number(r.amount) || 0,
        status: (r.status || 'active').toLowerCase(),
        notes: r.notes || null,
      }))
      await api.post('/api/amc/import/save', { contracts: sanitized })
      setSuccess(true)
    } catch (err: any) {
      console.error(err)
      alert(err.response?.data?.detail || err.message || 'Failed to import contracts')
    } finally {
      setIsSaving(false)
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[50vh] bg-vodacom-surface rounded-2xl border border-white/5">
        <CheckCircle2 className="w-16 h-16 text-vodacom-green mb-6" />
        <h2 className="text-2xl font-bold text-white mb-2">Import Successful!</h2>
        <p className="text-vodacom-muted mb-8">All AMC contracts have been imported successfully.</p>
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
          <p className="text-[13px] text-vodacom-muted mt-1">Upload an Excel spreadsheet (.xlsx) to bulk import maintenance contracts</p>
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
                  <p className="text-[13px] text-vodacom-muted">Only .xlsx files are supported</p>
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
              Supported Columns
            </h3>
            <div className="space-y-3">
              <div className="bg-vodacom-darker/60 p-3 rounded-xl border border-white/5">
                <p className="text-xs text-white mb-1"><span className="text-vodacom-green font-medium">Customer</span> (Required)</p>
                <p className="text-[11px] text-vodacom-muted">customer_name, customer, client, company</p>
              </div>
              <div className="bg-vodacom-darker/60 p-3 rounded-xl border border-white/5">
                <p className="text-xs text-white mb-1"><span className="text-vodacom-green font-medium">Start Date</span> (Required)</p>
                <p className="text-[11px] text-vodacom-muted">start_date, start, from_date</p>
              </div>
              <div className="bg-vodacom-darker/60 p-3 rounded-xl border border-white/5">
                <p className="text-xs text-white mb-1"><span className="text-vodacom-green font-medium">End Date</span> (Required)</p>
                <p className="text-[11px] text-vodacom-muted">end_date, end, to_date, expiry</p>
              </div>
              <div className="bg-vodacom-darker/60 p-3 rounded-xl border border-white/5">
                <p className="text-xs text-white mb-1"><span className="text-vodacom-green font-medium">Amount</span> (Required)</p>
                <p className="text-[11px] text-vodacom-muted">amount, contract_amount, value</p>
              </div>
              <div className="bg-vodacom-darker/60 p-3 rounded-xl border border-white/5">
                <p className="text-xs text-white mb-1">Status</p>
                <p className="text-[11px] text-vodacom-muted">defaults to "active"</p>
              </div>
              <div className="bg-vodacom-darker/60 p-3 rounded-xl border border-white/5">
                <p className="text-xs text-white mb-1">Notes</p>
                <p className="text-[11px] text-vodacom-muted">notes, remarks, comments</p>
              </div>
              <p className="text-[10px] text-vodacom-muted mt-2 px-1">Note: Contract # is auto-generated</p>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="bg-vodacom-surface border border-white/5 rounded-2xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-white font-medium">Review & Edit Data</h2>
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
                className="bg-vodacom-green hover:bg-emerald-500 disabled:opacity-50 text-white px-6 py-2 rounded-xl transition-colors text-xs font-medium"
              >
                {isSaving ? 'Importing...' : 'Import All'}
              </button>
            </div>
          </div>

          {warnings.length > 0 && (
            <div className="m-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-yellow-500 mb-1">Warnings</h4>
                <ul className="list-disc pl-4 text-xs text-yellow-500/80 space-y-1">
                  {warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-vodacom-darker/60 text-[11px] uppercase tracking-wider text-vodacom-muted">
                  <th className="px-4 py-3 border-b border-white/5 font-medium">#</th>
                  <th className="px-4 py-3 border-b border-white/5 font-medium">Customer</th>
                  <th className="px-4 py-3 border-b border-white/5 font-medium">Start Date</th>
                  <th className="px-4 py-3 border-b border-white/5 font-medium">End Date</th>
                  <th className="px-4 py-3 border-b border-white/5 font-medium">Amount (₹)</th>
                  <th className="px-4 py-3 border-b border-white/5 font-medium">Status</th>
                  <th className="px-4 py-3 border-b border-white/5 font-medium">Notes</th>
                  <th className="px-4 py-3 border-b border-white/5 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="text-xs text-white divide-y divide-white/5">
                {previewData.map((row, i) => (
                  <tr key={i} className="hover:bg-vodacom-darker/30">
                    <td className="px-4 py-3 text-vodacom-muted">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <select
                          value={row.customer_id || ''}
                          onChange={(e) => handleUpdateRow(i, 'customer_id', e.target.value ? parseInt(e.target.value, 10) : null)}
                          className={`bg-vodacom-darker border ${!row.customer_id ? 'border-red-500/50 text-red-400 focus:border-red-500' : 'border-white/10'} rounded-lg px-2 py-1.5 text-xs text-white w-40 outline-none`}
                        >
                          <option value="">Select Customer...</option>
                          {customers.map((c: any) => (
                            <option key={c.id} value={c.id}>{c.company_name || c.contact_person || `Customer #${c.id}`}</option>
                          ))}
                        </select>
                        {!row.customer_id && row.customer_name && (
                          <span className="text-[10px] text-red-400/80">Parsed: {row.customer_name}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="date"
                        value={row.start_date || ''}
                        onChange={(e) => handleUpdateRow(i, 'start_date', e.target.value)}
                        className="bg-vodacom-darker border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white w-32 outline-none focus:border-vodacom-blue/50"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="date"
                        value={row.end_date || ''}
                        onChange={(e) => handleUpdateRow(i, 'end_date', e.target.value)}
                        className="bg-vodacom-darker border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white w-32 outline-none focus:border-vodacom-blue/50"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={row.amount || ''}
                        onChange={(e) => handleUpdateRow(i, 'amount', e.target.value)}
                        className="bg-vodacom-darker border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white w-24 outline-none focus:border-vodacom-blue/50"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={row.status || 'active'}
                        onChange={(e) => handleUpdateRow(i, 'status', e.target.value)}
                        className="bg-vodacom-darker border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white w-24 outline-none focus:border-vodacom-blue/50"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={row.notes || ''}
                        onChange={(e) => handleUpdateRow(i, 'notes', e.target.value)}
                        className="bg-vodacom-darker border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white w-32 outline-none focus:border-vodacom-blue/50"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <button 
                        onClick={() => handleDeleteRow(i)}
                        className="p-1.5 hover:bg-white/10 rounded-lg text-vodacom-muted hover:text-red-400 transition-colors"
                        title="Remove row"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {previewData.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-vodacom-muted">
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
