'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AddClient() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    whatsappNumber: '',
    portalPassword: '',
    clientType: 'INDIVIDUAL',
    consultantPhone: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGeneratePassword = () => {
    const digits = formData.whatsappNumber ? formData.whatsappNumber.replace(/\D/g, '').slice(-4) : Math.floor(1000 + Math.random() * 9000);
    const newPass = `Pass#${digits || '1234'}`;
    setFormData((prev) => ({ ...prev, portalPassword: newPass }));
    setShowPassword(true);
  };

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
    <div className="max-w-xl mx-auto my-4 sm:my-8 liquid-glass p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm animate-in fade-in duration-300">
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-0.5 rounded-full text-xs font-bold mb-1.5">
          <span>➕ Client Registration</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Add New CA Client</h2>
        <p className="text-xs text-slate-500 font-medium">Register client profile, email, WhatsApp number & portal password</p>
      </div>

      {error && (
        <div className="bg-slate-100 border border-slate-300 text-slate-800 p-3 rounded-xl text-xs mb-4 flex items-center gap-2 font-semibold">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Client Name / Business Name *</label>
          <input
            type="text"
            required
            placeholder="e.g. Ramesh Kumar / ABC Enterprises"
            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-slate-900 transition"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Client Email Address (Optional)</label>
            <input
              type="email"
              placeholder="e.g. ramesh@example.com"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-slate-900 transition"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">WhatsApp Phone Number *</label>
            <input
              type="text"
              required
              placeholder="+919876543210"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-slate-900 transition"
              value={formData.whatsappNumber}
              onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
            />
          </div>
        </div>

        {/* Client Portal Password Option */}
        <div className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 space-y-2">
          <div className="flex justify-between items-center">
            <label className="block text-xs font-bold uppercase tracking-wider text-emerald-950">
              🔑 Client Portal Login Password
            </label>
            <button
              type="button"
              onClick={handleGeneratePassword}
              className="text-[11px] bg-white hover:bg-slate-900 hover:text-white text-slate-800 border border-slate-300 font-bold px-2.5 py-1 rounded-lg transition cursor-pointer"
            >
              🎲 Auto-Generate Password
            </button>
          </div>
          <div className="relative flex items-center">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="e.g. Pass#1234 (Set password for client to log in)"
              className="w-full pl-3.5 pr-20 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-slate-900 transition"
              value={formData.portalPassword}
              onChange={(e) => setFormData({ ...formData, portalPassword: e.target.value })}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 text-[10px] font-bold text-slate-500 hover:text-slate-900 px-2 py-1 bg-slate-100 rounded-md"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <p className="text-[10px] text-slate-500 font-medium">
            Optional. If set, this client can immediately log in to the Client Portal using their Mobile/Email + this Password.
          </p>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Client Entity Type</label>
          <select
            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-slate-900 transition"
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
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">CA Consultant Phone (Optional)</label>
          <input
            type="text"
            placeholder="+919876000000"
            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-slate-900 transition"
            value={formData.consultantPhone}
            onChange={(e) => setFormData({ ...formData, consultantPhone: e.target.value })}
          />
        </div>

        <div className="pt-3 flex flex-col sm:flex-row gap-2.5">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 btn-primary py-2.5 rounded-xl text-xs uppercase tracking-wider disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Saving Client...' : 'Save Client Profile'}
          </button>
          <Link href="/clients" className="btn-outline px-5 py-2.5 rounded-xl text-xs text-center font-bold">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
