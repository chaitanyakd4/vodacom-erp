'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileSpreadsheet, ArrowLeft, CheckCircle2 } from 'lucide-react';
import api from '../../../lib/api';

export default function ImportPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setSuccess(false);
      setMessage('');
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/api/products/import/excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccess(true);
      setMessage(res.data.message || 'Products imported successfully');
      setFile(null);
    } catch (err: any) {
      console.error(err);
      setMessage(err.response?.data?.detail || 'Failed to import spreadsheet. Check columns format.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-vodacom-surface border border-white/5 p-8 rounded-2xl shadow-2xl">
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => router.push('/products')}
          className="text-vodacom-muted hover:text-white p-1 rounded-lg transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-lg font-bold text-white tracking-wide">Import Products</h1>
          <p className="text-xs text-vodacom-muted">Upload an Excel spreadsheet (.xlsx) to bulk upload products</p>
        </div>
      </div>

      <div className="mb-6 p-4 bg-vodacom-darker/60 rounded-xl border border-white/5 text-xs text-vodacom-muted leading-relaxed space-y-2">
        <div className="font-bold text-white uppercase tracking-wider text-[10px]">Supported Excel Column Names:</div>
        <p>Your spreadsheet&apos;s <span className="text-white font-semibold">first row</span> must contain column headers. The importer reads these columns:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><span className="text-white font-semibold">name</span> <span className="text-vodacom-green">(Required)</span> — Also accepts: <code className="text-vodacom-blue">product_name</code>, <code className="text-vodacom-blue">item_name</code>, <code className="text-vodacom-blue">product</code>, <code className="text-vodacom-blue">item</code></li>
          <li><span className="text-white font-semibold">price</span> — Also accepts: <code className="text-vodacom-blue">unit_price</code>, <code className="text-vodacom-blue">rate</code>, <code className="text-vodacom-blue">mrp</code>, <code className="text-vodacom-blue">cost</code></li>
          <li><span className="text-white font-semibold">tax_rate</span> — Also accepts: <code className="text-vodacom-blue">gst</code>, <code className="text-vodacom-blue">gst_rate</code>, <code className="text-vodacom-blue">tax</code></li>
          <li><span className="text-white font-semibold">stock_quantity</span> — Also accepts: <code className="text-vodacom-blue">stock</code>, <code className="text-vodacom-blue">qty</code>, <code className="text-vodacom-blue">quantity</code>, <code className="text-vodacom-blue">opening_stock</code></li>
          <li><span className="text-white font-semibold">hsn_code</span> — Also accepts: <code className="text-vodacom-blue">hsn</code>, <code className="text-vodacom-blue">hsn_sac</code>, <code className="text-vodacom-blue">sac_code</code></li>
          <li><span className="text-white font-semibold">description</span> — Also accepts: <code className="text-vodacom-blue">desc</code>, <code className="text-vodacom-blue">details</code></li>
          <li><span className="text-white font-semibold">unit</span> — Also accepts: <code className="text-vodacom-blue">uom</code>, <code className="text-vodacom-blue">unit_of_measure</code></li>
        </ul>
        <p className="mt-2 text-[11px] text-vodacom-blue">Column names are case-insensitive. Spaces are treated as underscores. Rows without a name are skipped.</p>
      </div>

      {success && (
        <div className="mb-6 p-4 bg-vodacom-green/10 border border-vodacom-green/20 rounded-xl text-vodacom-green text-xs font-semibold flex items-center gap-3">
          <CheckCircle2 size={16} />
          <span>{message}</span>
        </div>
      )}

      {message && !success && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-semibold">
          {message}
        </div>
      )}

      <form onSubmit={handleUpload} className="space-y-6">
        <div className="border-2 border-dashed border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center bg-vodacom-darker/30 hover:bg-vodacom-darker/50 transition-colors cursor-pointer relative group">
          <input
            required
            type="file"
            accept=".xlsx"
            onChange={handleFileChange}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
          {file ? (
            <div className="flex flex-col items-center text-center">
              <FileSpreadsheet size={36} className="text-vodacom-green mb-3" />
              <span className="text-white font-semibold text-[13px]">{file.name}</span>
              <span className="text-vodacom-muted text-[11px] mt-1">
                {(file.size / 1024).toFixed(1)} KB — Ready to upload
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center">
              <Upload size={36} className="text-vodacom-muted group-hover:text-vodacom-blue transition-colors mb-3" />
              <span className="text-white font-semibold text-[13px]">Choose file or drag here</span>
              <span className="text-vodacom-muted text-[11px] mt-1">Supports Microsoft Excel (.xlsx) formats</span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 text-[12px] font-bold uppercase tracking-wider">
          <button
            type="button"
            onClick={() => router.push('/products')}
            className="px-5 py-2.5 border border-white/10 hover:bg-white/5 text-vodacom-text rounded-xl transition-all duration-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !file}
            className="px-5 py-2.5 bg-vodacom-green hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl transition-all duration-200 shadow-lg shadow-vodacom-green/15 disabled:cursor-not-allowed"
          >
            {loading ? 'Importing...' : 'Upload Spreadsheet'}
          </button>
        </div>
      </form>
    </div>
  );
}
