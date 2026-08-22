'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Users, FileText, Upload, MessageSquare, Plus, ArrowRight } from 'lucide-react';

export default function Dashboard() {
  const router = useRouter();
  const [clients, setClients] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const [clientRes, docRes] = await Promise.all([
          fetch('/api/clients', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/documents', { headers: { Authorization: `Bearer ${token}` } })
        ]);

        if (clientRes.status === 401 || docRes.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          router.push('/login');
          return;
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
    <div className="space-y-8">
      {/* Liquid Glass Header Banner */}
      <div className="liquid-glass-accent p-8 rounded-3xl flex justify-between items-center flex-wrap gap-4 relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-emerald-600/10 text-emerald-800 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-bold mb-3 shadow-xs">
            <span>✨ Liquid Glass AI Suite</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">CA Practice Dashboard</h1>
          <p className="text-slate-600 text-xs font-medium max-w-xl">Automated client document vault & AWS Bedrock AI WhatsApp delivery portal</p>
        </div>
        <div className="flex gap-3 relative z-10">
          <Link href="/whatsapp-simulator" className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-5 py-3 rounded-2xl text-xs transition flex items-center gap-2 shadow-lg shadow-emerald-600/25">
            <MessageSquare size={16} />
            <span>Launch WhatsApp AI Portal</span>
          </Link>
          <Link href="/upload-document" className="bg-white/80 hover:bg-white text-slate-800 font-bold px-4 py-3 rounded-2xl text-xs transition flex items-center gap-2 border border-white shadow-xs">
            <Upload size={16} />
            <span>Upload Document</span>
          </Link>
        </div>
      </div>

      {/* Liquid Glass Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="liquid-glass p-6 rounded-3xl flex items-center gap-4 hover:translate-y-[-2px] transition duration-300">
          <div className="p-4 bg-emerald-500/10 text-emerald-700 rounded-2xl border border-emerald-500/20 shadow-xs">
            <Users size={26} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{loading ? '...' : clients.length}</div>
            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Active CA Clients</div>
          </div>
        </div>

        <div className="liquid-glass p-6 rounded-3xl flex items-center gap-4 hover:translate-y-[-2px] transition duration-300">
          <div className="p-4 bg-teal-500/10 text-teal-700 rounded-2xl border border-teal-500/20 shadow-xs">
            <FileText size={26} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{loading ? '...' : documents.length}</div>
            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Uploaded Documents</div>
          </div>
        </div>

        <div className="liquid-glass p-6 rounded-3xl flex items-center gap-4 hover:translate-y-[-2px] transition duration-300">
          <div className="p-4 bg-cyan-500/10 text-cyan-700 rounded-2xl border border-cyan-500/20 shadow-xs">
            <MessageSquare size={26} />
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-700">Active</div>
            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">AWS Bedrock Bot</div>
          </div>
        </div>
      </div>

      {/* Quick Actions & Recent Clients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="liquid-glass p-6 rounded-3xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-900">Recent Clients</h3>
            <Link href="/clients" className="text-xs text-emerald-700 font-bold hover:underline flex items-center gap-1">
              <span>View All</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {loading ? (
            <div className="text-sm text-slate-400 py-4">Loading clients...</div>
          ) : clients.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              No clients added yet. <Link href="/add-client" className="text-emerald-700 font-bold underline">Add your first client</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {clients.slice(0, 5).map((c) => (
                <div key={c._id} className="flex justify-between items-center p-3.5 rounded-2xl bg-white/60 hover:bg-white transition border border-white/90 shadow-xs">
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{c.name}</div>
                    <div className="text-xs text-slate-500 font-medium">{c.whatsappNumber}</div>
                  </div>
                  <span className="text-xs bg-emerald-100/80 text-emerald-800 font-bold px-3 py-1 rounded-xl border border-emerald-200">
                    {c.clientType}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="liquid-glass p-6 rounded-3xl">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Quick Navigation</h3>
          <div className="grid grid-cols-2 gap-4">
            <Link href="/add-client" className="p-4 rounded-2xl bg-white/60 border border-white/90 hover:bg-white hover:border-emerald-400 transition group shadow-xs">
              <Plus className="text-emerald-700 mb-2 group-hover:scale-110 transition" size={24} />
              <div className="font-bold text-slate-900 text-sm">Add Client</div>
              <div className="text-xs text-slate-500 font-medium">Register new CA client</div>
            </Link>
            <Link href="/upload-document" className="p-4 rounded-2xl bg-white/60 border border-white/90 hover:bg-white hover:border-teal-400 transition group shadow-xs">
              <Upload className="text-teal-700 mb-2 group-hover:scale-110 transition" size={24} />
              <div className="font-bold text-slate-900 text-sm">Upload File</div>
              <div className="text-xs text-slate-500 font-medium">ITR, GST, TDS documents</div>
            </Link>
            <Link href="/whatsapp-simulator" className="p-4 rounded-2xl bg-white/60 border border-white/90 hover:bg-white hover:border-emerald-500 transition group col-span-2 shadow-xs">
              <MessageSquare className="text-emerald-700 mb-2 group-hover:scale-110 transition" size={24} />
              <div className="font-bold text-slate-900 text-sm">WhatsApp Web Simulator</div>
              <div className="text-xs text-slate-500 font-medium">Test client queries & AI automated document retrieval live</div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
