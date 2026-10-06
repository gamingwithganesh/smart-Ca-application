'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-8 px-4 animate-in fade-in duration-300">
      <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-white/50 backdrop-blur-2xl border border-white/60 shadow-2xl">
        
        {/* Header with Brand Logo */}
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex items-center gap-2 bg-slate-900/90 text-white px-3 py-1 rounded-xl text-xs font-bold shadow-xs backdrop-blur-sm">
            <div className="w-5 h-5 rounded-md bg-emerald-600 flex items-center justify-center text-[10px] font-black text-white">
              CA
            </div>
            <span>Smart CA Vault</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Sign In</h1>
          <p className="text-xs text-slate-700 font-semibold">Enter your credentials to access your portal</p>
        </div>

        {error && (
          <div className="bg-red-50/90 backdrop-blur-sm border border-red-200 text-red-700 p-3 rounded-xl text-xs mb-4 font-semibold flex items-center gap-2">
            <AlertTriangle size={14} className="text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">
              Mobile Number or Email Address
            </label>
            <input
              type="text"
              required
              className="w-full px-3.5 py-2.5 bg-white/50 border border-white/70 rounded-xl text-xs text-slate-900 placeholder-slate-500 outline-none focus:border-slate-900 focus:bg-white/75 backdrop-blur-md transition shadow-2xs font-medium"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
                Password
              </label>
            </div>
            <input
              type="password"
              required
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2.5 bg-white/50 border border-white/70 rounded-xl text-xs text-slate-900 placeholder-slate-500 outline-none focus:border-slate-900 focus:bg-white/75 backdrop-blur-md transition shadow-2xs font-medium"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 btn-primary py-3 rounded-xl text-xs uppercase tracking-wider transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin text-white" />
                <span>Signing In...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-900/10 text-center">
          <p className="text-xs text-slate-700 font-medium">
            Are you a Client / Taxpayer?{' '}
            <Link href="/register" className="text-emerald-700 font-bold hover:underline">
              Register Client Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
