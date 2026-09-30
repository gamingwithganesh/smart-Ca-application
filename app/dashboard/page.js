'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Users, FileText, Upload, MessageSquare, Plus, ArrowRight, ShieldCheck, Zap, Receipt } from 'lucide-react';
import SubscriptionPausedBanner from '@/components/SubscriptionPausedBanner';
import SubscriptionModal from '@/components/SubscriptionModal';
import PaymentHistoryTable from '@/components/PaymentHistoryTable';

export default function Dashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [clients, setClients] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
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
          if (u.role === 'superadmin') {
            router.push('/superadmin');
            return;
          }
        } catch (e) {}
      }

      try {
        const [meRes, clientRes, docRes] = await Promise.all([
          fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/clients', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/documents', { headers: { Authorization: `Bearer ${token}` } })
        ]);

        if (meRes.status === 401 || clientRes.status === 401 || docRes.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          router.push('/login');
          return;
        }

        if (meRes.ok) {
          const freshUser = await meRes.json();
          setCurrentUser(freshUser);
          if (freshUser.role === 'superadmin') {
            router.push('/superadmin');
            return;
          }
        }

        if (clientRes.ok) {
          const clientData = await clientRes.json();
          setClients(clientData);
        }
        if (docRes.ok) {
          const docData = await docRes.json();
          setDocuments(docData);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Subscription Paused Banner */}
      <SubscriptionPausedBanner
        user={currentUser}
        onOpenUpgrade={() => setIsSubscriptionModalOpen(true)}
      />

      {/* Hero Header Banner */}
      <div className="liquid-glass-accent p-6 sm:p-8 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold">
            <span>✨ {currentUser?.firmName || 'Smart CA Vault'}</span>
            <span className="text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded-full uppercase font-bold">
              {currentUser?.role === 'sub_ca' ? 'Associate' : 'Firm Admin'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            CA Practice Dashboard
          </h1>
          <p className="text-slate-600 text-xs sm:text-sm font-medium max-w-xl">
            Automated client document vault & AWS Bedrock AI WhatsApp delivery portal
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-6">
        <div className="liquid-glass p-5 rounded-2xl sm:rounded-3xl flex items-center gap-3.5">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-200 shrink-0">
            <Users size={22} />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900">{loading ? '...' : clients.length}</div>
            <div className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider">Active Clients</div>
          </div>
        </div>

        <div className="liquid-glass p-5 rounded-2xl sm:rounded-3xl flex items-center gap-3.5">
          <div className="p-3 bg-slate-100 text-slate-700 rounded-2xl border border-slate-200 shrink-0">
            <FileText size={22} />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900">{loading ? '...' : documents.length}</div>
            <div className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider">Documents</div>
          </div>
        </div>

        <div
          onClick={() => currentUser?.role === 'admin' && setIsSubscriptionModalOpen(true)}
          className={`liquid-glass p-5 rounded-2xl sm:rounded-3xl flex items-center justify-between gap-3.5 ${
            currentUser?.role === 'admin' ? 'hover:border-emerald-300 hover:shadow-xs cursor-pointer transition' : ''
          }`}
          title={currentUser?.role === 'admin' ? 'Click to change plan' : ''}
        >
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-200 shrink-0">
              <ShieldCheck size={22} />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 capitalize">
                {currentUser?.subscription?.plan || 'Professional'}
              </div>
              <div className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider">Plan Active</div>
            </div>
          </div>
          {currentUser?.role === 'admin' && (
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Manage
            </span>
          )}
        </div>

        <div className="liquid-glass p-5 rounded-2xl sm:rounded-3xl flex items-center gap-3.5">
          <div className="p-3 bg-slate-900 text-emerald-400 rounded-2xl shrink-0">
            <MessageSquare size={22} />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-emerald-700">Online</div>
            <div className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider">AI WhatsApp Bot</div>
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

          {loading ? (
            <div className="text-xs text-slate-400 py-6 text-center">Loading client records...</div>
          ) : clients.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              No clients added yet. <Link href="/add-client" className="text-emerald-700 font-bold underline">Add client</Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              {clients.slice(0, 5).map((c) => (
                <div key={c._id} className="flex justify-between items-center p-3 rounded-xl bg-slate-50/80 hover:bg-slate-100/80 transition border border-slate-200">
                  <div>
                    <div className="font-bold text-slate-900 text-xs sm:text-sm">{c.name}</div>
                    <div className="text-[11px] text-slate-500">{c.whatsappNumber}</div>
                  </div>
                  <span className="text-[10px] bg-white text-slate-800 font-bold px-2.5 py-0.5 rounded-lg border border-slate-200">
                    {c.clientType}
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
            {currentUser?.role === 'admin' && (
              <Link href="/team" className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-slate-800 transition group">
                <Users className="text-slate-800 mb-2 group-hover:scale-110 transition" size={20} />
                <div className="font-bold text-slate-900 text-xs sm:text-sm">Manage Sub-CAs</div>
                <div className="text-[11px] text-slate-500">Associate team access</div>
              </Link>
            )}
            <Link href="/whatsapp-simulator" className={`p-4 rounded-2xl bg-white border border-slate-200 hover:border-slate-800 transition group ${
              currentUser?.role === 'admin' ? '' : 'sm:col-span-2'
            }`}>
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

