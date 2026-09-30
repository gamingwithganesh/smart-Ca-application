'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FileText,
  Download,
  Eye,
  Search,
  MessageSquare,
  Send,
  User,
  Phone,
  Building,
  Calendar,
  Sparkles,
  CheckCircle2,
  CheckCheck,
  RefreshCw,
  LogOut,
  FileSpreadsheet,
  FileCode,
  Image as ImageIcon,
  File as FileIcon,
  ShieldCheck,
  ArrowRight,
  X,
  Bot,
  Lock,
  Unlock,
  CreditCard,
  QrCode,
  Wallet,
  AlertTriangle,
  Check
} from 'lucide-react';

import { loadRazorpayScript } from '@/lib/loadRazorpay';
import PaymentHistoryTable from '@/components/PaymentHistoryTable';

export default function ClientPortal() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [clientData, setClientData] = useState(null);
  const [caFirm, setCaFirm] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active view tab
  const [activeTab, setActiveTab] = useState('documents'); // 'documents' | 'payments'

  // Floating Chatbot State
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedYear, setSelectedYear] = useState('ALL');

  // Document Watermark Preview Modal State
  const [previewDoc, setPreviewDoc] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Payment Checkout Modal State
  const [paymentDoc, setPaymentDoc] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('UPI'); // 'UPI', 'CARD', 'NETBANKING'
  const [upiIdInput, setUpiIdInput] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [selectedBank, setSelectedBank] = useState('HDFC');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentCheckoutState, setPaymentCheckoutState] = useState('idle'); // 'idle' | 'creating' | 'processing' | 'success' | 'failed'
  const [paymentErrorMessage, setPaymentErrorMessage] = useState('');
  const [paymentSuccessData, setPaymentSuccessData] = useState(null);

  // Chatbot State
  const [chatLog, setChatLog] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    fetchPortalData();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog, sendingMessage]);

  const fetchPortalData = async () => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token) {
      router.push('/login');
      return;
    }

    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        setCurrentUser(u);
        if (u.role === 'admin' || u.role === 'sub_ca') {
          router.push('/dashboard');
          return;
        }
        if (u.role === 'superadmin') {
          router.push('/superadmin');
          return;
        }
      } catch (e) {}
    }

    try {
      const res = await fetch('/api/portal/documents', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setClientData(data.client);
        setCaFirm(data.caFirm);
        setDocuments(data.documents || []);

        // Initialize Chat Welcome
        const rawName = data.client?.name || currentUser?.name || 'Taxpayer';
        const clientName = rawName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        const caName = data.caFirm?.name || 'Your CA';
        setChatLog([
          {
            id: 1,
            sender: 'bot',
            text: `👋 Hello *${clientName}*! Welcome to your official CA Client Document Portal.\n\nI am your 24/7 Tax Document Assistant powered by *${caName}*.\n\nAsk for any returns, e.g., *"ITR 2024-25"*, *"GST Return"*, or click quick chips below!`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    } catch (err) {
      console.error('Portal load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const handleOpenPreviewModal = (doc) => {
    setPreviewDoc(doc);
    setShowPreviewModal(true);
  };

  const handleOpenPaymentModal = (doc) => {
    setPaymentDoc(doc);
    setPaymentSuccessData(null);
    setPaymentCheckoutState('idle');
    setPaymentErrorMessage('');
    setShowPaymentModal(true);
  };

  const handleProcessPayment = async (e) => {
    if (e) e.preventDefault();
    if (!paymentDoc) return;
    if (paymentCheckoutState === 'creating' || paymentCheckoutState === 'processing') return;

    setProcessingPayment(true);
    setPaymentCheckoutState('creating');
    setPaymentErrorMessage('');
    const token = localStorage.getItem('token');

    try {
      // 1. Create order on backend (server calculates exact price from DB)
      const orderRes = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          purpose: 'document_fee',
          documentId: paymentDoc._id || paymentDoc.id
        })
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.success) {
        throw new Error(orderData.message || 'Failed to initialize payment order');
      }

      // 2. Load Razorpay Checkout SDK dynamically on demand
      setPaymentCheckoutState('processing');
      const Razorpay = await loadRazorpayScript();

      // 3. Configure Checkout Options
      const options = {
        key: orderData.keyId,
        amount: orderData.amountInPaise,
        currency: orderData.currency || 'INR',
        name: caFirm?.firmName || 'Smart CA Vault',
        description: orderData.description || `Document Unlock: ${paymentDoc.documentName || paymentDoc.fileName}`,
        order_id: orderData.orderId,
        prefill: {
          name: clientData?.name || currentUser?.name || orderData.customer?.name || '',
          email: clientData?.email || currentUser?.email || orderData.customer?.email || '',
          contact: clientData?.whatsappNumber || currentUser?.phone || orderData.customer?.phone || ''
        },
        notes: {
          documentId: paymentDoc._id || paymentDoc.id,
          orderRef: orderData.orderRef
        },
        theme: {
          color: '#059669' // Emerald theme
        },
        modal: {
          ondismiss: () => {
            if (paymentCheckoutState !== 'success') {
              setPaymentCheckoutState('idle');
              setProcessingPayment(false);
            }
          }
        },
        handler: async function (response) {
          try {
            setPaymentCheckoutState('processing');

            // 4. Cryptographic Server-Side Signature Verification
            const verifyRes = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                orderRef: orderData.orderRef,
                paymentMethod: 'Razorpay Checkout'
              })
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok || !verifyData.success) {
              throw new Error(verifyData.message || 'Payment verification failed');
            }

            // 5. Update local state: document is unlocked and watermarks removed
            setPaymentSuccessData({
              paymentAmount: orderData.amount,
              paymentId: response.razorpay_payment_id,
              orderRef: orderData.orderRef,
              fileUrl: `/api/documents/download?id=${paymentDoc._id || paymentDoc.id}`
            });
            setPaymentCheckoutState('success');

            setDocuments((prevDocs) =>
              prevDocs.map((d) =>
                (d._id === paymentDoc._id || d.id === paymentDoc.id)
                  ? { ...d, paymentStatus: 'COMPLETED', paidAt: new Date(), paymentId: response.razorpay_payment_id }
                  : d
              )
            );

            if (previewDoc && (previewDoc._id === paymentDoc._id || previewDoc.id === paymentDoc.id)) {
              setPreviewDoc((prev) => ({ ...prev, paymentStatus: 'COMPLETED' }));
            }
          } catch (verifyErr) {
            console.error('Verification error:', verifyErr);
            setPaymentErrorMessage(verifyErr.message || 'Payment verification failed');
            setPaymentCheckoutState('failed');
          } finally {
            setProcessingPayment(false);
          }
        }
      };

      const rzp = new Razorpay(options);

      rzp.on('payment.failed', function (resp) {
        console.error('Payment failed:', resp.error);
        setPaymentErrorMessage(resp.error?.description || 'Payment was declined.');
        setPaymentCheckoutState('failed');
        setProcessingPayment(false);
      });

      rzp.open();
    } catch (err) {
      console.error('Payment checkout error:', err);
      setPaymentErrorMessage(err.message || 'Unable to open checkout. Please check connection.');
      setPaymentCheckoutState('failed');
      setProcessingPayment(false);
    }
  };

  const handleSendChatMessage = async (textToSend) => {
    const text = textToSend || chatInput;
    if (!text.trim()) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: text.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatLog((prev) => [...prev, userMsg]);
    if (!textToSend) setChatInput('');
    setSendingMessage(true);

    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/portal/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ message: text.trim() })
      });

      const data = await res.json();
      const botMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: data.reply || data.responseText || 'Your query has been processed.',
        documents: data.documents || [],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setChatLog((prev) => [...prev, botMsg]);
    } catch (err) {
      setChatLog((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'bot',
          text: '❌ Could not connect to AI Assistant. Please check your network.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleDownloadDocument = async (url, fileName = 'document.pdf') => {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        let msg = 'Document file is currently not available on server storage';
        try {
          const errData = await res.json();
          msg = errData.message || msg;
        } catch (_) {}
        alert(`⚠️ ${msg}`);
        return;
      }
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      alert(`⚠️ Download error: ${err.message}`);
    }
  };

  const formatText = (content) => {
    if (!content) return '';
    const lines = content.split('\n');
    return lines.map((line, lIdx) => {
      const parts = line.split(/(https?:\/\/[^\s]+)/g);
      return (
        <div key={lIdx} className="min-h-[1.2em]">
          {parts.map((part, pIdx) => {
            if (part.match(/^https?:\/\//)) {
              return (
                <a
                  key={pIdx}
                  href={part}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-700 underline font-bold break-all hover:text-emerald-900"
                >
                  {part}
                </a>
              );
            }
            const boldParts = part.split(/(\*[^*]+\*)/g);
            return (
              <span key={pIdx}>
                {boldParts.map((bp, bpIdx) => {
                  if (bp.startsWith('*') && bp.endsWith('*')) {
                    return <strong key={bpIdx}>{bp.slice(1, -1)}</strong>;
                  }
                  return bp;
                })}
              </span>
            );
          })}
        </div>
      );
    });
  };

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

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Filter documents
  const filteredDocs = documents.filter((doc) => {
    const nameMatch =
      (doc.documentName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.fileName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.description || '').toLowerCase().includes(searchTerm.toLowerCase());

    const catMatch =
      selectedCategory === 'ALL' ||
      (doc.category || '').toUpperCase() === selectedCategory.toUpperCase() ||
      (doc.documentType || '').toUpperCase() === selectedCategory.toUpperCase();

    const yearMatch =
      selectedYear === 'ALL' ||
      doc.financialYear === selectedYear ||
      doc.year === selectedYear;

    return nameMatch && catMatch && yearMatch;
  });

  const uniqueYears = ['ALL', ...new Set(documents.map((d) => d.financialYear || d.year).filter(Boolean))];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-500 font-medium animate-pulse">
        <RefreshCw size={28} className="animate-spin text-emerald-600 mb-3" />
        <span className="text-xs">Loading your verified CA Document Vault...</span>
      </div>
    );
  }

  const caFirmDisplayName = caFirm?.firmName || caFirm?.name || 'SMART CA PRACTICE';

  return (
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-300 pb-12">
      {/* Top Profile Header */}
      <div className="liquid-glass-accent p-6 sm:p-8 rounded-3xl border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold">
            <span>🛡️ Official Taxpayer Portal</span>
            <span className="text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded-full font-bold">
              VERIFIED
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Welcome, {(clientData?.name || currentUser?.name || 'Taxpayer').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 font-medium">
            <div className="flex items-center gap-1">
              <Phone size={14} className="text-emerald-700" />
              <span>Registered Mobile: <strong className="text-slate-900">{clientData?.whatsappNumber || currentUser?.phone || 'N/A'}</strong></span>
            </div>
            {caFirm && (
              <>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Building size={14} className="text-slate-700" />
                  <span>CA Firm: <strong className="text-slate-900">{caFirm.firmName || caFirm.name}</strong></span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={() => setIsChatOpen(true)}
            className="btn-primary flex-1 md:flex-none px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <MessageSquare size={16} />
            <span>Ask AI Assistant</span>
          </button>
          <button
            onClick={handleLogout}
            className="btn-outline px-3.5 py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 font-bold hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition"
            title="Sign Out"
          >
            <LogOut size={15} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-6">
        <div className="liquid-glass p-5 rounded-2xl sm:rounded-3xl flex items-center gap-3.5 border border-slate-200">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-200 shrink-0">
            <FileText size={22} />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900">{documents.length}</div>
            <div className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider">Issued Documents</div>
          </div>
        </div>

        <div className="liquid-glass p-5 rounded-2xl sm:rounded-3xl flex items-center gap-3.5 border border-slate-200">
          <div className="p-3 bg-slate-100 text-slate-700 rounded-2xl border border-slate-200 shrink-0">
            <Calendar size={22} />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900">{uniqueYears.length > 1 ? uniqueYears.length - 1 : 1}</div>
            <div className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider">Financial Years</div>
          </div>
        </div>

        <div className="liquid-glass p-5 rounded-2xl sm:rounded-3xl flex items-center gap-3.5 border border-slate-200">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-200 shrink-0">
            <ShieldCheck size={22} />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900">Encrypted</div>
            <div className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider">Storage Vault</div>
          </div>
        </div>

        <div className="liquid-glass p-5 rounded-2xl sm:rounded-3xl flex items-center gap-3.5 border border-slate-200">
          <div className="p-3 bg-slate-900 text-emerald-400 rounded-2xl shrink-0">
            <Sparkles size={22} />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-emerald-700">24/7 Active</div>
            <div className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider">AI Tax Assistant</div>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('documents')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'documents'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <FileText size={14} />
          <span>My Verified Documents ({documents.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'payments'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <CreditCard size={14} />
          <span>Payment History & Receipts</span>
        </button>
      </div>

      {activeTab === 'payments' ? (
        <PaymentHistoryTable userRole="client" />
      ) : (
        /* Main Section: Document Vault & CA Details */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        
        {/* Main Document Vault Table */}
        <div className="lg:col-span-8 space-y-4">
          {/* Filter & Search Controls */}
          <div className="liquid-glass p-4 rounded-2xl sm:rounded-3xl border border-slate-200 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full flex items-center">
              <Search size={15} className="absolute left-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search documents (e.g. ITR, GST, FY 2024-25)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:border-slate-900"
              />
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none"
              >
                <option value="ALL">All Categories</option>
                <option value="ITR">ITR Returns</option>
                <option value="GST">GST Returns</option>
                <option value="TDS">TDS / Form 16</option>
                <option value="BALANCE_SHEET">Balance Sheet</option>
                <option value="TAX_AUDIT">Tax Audit</option>
                <option value="GENERAL">General</option>
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none"
              >
                {uniqueYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr === 'ALL' ? 'All Years' : yr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Document List */}
          {filteredDocs.length === 0 ? (
            <div className="liquid-glass p-12 rounded-3xl text-center border border-slate-200 space-y-3">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-3xl mx-auto">
                📂
              </div>
              <h3 className="font-bold text-slate-900 text-base">No documents found matching your filter</h3>
              <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">
                Your CA firm ({caFirm?.name || 'Your CA'}) will upload and issue your verified returns here.
              </p>
            </div>
          ) : (
            <div className="liquid-glass rounded-2xl sm:rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                      <th className="py-3 px-4">Document</th>
                      <th className="py-3 px-3">Type</th>
                      <th className="py-3 px-3">FY</th>
                      <th className="py-3 px-3">Payment</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/80 text-xs">
                    {filteredDocs.map((doc) => {
                      const isPaid = doc.paymentStatus === 'COMPLETED' || doc.paymentStatus === 'FREE';
                      return (
                        <tr key={doc.id || doc._id} className="hover:bg-white/80 transition">
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            <div className="flex items-center gap-2.5">
                              <div className="p-2 bg-white rounded-xl border border-slate-200 shrink-0">
                                {getFileIcon(doc.mimeType, doc.fileName || doc.documentName)}
                              </div>
                              <div>
                                <div className="font-extrabold text-slate-900 line-clamp-1">
                                  {doc.documentName || doc.fileName}
                                </div>
                                <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1.5">
                                  <span>Issued: {new Date(doc.uploadDate).toLocaleDateString()}</span>
                                  <span>•</span>
                                  <span>{formatFileSize(doc.fileSize)}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-3 font-semibold">
                            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-lg text-[10px] font-bold">
                              {doc.category || doc.documentType}
                            </span>
                          </td>

                          <td className="py-3.5 px-3 font-bold text-slate-800 font-mono">
                            {doc.financialYear || doc.year}
                          </td>

                          <td className="py-3.5 px-3 font-semibold">
                            {isPaid ? (
                              <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 w-fit shadow-2xs">
                                <CheckCircle2 size={12} className="text-emerald-600" />
                                <span>Paid (₹{doc.paymentAmount || 500})</span>
                              </span>
                            ) : (
                              <button
                                onClick={() => handleOpenPaymentModal(doc)}
                                className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 w-fit transition cursor-pointer shadow-2xs"
                                title="Click to Pay & Unlock Clean Copy"
                              >
                                <Lock size={12} className="text-amber-700" />
                                <span>Pay ₹{doc.paymentAmount || 500}</span>
                              </button>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenPreviewModal(doc)}
                                className="bg-emerald-50 hover:bg-emerald-700 text-emerald-700 hover:text-white border border-emerald-300 px-3 py-1.5 rounded-xl transition flex items-center gap-1 font-bold text-xs cursor-pointer"
                                title={isPaid ? "View Clean Document" : "View Document (Watermarked Preview)"}
                              >
                                <Eye size={13} />
                                <span>{isPaid ? "View" : "View (Preview)"}</span>
                              </button>

                              {isPaid ? (
                                <button
                                  onClick={() => handleDownloadDocument(doc.fileUrl, doc.originalFilename || doc.fileName || 'document.pdf')}
                                  className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-xl transition flex items-center gap-1 font-bold text-xs shadow-xs cursor-pointer"
                                  title="Download Clean Original"
                                >
                                  <Download size={13} />
                                  <span>Download</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleOpenPaymentModal(doc)}
                                  className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-xl transition flex items-center gap-1 font-bold text-xs cursor-pointer shadow-xs"
                                  title="Pay to Download"
                                >
                                  <Lock size={13} />
                                  <span>Unlock</span>
                                </button>
                              )}
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

        {/* Right Sidebar: CA Contact & Quick Assistant launcher */}
        <div className="lg:col-span-4 space-y-5">
          {/* Quick AI Assistant Card */}
          <div className="liquid-glass p-5 rounded-2xl sm:rounded-3xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                <Sparkles size={16} className="text-emerald-700" />
                <span>AI Tax Assistant</span>
              </h3>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Active
              </span>
            </div>

            <p className="text-xs text-slate-500 font-medium">
              Ask our AI assistant naturally for any return or tax computation and get instant download links anytime.
            </p>

            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Quick Prompts:</div>
              <div className="flex flex-wrap gap-1.5">
                {['ITR 2024-25', 'GST Return', 'All Documents', 'Contact CA'].map((chip) => (
                  <button
                    key={chip}
                    onClick={() => {
                      setIsChatOpen(true);
                      setTimeout(() => handleSendChatMessage(chip), 150);
                    }}
                    className="bg-white hover:bg-slate-900 hover:text-white border border-slate-300 text-slate-800 text-xs font-semibold px-2.5 py-1 rounded-xl transition cursor-pointer"
                  >
                    {chip} ➔
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setIsChatOpen(true)}
              className="w-full btn-primary py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer font-bold shadow-sm"
            >
              <MessageSquare size={15} />
              <span>Open Floating AI Chat</span>
            </button>
          </div>

          {/* CA Contact Card */}
          {caFirm && (
            <div className="liquid-glass p-5 rounded-2xl sm:rounded-3xl border border-slate-200 space-y-3">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Building size={14} className="text-emerald-700" />
                <span>Your Chartered Accountant</span>
              </h4>
              <div className="space-y-1.5 text-xs text-slate-700">
                <div className="font-extrabold text-slate-900 text-sm">{caFirm.firmName || caFirm.name}</div>
                <div className="text-slate-500 font-medium">Lead CA: {caFirm.name}</div>
                {caFirm.phone && (
                  <div className="pt-1 flex items-center gap-1.5 text-emerald-800 font-bold">
                    <Phone size={13} />
                    <span>{caFirm.phone}</span>
                  </div>
                )}
                {caFirm.email && (
                  <div className="text-slate-500 text-[11px]">
                    Email: {caFirm.email}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Security & Verification Card */}
          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 text-xs space-y-1.5">
            <div className="font-bold text-emerald-900 flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-emerald-700" />
              <span>Bank-Grade 256-Bit Vault</span>
            </div>
            <p className="text-[11px] text-emerald-800 font-medium leading-relaxed">
              All documents are cryptographically verified and issued directly by your registered CA firm.
            </p>
          </div>
        </div>
      </div>
      )}

      {/* DOCUMENT PREVIEW MODAL WITH CA WATERMARK OVERLAY */}
      {showPreviewModal && previewDoc && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-600 rounded-xl text-white">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base leading-tight">
                    {previewDoc.documentName || previewDoc.fileName}
                  </h3>
                  <div className="text-xs text-slate-400 font-medium flex items-center gap-2 mt-0.5">
                    <span>FY: {previewDoc.financialYear || previewDoc.year}</span>
                    <span>•</span>
                    <span>Category: {previewDoc.category || previewDoc.documentType}</span>
                    <span>•</span>
                    {previewDoc.paymentStatus === 'COMPLETED' || previewDoc.paymentStatus === 'FREE' ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 size={12} />
                        Clean Official Copy
                      </span>
                    ) : (
                      <span className="text-amber-400 font-bold flex items-center gap-1">
                        <Lock size={12} />
                        Watermarked Preview Copy
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowPreviewModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Payment Alert Banner if Unpaid */}
            {!(previewDoc.paymentStatus === 'COMPLETED' || previewDoc.paymentStatus === 'FREE') && (
              <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-950">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <AlertTriangle size={16} className="text-amber-700 shrink-0" />
                  <span>
                    <strong>Payment Pending (₹{previewDoc.paymentAmount || 500})</strong>: This preview has CA Firm watermarks. Complete payment to remove watermarks and download the official verified document.
                  </span>
                </div>
                <button
                  onClick={() => {
                    setShowPreviewModal(false);
                    handleOpenPaymentModal(previewDoc);
                  }}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-1.5 rounded-xl transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
                >
                  <Lock size={13} />
                  <span>Pay ₹{previewDoc.paymentAmount || 500} & Remove Watermark</span>
                </button>
              </div>
            )}

            {/* Document Content View Area with Relative Container */}
            <div className="flex-1 overflow-auto p-4 sm:p-8 bg-slate-100 flex items-center justify-center min-h-[380px] relative select-none">
              
              {/* Actual Document (Image or PDF view) */}
              <div className="relative bg-white rounded-2xl shadow-lg border border-slate-300 overflow-hidden max-w-2xl w-full flex items-center justify-center min-h-[420px]">
                {previewDoc.mimeType?.includes('image') || previewDoc.fileName?.match(/\.(png|jpe?g|webp|gif|svg)$/i) ? (
                  <img
                    src={previewDoc.fileUrl}
                    alt="Document Preview"
                    className="max-h-[520px] w-auto object-contain mx-auto"
                  />
                ) : (
                  <div className="p-8 text-center space-y-4 w-full">
                    <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-200">
                      <FileText size={32} />
                    </div>
                    <div className="font-extrabold text-slate-900 text-lg">
                      {previewDoc.documentName || previewDoc.fileName}
                    </div>
                    <div className="text-xs text-slate-500 font-medium max-w-md mx-auto">
                      Official Tax Document issued for Financial Year {previewDoc.financialYear || previewDoc.year}.
                    </div>
                  </div>
                )}

                {/* WATERMARK OVERLAY (When NOT Paid) */}
                {!(previewDoc.paymentStatus === 'COMPLETED' || previewDoc.paymentStatus === 'FREE') && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col justify-around overflow-hidden bg-white/20 backdrop-blur-[0.5px]">
                    {/* Repeating diagonal watermark patterns */}
                    {[1, 2, 3, 4, 5, 6].map((row) => (
                      <div
                        key={row}
                        className="transform -rotate-25 whitespace-nowrap text-center text-slate-900/35 font-black text-xl sm:text-2xl md:text-3xl tracking-widest uppercase select-none drop-shadow-xs"
                      >
                        {caFirmDisplayName} • UNPAID COPY • PREVIEW ONLY • {caFirmDisplayName}
                      </div>
                    ))}
                    <div className="absolute inset-0 border-4 border-dashed border-rose-400/40 rounded-2xl pointer-events-none m-2"></div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between">
              <div className="text-xs text-slate-500 font-medium">
                Issued by: <strong className="text-slate-900">{caFirmDisplayName}</strong>
              </div>

              <div className="flex items-center gap-2">
                {previewDoc.paymentStatus === 'COMPLETED' || previewDoc.paymentStatus === 'FREE' ? (
                  <button
                    onClick={() => handleDownloadDocument(previewDoc.fileUrl, previewDoc.originalFilename || previewDoc.fileName || 'document.pdf')}
                    className="btn-primary px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 font-bold shadow-sm cursor-pointer"
                  >
                    <Download size={14} />
                    <span>Download Clean Original</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setShowPreviewModal(false);
                      handleOpenPaymentModal(previewDoc);
                    }}
                    className="btn-primary px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 font-bold shadow-sm cursor-pointer"
                  >
                    <Lock size={14} />
                    <span>Pay ₹{previewDoc.paymentAmount || 500} & Unlock Clean Copy</span>
                  </button>
                )}
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="btn-outline px-3.5 py-2 rounded-xl text-xs font-bold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RAZORPAY-READY INSTANT PAYMENT CHECKOUT MODAL */}
      {showPaymentModal && paymentDoc && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            
            {/* Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center font-bold text-white shadow-xs">
                  ₹
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">CA Document Payment</h3>
                  <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                    <ShieldCheck size={12} />
                    <span>Razorpay Secure Gateway • 256-Bit SSL</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowPaymentModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Payment Body */}
            {paymentSuccessData ? (
              <div className="p-6 text-center space-y-4 animate-in zoom-in-95 duration-200">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 size={36} />
                </div>
                <div>
                  <h4 className="font-black text-xl text-slate-900">Payment Successful!</h4>
                  <p className="text-xs text-slate-600 font-medium mt-1">
                    Your fee of <strong>₹{paymentSuccessData.paymentAmount || 500}</strong> has been confirmed. Watermark is removed and clean document is unlocked!
                  </p>
                  <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 font-mono space-y-1 text-left">
                    <div>Order Ref: <strong className="text-slate-900">{paymentSuccessData.orderRef}</strong></div>
                    <div>Payment ID: <strong className="text-slate-900">{paymentSuccessData.paymentId}</strong></div>
                  </div>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    onClick={() => handleDownloadDocument(paymentSuccessData.fileUrl, paymentSuccessData.fileName || 'Clean_Document.pdf')}
                    className="btn-primary py-3 rounded-xl text-xs flex items-center justify-center gap-2 font-bold shadow-md cursor-pointer"
                  >
                    <Download size={15} />
                    <span>Download Clean Official Document</span>
                  </button>
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="btn-outline py-2.5 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Back to Portal
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-5 sm:p-6 space-y-5">
                {/* Bill Summary */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">Document:</span>
                    <strong className="text-slate-900 truncate max-w-[200px]">{paymentDoc.documentName || paymentDoc.fileName}</strong>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">Financial Year:</span>
                    <strong className="text-slate-900">FY {paymentDoc.financialYear || paymentDoc.year}</strong>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">Payable To:</span>
                    <strong className="text-emerald-800 font-bold">{caFirmDisplayName}</strong>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                    <span className="font-extrabold text-slate-900 text-sm">Total CA Fee:</span>
                    <span className="font-black text-emerald-700 text-xl">₹{paymentDoc.paymentAmount || 500}</span>
                  </div>
                </div>

                {/* Secure Gateway info */}
                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-xs text-emerald-950 space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5 text-emerald-900">
                    <ShieldCheck size={16} className="text-emerald-700 shrink-0" />
                    <span>Razorpay Instant Checkout</span>
                  </div>
                  <p className="text-[11px] text-emerald-800/90 leading-relaxed font-medium">
                    Pay securely using UPI (Google Pay, PhonePe, Paytm), Credit/Debit Cards, or NetBanking. Your clean official copy is unlocked instantly upon payment.
                  </p>
                </div>

                {/* Error Alert */}
                {paymentErrorMessage && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                    <AlertTriangle size={15} className="text-rose-600 shrink-0" />
                    <span>{paymentErrorMessage}</span>
                  </div>
                )}

                {/* Submit Checkout Button */}
                <button
                  type="button"
                  onClick={handleProcessPayment}
                  disabled={processingPayment || paymentCheckoutState === 'creating' || paymentCheckoutState === 'processing'}
                  className="w-full btn-primary py-3 rounded-2xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:shadow-xl transition disabled:opacity-50"
                >
                  {paymentCheckoutState === 'creating' ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      <span>Creating Order...</span>
                    </>
                  ) : paymentCheckoutState === 'processing' ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      <span>Processing Payment...</span>
                    </>
                  ) : paymentCheckoutState === 'failed' ? (
                    <>
                      <ShieldCheck size={16} />
                      <span>Try Again • Pay ₹{paymentDoc.paymentAmount || 500}</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={16} />
                      <span>Pay ₹{paymentDoc.paymentAmount || 500} & Unlock</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FLOATING CHATBOT APPLICATION WIDGET */}
      <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end">
        {/* Floating Chat Modal Window */}
        {isChatOpen && (
          <div className="w-[92vw] sm:w-[410px] md:w-[440px] h-[560px] max-h-[82vh] bg-white rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden mb-3.5 animate-in slide-in-from-bottom-5 duration-200">
            {/* Header */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-600 flex items-center justify-center font-bold text-white shadow-xs">
                  <Bot size={18} />
                </div>
                <div>
                  <div className="font-bold text-sm leading-snug">
                    {caFirm?.firmName || caFirm?.name || 'Smart CA Tax Assistant'}
                  </div>
                  <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Online • Instant Document Retrieval
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsChatOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
                title="Close chat"
              >
                <X size={16} />
              </button>
            </div>

            {/* Chat Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f8fafc]">
              {chatLog.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3.5 rounded-2xl text-xs shadow-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-emerald-700 text-white rounded-tr-none'
                        : 'bg-white text-slate-900 border border-slate-200 rounded-tl-none'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{formatText(msg.text)}</div>

                    {/* Render Download Buttons for matched documents in chat bubble */}
                    {msg.documents && msg.documents.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Download Documents:
                        </span>
                        <div className="flex flex-col gap-1.5">
                          {msg.documents.map((d) => (
                            <a
                              key={d.id}
                              href={d.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white border border-emerald-300 px-3 py-2 rounded-xl transition flex items-center justify-between font-bold text-xs group"
                            >
                              <div className="flex items-center gap-2">
                                <FileText size={14} />
                                <span className="truncate">{d.name} ({d.year})</span>
                              </div>
                              <div className="flex items-center gap-1 text-[11px] shrink-0">
                                <span>Download</span>
                                <Download size={12} />
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    <div
                      className={`text-[9px] mt-1.5 text-right flex items-center justify-end gap-1 ${
                        msg.sender === 'user' ? 'text-emerald-200' : 'text-slate-400'
                      }`}
                    >
                      <span>{msg.time}</span>
                      {msg.sender === 'user' && <CheckCheck size={11} />}
                    </div>
                  </div>
                </div>
              ))}

              {sendingMessage && (
                <div className="flex items-center gap-2 text-slate-400 text-xs p-2 bg-white rounded-xl border border-slate-200 w-fit">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]"></span>
                  <span className="text-[10px] font-semibold text-slate-500 ml-1">AI searching documents...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Footer & Inputs */}
            <div className="p-3 bg-white border-t border-slate-200 space-y-2">
              <div className="flex flex-wrap gap-1.5 max-h-14 overflow-y-auto">
                {['ITR 2024-25', '2025-26', 'GST Return', 'Show all documents', 'Contact CA'].map((chip) => (
                  <button
                    key={chip}
                    onClick={() => handleSendChatMessage(chip)}
                    className="bg-slate-100 hover:bg-slate-900 hover:text-white border border-slate-200 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded-full transition cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendChatMessage();
                }}
                className="flex items-center gap-1.5"
              >
                <input
                  type="text"
                  placeholder="Ask for any return (e.g. 'ITR 2024-25')..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white transition font-medium"
                />
                <button
                  type="submit"
                  disabled={sendingMessage || !chatInput.trim()}
                  className="btn-primary p-2 rounded-xl disabled:opacity-50 cursor-pointer shrink-0"
                >
                  <Send size={15} />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Floating Action Button (FAB) */}
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-full shadow-2xl transition-all transform hover:scale-105 active:scale-95 cursor-pointer font-bold text-xs ${
            isChatOpen
              ? 'bg-slate-900 text-white border border-slate-700 hover:bg-slate-800'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30'
          }`}
          title={isChatOpen ? 'Minimize Assistant' : 'Open Tax AI Assistant'}
        >
          <div className="relative flex items-center justify-center">
            {isChatOpen ? <X size={18} /> : <Bot size={18} />}
            {!isChatOpen && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
              </span>
            )}
          </div>
          <span>{isChatOpen ? 'Minimize Assistant' : '💬 Ask AI Assistant'}</span>
        </button>
      </div>
    </div>
  );
}


