'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [bootstrapMsg, setBootstrapMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Login failed');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      if (data.user?.role === 'superadmin') {
        router.push('/superadmin');
      } else if (data.user?.role === 'client') {
        router.push('/portal');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleAutofillSuperAdmin = async () => {
    setLoading(true);
    setError('');
    try {
      await fetch('/api/superadmin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'superadmin@zintech.in',
          password: 'superadmin@zintech.in',
          name: 'Zintech Super Admin'
        })
      });
      setEmail('superadmin@zintech.in');
      setPassword('superadmin@zintech.in');
      setBootstrapMsg('Super Admin credentials loaded! Click "Sign In" below.');
    } catch (e) {
      setError('Failed to setup Super Admin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-6 px-3 sm:px-4 animate-in fade-in duration-300">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        
        {/* Left Side: Brand Panel */}
        <div className="md:col-span-6 bg-slate-900 p-6 sm:p-8 flex flex-col justify-between text-white relative overflow-hidden">
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-black text-xs">
                CA
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Smart CA Vault
              </span>
            </div>

            <div className="pt-4 space-y-2">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
                Practice Document Platform
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
                Automated client tax return retrieval, Sub-CA team provisioning, and AWS Bedrock AI integration.
              </p>
            </div>
          </div>

          <div className="relative z-10 grid grid-cols-2 gap-3 pt-6 border-t border-slate-800 mt-6">
            <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
              <div className="text-emerald-400 font-bold text-xs">Instant AI</div>
              <div className="text-[10px] text-slate-400">WhatsApp Delivery</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
              <div className="text-emerald-400 font-bold text-xs">Multi-Tier</div>
              <div className="text-[10px] text-slate-400">Admin & Sub-CAs</div>
            </div>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="md:col-span-6 p-6 sm:p-8 lg:p-10 flex flex-col justify-center bg-white">
          <div className="mb-5 space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">Sign In</h2>
            <p className="text-xs text-slate-500 font-medium">Enter your credentials to access your portal</p>
          </div>

          {bootstrapMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-2.5 rounded-xl text-xs mb-3 font-semibold flex items-center gap-2">
              <span>✨</span>
              <span>{bootstrapMsg}</span>
            </div>
          )}

          {error && (
            <div className="bg-slate-100 border border-slate-300 text-slate-800 p-2.5 rounded-xl text-xs mb-3 font-semibold flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Mobile Number or Email Address
              </label>
              <input
                type="text"
                required
                placeholder="e.g. +919876543210, 9876543210 or user@example.com"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-slate-900 focus:bg-white transition"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Password
                </label>
              </div>
              <input
                type="password"
                required
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-slate-900 focus:bg-white transition"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 btn-primary py-3 rounded-xl text-xs uppercase tracking-wider transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <span>➔</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Super Admin Setup Button */}
          <div className="mt-4 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">
              Super Admin Quick Access
            </span>
            <button
              type="button"
              onClick={handleAutofillSuperAdmin}
              className="text-[11px] font-bold text-slate-800 hover:text-emerald-700 underline cursor-pointer"
            >
              👑 Autofill Super Admin (superadmin@zintech.in)
            </button>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500 font-medium">
              Are you a Client / Taxpayer?{' '}
              <Link href="/register" className="text-emerald-700 font-bold hover:underline">
                Register Client Account
              </Link>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
