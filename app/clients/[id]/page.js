'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import {
  FileText,
  Upload,
  Search,
  Trash2,
  Edit,
  Eye,
  Plus,
  ArrowLeft,
  X,
  FileSpreadsheet,
  FileCode,
  Image as ImageIcon,
  File as FileIcon,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  Send,
  Phone,
  Download,
  CheckCheck,
  Sparkles,
  Key,
  Copy,
  Check,
  Lock,
  ShieldCheck,
  Mail,
  IndianRupee,
  CreditCard,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export default function ClientDocuments({ params }) {
  const routeParams = useParams();
  const clientId = routeParams?.id || (params && typeof params === 'object' && !('then' in params) ? params.id : '');
  const router = useRouter();

  const [client, setClient] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('documents'); // 'documents' or 'whatsapp'

  // Search, Filter & Sort State for Documents
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [fileTypeFilter, setFileTypeFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('newest');

  // WhatsApp Messaging State
  const [chatMessage, setChatMessage] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const chatEndRef = useRef(null);

  // Modals State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showWhatsAppDocModal, setShowWhatsAppDocModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);

  // Upload Form State
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadFormData, setUploadFormData] = useState({
    documentName: '',
    category: 'ITR',
    financialYear: '2025-26',
    description: '',
    paymentAmount: '500',
    paymentStatus: 'PENDING'
  });
  const [uploading, setUploading] = useState(false);
  const uploadInputRef = useRef(null);

  // Edit Form State
  const [editFormData, setEditFormData] = useState({
    documentName: '',
    category: 'ITR',
    financialYear: '2024-25',
    description: '',
    paymentAmount: '500',
    paymentStatus: 'PENDING'
  });
  const [replaceFile, setReplaceFile] = useState(null);
  const [updating, setUpdating] = useState(false);
  const replaceInputRef = useRef(null);

  // Send WhatsApp Document State
  const [docMessageCustomText, setDocMessageCustomText] = useState('');
  const [sendingWhatsAppDoc, setSendingWhatsAppDoc] = useState(false);

  // Portal Access & Password State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [portalPasswordInput, setPortalPasswordInput] = useState('');
  const [portalEmailInput, setPortalEmailInput] = useState('');
  const [showPortalPassword, setShowPortalPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [copiedCredentials, setCopiedCredentials] = useState(false);

  // Status & Notification Messages
  const [message, setMessage] = useState({ text: '', type: '' });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (clientId) {
      fetchClientData();
    } else {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    if (activeTab === 'whatsapp' && clientId) {
      fetchMessageHistory();
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTab, clientId]);

  const fetchClientData = async () => {
    if (!clientId) {
      setLoading(false);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const [clientRes, docsRes, msgRes] = await Promise.all([
        fetch(`/api/clients/${clientId}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ ok: false, status: 500 })),
        fetch(`/api/documents?clientId=${clientId}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ ok: false, status: 500 })),
        fetch(`/api/whatsapp/messages?clientId=${clientId}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ ok: false, status: 500 }))
      ]);

      if (clientRes.status === 401 || docsRes.status === 401) {
        localStorage.removeItem('token');
        router.push('/login');
        return;
      }

      if (clientRes.ok) {
        const clientData = await clientRes.json().catch(() => null);
        setClient(clientData);
      } else {
        setClient(null);
      }

      if (docsRes.ok) {
        const docsData = await docsRes.json().catch(() => []);
        setDocuments(Array.isArray(docsData) ? docsData : []);
      }

      if (msgRes.ok) {
        const msgData = await msgRes.json().catch(() => []);
        setMessages(Array.isArray(msgData) ? msgData : []);
      }
    } catch (err) {
      console.error('Error fetching client data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessageHistory = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/whatsapp/messages?clientId=${clientId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (e) {}
  };

  const showNotification = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  // Helper for file type icons
  const getFileIcon = (mimeType, fileName = '') => {
    const ext = fileName.split('.').pop().toLowerCase();
    if (ext === 'pdf' || (mimeType && mimeType.includes('pdf'))) {
      return <FileText className="text-rose-600" size={18} />;
    }
    if (['xls', 'xlsx', 'csv'].includes(ext) || (mimeType && (mimeType.includes('excel') || mimeType.includes('spreadsheet')))) {
      return <FileSpreadsheet className="text-emerald-600" size={18} />;
    }
    if (['doc', 'docx'].includes(ext) || (mimeType && mimeType.includes('word'))) {
      return <FileIcon className="text-blue-600" size={18} />;
    }
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext) || (mimeType && mimeType.includes('image'))) {
      return <ImageIcon className="text-purple-600" size={18} />;
    }
    return <FileCode className="text-slate-500" size={18} />;
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // --- UPLOAD HANDLER ---
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      showNotification('Please select a file to upload!', 'error');
      return;
    }

    setUploading(true);
    const token = localStorage.getItem('token');

    try {
      const uploadData = new FormData();
      uploadData.append('file', uploadFile);
      uploadData.append('clientId', clientId);

      const s3Res = await fetch('/api/documents/upload-file', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: uploadData
      });

      const s3Data = await s3Res.json();
      if (!s3Res.ok) throw new Error(s3Data.message || 'S3 file upload failed');

      const nameToSave = uploadFormData.documentName.trim() || uploadFile.name;
      const payload = {
        clientId,
        documentName: nameToSave,
        fileName: nameToSave,
        originalFilename: uploadFile.name,
        category: uploadFormData.category,
        documentType: uploadFormData.category,
        financialYear: uploadFormData.financialYear,
        year: uploadFormData.financialYear,
        description: uploadFormData.description.trim(),
        paymentAmount: uploadFormData.paymentAmount === '' ? 0 : Number(uploadFormData.paymentAmount),
        paymentStatus: uploadFormData.paymentStatus || 'PENDING',
        s3Key: s3Data.s3Key || '',
        bucket: s3Data.bucket || 'caapp123',
        mimeType: s3Data.mimeType,
        fileSize: s3Data.fileSize,
        storageType: s3Data.storageType || 'local',
        fileUrl: s3Data.fileUrl,
        savedFileName: s3Data.savedFileName || '',
        localFilePath: s3Data.fileUrl || ''
      };

      const docRes = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const newDoc = await docRes.json();
      if (!docRes.ok) throw new Error(newDoc.message || 'Failed to save document record');

      setDocuments((prev) => [newDoc, ...prev]);
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadFormData({
        documentName: '',
        category: 'ITR',
        financialYear: '2025-26',
        description: '',
        paymentAmount: '500',
        paymentStatus: 'PENDING'
      });
      showNotification(`Document "${nameToSave}" uploaded successfully with ₹${payload.paymentAmount} fee set!`);
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  // --- EDIT & REPLACE HANDLER ---
  const handleOpenEdit = (doc) => {
    setSelectedDoc(doc);
    setEditFormData({
      documentName: doc.documentName || doc.fileName || '',
      category: doc.category || doc.documentType || 'ITR',
      financialYear: doc.financialYear || doc.year || '2024-25',
      description: doc.description || '',
      paymentAmount: doc.paymentAmount !== undefined && doc.paymentAmount !== null ? String(doc.paymentAmount) : '500',
      paymentStatus: doc.paymentStatus || 'PENDING'
    });
    setReplaceFile(null);
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDoc) return;

    setUpdating(true);
    const token = localStorage.getItem('token');

    try {
      let replacementMeta = {};

      if (replaceFile) {
        const uploadData = new FormData();
        uploadData.append('file', replaceFile);
        uploadData.append('clientId', clientId);

        const s3Res = await fetch('/api/documents/upload-file', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: uploadData
        });

        const s3Data = await s3Res.json();
        if (!s3Res.ok) throw new Error(s3Data.message || 'Failed to upload replacement file to S3');

        replacementMeta = {
          newS3Key: s3Data.s3Key,
          newFileName: replaceFile.name,
          newMimeType: s3Data.mimeType,
          newFileSize: s3Data.fileSize
        };
      }

      const updatePayload = {
        documentName: editFormData.documentName.trim(),
        category: editFormData.category,
        financialYear: editFormData.financialYear,
        description: editFormData.description.trim(),
        paymentAmount: editFormData.paymentAmount === '' ? 0 : Number(editFormData.paymentAmount),
        paymentStatus: editFormData.paymentStatus || 'PENDING',
        ...replacementMeta
      };

      const res = await fetch(`/api/documents/${selectedDoc._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updatePayload)
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.message || 'Failed to update document');

      const updatedDoc = resData.document;
      setDocuments((prev) => prev.map((d) => (d._id === updatedDoc._id ? updatedDoc : d)));
      setShowEditModal(false);
      showNotification(`Document "${updatedDoc.documentName}" updated successfully!`);
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setUpdating(false);
    }
  };

  // --- QUICK STATUS CHANGE (CA 1-CLICK TOGGLE) ---
  const handleQuickStatusChange = async (docId, newStatus) => {
    const token = localStorage.getItem('token');
    try {
      // Optimistic update
      setDocuments((prev) => prev.map((d) => (d._id === docId ? { ...d, paymentStatus: newStatus } : d)));

      const res = await fetch(`/api/documents/${docId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ paymentStatus: newStatus })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update payment status');

      const statusLabels = {
        COMPLETED: 'Marked as Paid (Watermark Removed)',
        PENDING: 'Marked as Pending (Watermarked Preview)',
        IN_PROCESS: 'Marked as In Process',
        FREE: 'Marked as Free (No Watermark)'
      };
      showNotification(statusLabels[newStatus] || `Status updated to ${newStatus}`);
    } catch (err) {
      showNotification(err.message, 'error');
      fetchClientData();
    }
  };

  // --- DELETE HANDLER ---
  const handleOpenDelete = (doc) => {
    setSelectedDoc(doc);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedDoc) return;
    setDeleting(true);
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`/api/documents/${selectedDoc._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete document');

      setDocuments((prev) => prev.filter((d) => d._id !== selectedDoc._id));
      setShowDeleteModal(false);
      showNotification(`Document "${selectedDoc.documentName || selectedDoc.fileName}" deleted permanently from S3!`);
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  // --- SEND WHATSAPP TEXT HANDLER ---
  const handleSendChatMessage = async (e) => {
    e?.preventDefault();
    if (!chatMessage.trim()) return;

    setSendingChat(true);
    const token = localStorage.getItem('token');

    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          clientId,
          body: chatMessage.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send WhatsApp message');

      setMessages((prev) => [...prev, data.data]);
      setChatMessage('');
      showNotification('WhatsApp message sent to ' + (client?.name || 'client') + '!');
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setSendingChat(false);
    }
  };

  // --- SEND WHATSAPP DOCUMENT HANDLER ---
  const handleOpenWhatsAppDocModal = (doc) => {
    setSelectedDoc(doc);
    setDocMessageCustomText(`📄 *${doc.documentName || doc.fileName}* (${doc.financialYear || doc.year || '2024-25'})`);
    setShowWhatsAppDocModal(true);
  };

  const handleSendWhatsAppDocConfirm = async () => {
    if (!selectedDoc) return;
    setSendingWhatsAppDoc(true);
    const token = localStorage.getItem('token');

    try {
      const res = await fetch('/api/whatsapp/send-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          clientId,
          documentId: selectedDoc._id,
          body: docMessageCustomText
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send WhatsApp document');

      setMessages((prev) => [...prev, data.data]);
      setShowWhatsAppDocModal(false);
      showNotification(`Document "${selectedDoc.documentName || selectedDoc.fileName}" sent successfully to ${client?.name} via WhatsApp!`);
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setSendingWhatsAppDoc(false);
    }
  };

  // --- CLIENT PORTAL ACCESS & PASSWORD HANDLERS ---
  const handleOpenPasswordModal = () => {
    setPortalEmailInput(client?.email || '');
    const digits = client?.whatsappNumber ? client.whatsappNumber.replace(/\D/g, '').slice(-4) : '1234';
    setPortalPasswordInput(`Pass#${digits}`);
    setShowPortalPassword(true);
    setCopiedCredentials(false);
    setShowPasswordModal(true);
  };

  const handleGenerateRandomPassword = () => {
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    setPortalPasswordInput(`Pass#${randomDigits}`);
    setShowPortalPassword(true);
    setCopiedCredentials(false);
  };

  const handleSavePortalCredentials = async (e) => {
    if (e) e.preventDefault();
    if (!portalPasswordInput.trim()) {
      showNotification('Please provide or generate a password', 'error');
      return;
    }

    setSavingPassword(true);
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          email: portalEmailInput.trim(),
          portalPassword: portalPasswordInput.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update portal password');

      setClient(data);
      showNotification(`Portal password updated successfully for ${data.name}!`);
      setShowPasswordModal(false);
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleCopyCredentials = () => {
    const loginIdentifier = portalEmailInput.trim() || client?.whatsappNumber || client?.email;
    const textToCopy = `🔐 *Client Portal Access Credentials*\n` +
      `Portal Link: ${window.location.origin}/login\n` +
      `Login Mobile/Email: ${loginIdentifier}\n` +
      `Password: ${portalPasswordInput.trim()}\n\n` +
      `You can log in to view your filed returns, download tax documents, and chat with your AI assistant anytime!`;

    navigator.clipboard.writeText(textToCopy);
    setCopiedCredentials(true);
    showNotification('Portal credentials copied to clipboard!');
    setTimeout(() => setCopiedCredentials(false), 3000);
  };

  // Search & Filter logic for Documents
  const filteredDocuments = documents
    .filter((doc) => {
      const nameMatch =
        (doc.documentName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.fileName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.description || '').toLowerCase().includes(searchTerm.toLowerCase());

      const categoryMatch =
        categoryFilter === 'ALL' ||
        (doc.category || '').toUpperCase() === categoryFilter.toUpperCase() ||
        (doc.documentType || '').toUpperCase() === categoryFilter.toUpperCase();

      const yearMatch =
        yearFilter === 'ALL' ||
        doc.financialYear === yearFilter ||
        doc.year === yearFilter;

      const paymentMatch =
        paymentFilter === 'ALL' ||
        (doc.paymentStatus || 'PENDING') === paymentFilter;

      let fileTypeMatch = true;
      if (fileTypeFilter !== 'ALL') {
        const ext = (doc.originalFilename || doc.fileName || '').split('.').pop().toLowerCase();
        if (fileTypeFilter === 'PDF') fileTypeMatch = ext === 'pdf';
        else if (fileTypeFilter === 'SPREADSHEET') fileTypeMatch = ['xls', 'xlsx', 'csv'].includes(ext);
        else if (fileTypeFilter === 'WORD') fileTypeMatch = ['doc', 'docx'].includes(ext);
        else if (fileTypeFilter === 'IMAGE') fileTypeMatch = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
      }

      return nameMatch && categoryMatch && yearMatch && paymentMatch && fileTypeMatch;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.uploadDate || b.createdAt) - new Date(a.uploadDate || a.createdAt);
      if (sortBy === 'oldest') return new Date(a.uploadDate || a.createdAt) - new Date(b.uploadDate || b.createdAt);
      if (sortBy === 'name') return (a.documentName || a.fileName).localeCompare(b.documentName || b.fileName);
      return 0;
    });

  // Financial summary metrics
  const totalBilled = documents.reduce((sum, d) => sum + (Number(d.paymentAmount) || 0), 0);
  const totalPaid = documents.filter((d) => d.paymentStatus === 'COMPLETED').reduce((sum, d) => sum + (Number(d.paymentAmount) || 0), 0);
  const totalPending = documents.filter((d) => (d.paymentStatus || 'PENDING') === 'PENDING' || d.paymentStatus === 'IN_PROCESS').reduce((sum, d) => sum + (Number(d.paymentAmount) || 0), 0);
  const paidDocsCount = documents.filter((d) => d.paymentStatus === 'COMPLETED').length;
  const pendingDocsCount = documents.filter((d) => (d.paymentStatus || 'PENDING') === 'PENDING' || d.paymentStatus === 'IN_PROCESS').length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 font-medium">
        <RefreshCw size={28} className="animate-spin text-emerald-600 mb-3" />
        <span>Loading client profile & document vault...</span>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="liquid-glass p-8 sm:p-12 rounded-3xl text-center max-w-lg mx-auto my-12 space-y-4">
        <div className="w-16 h-16 bg-slate-100 text-slate-700 rounded-3xl flex items-center justify-center text-3xl mx-auto font-bold">
          🔍
        </div>
        <h2 className="text-xl font-black text-slate-900">Client Profile Not Found</h2>
        <p className="text-xs text-slate-500 font-medium">
          The requested client record does not exist or you do not have permission to view it.
        </p>
        <div className="pt-2">
          <Link href="/clients" className="inline-flex items-center gap-2 btn-primary px-5 py-2.5 rounded-xl text-xs">
            <ArrowLeft size={15} />
            <span>Return to Clients Directory</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {message.text && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold flex items-center gap-2 transition animate-bounce ${
            message.type === 'error' ? 'bg-rose-50 border-rose-300 text-rose-700' : 'bg-emerald-50 border-emerald-300 text-emerald-800'
          }`}
        >
          {message.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="liquid-glass p-6 rounded-3xl flex justify-between items-center flex-wrap gap-4 shadow-sm">
        <div>
          <Link href="/clients" className="inline-flex items-center gap-1 text-xs text-emerald-700 font-bold hover:underline mb-2">
            <ArrowLeft size={14} />
            <span>Back to CA Client Vault</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {client ? client.name : 'Client'} - Client Hub
            </h1>
            <span className="text-xs bg-emerald-100/90 text-emerald-800 border border-emerald-300 px-3 py-1 rounded-full font-bold">
              {client?.clientType || 'INDIVIDUAL'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500 font-medium mt-1 flex-wrap">
            <div className="flex items-center gap-1">
              <Phone size={14} className="text-emerald-700" />
              <span>WhatsApp: <strong className="text-slate-900">{client?.whatsappNumber}</strong></span>
            </div>
            {client?.email && (
              <>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Mail size={14} className="text-emerald-700" />
                  <span>Email: <strong className="text-slate-900">{client.email}</strong></span>
                </div>
              </>
            )}
            <span>•</span>
            <span>S3 Private Bucket: <strong className="text-slate-800 font-mono">caapp123</strong></span>
          </div>
        </div>

        {/* Tab Selection & Portal Access */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleOpenPasswordModal}
            className="px-4 py-2 bg-slate-900 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <Key size={14} className="text-emerald-400" />
            <span>Portal Password & Login</span>
          </button>

          <div className="flex bg-white/70 p-1.5 rounded-2xl border border-slate-200/80 shadow-xs">
            <button
              onClick={() => setActiveTab('documents')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'documents'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <FileText size={15} />
              <span>Uploaded Documents ({documents.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('whatsapp')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'whatsapp'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <MessageSquare size={15} />
              <span>WhatsApp Messages</span>
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: UPLOADED DOCUMENTS */}
      {activeTab === 'documents' && (
        <div className="space-y-6">
          {/* Financial Fee & Payment Monitoring Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="liquid-glass p-4 rounded-2xl border border-slate-200/80 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Billed Fees</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">₹{totalBilled.toLocaleString('en-IN')}</div>
                <div className="text-[10px] text-slate-400 font-medium">{documents.length} Total Documents</div>
              </div>
              <div className="p-3 bg-slate-100 text-slate-700 rounded-2xl">
                <CreditCard size={20} />
              </div>
            </div>

            <div className="liquid-glass p-4 rounded-2xl border border-emerald-200/80 bg-emerald-50/40 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Collected / Paid</div>
                <div className="text-xl font-black text-emerald-700 mt-0.5">₹{totalPaid.toLocaleString('en-IN')}</div>
                <div className="text-[10px] text-emerald-700 font-bold">{paidDocsCount} Watermark-Free Docs</div>
              </div>
              <div className="p-3 bg-emerald-100 text-emerald-800 rounded-2xl">
                <CheckCircle size={20} />
              </div>
            </div>

            <div className="liquid-glass p-4 rounded-2xl border border-amber-200/80 bg-amber-50/40 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Pending Client Dues</div>
                <div className="text-xl font-black text-amber-700 mt-0.5">₹{totalPending.toLocaleString('en-IN')}</div>
                <div className="text-[10px] text-amber-700 font-bold">{pendingDocsCount} Watermarked / Locked</div>
              </div>
              <div className="p-3 bg-amber-100 text-amber-800 rounded-2xl">
                <Clock size={20} />
              </div>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="liquid-glass p-4 rounded-3xl space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
              {/* Search */}
              <div className="lg:col-span-3 relative flex items-center">
                <Search size={16} className="absolute left-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search documents by name..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white/80 border border-slate-300/80 rounded-2xl text-xs font-medium text-slate-900 outline-none focus:border-emerald-600 shadow-xs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Category Filter */}
              <div className="lg:col-span-2">
                <select
                  className="w-full px-3 py-2.5 bg-white/80 border border-slate-300/80 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:border-emerald-600 shadow-xs"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="ALL">All Categories</option>
                  <option value="ITR">ITR (Income Tax)</option>
                  <option value="GST">GST Returns</option>
                  <option value="GSTR1">GSTR-1</option>
                  <option value="GSTR3B">GSTR-3B</option>
                  <option value="BALANCE_SHEET">Balance Sheet & PnL</option>
                  <option value="TAX_AUDIT">Tax Audit</option>
                  <option value="KYC">KYC Documents</option>
                  <option value="LEGAL">Legal & Agreements</option>
                  <option value="COMPUTATION">Tax Computation</option>
                  <option value="GENERAL">General</option>
                </select>
              </div>

              {/* File Type Filter */}
              <div className="lg:col-span-2">
                <select
                  className="w-full px-3 py-2.5 bg-white/80 border border-slate-300/80 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:border-emerald-600 shadow-xs"
                  value={fileTypeFilter}
                  onChange={(e) => setFileTypeFilter(e.target.value)}
                >
                  <option value="ALL">All File Types</option>
                  <option value="PDF">PDF</option>
                  <option value="SPREADSHEET">Excel / Spreadsheet</option>
                  <option value="WORD">Word Document</option>
                  <option value="IMAGE">Image (JPG/PNG)</option>
                </select>
              </div>

              {/* Payment Filter */}
              <div className="lg:col-span-2">
                <select
                  className="w-full px-3 py-2.5 bg-white/80 border border-slate-300/80 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:border-emerald-600 shadow-xs"
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                >
                  <option value="ALL">All Payments</option>
                  <option value="COMPLETED">✅ Paid (Clean)</option>
                  <option value="PENDING">🔒 Pending (Watermarked)</option>
                  <option value="IN_PROCESS">⏳ In Process</option>
                  <option value="FREE">🆓 Free / No Fee</option>
                </select>
              </div>

              {/* FY Filter & Upload Button */}
              <div className="lg:col-span-3 flex gap-2">
                <select
                  className="flex-1 px-3 py-2.5 bg-white/80 border border-slate-300/80 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:border-emerald-600 shadow-xs"
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                >
                  <option value="ALL">All FY</option>
                  <option value="2025-26">2025-26</option>
                  <option value="2024-25">2024-25</option>
                  <option value="2023-24">2023-24</option>
                  <option value="2022-23">2022-23</option>
                </select>

                <button
                  onClick={() => setShowUploadModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3.5 py-2.5 rounded-2xl text-xs transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20 shrink-0"
                >
                  <Plus size={15} />
                  <span>Upload</span>
                </button>
              </div>
            </div>
          </div>

          {/* Document Table */}
          {filteredDocuments.length === 0 ? (
            <div className="liquid-glass p-12 rounded-3xl text-center flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-3xl flex items-center justify-center text-3xl font-bold">
                📁
              </div>
              <h3 className="text-base font-bold text-slate-900">No documents match the selected filters.</h3>
              <p className="text-xs text-slate-500 font-medium max-w-sm">
                Click below to upload PDFs, Excel files, Word documents, or images to S3 bucket caapp123.
              </p>
              <button
                onClick={() => setShowUploadModal(true)}
                className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-5 py-2.5 rounded-2xl text-xs transition flex items-center gap-2 shadow-md shadow-emerald-600/20"
              >
                <Plus size={16} />
                <span>Upload Document</span>
              </button>
            </div>
          ) : (
            <div className="liquid-glass rounded-3xl overflow-hidden shadow-xs border border-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/70 border-b border-slate-200/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                      <th className="py-3.5 px-4">Document Name</th>
                      <th className="py-3.5 px-3">Type</th>
                      <th className="py-3.5 px-3">Category</th>
                      <th className="py-3.5 px-3">FY</th>
                      <th className="py-3.5 px-3">Payment & Watermark</th>
                      <th className="py-3.5 px-3">Size</th>
                      <th className="py-3.5 px-3">Upload Date</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60 text-xs">
                    {filteredDocuments.map((doc) => {
                      const pStatus = doc.paymentStatus || 'PENDING';
                      const pAmount = doc.paymentAmount !== undefined ? doc.paymentAmount : 500;

                      return (
                        <tr key={doc._id} className="hover:bg-white/80 transition group">
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            <div className="flex items-center gap-2.5">
                              <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-2xs">
                                {getFileIcon(doc.mimeType, doc.originalFilename || doc.fileName)}
                              </div>
                              <div>
                                <div className="font-extrabold text-slate-900">{doc.documentName || doc.fileName}</div>
                                {doc.description && (
                                  <div className="text-[10px] text-slate-400 font-medium line-clamp-1">{doc.description}</div>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-3 font-semibold text-slate-700">
                            <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-lg border border-slate-300/80 font-mono text-[10px]">
                              {doc.documentType || 'ITR'}
                            </span>
                          </td>

                          <td className="py-3.5 px-3 font-semibold text-emerald-800">
                            <span className="bg-emerald-100/80 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-lg font-bold text-[10px]">
                              {doc.category || doc.documentType || 'General'}
                            </span>
                          </td>

                          <td className="py-3.5 px-3 font-bold text-slate-800 font-mono">
                            {doc.financialYear || doc.year || '2024-25'}
                          </td>

                          {/* Payment & Watermark Status with 1-Click Toggle */}
                          <td className="py-3.5 px-3">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-slate-900 text-xs">
                                  ₹{pAmount}
                                </span>
                                <select
                                  value={pStatus}
                                  onChange={(e) => handleQuickStatusChange(doc._id, e.target.value)}
                                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg border outline-none cursor-pointer shadow-2xs transition ${
                                    pStatus === 'COMPLETED'
                                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                                      : pStatus === 'IN_PROCESS'
                                      ? 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200'
                                      : pStatus === 'FREE'
                                      ? 'bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200'
                                      : 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                                  }`}
                                  title="Change client payment & watermark status"
                                >
                                  <option value="PENDING">🔒 Pending (Watermark)</option>
                                  <option value="IN_PROCESS">⏳ In Process</option>
                                  <option value="COMPLETED">✅ Paid (Clean)</option>
                                  <option value="FREE">🆓 Free (Clean)</option>
                                </select>
                              </div>
                              <span className="text-[9px] text-slate-400 font-medium">
                                {pStatus === 'COMPLETED' ? 'Client unlocked' : 'Watermark on client preview'}
                              </span>
                            </div>
                          </td>

                          <td className="py-3.5 px-3 text-slate-500 font-mono">
                            {formatFileSize(doc.fileSize)}
                          </td>

                          <td className="py-3.5 px-3 text-slate-500 font-medium">
                            {new Date(doc.uploadDate || doc.createdAt).toLocaleDateString()}
                          </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View Button -> Opens Pre-Signed URL download route */}
                            <a
                              href={`/api/documents/download?id=${doc._id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-300 p-2 rounded-xl transition flex items-center gap-1 font-bold text-[11px]"
                              title="View / Download File"
                            >
                              <Eye size={14} />
                              <span>View</span>
                            </a>

                            {/* Download Button */}
                            <a
                              href={`/api/documents/download?id=${doc._id}`}
                              download
                              className="bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-300 p-2 rounded-xl transition font-bold text-[11px]"
                              title="Download File"
                            >
                              <Download size={14} />
                            </a>

                            {/* Edit Button */}
                            <button
                              onClick={() => handleOpenEdit(doc)}
                              className="bg-slate-100 hover:bg-slate-800 text-slate-700 hover:text-white border border-slate-300 p-2 rounded-xl transition font-bold text-[11px]"
                              title="Edit Metadata / Replace File"
                            >
                              <Edit size={14} />
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => handleOpenDelete(doc)}
                              className="bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 p-2 rounded-xl transition font-bold text-[11px]"
                              title="Delete Document"
                            >
                              <Trash2 size={14} />
                            </button>

                            {/* WhatsApp Button */}
                            <button
                              onClick={() => handleOpenWhatsAppDocModal(doc)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 p-2 rounded-xl transition flex items-center gap-1 font-bold text-[11px] shadow-2xs"
                              title="Send Document on WhatsApp"
                            >
                              <MessageSquare size={14} />
                              <span>WhatsApp</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: WHATSAPP MESSAGES */}
      {activeTab === 'whatsapp' && (
        <div className="bg-slate-950 p-3 rounded-3xl shadow-2xl max-w-4xl mx-auto">
          <div className="bg-[#efeae2] rounded-2xl h-[580px] flex flex-col overflow-hidden">
            {/* WhatsApp Header */}
            <div className="bg-[#075E54] text-white px-4 py-3 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-800 rounded-full flex items-center justify-center font-bold text-base">
                  {client?.name?.charAt(0) || 'C'}
                </div>
                <div>
                  <div className="font-bold text-sm flex items-center gap-2">
                    <span>{client?.name}</span>
                    <span className="text-[10px] bg-emerald-700 text-emerald-100 px-2 py-0.5 rounded-md font-mono">
                      {client?.whatsappNumber}
                    </span>
                  </div>
                  <div className="text-[10px] text-emerald-200 flex items-center gap-1">
                    <Sparkles size={11} />
                    <span>Twilio WhatsApp Sandbox Connected (+14155238886)</span>
                  </div>
                </div>
              </div>
              <button
                onClick={fetchMessageHistory}
                className="p-2 hover:bg-white/10 rounded-full transition"
                title="Refresh Message History"
              >
                <RefreshCw size={15} />
              </button>
            </div>

            {/* Message History Chat */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {messages.length === 0 ? (
                <div className="text-center py-16 text-slate-500 text-xs font-medium">
                  No WhatsApp messages exchanged with {client?.name} yet.<br />
                  Send a text message below or send documents directly from the <strong>Uploaded Documents</strong> tab!
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg._id || msg.id}
                    className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                        msg.direction === 'outbound'
                          ? 'bg-[#dcf8c6] text-slate-900 rounded-tr-none'
                          : 'bg-white text-slate-900 rounded-tl-none border border-slate-200'
                      }`}
                    >
                      <div className="font-medium">{msg.body}</div>

                      {/* Render Media Link if document/image message */}
                      {msg.mediaUrl && (
                        <div className="mt-2 pt-2 border-t border-black/10 flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold text-emerald-900 flex items-center gap-1">
                            📁 Attached Media Document
                          </span>
                          <a
                            href={msg.mediaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-extrabold px-3 py-1 rounded-lg flex items-center gap-1 shadow-2xs"
                          >
                            <Download size={12} />
                            <span>Download Media</span>
                          </a>
                        </div>
                      )}

                      <div className="text-[9px] text-slate-400 text-right mt-1.5 flex items-center justify-end gap-1 font-mono">
                        <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {msg.direction === 'outbound' && (
                          <span className="text-emerald-700 font-bold uppercase">{msg.status || 'sent'}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendChatMessage} className="bg-slate-100 p-3 flex items-center gap-2">
              <input
                type="text"
                placeholder={`Type WhatsApp message to ${client?.name} (${client?.whatsappNumber})...`}
                className="flex-1 bg-white px-4 py-2.5 rounded-full text-xs outline-none shadow-xs text-slate-900 font-medium border border-slate-300/80 focus:border-emerald-600"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                disabled={sendingChat}
              />
              <button
                type="submit"
                disabled={sendingChat || !chatMessage.trim()}
                className="bg-[#075E54] hover:bg-[#128C7E] text-white p-2.5 rounded-full transition disabled:opacity-50 flex items-center justify-center shadow-sm"
              >
                {sendingChat ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* MODAL 1: UPLOAD DOCUMENT */}
      {/* ============================================================================== */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white p-6 lg:p-8 rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Upload size={18} className="text-emerald-600" />
                <span>Upload Document for {client?.name}</span>
              </h3>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-slate-700 p-1">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Choose File from System *
                </label>
                <input
                  ref={uploadInputRef}
                  type="file"
                  required
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.zip"
                  className="w-full p-2.5 border border-slate-300 rounded-2xl text-xs font-medium text-slate-800 bg-slate-50 focus:border-emerald-600 outline-none"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const f = e.target.files[0];
                      setUploadFile(f);
                      if (!uploadFormData.documentName || uploadFormData.documentName.includes('Static')) {
                        setUploadFormData((prev) => ({
                          ...prev,
                          documentName: `${prev.category || 'ITR'} Return - FY ${prev.financialYear || '2025-26'}`
                        }));
                      }
                    }
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Document Display Title (Shown to Client) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Income Tax Return Acknowledgement FY 2025-26"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-2xl text-xs font-bold text-slate-900 outline-none focus:border-emerald-600"
                  value={uploadFormData.documentName}
                  onChange={(e) => setUploadFormData({ ...uploadFormData, documentName: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Category *</label>
                  <select
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-2xl text-xs font-bold text-slate-900 outline-none focus:border-emerald-600"
                    value={uploadFormData.category}
                    onChange={(e) => setUploadFormData({ ...uploadFormData, category: e.target.value })}
                  >
                    <option value="ITR">ITR (Income Tax)</option>
                    <option value="GST">GST Returns</option>
                    <option value="GSTR1">GSTR-1</option>
                    <option value="GSTR3B">GSTR-3B</option>
                    <option value="BALANCE_SHEET">Balance Sheet & PnL</option>
                    <option value="TAX_AUDIT">Tax Audit Report</option>
                    <option value="KYC">KYC Documents</option>
                    <option value="LEGAL">Legal & Agreements</option>
                    <option value="COMPUTATION">Tax Computation</option>
                    <option value="GENERAL">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Financial Year *</label>
                  <select
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-2xl text-xs font-bold text-slate-900 outline-none focus:border-emerald-600"
                    value={uploadFormData.financialYear}
                    onChange={(e) => setUploadFormData({ ...uploadFormData, financialYear: e.target.value })}
                  >
                    <option value="2025-26">2025-26</option>
                    <option value="2024-25">2024-25</option>
                    <option value="2023-24">2023-24</option>
                    <option value="2022-23">2022-23</option>
                  </select>
                </div>
              </div>

              {/* Payment & Watermark Configuration */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>💳 Payment & Watermark Lock</span>
                  <span className="text-[10px] text-slate-500 font-normal">Unpaid documents show CA watermark</span>
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
                        placeholder="0"
                        className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-emerald-600"
                        value={uploadFormData.paymentAmount}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '');
                          const cleanVal = digits === '' ? '' : String(parseInt(digits, 10));
                          setUploadFormData({ ...uploadFormData, paymentAmount: cleanVal });
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Initial Status</label>
                    <select
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-emerald-600"
                      value={uploadFormData.paymentStatus}
                      onChange={(e) => setUploadFormData({ ...uploadFormData, paymentStatus: e.target.value })}
                    >
                      <option value="PENDING">🔒 Pending (Watermarked)</option>
                      <option value="COMPLETED">✅ Paid (Clean)</option>
                      <option value="IN_PROCESS">⏳ In Process</option>
                      <option value="FREE">🆓 Free / No Charge</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Additional document notes..."
                  className="w-full p-3 border border-slate-300 rounded-2xl text-xs font-medium text-slate-900 outline-none focus:border-emerald-600"
                  value={uploadFormData.description}
                  onChange={(e) => setUploadFormData({ ...uploadFormData, description: e.target.value })}
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !uploadFile}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl transition shadow-md disabled:opacity-50 flex items-center gap-2"
                >
                  {uploading && <RefreshCw size={14} className="animate-spin" />}
                  <span>{uploading ? 'Uploading to S3...' : 'Upload File'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* MODAL 2: EDIT DOCUMENT & REPLACE FILE */}
      {/* ============================================================================== */}
      {showEditModal && selectedDoc && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white p-6 lg:p-8 rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Edit size={18} className="text-emerald-600" />
                <span>Edit Document</span>
              </h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-700 p-1">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Document Name *</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-2xl text-xs font-medium text-slate-900 outline-none focus:border-emerald-600"
                  value={editFormData.documentName}
                  onChange={(e) => setEditFormData({ ...editFormData, documentName: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Category *</label>
                  <select
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-2xl text-xs font-bold text-slate-900 outline-none focus:border-emerald-600"
                    value={editFormData.category}
                    onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                  >
                    <option value="ITR">ITR (Income Tax)</option>
                    <option value="GST">GST Returns</option>
                    <option value="GSTR1">GSTR-1</option>
                    <option value="GSTR3B">GSTR-3B</option>
                    <option value="BALANCE_SHEET">Balance Sheet & PnL</option>
                    <option value="TAX_AUDIT">Tax Audit Report</option>
                    <option value="KYC">KYC Documents</option>
                    <option value="LEGAL">Legal & Agreements</option>
                    <option value="COMPUTATION">Tax Computation</option>
                    <option value="GENERAL">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Financial Year *</label>
                  <select
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-2xl text-xs font-bold text-slate-900 outline-none focus:border-emerald-600"
                    value={editFormData.financialYear}
                    onChange={(e) => setEditFormData({ ...editFormData, financialYear: e.target.value })}
                  >
                    <option value="2025-26">2025-26</option>
                    <option value="2024-25">2024-25</option>
                    <option value="2023-24">2023-24</option>
                    <option value="2022-23">2022-23</option>
                  </select>
                </div>
              </div>

              {/* Edit Payment Fee & Status */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>💳 Payment & Watermark Status</span>
                  <span className="text-[10px] text-slate-500 font-normal">Paid status automatically removes client watermark</span>
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
                        placeholder="0"
                        className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-emerald-600"
                        value={editFormData.paymentAmount}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '');
                          const cleanVal = digits === '' ? '' : String(parseInt(digits, 10));
                          setEditFormData({ ...editFormData, paymentAmount: cleanVal });
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Payment Status</label>
                    <select
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-emerald-600"
                      value={editFormData.paymentStatus}
                      onChange={(e) => setEditFormData({ ...editFormData, paymentStatus: e.target.value })}
                    >
                      <option value="PENDING">🔒 Pending (Watermarked)</option>
                      <option value="COMPLETED">✅ Paid (Clean)</option>
                      <option value="IN_PROCESS">⏳ In Process</option>
                      <option value="FREE">🆓 Free / No Charge</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Description</label>
                <textarea
                  rows={2}
                  className="w-full p-3 border border-slate-300 rounded-2xl text-xs font-medium text-slate-900 outline-none focus:border-emerald-600"
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                  <span>Replace Existing File (Optional)</span>
                  <span className="text-[10px] text-slate-400 font-normal">S3 file is safe until new upload succeeds</span>
                </label>
                <input
                  ref={replaceInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.zip"
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs text-slate-800 bg-white"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setReplaceFile(e.target.files[0]);
                    }
                  }}
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl transition shadow-md disabled:opacity-50 flex items-center gap-2"
                >
                  {updating && <RefreshCw size={14} className="animate-spin" />}
                  <span>{updating ? 'Saving Changes...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* MODAL 3: DELETE CONFIRMATION */}
      {/* ============================================================================== */}
      {showDeleteModal && selectedDoc && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white p-6 lg:p-8 rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 space-y-4 text-center">
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-3xl mx-auto flex items-center justify-center">
              <AlertTriangle size={28} />
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900 mb-1">Delete Document?</h3>
              <p className="text-xs text-slate-500 font-medium">
                Are you sure you want to permanently delete this document from S3 bucket <strong className="text-slate-800">caapp123</strong>?
              </p>
              <div className="mt-3 p-3 bg-slate-100 rounded-2xl text-xs font-bold text-slate-900 border border-slate-200">
                📄 {selectedDoc.documentName || selectedDoc.fileName}
              </div>
            </div>

            <div className="pt-2 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteConfirm}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl transition shadow-md disabled:opacity-50 flex items-center gap-2"
              >
                {deleting && <RefreshCw size={14} className="animate-spin" />}
                <span>{deleting ? 'Deleting from S3...' : 'Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* MODAL 4: SEND DOCUMENT ON WHATSAPP */}
      {/* ============================================================================== */}
      {showWhatsAppDocModal && selectedDoc && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white p-6 lg:p-8 rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <MessageSquare size={18} className="text-emerald-600" />
                <span>Send Document on WhatsApp</span>
              </h3>
              <button onClick={() => setShowWhatsAppDocModal(false)} className="text-slate-400 hover:text-slate-700 p-1">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-emerald-50/80 rounded-2xl border border-emerald-200 text-emerald-900 space-y-1 font-medium">
                <div>Client: <strong className="text-slate-900">{client?.name}</strong></div>
                <div>WhatsApp: <strong className="text-slate-900">{client?.whatsappNumber}</strong></div>
                <div>Document: <strong className="text-slate-900">{selectedDoc.documentName || selectedDoc.fileName}</strong></div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Custom WhatsApp Message (Optional)
                </label>
                <textarea
                  rows={3}
                  className="w-full p-3 border border-slate-300 rounded-2xl text-xs font-medium text-slate-900 outline-none focus:border-emerald-600"
                  value={docMessageCustomText}
                  onChange={(e) => setDocMessageCustomText(e.target.value)}
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowWhatsAppDocModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={sendingWhatsAppDoc}
                onClick={handleSendWhatsAppDocConfirm}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl transition shadow-md disabled:opacity-50 flex items-center gap-2"
              >
                {sendingWhatsAppDoc && <RefreshCw size={14} className="animate-spin" />}
                <span>{sendingWhatsAppDoc ? 'Sending via Twilio...' : 'Send'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* MODAL 5: CLIENT PORTAL ACCESS & PASSWORD MANAGEMENT */}
      {/* ============================================================================== */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white p-6 lg:p-8 rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Key size={18} className="text-emerald-600" />
                <span>Client Portal Access & Password</span>
              </h3>
              <button onClick={() => setShowPasswordModal(false)} className="text-slate-400 hover:text-slate-700 p-1">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePortalCredentials} className="space-y-4 text-xs">
              <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-200/80 space-y-1.5 font-medium text-emerald-950">
                <div className="flex items-center justify-between">
                  <span>Client: <strong>{client?.name}</strong></span>
                  <span className="bg-emerald-200 text-emerald-900 text-[10px] font-bold px-2 py-0.5 rounded-full">Portal User</span>
                </div>
                <div>WhatsApp / Phone: <strong>{client?.whatsappNumber}</strong></div>
                <div className="text-[11px] text-slate-600">
                  Client can log in at <span className="font-bold text-slate-900 font-mono">/login</span> using their Mobile Number or Email + this Password.
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Client Email (For Portal Login & Notices)
                </label>
                <input
                  type="email"
                  placeholder="e.g. client@example.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-slate-900 focus:bg-white transition"
                  value={portalEmailInput}
                  onChange={(e) => setPortalEmailInput(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    New Portal Login Password *
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateRandomPassword}
                    className="text-[11px] text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-md font-bold transition flex items-center gap-1"
                  >
                    <Sparkles size={11} className="text-emerald-600" />
                    <span>Auto-Generate</span>
                  </button>
                </div>
                <div className="relative flex items-center">
                  <input
                    type={showPortalPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter or generate a password"
                    className="w-full pl-3.5 pr-20 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-slate-900 focus:bg-white transition"
                    value={portalPasswordInput}
                    onChange={(e) => setPortalPasswordInput(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPortalPassword(!showPortalPassword)}
                    className="absolute right-2 text-[10px] font-bold text-slate-500 hover:text-slate-900 px-2 py-1 bg-white border border-slate-200 rounded-md"
                  >
                    {showPortalPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {/* Copy Credentials Quick Action */}
              <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                <div className="text-[11px] text-slate-600 font-medium truncate">
                  Pass: <strong className="text-slate-900 font-mono">{portalPasswordInput || '---'}</strong>
                </div>
                <button
                  type="button"
                  onClick={handleCopyCredentials}
                  className="px-3 py-1.5 bg-white hover:bg-slate-900 hover:text-white border border-slate-300 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0"
                >
                  {copiedCredentials ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  <span>{copiedCredentials ? 'Copied!' : 'Copy Login Details'}</span>
                </button>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl transition shadow-md disabled:opacity-50 flex items-center gap-2"
                >
                  {savingPassword && <RefreshCw size={14} className="animate-spin" />}
                  <span>{savingPassword ? 'Saving Password...' : 'Save & Update Password'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
