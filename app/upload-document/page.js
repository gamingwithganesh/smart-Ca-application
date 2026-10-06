'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Upload, AlertTriangle, CreditCard, Loader2, CheckCircle2, FolderUp } from 'lucide-react';

export default function UploadDocument() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [clients, setClients] = useState([]);
  const [clientMode, setClientMode] = useState('select'); // 'select' or 'quick'
  const [quickClient, setQuickClient] = useState({
    name: '',
    mobile: '',
    email: ''
  });
  const [formData, setFormData] = useState({
    clientId: '',
    year: '2024-25',
    documentType: 'ITR',
    fileUrl: '',
    fileName: '',
    paymentAmount: '500',
    paymentStatus: 'PENDING'
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    fetchClients();
  }, []);

  const uploadSystemFile = async (file) => {
    if (!file) return;
    setUploadingFile(true);
    setError('');

    const token = localStorage.getItem('token');
    const fileSizeMB = file.size / (1024 * 1024);

    try {
      // Direct S3 Pre-signed URL upload for files larger than 4MB
      if (fileSizeMB > 4) {
        const presignedRes = await fetch('/api/documents/presigned-upload-url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            fileName: file.name,
            contentType: file.type || 'application/pdf',
            clientId: formData.clientId || 'general'
          })
        });

        if (presignedRes.ok) {
          const { uploadUrl, fileUrl, s3Key, bucket } = await presignedRes.json();
          const s3UploadRes = await fetch(uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': file.type || 'application/octet-stream' },
            body: file
          });

          if (!s3UploadRes.ok) throw new Error('Failed to upload directly to S3');

          setSelectedFile(file);
          setFormData((prev) => ({
            ...prev,
            fileUrl,
            fileName: file.name,
            s3Key,
            bucket,
            mimeType: file.type || 'application/pdf',
            fileSize: file.size
          }));
          setUploadingFile(false);
          return;
        }
      }

      // Standard API multipart upload for smaller files
      const data = new FormData();
      data.append('file', file);
      data.append('clientId', formData.clientId || 'general');

      const res = await fetch('/api/documents/upload-file', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: data
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.message || 'File upload failed');

      setSelectedFile(file);
      setFormData((prev) => ({
        ...prev,
        fileUrl: resData.fileUrl,
        fileName: resData.fileName,
        s3Key: resData.s3Key,
        bucket: resData.bucket,
        mimeType: resData.mimeType,
        fileSize: resData.fileSize
      }));
    } catch (err) {
      setError(err.message || 'Error uploading file');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      uploadSystemFile(e.target.files[0]);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const token = localStorage.getItem('token');
    try {
      let activeClientId = formData.clientId;

      // If Quick Mode is active, create or resolve client first
      if (clientMode === 'quick') {
        if (!quickClient.mobile && !quickClient.email) {
          throw new Error('Please enter at least a mobile number or email for the client.');
        }

        const createClientRes = await fetch('/api/clients', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            name: quickClient.name || quickClient.mobile || quickClient.email,
            whatsappNumber: quickClient.mobile,
            email: quickClient.email,
            clientType: 'INDIVIDUAL'
          })
        });

        const createdClientData = await createClientRes.json();
        if (!createClientRes.ok) {
          throw new Error(createdClientData.message || 'Failed to auto-register client');
        }

        activeClientId = createdClientData._id;
      }

      if (!activeClientId) {
        throw new Error('Please select or create a valid client.');
      }

      const payload = {
        ...formData,
        clientId: activeClientId,
        documentName: formData.documentName || `${formData.documentType} Return - FY ${formData.year}`,
        paymentAmount: formData.paymentAmount !== '' ? Number(formData.paymentAmount) : 0,
        paymentStatus: formData.paymentStatus || 'PENDING'
      };

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
    <div className="max-w-xl mx-auto my-4 sm:my-8 liquid-glass p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm animate-in fade-in duration-300">
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-0.5 rounded-full text-xs font-bold mb-1.5">
          <Upload size={13} />
          <span>Document Uploader</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Upload Client Document</h2>
        <p className="text-xs text-slate-500 font-medium">Upload by selecting existing client or directly entering client mobile / email</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs mb-4 flex items-center gap-2 font-semibold">
          <AlertTriangle size={15} className="text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Client Selection Mode Selector */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Target Client *</label>
            <div className="flex bg-slate-100 p-0.5 rounded-lg text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setClientMode('select')}
                className={`px-2.5 py-1 rounded-md transition ${clientMode === 'select' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Existing Client
              </button>
              <button
                type="button"
                onClick={() => setClientMode('quick')}
                className={`px-2.5 py-1 rounded-md transition ${clientMode === 'quick' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
              >
                By Mobile / Email
              </button>
            </div>
          </div>

          {clientMode === 'select' ? (
            <select
              required
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-slate-900 transition"
              value={formData.clientId}
              onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
            >
              {clients.length > 0 ? (
                clients.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} ({c.whatsappNumber || c.email || 'Client'})
                  </option>
                ))
              ) : (
                <option value="">No clients found. Switch to &apos;By Mobile / Email&apos; above.</option>
              )}
            </select>
          ) : (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Client Mobile / WhatsApp *</label>
                  <input
                    type="tel"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-slate-900 transition"
                    value={quickClient.mobile}
                    onChange={(e) => setQuickClient({ ...quickClient, mobile: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Client Email (Optional)</label>
                  <input
                    type="email"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-slate-900 transition"
                    value={quickClient.email}
                    onChange={(e) => setQuickClient({ ...quickClient, email: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Client Name / Business (Optional)</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-slate-900 transition"
                  value={quickClient.name}
                  onChange={(e) => setQuickClient({ ...quickClient, name: e.target.value })}
                />
              </div>
              <p className="text-[10px] text-slate-500 font-medium">
                When this client registers on their own with this Mobile or Email, they will automatically see this document in their Client Portal.
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Document Type *</label>
            <select
              required
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-slate-900 transition"
              value={formData.documentType}
              onChange={(e) => {
                const newType = e.target.value;
                setFormData((prev) => ({
                  ...prev,
                  documentType: newType,
                  documentName: prev.documentName ? prev.documentName : `${newType} Return - FY ${prev.year}`
                }));
              }}
            >
              <option value="ITR">Income Tax Return (ITR)</option>
              <option value="GST">GST Return / 3B</option>
              <option value="TDS">TDS Certificate / Form 16</option>
              <option value="BALANCE_SHEET">Balance Sheet / P&L</option>
              <option value="AUDIT_REPORT">Tax Audit Report</option>
              <option value="OTHER">Other Financial Doc</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Financial Year (FY) *</label>
            <input
              type="text"
              required
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-slate-900 transition"
              value={formData.year}
              onChange={(e) => {
                const newYear = e.target.value;
                setFormData((prev) => ({
                  ...prev,
                  year: newYear,
                  documentName: prev.documentName ? prev.documentName : `${prev.documentType} Return - FY ${newYear}`
                }));
              }}
            />
          </div>
        </div>

        {/* Document Display Name / Title */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
            Document Title / Display Name (Shown to Client) *
          </label>
          <input
            type="text"
            required
            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-slate-900 transition"
            value={formData.documentName || ''}
            onChange={(e) => setFormData({ ...formData, documentName: e.target.value })}
          />
          <p className="text-[10px] text-slate-500 font-medium mt-1">
            This clean, official title will be displayed in the client&apos;s document vault and chatbot.
          </p>
        </div>

        {/* Payment & Watermark Fee Settings */}
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <CreditCard size={14} className="text-slate-600" />
              <span>Document Fee & Payment Lock</span>
            </span>
            <span className="text-[10px] text-slate-500">Unpaid previews show CA firm watermark</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Fee Amount (₹)</label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-slate-400 font-bold text-xs">₹</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-slate-900"
                  value={formData.paymentAmount !== undefined ? formData.paymentAmount : '500'}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '');
                    const cleanVal = digits === '' ? '' : String(parseInt(digits, 10));
                    setFormData((prev) => ({ ...prev, paymentAmount: cleanVal }));
                  }}
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Initial Status</label>
              <select
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-slate-900"
                value={formData.paymentStatus || 'PENDING'}
                onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
              >
                <option value="PENDING">Pending (Watermarked)</option>
                <option value="COMPLETED">Paid (Clean / Unlocked)</option>
                <option value="IN_PROCESS">In Process</option>
                <option value="FREE">Free / No Charge</option>
              </select>
            </div>
          </div>
        </div>

        {/* Drag and Drop Zone */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
            Choose File from Device *
          </label>
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition ${
              dragActive
                ? 'border-slate-900 bg-slate-100'
                : selectedFile
                ? 'border-emerald-600 bg-emerald-50/40'
                : 'border-slate-300 bg-slate-50/80 hover:bg-slate-100/80'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
            />
            {uploadingFile ? (
              <div className="space-y-1.5 flex flex-col items-center justify-center">
                <Loader2 size={24} className="animate-spin text-slate-800" />
                <div className="font-bold text-slate-900">Uploading File...</div>
              </div>
            ) : selectedFile ? (
              <div className="space-y-1.5 flex flex-col items-center justify-center">
                <CheckCircle2 size={24} className="text-emerald-600" />
                <div className="font-bold text-slate-900 text-xs">{selectedFile.name}</div>
                <div className="text-[10px] text-slate-500 font-semibold">
                  {(selectedFile.size / 1024).toFixed(1)} KB • Click to replace
                </div>
              </div>
            ) : (
              <div className="space-y-1.5 flex flex-col items-center justify-center">
                <FolderUp size={26} className="text-slate-400" />
                <div className="font-bold text-slate-800 text-xs">Drag & drop or Click to browse</div>
                <div className="text-[10px] text-slate-400">PDF, Excel, Word up to 25MB</div>
              </div>
            )}
          </div>
        </div>

        <div className="pt-3 flex flex-col sm:flex-row gap-2.5">
          <button
            type="submit"
            disabled={loading || uploadingFile || !formData.fileUrl}
            className="flex-1 btn-primary py-2.5 rounded-xl text-xs uppercase tracking-wider disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Saving to Vault...' : 'Save & Publish to Client Vault'}
          </button>
          <Link href="/dashboard" className="btn-outline px-5 py-2.5 rounded-xl text-xs text-center font-bold">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
