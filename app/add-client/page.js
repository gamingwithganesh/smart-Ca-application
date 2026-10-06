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
    <div className="max-w-lg mx-auto my-6 sm:my-10 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Add Client</h2>
        <p className="text-xs text-slate-500 mt-1">Fill in the details below to register a new client.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3.5 py-2.5 rounded-xl text-xs mb-5 font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Client Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Email
            </label>
            <input
              type="email"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              WhatsApp Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition"
              value={formData.whatsappNumber}
              onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Portal Password
            </label>
            <button
              type="button"
              onClick={handleGeneratePassword}
              className="text-[11px] text-slate-600 hover:text-slate-900 font-semibold underline underline-offset-2 transition cursor-pointer"
            >
              Generate
            </button>
          </div>
          <div className="relative flex items-center">
            <input
              type={showPassword ? 'text' : 'password'}
              className="w-full pl-3.5 pr-16 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition"
              value={formData.portalPassword}
              onChange={(e) => setFormData({ ...formData, portalPassword: e.target.value })}
            />
            {formData.portalPassword && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 text-[11px] font-semibold text-slate-500 hover:text-slate-800 px-1.5 py-0.5"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Entity Type
            </label>
            <select
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition cursor-pointer"
              value={formData.clientType}
              onChange={(e) => setFormData({ ...formData, clientType: e.target.value })}
            >
              <option value="INDIVIDUAL">Individual</option>
              <option value="PROPRIETORSHIP">Proprietorship</option>
              <option value="PARTNERSHIP_LLP">Partnership / LLP</option>
              <option value="COMPANY">Company</option>
              <option value="TRUST_NGO">Trust / NGO</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Consultant Phone
            </label>
            <input
              type="tel"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition"
              value={formData.consultantPhone}
              onChange={(e) => setFormData({ ...formData, consultantPhone: e.target.value })}
            />
          </div>
        </div>

        <div className="pt-4 flex items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 btn-primary py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Client'}
          </button>
          <Link
            href="/clients"
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs text-center transition"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
