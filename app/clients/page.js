'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserPlus, Trash2, Phone, Building, FileText } from 'lucide-react';

export default function Clients() {
  const router = useRouter();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const res = await fetch('/api/clients', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) {
        localStorage.removeItem('token');
        router.push('/login');
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this client and all associated documents?')) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setClients(clients.filter(c => c._id !== id));
      }
    } catch (err) {
      alert('Failed to delete client');
    }
  };

  const filteredClients = clients.filter(c => 
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.whatsappNumber?.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.clientType?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="liquid-glass p-5 sm:p-7 rounded-2xl sm:rounded-3xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border border-slate-200">
        <div>
          <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-0.5 rounded-full text-xs font-bold mb-1">
            <span>👥 Client Directory</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">CA Client Vault</h1>
          <p className="text-slate-500 text-xs font-medium">Manage client email, WhatsApp numbers & document access</p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search name, phone, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-slate-800"
          />
          <Link href="/add-client" className="btn-primary px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shrink-0">
            <UserPlus size={15} />
            <span>Add Client</span>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 font-medium text-xs">Loading client directory...</div>
      ) : filteredClients.length === 0 ? (
        <div className="liquid-glass p-10 rounded-2xl sm:rounded-3xl text-center border border-slate-200 space-y-3">
          <p className="text-slate-500 text-xs font-semibold">No clients found matching your query.</p>
          <Link href="/add-client" className="inline-block btn-primary px-4 py-2 rounded-xl text-xs">
            Add First Client
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredClients.map((client) => (
            <div key={client._id} className="liquid-glass p-5 sm:p-6 rounded-2xl sm:rounded-3xl flex flex-col justify-between border border-slate-200 hover:border-slate-800 transition duration-200">
              <div>
                <div className="flex justify-between items-start mb-3 gap-2">
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug">{client.name}</h3>
                  <span className="text-[10px] uppercase tracking-wider font-extrabold bg-slate-100 text-slate-800 border border-slate-200 px-2 py-0.5 rounded-md shrink-0">
                    {client.clientType}
                  </span>
                </div>

                <div className="space-y-2 text-xs text-slate-600 font-medium">
                  <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <Phone size={14} className="text-emerald-700 shrink-0" />
                    <span className="truncate">WhatsApp: <strong className="text-slate-900">{client.whatsappNumber}</strong></span>
                  </div>
                  {client.email && (
                    <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <span className="text-emerald-700 text-xs shrink-0">✉️</span>
                      <span className="truncate">Email: <strong className="text-slate-900">{client.email}</strong></span>
                    </div>
                  )}
                  {client.consultantPhone && (
                    <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <Building size={14} className="text-slate-400 shrink-0" />
                      <span className="truncate">Consultant: <strong className="text-slate-900">{client.consultantPhone}</strong></span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-3.5 border-t border-slate-200 flex justify-between items-center gap-2">
                <Link
                  href={`/clients/${client._id}`}
                  className="btn-primary px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5"
                >
                  <FileText size={14} />
                  <span>Documents</span>
                </Link>
                <button
                  onClick={() => handleDelete(client._id)}
                  className="text-slate-400 hover:text-rose-600 p-1.5 rounded-xl hover:bg-slate-100 transition"
                  title="Delete Client"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
