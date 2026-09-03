'use client'

import React, { useState } from 'react'
import { Upload, FileSpreadsheet, ArrowLeft, CheckCircle2, X, AlertTriangle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import api from '../../../lib/api'

export default function ImportCustomersPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [previewData, setPreviewData] = useState<any[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const [successCount, setSuccessCount] = useState(0)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handlePreview = async () => {
    if (!file) return
    setLoading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await api.post('/api/customers/import/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setPreviewData(response.data.rows || response.data.data || [])
      setWarnings(response.data.warnings || [])
      setStep(2)
    } catch (error) {
      console.error('Preview error:', error)
      alert('Error uploading file for preview. Please check console.')
    } finally {
      setLoading(false)
    }
  }

  const handleCellChange = (index: number, field: string, value: string) => {
    const newData = [...previewData]
    newData[index] = { ...newData[index], [field]: value }
    setPreviewData(newData)
  }

  const handleDeleteRow = (index: number) => {
    const newData = [...previewData]
    newData.splice(index, 1)
    setPreviewData(newData)
  }

  const handleImportAll = async () => {
    setLoading(true)
    try {
      const response = await api.post('/api/customers/import/save', { customers: previewData })
      setSuccessCount(response.data.count || previewData.length)
      setStep(3)
    } catch (error) {
      console.error('Save error:', error)
      alert('Error importing customers. Please check console.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-8 bg-vodacom-darker/30">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => step === 2 ? setStep(1) : router.push('/customers')}
            className="p-2 rounded-xl bg-vodacom-surface border border-white/10 hover:bg-white/5 transition-colors text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-white">Import Customers</h1>
            <p className="text-sm text-vodacom-muted mt-1">
              Upload an Excel spreadsheet (.xlsx) to bulk upload client customer profiles
            </p>
          </div>
        </div>

        {/* Step 1: Upload */}
        {step === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <div className="bg-vodacom-surface border border-white/5 rounded-2xl p-8 text-center">
                <div className="border-2 border-dashed border-white/10 rounded-xl p-12 hover:bg-white/[0.02] transition-colors relative">
                  <input 
                    type="file" 
                    accept=".xlsx" 
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="p-4 bg-vodacom-darker/60 rounded-full">
                      <Upload className="w-8 h-8 text-vodacom-blue" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {file ? file.name : "Click or drag file to this area to upload"}
                      </p>
                      <p className="text-xs text-vodacom-muted mt-1">
                        Support for a single .xlsx file
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex justify-end">
                  <button
                    onClick={handlePreview}
                    disabled={!file || loading}
                    className="px-6 py-2.5 rounded-xl bg-vodacom-green hover:bg-emerald-500 text-white font-medium text-sm transition-colors disabled:opacity-50 flex items-center"
                  >
                    {loading ? 'Uploading...' : 'Preview Data'}
                  </button>
                </div>
              </div>
            </div>

            {/* Column Documentation */}
            <div className="bg-vodacom-surface border border-white/5 rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center">
                <FileSpreadsheet className="w-4 h-4 mr-2 text-vodacom-blue" />
                Supported Columns
              </h3>
              <div className="space-y-4 text-[13px]">
                {[
                  { name: 'company_name', alias: 'Name, Company' },
                  { name: 'contact_person', alias: 'Contact, Person' },
                  { name: 'phone', alias: 'Phone Number, Mobile' },
                  { name: 'email', alias: 'Email Address' },
                  { name: 'address', alias: 'Billing Address' },
                  { name: 'shipping_address', alias: 'Shipping' },
                  { name: 'state_name', alias: 'State' },
                  { name: 'state_code', alias: 'Code' },
                  { name: 'gstin', alias: 'GST' }
                ].map((col) => (
                  <div key={col.name} className="flex justify-between items-start border-b border-white/5 pb-2 last:border-0">
                    <span className="text-white font-medium">{col.name}</span>
                    <span className="text-vodacom-muted text-right text-[11px] max-w-[120px]">{col.alias}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Review & Edit */}
        {step === 2 && (
          <div className="space-y-6">
            {warnings && warnings.length > 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-yellow-500">Warnings found</h4>
                  <ul className="mt-1 space-y-1">
                    {warnings.map((w, i) => (
                      <li key={i} className="text-xs text-yellow-500/80">{w}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="bg-vodacom-surface border border-white/5 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-white/10 flex justify-between items-center bg-vodacom-darker/60">
                <div>
                  <h3 className="text-sm font-medium text-white">Review Data</h3>
                  <p className="text-xs text-vodacom-muted">{previewData.length} rows ready for import</p>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setStep(1)}
                    className="px-4 py-2 rounded-xl bg-vodacom-surface hover:bg-white/5 border border-white/10 text-white text-sm transition-colors"
                  >
                    Go Back
                  </button>
                  <button
                    onClick={handleImportAll}
                    disabled={loading || previewData.length === 0}
                    className="px-6 py-2 rounded-xl bg-vodacom-green hover:bg-emerald-500 text-white font-medium text-sm transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Importing...' : 'Import All'}
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar p-2">
                <table className="w-full text-left border-collapse min-w-max">
                  <thead className="sticky top-0 bg-vodacom-surface z-10">
                    <tr>
                      <th className="px-3 py-3 text-[10px] font-medium text-vodacom-muted uppercase tracking-wider">#</th>
                      <th className="px-3 py-3 text-[10px] font-medium text-vodacom-muted uppercase tracking-wider">Company Name</th>
                      <th className="px-3 py-3 text-[10px] font-medium text-vodacom-muted uppercase tracking-wider">Contact Person</th>
                      <th className="px-3 py-3 text-[10px] font-medium text-vodacom-muted uppercase tracking-wider">Email</th>
                      <th className="px-3 py-3 text-[10px] font-medium text-vodacom-muted uppercase tracking-wider">Phone</th>
                      <th className="px-3 py-3 text-[10px] font-medium text-vodacom-muted uppercase tracking-wider">Address</th>
                      <th className="px-3 py-3 text-[10px] font-medium text-vodacom-muted uppercase tracking-wider">Shipping Address</th>
                      <th className="px-3 py-3 text-[10px] font-medium text-vodacom-muted uppercase tracking-wider">State</th>
                      <th className="px-3 py-3 text-[10px] font-medium text-vodacom-muted uppercase tracking-wider">State Code</th>
                      <th className="px-3 py-3 text-[10px] font-medium text-vodacom-muted uppercase tracking-wider">GSTIN</th>
                      <th className="px-3 py-3 text-[10px] font-medium text-vodacom-muted uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {previewData.map((row, i) => (
                      <tr key={i} className="hover:bg-white/[0.02]">
                        <td className="px-3 py-2 text-[11px] text-vodacom-muted w-10">{i + 1}</td>
                        {['company_name', 'contact_person', 'email', 'phone', 'address', 'shipping_address', 'state_name', 'state_code', 'gstin'].map((field) => (
                          <td key={field} className="px-3 py-2 min-w-[140px]">
                            <input
                              type="text"
                              value={row[field] || ''}
                              onChange={(e) => handleCellChange(i, field, e.target.value)}
                              className="w-full bg-vodacom-darker border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-vodacom-blue focus:ring-1 focus:ring-vodacom-blue transition-colors"
                            />
                          </td>
                        ))}
                        <td className="px-3 py-2 text-right">
                          <button
                            onClick={() => handleDeleteRow(i)}
                            className="p-1.5 rounded-lg text-vodacom-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
                            title="Remove row"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewData.length === 0 && (
                  <div className="text-center py-12 text-vodacom-muted text-sm">
                    No data to display. Please go back and upload a valid file.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
          <div className="bg-vodacom-surface border border-white/5 rounded-2xl p-12 text-center max-w-2xl mx-auto">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Import Successful</h2>
            <p className="text-vodacom-muted mb-8">
              Successfully imported {successCount} customer profiles.
            </p>
            <button
              onClick={() => router.push('/customers')}
              className="px-6 py-2.5 rounded-xl bg-vodacom-surface hover:bg-white/5 border border-white/10 text-white font-medium text-sm transition-colors"
            >
              View Customers
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
