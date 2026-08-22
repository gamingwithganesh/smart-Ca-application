'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import './globals.css';

export default function RootLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {}
    }
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    router.push('/login');
  };

  const isAuthPage = pathname === '/login' || pathname === '/register';

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/clients', label: 'Clients', icon: '👥' },
    { href: '/add-client', label: 'Add Client', icon: '➕' },
    { href: '/upload-document', label: 'Upload Document', icon: '📤' },
    { href: '/whatsapp-simulator', label: 'WhatsApp AI Portal', icon: '💬', badge: 'Live AI' }
  ];

  return (
    <html lang="en">
      <head>
        <title>Smart CA System • AI-Powered Document Platform</title>
        <meta name="description" content="Next.js & AWS Bedrock powered document management system for Chartered Accountants" />
      </head>
      <body>
        <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-emerald-500 selection:text-white">
          {!isAuthPage && (
            <header className="sticky top-0 z-50 liquid-glass border-b border-white/80 shadow-lg shadow-slate-200/50">
              <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                {/* Brand Logo */}
                <Link href="/dashboard" className="flex items-center gap-3 group">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 p-0.5 shadow-md shadow-emerald-500/20 group-hover:scale-105 transition duration-300">
                    <div className="w-full h-full bg-emerald-600 rounded-[10px] flex items-center justify-center font-black text-white text-lg">
                      CA
                    </div>
                  </div>
                  <div>
                    <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-700 bg-clip-text text-transparent">
                      Smart CA Vault
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-emerald-700 tracking-wide uppercase">AI Automation</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    </div>
                  </div>
                </Link>

                {/* Desktop Navigation Links */}
                <nav className="hidden lg:flex items-center gap-1.5 bg-white/70 p-1.5 rounded-2xl border border-white/80 shadow-inner">
                  {navLinks.map((link) => {
                    const isActive = pathname === link.href;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                          isActive
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 font-bold'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                        }`}
                      >
                        <span>{link.icon}</span>
                        <span>{link.label}</span>
                        {link.badge && (
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full font-bold border border-emerald-300">
                            {link.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </nav>

                {/* User Info & Actions */}
                <div className="hidden lg:flex items-center gap-3">
                  {user && (
                    <div className="flex items-center gap-2 bg-white/80 border border-slate-200/80 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 shadow-xs">
                      <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-xs">
                        {user.name?.charAt(0) || 'C'}
                      </div>
                      <span>{user.name}</span>
                    </div>
                  )}
                  {/* FROSTED LIQUID GLASS SIGN OUT BUTTON (NO RED COLOR) */}
                  <button
                    onClick={handleLogout}
                    className="liquid-btn-logout font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="text-slate-500 font-bold">↳</span>
                    <span>Sign Out</span>
                  </button>
                </div>

                {/* Mobile Menu Toggle Button */}
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
                >
                  <span className="text-xl">{isMenuOpen ? '✕' : '☰'}</span>
                </button>
              </div>

              {/* Mobile Drawer Menu */}
              {isMenuOpen && (
                <div className="lg:hidden border-t border-slate-200/80 liquid-glass p-4 space-y-2 shadow-lg">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsMenuOpen(false)}
                      className={`block px-4 py-2.5 rounded-xl text-sm font-semibold ${
                        pathname === link.href
                          ? 'bg-emerald-600 text-white'
                          : 'text-slate-700 hover:bg-slate-100/80'
                      }`}
                    >
                      {link.icon} {link.label}
                    </Link>
                  ))}
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold liquid-btn-logout mt-2 flex items-center gap-2"
                  >
                    <span className="text-slate-500 font-bold">↳</span>
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </header>
          )}

          {/* Main Content Area */}
          <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
            {children}
          </main>

          {/* Liquid Glass Footer */}
          {!isAuthPage && (
            <footer className="liquid-glass border-t border-white/80 text-slate-600 text-xs py-10 mt-12 shadow-xl shadow-slate-200/40">
              <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                <div className="space-y-3 md:col-span-2">
                  <div className="flex items-center gap-2 text-emerald-700 font-bold text-base">
                    <span>⚡ Smart CA AI Portal</span>
                  </div>
                  <p className="text-slate-500 text-xs leading-relaxed max-w-md">
                    Next-generation Chartered Accountant document distribution system. Powered by Next.js App Router, MongoDB Atlas, AWS Bedrock AI (`nova-micro`), and S3 storage.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Features</h4>
                  <ul className="space-y-1.5 text-slate-500">
                    <li>• AI WhatsApp Natural Language Bot</li>
                    <li>• Precise Single-Year ITR Matching</li>
                    <li>• Local Drag & Drop System Upload</li>
                    <li>• Client Management & Session Memory</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">System Status</h4>
                  <div className="bg-white/80 p-3 rounded-xl border border-white/90 space-y-2 shadow-xs">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">AWS Bedrock LLM:</span>
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                        Online
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Database:</span>
                      <span className="text-emerald-700 font-bold">MongoDB Atlas</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="max-w-7xl mx-auto px-6 border-t border-slate-200/60 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-[11px]">
                <p>Smart CA Document Automation System &copy; 2026 • Powered by Next.js & AWS Bedrock</p>
                <div className="flex items-center gap-4 text-slate-500">
                  <span>Privacy Policy</span>
                  <span>•</span>
                  <span>Terms of Service</span>
                  <span>•</span>
                  <span className="text-emerald-700 font-semibold">v2.5 Liquid Glass Release</span>
                </div>
              </div>
            </footer>
          )}
        </div>
      </body>
    </html>
  );
}
