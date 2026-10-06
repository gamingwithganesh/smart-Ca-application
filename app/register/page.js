'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';

export default function Register() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone,
          password,
          accountType: 'client'
        })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      router.push('/portal');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-6 px-3 sm:px-4 animate-in fade-in duration-300">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 rounded-2xl sm:rounded-3xl border border-white/50 shadow-2xl overflow-hidden backdrop-blur-2xl">
        
        {/* Left Side: Brand Panel */}
        <div className="md:col-span-5 bg-slate-900/80 backdrop-blur-xl p-6 sm:p-8 flex flex-col justify-between text-white relative overflow-hidden border-b md:border-b-0 md:border-r border-white/10">
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-black text-xs shadow-md">
                CA
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Smart CA Vault
              </span>
            </div>

            <div className="pt-4 space-y-2">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
                Client Tax Vault
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
                Access official returns, download CA-issued documents, and chat with your 24/7 AI tax assistant.
              </p>
            </div>
          </div>

          <div className="relative z-10 grid grid-cols-2 gap-3 pt-6 border-t border-white/10 mt-6">
            <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10">
              <div className="text-emerald-400 font-bold text-xs">Instant AI</div>
              <div className="text-[10px] text-slate-300">Document Chatbot</div>
            </div>
            <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10">
              <div className="text-emerald-400 font-bold text-xs">Direct Vault</div>
              <div className="text-[10px] text-slate-300">PDF & Excel Returns</div>
            </div>
          </div>
        </div>

        {/* Right Side: Registration Form */}
        <div className="md:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-center bg-white/50 backdrop-blur-2xl">
          <div className="mb-5 space-y-1">
            <div className="inline-flex items-center gap-1.5 bg-emerald-50/90 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold mb-1">
              <User size={12} />
              <span>Client Registration</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              Create Client Account
            </h2>
            <p className="text-xs text-slate-700 font-medium">
              Register with your mobile & email to view all documents issued by your CA
            </p>
          </div>

          {error && (
            <div className="bg-red-50/90 backdrop-blur-sm border border-red-200 text-red-700 p-2.5 rounded-xl text-xs mb-3 font-semibold flex items-center gap-2">
              <AlertTriangle size={14} className="text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1">
                Full Name / Business Name *
              </label>
              <input
                type="text"
                required
                className="w-full px-3.5 py-2.5 bg-white/50 border border-white/70 rounded-xl text-xs text-slate-900 placeholder-slate-500 outline-none focus:border-slate-900 focus:bg-white/75 backdrop-blur-md transition shadow-2xs font-medium"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  className="w-full px-3.5 py-2.5 bg-white/50 border border-white/70 rounded-xl text-xs text-slate-900 placeholder-slate-500 outline-none focus:border-slate-900 focus:bg-white/75 backdrop-blur-md transition shadow-2xs font-medium"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1">
                  Mobile / WhatsApp No. *
                </label>
                <input
                  type="tel"
                  required
                  className="w-full px-3.5 py-2.5 bg-white/50 border border-white/70 rounded-xl text-xs text-slate-900 placeholder-slate-500 outline-none focus:border-slate-900 focus:bg-white/75 backdrop-blur-md transition shadow-2xs font-medium"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1">
                Password *
              </label>
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
              className="w-full mt-3 btn-primary py-3 rounded-xl text-xs uppercase tracking-wider transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin text-white" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Client Account</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 pt-3 border-t border-slate-200/60 text-center">
            <p className="text-xs text-slate-600 font-medium">
              Already have an account?{' '}
              <Link href="/login" className="text-emerald-700 font-bold hover:underline">
                Sign in here
              </Link>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
