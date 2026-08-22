'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserPlus, Trash2, Phone, Building } from 'lucide-react';

export default function Clients() {
  const router = useRouter();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="space-y-6">
      {/* Liquid Glass Header */}
      <div className="liquid-glass p-6 rounded-3xl flex justify-between items-center flex-wrap gap-4 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 bg-emerald-600/10 text-emerald-800 border border-emerald-500/20 px-3 py-0.5 rounded-full text-xs font-bold mb-1 shadow-xs">
            <span>👥 Client Directory</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">CA Client Vault</h1>
          <p className="text-slate-500 text-xs font-medium">Manage client WhatsApp numbers & document permissions</p>
        </div>
        <Link href="/add-client" className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-4 py-2.5 rounded-2xl text-xs transition flex items-center gap-2 shadow-md shadow-emerald-600/20">
          <UserPlus size={16} />
          <span>Add New Client</span>
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 font-medium">Loading client directory...</div>
      ) : clients.length === 0 ? (
        <div className="liquid-glass p-12 rounded-3xl text-center">
          <p className="text-slate-500 text-xs font-semibold mb-4">No clients added to your CA practice yet.</p>
          <Link href="/add-client" className="text-emerald-700 font-bold underline text-xs">Add First Client</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.map((client) => (
            <div key={client._id} className="liquid-glass p-6 rounded-3xl flex flex-col justify-between hover:translate-y-[-2px] transition duration-300">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-black text-slate-900 text-base">{client.name}</h3>
                  <span className="text-[10px] uppercase tracking-wider font-extrabold bg-emerald-100/80 text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded-xl">
                    {client.clientType}
                  </span>
                </div>

                <div className="space-y-2.5 text-xs text-slate-600 font-medium">
                  <div className="flex items-center gap-2 bg-white/60 p-2.5 rounded-xl border border-white/80">
                    <Phone size={14} className="text-emerald-700" />
                    <span>WhatsApp: <strong className="text-slate-900">{client.whatsappNumber}</strong></span>
                  </div>
                  {client.consultantPhone && (
                    <div className="flex items-center gap-2 bg-white/60 p-2.5 rounded-xl border border-white/80">
                      <Building size={14} className="text-slate-400" />
                      <span>Consultant: <strong className="text-slate-900">{client.consultantPhone}</strong></span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200/60 flex justify-between items-center">
                <span className="text-[10px] text-slate-400 font-medium">Created: {new Date(client.createdAt).toLocaleDateString()}</span>
                <button
                  onClick={() => handleDelete(client._id)}
                  className="text-slate-400 hover:text-rose-600 p-2 rounded-xl hover:bg-rose-50 transition"
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
