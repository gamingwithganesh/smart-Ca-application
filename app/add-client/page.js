'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AddClient() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    whatsappNumber: '',
    clientType: 'INDIVIDUAL',
    consultantPhone: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to add client');
      }

      router.push('/clients');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto my-6 liquid-glass p-8 lg:p-10 rounded-3xl shadow-xl">
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 bg-emerald-600/10 text-emerald-800 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-bold mb-2 shadow-xs">
          <span>➕ Client Registration</span>
        </div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Add New CA Client</h2>
        <p className="text-xs text-slate-500 font-medium">Register client profile & WhatsApp number for automated tax delivery</p>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-2xl text-xs mb-4 flex items-center gap-2 font-semibold">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Client Name / Business Name *</label>
          <input
            type="text"
            required
            placeholder="e.g. Ramesh Kumar / ABC Traders"
            className="w-full px-4 py-3 bg-white/80 border border-slate-300/80 rounded-2xl text-xs font-medium text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition shadow-xs"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">WhatsApp Phone Number *</label>
          <input
            type="text"
            required
            placeholder="+919876543210"
            className="w-full px-4 py-3 bg-white/80 border border-slate-300/80 rounded-2xl text-xs font-medium text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition shadow-xs"
            value={formData.whatsappNumber}
            onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
          />
          <small className="text-[10px] text-slate-400 font-medium mt-1 block">Include country code (e.g. +91)</small>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Client Entity Type</label>
          <select
            className="w-full px-4 py-3 bg-white/80 border border-slate-300/80 rounded-2xl text-xs font-medium text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition shadow-xs"
            value={formData.clientType}
            onChange={(e) => setFormData({ ...formData, clientType: e.target.value })}
          >
            <option value="INDIVIDUAL">Individual</option>
            <option value="PROPRIETORSHIP">Proprietorship</option>
            <option value="PARTNERSHIP_LLP">Partnership / LLP</option>
            <option value="COMPANY">Private Limited / Company</option>
            <option value="TRUST_NGO">Trust / NGO</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">CA Consultant Phone (Optional)</label>
          <input
            type="text"
            placeholder="+919876000000"
            className="w-full px-4 py-3 bg-white/80 border border-slate-300/80 rounded-2xl text-xs font-medium text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition shadow-xs"
            value={formData.consultantPhone}
            onChange={(e) => setFormData({ ...formData, consultantPhone: e.target.value })}
          />
        </div>

        <div className="pt-4 flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold py-3.5 rounded-2xl text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-600/20 disabled:opacity-50"
          >
            {loading ? 'Saving Client...' : 'Save Client Profile'}
          </button>
          <Link href="/clients" className="px-6 py-3.5 border border-slate-300/80 rounded-2xl text-xs text-slate-700 hover:bg-white font-bold transition">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
