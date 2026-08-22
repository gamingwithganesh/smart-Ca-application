'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Register() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
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
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-6 px-4 bg-slate-50">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
        
        {/* Left Side: Light Mode Hero Graphic Banner */}
        <div className="lg:col-span-7 relative min-h-[340px] lg:min-h-[540px] bg-slate-100 p-8 flex flex-col justify-between overflow-hidden group">
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-85 group-hover:scale-105 transition duration-700"
            style={{ backgroundImage: `url('/images/ca_login_light.jpg')` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/10 via-transparent to-white" />

          <div className="relative z-10 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-black text-xs shadow-md">
              CA
            </div>
            <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-800">
              Smart CA Registration
            </span>
          </div>

          <div className="relative z-10 my-auto space-y-4 max-w-lg">
            <div className="inline-flex items-center gap-2 bg-emerald-100/90 text-emerald-800 border border-emerald-300 px-3.5 py-1 rounded-full text-xs font-bold shadow-sm">
              <span>🚀 Zero Configuration Setup</span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-black text-slate-900 leading-tight">
              Create Your Digital <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 bg-clip-text text-transparent">CA Practice Vault</span>
            </h1>
            <p className="text-xs lg:text-sm text-slate-700 leading-relaxed font-medium bg-white/60 p-3 rounded-2xl border border-white/80 backdrop-blur-sm shadow-sm">
              Register in seconds to organize client profiles, upload PDF financial records, and enable 24/7 AI WhatsApp bot response for your clients.
            </p>
          </div>

          <div className="relative z-10 grid grid-cols-3 gap-3 pt-4 border-t border-slate-200">
            <div className="bg-white/90 backdrop-blur-md p-2.5 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-emerald-700 font-black text-sm">Unlimited</div>
              <div className="text-[10px] text-slate-600 font-semibold">Client Profiles</div>
            </div>
            <div className="bg-white/90 backdrop-blur-md p-2.5 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-emerald-700 font-black text-sm">Bedrock AI</div>
              <div className="text-[10px] text-slate-600 font-semibold">Smart Matching</div>
            </div>
            <div className="bg-white/90 backdrop-blur-md p-2.5 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-emerald-700 font-black text-sm">S3 Cloud</div>
              <div className="text-[10px] text-slate-600 font-semibold">Document Vault</div>
            </div>
          </div>
        </div>

        {/* Right Side: Clean Light Registration Form */}
        <div className="lg:col-span-5 p-8 lg:p-10 flex flex-col justify-center bg-white">
          <div className="mb-6 space-y-1">
            <h2 className="text-2xl font-black text-slate-900">Create CA Account</h2>
            <p className="text-xs text-slate-500 font-medium">Setup your practice profile to start automating client docs</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs mb-4 flex items-center gap-2 font-semibold">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Full Name / Practice Name
              </label>
              <input
                type="text"
                required
                placeholder="CA Rajesh Sharma & Associates"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition font-medium"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="ca.rajesh@firm.com"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition font-medium"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••••••"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition font-medium"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold py-3.5 rounded-xl text-xs uppercase tracking-wider transition shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Registering Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account & Start</span>
                  <span>➔</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500 font-medium">
              Already registered?{' '}
              <Link href="/login" className="text-emerald-700 font-bold hover:underline transition">
                Sign in here
              </Link>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
