'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function UploadDocument() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [clients, setClients] = useState([]);
  const [formData, setFormData] = useState({
    clientId: '',
    year: '2024-25',
    documentType: 'ITR',
    fileUrl: '',
    fileName: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/clients', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setClients(data);
        if (data.length > 0) {
          setFormData((prev) => ({ ...prev, clientId: data[0]._id }));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const uploadSystemFile = async (file) => {
    if (!file) return;
    setUploadingFile(true);
    setError('');

    const token = localStorage.getItem('token');
    const uploadData = new FormData();
    uploadData.append('file', file);

    try {
      const res = await fetch('/api/documents/upload-file', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: uploadData
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to upload system file');
      }

      setSelectedFile(file);
      setFormData((prev) => ({
        ...prev,
        fileUrl: data.fileUrl,
        fileName: data.fileName || file.name
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadSystemFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      uploadSystemFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    let finalFileUrl = formData.fileUrl?.trim();
    let finalFileName = formData.fileName?.trim();

    // Auto-generate storage URL if user doesn't have a URL or upload file
    if (!finalFileUrl) {
      const timestamp = Date.now();
      const docTypeLower = formData.documentType.toLowerCase();
      finalFileUrl = `/uploads/${docTypeLower}_${formData.year}_${timestamp}.pdf`;
      if (!finalFileName) {
        finalFileName = `${formData.documentType}_${formData.year}.pdf`;
      }
    }

    const payload = {
      ...formData,
      fileUrl: finalFileUrl,
      fileName: finalFileName || `${formData.documentType}_${formData.year}.pdf`
    };

    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to upload document');
      }

      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto my-6 liquid-glass p-8 lg:p-10 rounded-3xl shadow-xl">
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 bg-emerald-600/10 text-emerald-800 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-bold mb-2 shadow-xs">
          <span>📤 Document Uploader</span>
        </div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Upload Client Document</h2>
        <p className="text-xs text-slate-500 font-medium">Select a file from your computer system or click Save (URL is automatically generated!)</p>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-2xl text-xs mb-4 flex items-center gap-2 font-semibold">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Select Client *</label>
          <select
            required
            className="w-full px-4 py-3 bg-white/80 border border-slate-300/80 rounded-2xl text-xs font-medium text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition shadow-xs"
            value={formData.clientId}
            onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
          >
            {clients.length > 0 ? (
              clients.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.whatsappNumber})
                </option>
              ))
            ) : (
              <option value="">No clients found. Add a client first.</option>
            )}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Document Type *</label>
            <select
              className="w-full px-4 py-3 bg-white/80 border border-slate-300/80 rounded-2xl text-xs font-medium text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition shadow-xs"
              value={formData.documentType}
              onChange={(e) => setFormData({ ...formData, documentType: e.target.value })}
            >
              <option value="ITR">ITR (Income Tax Return)</option>
              <option value="GSTR1">GSTR-1</option>
              <option value="GSTR3B">GSTR-3B</option>
              <option value="BALANCE_SHEET">Balance Sheet & PnL</option>
              <option value="TAX_AUDIT">Tax Audit Report</option>
              <option value="FORM_16">Form 16 / Salary Certificate</option>
              <option value="TDS_RETURN">TDS Return</option>
              <option value="COMPUTATION">Tax Computation</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Assessment Year *</label>
            <select
              className="w-full px-4 py-3 bg-white/80 border border-slate-300/80 rounded-2xl text-xs font-medium text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition shadow-xs"
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: e.target.value })}
            >
              <option value="2025-26">2025-26</option>
              <option value="2024-25">2024-25</option>
              <option value="2023-24">2023-24</option>
              <option value="2022-23">2022-23</option>
            </select>
          </div>
        </div>

        {/* Drag & Drop Liquid Glass File Dropzone */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Choose File from Computer System (Optional)</label>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
            className="hidden"
            onChange={handleFileChange}
          />

          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-2 ${
              dragActive ? 'border-emerald-500 bg-emerald-50/80 shadow-md' : 'border-slate-300/80 hover:border-emerald-500 bg-white/60 hover:bg-white/90 shadow-xs'
            }`}
          >
            {uploadingFile ? (
              <div className="flex items-center gap-2 text-emerald-700 text-sm font-bold animate-pulse">
                <span>⚡ Uploading file from your computer...</span>
              </div>
            ) : selectedFile || formData.fileUrl ? (
              <div className="flex flex-col items-center gap-1">
                <span className="text-3xl">📄</span>
                <span className="text-sm font-bold text-slate-900">{formData.fileName || selectedFile?.name || 'File Registered'}</span>
                <span className="text-xs text-emerald-700 bg-emerald-100/90 px-3 py-1 rounded-xl font-mono border border-emerald-300">{formData.fileUrl}</span>
                <span className="text-xs text-slate-400 mt-1 hover:underline">Click or drag a new file to replace</span>
              </div>
            ) : (
              <>
                <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center text-2xl font-bold mb-1 shadow-xs">
                  📁
                </div>
                <p className="text-sm font-bold text-slate-800">
                  Drag & Drop file here or <span className="text-emerald-700 underline">Choose from System</span>
                </p>
                <p className="text-xs text-slate-400 font-medium">Or leave blank to auto-generate document file record!</p>
              </>
            )}
          </div>
        </div>

        {/* Optional Custom File URL */}
        <details className="text-xs text-slate-600 bg-white/40 p-3 rounded-2xl border border-slate-200/60">
          <summary className="font-bold text-slate-700 cursor-pointer select-none">🔗 Custom S3 / External File URL (Optional)</summary>
          <div className="mt-3 space-y-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Custom S3 / Web Link</label>
              <input
                type="text"
                placeholder="Auto-generated if left blank (e.g. /uploads/itr_2024-25.pdf)"
                className="w-full px-4 py-2.5 bg-white border border-slate-300/80 rounded-xl text-xs text-slate-800 font-mono outline-none focus:border-emerald-600 transition"
                value={formData.fileUrl}
                onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Custom Display File Name</label>
              <input
                type="text"
                placeholder="ITR_Acknowledgement_2024_25.pdf"
                className="w-full px-4 py-2.5 bg-white border border-slate-300/80 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-emerald-600 transition"
                value={formData.fileName}
                onChange={(e) => setFormData({ ...formData, fileName: e.target.value })}
              />
            </div>
          </div>
        </details>

        <div className="pt-2 flex gap-3">
          <button
            type="submit"
            disabled={loading || !formData.clientId}
            className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold py-3.5 rounded-2xl text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-600/20 disabled:opacity-50"
          >
            {loading ? 'Registering Document...' : 'Save & Register Document'}
          </button>
          <Link href="/dashboard" className="px-6 py-3.5 border border-slate-300/80 rounded-2xl text-xs text-slate-700 hover:bg-white font-bold transition">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
