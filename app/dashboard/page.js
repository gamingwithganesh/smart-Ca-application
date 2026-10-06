'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Users,
  FileText,
  Upload,
  MessageSquare,
  Plus,
  ArrowRight,
  ShieldCheck,
  Zap,
  Building2,
  ChevronDown,
  Sparkles,
  ExternalLink,
  ArrowLeft
} from 'lucide-react';
import SubscriptionPausedBanner from '@/components/SubscriptionPausedBanner';
import SubscriptionModal from '@/components/SubscriptionModal';
import PaymentHistoryTable from '@/components/PaymentHistoryTable';

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCaId = searchParams.get('caId') || 'all';

  const [currentUser, setCurrentUser] = useState(null);
  const [cas, setCas] = useState([]);
  const [selectedCaId, setSelectedCaId] = useState(initialCaId);
  const [clients, setClients] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);

  // Initial user fetch
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');

      if (!token) {
        router.push('/login');
        return;
      }

      let user = null;
      if (userStr) {
        try {
          user = JSON.parse(userStr);
          setCurrentUser(user);
        } catch (e) {}
      }

      try {
        const meRes = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (meRes.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          router.push('/login');
          return;
        }

        if (meRes.ok) {
          const freshUser = await meRes.json();
          setCurrentUser(freshUser);
          user = freshUser;
        }

        // If Super Admin, fetch list of all CA firms
        if (user && user.role === 'superadmin') {
          const casRes = await fetch('/api/superadmin/cas', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (casRes.ok) {
            const casData = await casRes.json();
            setCas(casData);
          }
        }
      } catch (err) {
        console.error('Error initializing user:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [router]);

  // Sync selectedCaId if URL query changes
  useEffect(() => {
    const urlCaId = searchParams.get('caId');
    if (urlCaId && urlCaId !== selectedCaId) {
      setSelectedCaId(urlCaId);
    }
  }, [searchParams]);

  // Fetch clients & documents whenever selectedCaId changes or currentUser loads
  useEffect(() => {
    const fetchFirmData = async () => {
      const token = localStorage.getItem('token');
      if (!token || !currentUser) return;

      setDataLoading(true);
      try {
        const isSuperAdmin = currentUser.role === 'superadmin';
        let clientsUrl = '/api/clients';
        let docsUrl = '/api/documents';

        if (isSuperAdmin && selectedCaId && selectedCaId !== 'all') {
          clientsUrl += `?caId=${selectedCaId}`;
          docsUrl += `?caId=${selectedCaId}`;
        }

        const [clientRes, docRes] = await Promise.all([
          fetch(clientsUrl, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(docsUrl, { headers: { Authorization: `Bearer ${token}` } })
        ]);

        if (clientRes.ok) {
          const clientData = await clientRes.json();
          setClients(Array.isArray(clientData) ? clientData : []);
        }
        if (docRes.ok) {
          const docData = await docRes.json();
          setDocuments(Array.isArray(docData) ? docData : []);
        }
      } catch (err) {
        console.error('Error loading firm data:', err);
      } finally {
        setDataLoading(false);
      }
    };

    fetchFirmData();
  }, [currentUser, selectedCaId]);

  const isSuperAdmin = currentUser?.role === 'superadmin';
  const activeSelectedCa = isSuperAdmin && selectedCaId !== 'all' 
    ? cas.find(c => c._id === selectedCaId) 
    : null;

  const handleCaChange = (e) => {
    const newCaId = e.target.value;
    setSelectedCaId(newCaId);
    if (newCaId === 'all') {
      router.push('/dashboard');
    } else {
      router.push(`/dashboard?caId=${newCaId}`);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Subscription Paused Banner (for CA firms) */}
      {!isSuperAdmin && (
        <SubscriptionPausedBanner
          user={currentUser}
          onOpenUpgrade={() => setIsSubscriptionModalOpen(true)}
        />
      )}

      {/* Super Admin Control Strip */}
      {isSuperAdmin && (
        <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Super Admin Mode</span>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md font-semibold border border-slate-700">Firm Inspector</span>
              </div>
              <div className="text-sm font-black text-slate-100">
                {activeSelectedCa ? `Viewing: ${activeSelectedCa.firmName || activeSelectedCa.name}` : 'Viewing: All CA Practice Firms'}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* CA Selector Dropdown */}
            <div className="relative flex-1 sm:flex-initial">
              <select
                value={selectedCaId}
                onChange={handleCaChange}
                className="w-full sm:w-64 bg-slate-800 hover:bg-slate-750 text-white text-xs font-semibold px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer appearance-none pr-8"
              >
                <option value="all">All CA Firms ({cas.length})</option>
                {cas.map((ca) => (
                  <option key={ca._id} value={ca._id}>
                    {ca.firmName || ca.name} {ca.firmCity ? `(${ca.firmCity})` : ''} - {ca.status === 'active' ? 'Active' : 'Paused'}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <Link
              href="/superadmin"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition"
            >
              <ArrowLeft size={14} />
              <span>Super Admin Console</span>
            </Link>
          </div>
        </div>
      )}

      {/* Hero Header Banner */}
      <div className="liquid-glass-accent p-6 sm:p-8 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold">
            <Sparkles size={12} className="text-emerald-700" />
            <span>
              {isSuperAdmin
                ? activeSelectedCa?.firmName || 'Super Admin Overview'
                : currentUser?.firmName || 'Smart CA Vault'}
            </span>
            <span className="text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded-full uppercase font-bold ml-1">
              {isSuperAdmin ? 'Super Admin' : currentUser?.role === 'sub_ca' ? 'Associate' : 'Firm Admin'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {isSuperAdmin && activeSelectedCa ? `${activeSelectedCa.firmName || activeSelectedCa.name} Dashboard` : 'CA Practice Dashboard'}
          </h1>
          <p className="text-slate-600 text-xs sm:text-sm font-medium max-w-xl">
            {isSuperAdmin && activeSelectedCa
              ? `Managed by ${activeSelectedCa.name} (${activeSelectedCa.email}) • Plan: ${activeSelectedCa.subscription?.plan || 'Professional'}`
              : 'Automated client document vault & AWS Bedrock AI WhatsApp delivery portal'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 w-full md:w-auto">
          {currentUser?.role === 'admin' && (
            <button
              onClick={() => setIsSubscriptionModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
            >
              <Zap size={15} />
              <span>Upgrade Plan</span>
            </button>
          )}
          <Link
            href="/whatsapp-simulator"
            className="btn-primary px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2"
          >
            <MessageSquare size={16} />
            <span>Launch WhatsApp AI Portal</span>
          </Link>
          <Link
            href="/upload-document"
            className="btn-outline px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2"
          >
            <Upload size={16} />
            <span>Upload Document</span>
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className={`grid grid-cols-1 ${isSuperAdmin ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-4 sm:gap-6`}>
        {isSuperAdmin && (
          <div className="liquid-glass p-5 sm:p-6 rounded-2xl sm:rounded-3xl flex items-center gap-4">
            <div className="p-3.5 bg-slate-900 text-white rounded-2xl shrink-0">
              <Building2 size={24} />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900">
                {activeSelectedCa ? '1 Firm' : cas.length}
              </div>
              <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                {activeSelectedCa ? 'Selected CA Firm' : 'Active CA Firms'}
              </div>
            </div>
          </div>
        )}

        <div className="liquid-glass p-5 sm:p-6 rounded-2xl sm:rounded-3xl flex items-center gap-4">
          <div className="p-3.5 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-200 shrink-0">
            <Users size={24} />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900">
              {loading || dataLoading ? '...' : clients.length}
            </div>
            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5">
              {activeSelectedCa ? 'Firm Clients' : 'Active Clients'}
            </div>
          </div>
        </div>

        <div className="liquid-glass p-5 sm:p-6 rounded-2xl sm:rounded-3xl flex items-center gap-4">
          <div className="p-3.5 bg-slate-100 text-slate-700 rounded-2xl border border-slate-200 shrink-0">
            <FileText size={24} />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900">
              {loading || dataLoading ? '...' : documents.length}
            </div>
            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5">
              {activeSelectedCa ? 'Firm Documents' : 'Total Documents'}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Navigation & Recent Clients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {/* Recent Clients */}
        <div className="liquid-glass p-5 sm:p-6 rounded-2xl sm:rounded-3xl">
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">Recent Clients</h3>
            <Link href="/clients" className="text-xs text-emerald-700 font-bold hover:underline flex items-center gap-1">
              <span>View All</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {loading || dataLoading ? (
            <div className="text-xs text-slate-400 py-6 text-center">Loading client records...</div>
          ) : clients.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              No clients found for this firm.{' '}
              <Link href="/add-client" className="text-emerald-700 font-bold underline">
                Add client
              </Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              {clients.slice(0, 5).map((c) => (
                <div
                  key={c._id}
                  className="flex justify-between items-center p-3 rounded-xl bg-slate-50/80 hover:bg-slate-100/80 transition border border-slate-200"
                >
                  <div>
                    <div className="font-bold text-slate-900 text-xs sm:text-sm">{c.name}</div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2">
                      <span>{c.whatsappNumber}</span>
                      {isSuperAdmin && c.createdBy?.firmName && (
                        <span className="text-slate-400">• {c.createdBy.firmName}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] bg-white text-slate-800 font-bold px-2.5 py-0.5 rounded-lg border border-slate-200">
                    {c.clientType || 'Individual'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Navigation Actions */}
        <div className="liquid-glass p-5 sm:p-6 rounded-2xl sm:rounded-3xl">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-4 sm:mb-6">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Link href="/add-client" className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-slate-800 transition group">
              <Plus className="text-emerald-700 mb-2 group-hover:scale-110 transition" size={20} />
              <div className="font-bold text-slate-900 text-xs sm:text-sm">Add Client</div>
              <div className="text-[11px] text-slate-500">Register new CA client</div>
            </Link>
            <Link href="/upload-document" className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-slate-800 transition group">
              <Upload className="text-slate-700 mb-2 group-hover:scale-110 transition" size={20} />
              <div className="font-bold text-slate-900 text-xs sm:text-sm">Upload File</div>
              <div className="text-[11px] text-slate-500">ITR, GST, TDS documents</div>
            </Link>
            {currentUser?.role === 'admin' ? (
              <Link href="/team" className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-slate-800 transition group">
                <Users className="text-slate-800 mb-2 group-hover:scale-110 transition" size={20} />
                <div className="font-bold text-slate-900 text-xs sm:text-sm">Manage Sub-CAs</div>
                <div className="text-[11px] text-slate-500">Associate team access</div>
              </Link>
            ) : isSuperAdmin ? (
              <Link href="/superadmin" className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-slate-800 transition group">
                <ShieldCheck className="text-emerald-700 mb-2 group-hover:scale-110 transition" size={20} />
                <div className="font-bold text-slate-900 text-xs sm:text-sm">CA Master Console</div>
                <div className="text-[11px] text-slate-500">Manage CA firms & subscriptions</div>
              </Link>
            ) : null}
            <Link
              href="/whatsapp-simulator"
              className={`p-4 rounded-2xl bg-white border border-slate-200 hover:border-slate-800 transition group ${
                currentUser?.role === 'admin' || isSuperAdmin ? '' : 'sm:col-span-2'
              }`}
            >
              <MessageSquare className="text-emerald-700 mb-2 group-hover:scale-110 transition" size={20} />
              <div className="font-bold text-slate-900 text-xs sm:text-sm">WhatsApp AI Portal</div>
              <div className="text-[11px] text-slate-500">Test client queries & automated delivery</div>
            </Link>
          </div>
        </div>
      </div>

      {/* Practice Billing & Payment History Section */}
      <div className="space-y-4">
        <PaymentHistoryTable userRole={currentUser?.role || 'admin'} />
      </div>

      {/* Razorpay Subscription Modal */}
      <SubscriptionModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
        currentUser={currentUser}
        onPaymentSuccess={(data) => {
          setCurrentUser((prev) => ({
            ...prev,
            status: 'active',
            isPaused: false,
            subscription: {
              ...prev?.subscription,
              plan: data.activation?.plan || 'Professional',
              status: 'active',
              expiresAt: data.activation?.expiresAt
            }
          }));
        }}
      />
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading Dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
