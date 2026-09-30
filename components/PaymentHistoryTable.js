'use client';

import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Search,
  Download,
  FileText,
  ExternalLink,
  ShieldCheck,
  Receipt
} from 'lucide-react';

export default function PaymentHistoryTable({ userRole = 'client' }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch('/api/payments/history', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.payments) {
        setPayments(data.payments);
      } else {
        setError(data.message || 'Failed to load transaction history');
      }
    } catch (e) {
      setError('Network error while retrieving payments.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadDocument = async (url, fileName = 'Document.pdf') => {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        let msg = 'Document file is currently not available on storage';
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
      alert(`⚠️ Download failed: ${err.message}`);
    }
  };

  const filteredPayments = payments.filter((p) => {
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const query = search.toLowerCase().trim();
    if (!query) return matchesStatus;

    const matchesSearch =
      p.orderRef?.toLowerCase().includes(query) ||
      p.razorpayOrderId?.toLowerCase().includes(query) ||
      p.razorpayPaymentId?.toLowerCase().includes(query) ||
      p.customerName?.toLowerCase().includes(query) ||
      p.document?.name?.toLowerCase().includes(query) ||
      p.planId?.toLowerCase().includes(query);

    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PAID':
      case 'CAPTURED':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
            <CheckCircle2 size={11} className="text-emerald-600" />
            <span>Success</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
            <AlertCircle size={11} className="text-rose-600" />
            <span>Failed</span>
          </span>
        );
      case 'PENDING':
      case 'CREATED':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
            <Clock size={11} className="text-amber-600" />
            <span>Pending</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-slate-50/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
            <Receipt size={15} />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">Payment & Invoice History</h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Verified Razorpay transactions and official receipts
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-56">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search Ref / ID / Name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl text-xs py-1.5 px-2.5 font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">All Statuses</option>
            <option value="PAID">Success</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
          </select>

          {/* Refresh Button */}
          <button
            onClick={fetchHistory}
            disabled={loading}
            className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 transition cursor-pointer"
            title="Refresh payments"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500 font-medium">
            <RefreshCw size={20} className="animate-spin mx-auto text-emerald-600 mb-2" />
            Loading transaction history...
          </div>
        ) : error ? (
          <div className="p-6 text-center text-xs text-rose-600 font-medium">{error}</div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <CreditCard size={22} />
            </div>
            <div className="text-xs font-bold text-slate-700">No payment records found</div>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              {search || statusFilter !== 'all'
                ? 'No transactions matched your search criteria.'
                : 'All completed Razorpay checkouts and invoices will appear here.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Order / Purpose</th>
                <th className="py-3 px-4">Payment ID</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4 text-right">Receipt / Document</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900 font-mono text-[11px]">{p.orderRef}</div>
                    <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                      {p.purpose === 'document_fee' ? (
                        <>
                          <FileText size={11} className="text-emerald-600" />
                          <span className="truncate max-w-[180px]">
                            {p.document?.name || 'Document Fee'} {p.document?.year ? `(${p.document.year})` : ''}
                          </span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck size={11} className="text-emerald-600" />
                          <span>CA Plan: {p.planId} ({p.billingCycle})</span>
                        </>
                      )}
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    {p.razorpayPaymentId ? (
                      <div className="font-mono text-[11px] text-slate-700 font-semibold truncate max-w-[140px]">
                        {p.razorpayPaymentId}
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Pending checkout</span>
                    )}
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{p.razorpayOrderId}</div>
                  </td>

                  <td className="py-3 px-4">
                    <div className="font-black text-slate-900 text-sm">₹{p.amount}</div>
                    <div className="text-[10px] text-slate-400 font-medium uppercase">{p.paymentMethod || 'Razorpay'}</div>
                  </td>

                  <td className="py-3 px-4">{getStatusBadge(p.status)}</td>

                  <td className="py-3 px-4 text-slate-600 text-[11px]">
                    <div>{new Date(p.paidAt || p.createdAt).toLocaleDateString()}</div>
                    <div className="text-[10px] text-slate-400">
                      {new Date(p.paidAt || p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>

                  <td className="py-3 px-4 text-right">
                    {p.purpose === 'document_fee' && p.document?.id && p.status === 'PAID' ? (
                      <button
                        onClick={() => handleDownloadDocument(`/api/documents/download?id=${p.document.id}`, p.document?.name || 'Tax_Document.pdf')}
                        className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-xl transition cursor-pointer"
                      >
                        <Download size={11} />
                        <span>Download</span>
                      </button>
                    ) : p.status === 'PAID' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-xl">
                        <span>Invoice Settled</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
