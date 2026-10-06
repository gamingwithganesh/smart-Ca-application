'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  Building2,
  Users,
  Folder,
  Pause,
  Play,
  AlertTriangle,
  Loader2,
  Pencil,
  Trash2,
  Mail,
  Phone,
  X,
  ShieldCheck,
  LayoutDashboard,
  Plus,
  RefreshCw,
  Sparkles,
  CreditCard
} from 'lucide-react';
import PaymentHistoryTable from '@/components/PaymentHistoryTable';

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [cas, setCas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [activeView, setActiveView] = useState('firms'); // 'firms' | 'payments'

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPauseModalOpen, setIsPauseModalOpen] = useState(false);
  const [selectedCa, setSelectedCa] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states for Create CA
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    firmName: '',
    firmCity: '',
    phone: '',
    plan: 'Professional',
    pricePerMonth: 2499,
    billingCycle: 'monthly',
    durationMonths: 1,
    maxSubCas: 5,
    maxClients: 200,
    notes: ''
  });

  // Pause modal state
  const [pauseReason, setPauseReason] = useState('Subscription payment overdue / Unpaid invoice');

  useEffect(() => {
    checkAuthAndLoad();
  }, [statusFilter, planFilter]);

  const checkAuthAndLoad = async () => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const user = JSON.parse(userStr || '{}');
      setCurrentUser(user);

      if (user.role !== 'superadmin') {
        const meRes = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const meData = await meRes.json();
        if (meData.role !== 'superadmin') {
          setError('Super Admin privileges required to access this portal.');
          setLoading(false);
          return;
        }
      }

      await fetchAllData(token);
    } catch (err) {
      setError(err.message || 'Error initializing Super Admin console');
      setLoading(false);
    }
  };

  const fetchAllData = async (token = localStorage.getItem('token')) => {
    setLoading(true);
    setError('');
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [statsRes, casRes] = await Promise.all([
        fetch('/api/superadmin/stats', { headers }),
        fetch(`/api/superadmin/cas?status=${statusFilter}&plan=${planFilter}&search=${encodeURIComponent(search)}`, { headers })
      ]);

      if (!statsRes.ok || !casRes.ok) {
        if (statsRes.status === 403 || casRes.status === 403) {
          throw new Error('Access denied: You are not logged in as a Super Admin.');
        }
        throw new Error('Failed to load Super Admin data.');
      }

      const statsData = await statsRes.json();
      const casData = await casRes.json();

      setStats(statsData);
      setCas(casData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchAllData();
  };

  const handleToggleStatus = async (ca) => {
    if (ca.status === 'active') {
      setSelectedCa(ca);
      setIsPauseModalOpen(true);
    } else {
      await executeStatusChange(ca._id, 'active', '');
    }
  };

  const executeStatusChange = async (caId, status, reason) => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/superadmin/cas/${caId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status, pauseReason: reason })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update status');

      setIsPauseModalOpen(false);
      await fetchAllData();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleQuickExtend = async (caId, days) => {
    if (!confirm(`Extend subscription for ${days} days and activate account?`)) return;
    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/superadmin/cas/${caId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'active', extendDays: days, pauseReason: '' })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to extend subscription');

      await fetchAllData();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateCa = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/superadmin/cas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create CA Firm');

      setIsAddModalOpen(false);
      setFormData({
        name: '',
        email: '',
        password: '',
        firmName: '',
        firmCity: '',
        phone: '',
        plan: 'Professional',
        pricePerMonth: 2499,
        billingCycle: 'monthly',
        durationMonths: 1,
        maxSubCas: 5,
        maxClients: 200,
        notes: ''
      });
      await fetchAllData();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditCaSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCa) return;
    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/superadmin/cas/${selectedCa._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: selectedCa.name,
          email: selectedCa.email,
          firmName: selectedCa.firmName,
          firmCity: selectedCa.firmCity,
          phone: selectedCa.phone,
          status: selectedCa.status,
          pauseReason: selectedCa.pauseReason,
          subscription: selectedCa.subscription
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update CA firm');

      setIsEditModalOpen(false);
      await fetchAllData();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCa = async (ca) => {
    const confirmPrompt = prompt(
      `⚠️ ARE YOU SURE?\nThis will delete CA "${ca.name}" (${ca.firmName}), all their Sub-CAs, clients, and documents!\nType "DELETE" to confirm:`
    );
    if (confirmPrompt !== 'DELETE') return;

    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/superadmin/cas/${ca._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete CA');

      await fetchAllData();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePurgeDemoData = async () => {
    const confirmation = prompt('⚠️ DANGER: Type "PURGE" to delete all demo CA firms, test clients, and test documents:');
    if (confirmation !== 'PURGE') return;

    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/superadmin/cleanup', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to purge demo data');

      alert(data.message);
      await fetchAllData();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300 pb-12">
      {/* Top Super Admin Header */}
      <div className="liquid-glass rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-white font-extrabold text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck size={12} className="text-emerald-400" />
              <span>Master Console</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold text-[11px] border border-emerald-200">
              Platform Admin
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-slate-900">
            CA Firms & Subscriptions
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl font-medium">
            Provision CA accounts, control monthly subscriptions, and pause/resume access for non-paying clients.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap sm:flex-nowrap">
          <button
            onClick={handlePurgeDemoData}
            disabled={actionLoading}
            className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
            title="Wipe demo test accounts"
          >
            <Trash2 size={13} className="text-slate-500" />
            <span>Purge Demo Data</span>
          </button>
          <button
            onClick={() => fetchAllData()}
            className="w-full sm:w-auto px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
            title="Refresh Table"
          >
            <RefreshCw size={13} className="text-slate-500" />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="w-full sm:w-auto px-4 py-2 rounded-xl btn-primary text-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} />
            <span>Add CA Firm</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-slate-100 border border-slate-300 text-slate-800 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="text-amber-600 shrink-0" />
            <span>{error}</span>
          </div>
          <Link href="/login" className="underline font-bold ml-2 text-emerald-700">
            Sign In Again
          </Link>
        </div>
      )}

      {/* Top View Selector Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveView('firms')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
            activeView === 'firms'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <Building2 size={14} className={activeView === 'firms' ? 'text-emerald-400' : 'text-slate-500'} />
          <span>CA Firms Directory & Stats</span>
        </button>
        <button
          onClick={() => setActiveView('payments')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
            activeView === 'payments'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <CreditCard size={14} className={activeView === 'payments' ? 'text-emerald-400' : 'text-slate-500'} />
          <span>Razorpay Payments & Invoices</span>
        </button>
      </div>

      {activeView === 'payments' ? (
        <PaymentHistoryTable userRole="superadmin" />
      ) : (
        <>
          {/* Metric Cards Grid - Fully Responsive */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <div className="liquid-glass p-4 rounded-2xl border border-slate-200">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total CA Firms</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{stats.totalCas}</div>
            <span className="text-[10px] text-slate-400 font-medium">Registered</span>
          </div>

          <div className="liquid-glass p-4 rounded-2xl border border-emerald-200 bg-emerald-50/30">
            <span className="text-[10px] sm:text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">Active CAs</span>
            <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">{stats.activeCas}</div>
            <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> Live Access
            </span>
          </div>

          <div className="liquid-glass p-4 rounded-2xl border border-slate-300 bg-slate-100/50">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-600 uppercase tracking-wider block">Paused</span>
            <div className="text-xl sm:text-2xl font-black text-slate-800 mt-1">{stats.pausedCas}</div>
            <span className="text-[10px] text-slate-500 font-medium">On Hold</span>
          </div>

          <div className="liquid-glass p-4 rounded-2xl border border-slate-200">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Sub-CAs</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{stats.totalSubCas}</div>
            <span className="text-[10px] text-slate-400 font-medium">Staff Members</span>
          </div>

          <div className="liquid-glass p-4 rounded-2xl border border-slate-200">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block">End Clients</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{stats.totalClients}</div>
            <span className="text-[10px] text-slate-400 font-medium">{stats.totalDocuments} Docs</span>
          </div>

          <div className="liquid-glass p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-700 uppercase tracking-wider block">Platform MRR</span>
            <div className="text-xl sm:text-2xl font-black text-emerald-800 mt-1">₹{stats.totalMRR?.toLocaleString()}</div>
            <span className="text-[10px] text-emerald-700 font-semibold">Monthly Est.</span>
          </div>
        </div>
      )}

      {/* Control & Filter Bar */}
      <div className="liquid-glass rounded-2xl p-3 sm:p-4 border border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Box */}
        <form onSubmit={handleSearchSubmit} className="w-full md:w-72 relative">
          <input
            type="text"
            placeholder="Search firm, name, email, city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-800 transition"
          />
          <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
        </form>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <span className="text-[10px] font-bold text-slate-500 uppercase shrink-0">Status:</span>
          {['all', 'active', 'paused'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-xl text-xs font-bold capitalize transition shrink-0 cursor-pointer ${
                statusFilter === st
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {st}
            </button>
          ))}

          <span className="text-[10px] font-bold text-slate-500 uppercase ml-2 shrink-0">Plan:</span>
          {['all', 'Starter', 'Professional', 'Enterprise'].map((pl) => (
            <button
              key={pl}
              onClick={() => setPlanFilter(pl)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                planFilter === pl
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {pl}
            </button>
          ))}
        </div>
      </div>

      {/* CA Firms Table / Mobile Card Layout */}
      <div className="liquid-glass rounded-2xl sm:rounded-3xl border border-slate-200 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-white/70 flex items-center justify-between">
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
            <Building2 size={16} className="text-slate-700" />
            <span>CA Firms Directory</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 text-xs font-black">
              {cas.length} Firms
            </span>
          </h3>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            Click <strong>Pause</strong> to freeze firm access on unpaid subscriptions.
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
            <Loader2 size={24} className="animate-spin text-slate-700" />
            <span>Loading CA firm records...</span>
          </div>
        ) : cas.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs space-y-3">
            <p className="font-semibold text-slate-700">No CA firms found matching the filter.</p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 rounded-xl btn-primary text-xs"
            >
              Add First CA Firm
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead className="bg-slate-100 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="p-4">CA & Firm Info</th>
                  <th className="p-4">Plan & Billing</th>
                  <th className="p-4">Expiry Date</th>
                  <th className="p-4 text-center">Team & Clients</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {cas.map((ca) => {
                  const isPaused = ca.status === 'paused' || ca.status === 'suspended';
                  const expiresAt = ca.subscription?.expiresAt ? new Date(ca.subscription.expiresAt) : null;
                  const isExpired = expiresAt && expiresAt < new Date();
                  const daysLeft = expiresAt ? Math.ceil((expiresAt - new Date()) / (1000 * 60 * 60 * 24)) : null;

                  return (
                    <tr
                      key={ca._id}
                      className={`hover:bg-slate-50 transition ${
                        isPaused ? 'bg-slate-100/40' : ''
                      }`}
                    >
                      {/* CA & Firm Name */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0 ${
                            isPaused ? 'bg-slate-600' : 'bg-slate-900'
                          }`}>
                            {ca.name?.charAt(0) || 'C'}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                              {ca.name}
                              {ca.firmCity && (
                                <span className="text-[10px] text-slate-400 font-semibold">({ca.firmCity})</span>
                              )}
                            </div>
                            <div className="text-[11px] font-bold text-emerald-700">
                              {ca.firmName || 'CA Practice'}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                              <span className="flex items-center gap-1"><Mail size={12} className="text-slate-400" /> {ca.email}</span>
                              {ca.phone && <span className="flex items-center gap-1">• <Phone size={12} className="text-slate-400" /> {ca.phone}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Subscription Plan */}
                      <td className="p-4">
                        <div className="space-y-0.5">
                          <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-slate-100 text-slate-800 border border-slate-300">
                            {ca.subscription?.plan || 'Professional'}
                          </span>
                          <div className="text-[11px] text-slate-600 font-semibold">
                            ₹{ca.subscription?.pricePerMonth || 2499}/mo
                          </div>
                        </div>
                      </td>

                      {/* Expiry Date */}
                      <td className="p-4">
                        {expiresAt ? (
                          <div className="space-y-0.5">
                            <div className="font-semibold text-slate-800">
                              {expiresAt.toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </div>
                            {daysLeft !== null && (
                              <div className={`text-[10px] font-bold flex items-center gap-1 ${
                                daysLeft <= 3
                                  ? 'text-rose-600'
                                  : daysLeft <= 10
                                  ? 'text-amber-600'
                                  : 'text-emerald-700'
                              }`}>
                                {daysLeft <= 0 ? (
                                  <>
                                    <AlertTriangle size={11} className="text-rose-600" />
                                    <span>Expired</span>
                                  </>
                                ) : (
                                  `${daysLeft} days left`
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">Unlimited</span>
                        )}
                      </td>

                      {/* Team & Usage */}
                      <td className="p-4 text-center">
                        <div className="inline-flex items-center gap-2 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200">
                          <span className="text-slate-700 font-bold text-[11px] flex items-center gap-1">
                            <Users size={12} className="text-slate-500" />
                            <span>{ca.subCaCount || 0}/{ca.subscription?.maxSubCas || 5}</span>
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-700 font-bold text-[11px] flex items-center gap-1">
                            <Folder size={12} className="text-slate-500" />
                            <span>{ca.clientCount || 0}/{ca.subscription?.maxClients || 200}</span>
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        {isPaused ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-200 text-slate-800 border border-slate-300">
                              <Pause size={10} /> PAUSED
                            </span>
                            {ca.pauseReason && (
                              <div className="text-[10px] text-slate-500 font-medium max-w-[130px] truncate" title={ca.pauseReason}>
                                {ca.pauseReason}
                              </div>
                            )}
                          </div>
                        ) : isExpired ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                            <AlertTriangle size={10} /> EXPIRED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> ACTIVE
                          </span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View CA Firm Dashboard */}
                          <Link
                            href={`/dashboard?caId=${ca._id}`}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] transition flex items-center gap-1.5"
                            title="Open CA Firm View / Vault"
                          >
                            <LayoutDashboard size={12} className="text-emerald-400" />
                            <span>Vault</span>
                          </Link>

                          {/* Pause / Resume Button */}
                          <button
                            onClick={() => handleToggleStatus(ca)}
                            className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition cursor-pointer flex items-center gap-1.5 ${
                              isPaused
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                : 'bg-slate-800 hover:bg-slate-900 text-white'
                            }`}
                            title={isPaused ? 'Resume account' : 'Pause account'}
                          >
                            {isPaused ? <Play size={11} /> : <Pause size={11} />}
                            <span>{isPaused ? 'Resume' : 'Pause'}</span>
                          </button>

                          {/* Quick Extend */}
                          <button
                            onClick={() => handleQuickExtend(ca._id, 30)}
                            className="px-2 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] border border-slate-300 transition cursor-pointer"
                            title="Quick Extend +30 Days"
                          >
                            +30d
                          </button>

                          {/* Edit CA */}
                          <button
                            onClick={() => {
                              setSelectedCa({
                                ...ca,
                                subscription: ca.subscription || {}
                              });
                              setIsEditModalOpen(true);
                            }}
                            className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-200 transition cursor-pointer"
                            title="Edit Limits & Plan"
                          >
                            <Pencil size={12} />
                          </button>

                          {/* Delete CA */}
                          <button
                            onClick={() => handleDeleteCa(ca)}
                            className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-400 hover:text-rose-600 font-bold border border-slate-200 transition cursor-pointer"
                            title="Delete CA Firm"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: Add New CA Firm */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 sm:p-7 max-w-lg w-full border border-slate-200 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Provision CA Firm Account</h3>
                <p className="text-xs text-slate-500">Create login credentials and configure subscription.</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleCreateCa} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">CA Admin Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-medium focus:bg-white focus:outline-none focus:border-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Firm Name</label>
                  <input
                    type="text"
                    value={formData.firmName}
                    onChange={(e) => setFormData({ ...formData, firmName: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-medium focus:bg-white focus:outline-none focus:border-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Login Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-medium focus:bg-white focus:outline-none focus:border-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Initial Password *</label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-medium focus:bg-white focus:outline-none focus:border-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Phone / WhatsApp</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-medium focus:bg-white focus:outline-none focus:border-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">City</label>
                  <input
                    type="text"
                    value={formData.firmCity}
                    onChange={(e) => setFormData({ ...formData, firmCity: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-medium focus:bg-white focus:outline-none focus:border-slate-900"
                  />
                </div>
              </div>

              {/* Plan & Limits */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Subscription & Limits
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600">Plan</label>
                    <select
                      value={formData.plan}
                      onChange={(e) => {
                        const plan = e.target.value;
                        let price = 2499;
                        let subCas = 5;
                        let clients = 200;
                        if (plan === 'Starter') { price = 999; subCas = 2; clients = 50; }
                        if (plan === 'Enterprise') { price = 4999; subCas = 20; clients = 1000; }
                        setFormData({
                          ...formData,
                          plan,
                          pricePerMonth: price,
                          maxSubCas: subCas,
                          maxClients: clients
                        });
                      }}
                      className="w-full p-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-800"
                    >
                      <option value="Starter">Starter (₹999/mo)</option>
                      <option value="Professional">Professional (₹2499/mo)</option>
                      <option value="Enterprise">Enterprise (₹4999/mo)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600">Duration</label>
                    <select
                      value={formData.durationMonths}
                      onChange={(e) => setFormData({ ...formData, durationMonths: Number(e.target.value) })}
                      className="w-full p-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-800"
                    >
                      <option value={1}>1 Month</option>
                      <option value={3}>3 Months</option>
                      <option value={6}>6 Months</option>
                      <option value={12}>1 Year</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600">Max Sub-CAs</label>
                    <input
                      type="number"
                      value={formData.maxSubCas}
                      onChange={(e) => setFormData({ ...formData, maxSubCas: Number(e.target.value) })}
                      className="w-full p-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-800"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl btn-outline text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl btn-primary text-xs disabled:opacity-50"
                >
                  {actionLoading ? 'Creating...' : 'Create & Activate Firm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Pause Account Confirmation */}
      {/* ========================================================================= */}
      {isPauseModalOpen && selectedCa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 sm:p-7 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                <Pause size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Pause CA Firm Account
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedCa.name} ({selectedCa.firmName})
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Pausing will immediately restrict the CA firm and all its Sub-CAs from uploading documents and modifying clients.
            </p>

            <div className="space-y-1 text-xs">
              <label className="font-bold text-slate-700">Reason for Pausing *</label>
              <select
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                className="w-full p-2 rounded-xl border border-slate-300 bg-slate-50 font-medium text-slate-800"
              >
                <option value="Subscription payment overdue / Unpaid invoice">Subscription payment overdue / Unpaid invoice</option>
                <option value="Billing cycle expired">Billing cycle expired</option>
                <option value="Requested by CA firm owner">Requested by CA firm owner</option>
                <option value="Custom hold">Other reason</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsPauseModalOpen(false)}
                className="px-4 py-2 rounded-xl btn-outline text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeStatusChange(selectedCa._id, 'paused', pauseReason)}
                disabled={actionLoading}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs disabled:opacity-50"
              >
                {actionLoading ? 'Pausing...' : 'Confirm & Pause'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: Edit CA Firm & Subscription */}
      {/* ========================================================================= */}
      {isEditModalOpen && selectedCa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 sm:p-7 max-w-lg w-full border border-slate-200 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Edit CA Firm Details</h3>
                <p className="text-xs text-slate-500">Update firm profile and subscription limits.</p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleEditCaSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">CA Admin Name</label>
                  <input
                    type="text"
                    required
                    value={selectedCa.name || ''}
                    onChange={(e) => setSelectedCa({ ...selectedCa, name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 font-medium text-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Firm Name</label>
                  <input
                    type="text"
                    value={selectedCa.firmName || ''}
                    onChange={(e) => setSelectedCa({ ...selectedCa, firmName: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 font-medium text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Email Address</label>
                  <input
                    type="email"
                    required
                    value={selectedCa.email || ''}
                    onChange={(e) => setSelectedCa({ ...selectedCa, email: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 font-medium text-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Phone</label>
                  <input
                    type="text"
                    value={selectedCa.phone || ''}
                    onChange={(e) => setSelectedCa({ ...selectedCa, phone: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 font-medium text-slate-800"
                  />
                </div>
              </div>

              {/* Subscription Controls */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <h4 className="font-bold text-slate-900 text-xs uppercase">Subscription & Limits</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600">Plan</label>
                    <select
                      value={selectedCa.subscription?.plan || 'Professional'}
                      onChange={(e) => setSelectedCa({
                        ...selectedCa,
                        subscription: { ...selectedCa.subscription, plan: e.target.value }
                      })}
                      className="w-full p-2 rounded-xl border border-slate-300 bg-white font-bold"
                    >
                      <option value="Starter">Starter</option>
                      <option value="Professional">Professional</option>
                      <option value="Enterprise">Enterprise</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600">Max Sub-CAs</label>
                    <input
                      type="number"
                      value={selectedCa.subscription?.maxSubCas || 5}
                      onChange={(e) => setSelectedCa({
                        ...selectedCa,
                        subscription: { ...selectedCa.subscription, maxSubCas: Number(e.target.value) }
                      })}
                      className="w-full p-2 rounded-xl border border-slate-300 bg-white font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600">Max Clients</label>
                    <input
                      type="number"
                      value={selectedCa.subscription?.maxClients || 200}
                      onChange={(e) => setSelectedCa({
                        ...selectedCa,
                        subscription: { ...selectedCa.subscription, maxClients: Number(e.target.value) }
                      })}
                      className="w-full p-2 rounded-xl border border-slate-300 bg-white font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl btn-outline text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl btn-primary text-xs disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
