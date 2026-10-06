'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Upload,
  Building2,
  MessageSquare,
  ShieldCheck,
  FileText,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import './globals.css';

export default function RootLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const storedUser = localStorage.getItem('user');
      const token = localStorage.getItem('token');

      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {}
      }

      if (token && !isAuthPage) {
        try {
          const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const freshUser = await res.json();
            setUser(freshUser);
            localStorage.setItem('user', JSON.stringify(freshUser));
          }
        } catch (e) {}
      }
    };

    checkUser();
    setIsMenuOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    router.push('/login');
  };

  const isAuthPage = pathname === '/login' || pathname === '/register';
  const role = user?.role || 'admin';

  let navLinks = [];
  if (role === 'client') {
    navLinks = [
      { href: '/portal', label: 'My Documents Vault', icon: FileText }
    ];
  } else if (role === 'superadmin') {
    navLinks = [
      { href: '/superadmin', label: 'Super Admin Console', icon: ShieldCheck, badge: 'Master' },
      { href: '/dashboard', label: 'CA Firm View', icon: LayoutDashboard },
      { href: '/clients', label: 'All Clients', icon: Users },
      { href: '/whatsapp-simulator', label: 'AI Portal', icon: MessageSquare }
    ];
  } else if (role === 'sub_ca') {
    navLinks = [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/clients', label: 'Clients', icon: Users },
      { href: '/add-client', label: 'Add Client', icon: UserPlus },
      { href: '/upload-document', label: 'Upload Document', icon: Upload },
      { href: '/whatsapp-simulator', label: 'WhatsApp AI Portal', icon: MessageSquare }
    ];
  } else {
    navLinks = [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/clients', label: 'Clients', icon: Users },
      { href: '/add-client', label: 'Add Client', icon: UserPlus },
      { href: '/upload-document', label: 'Upload Document', icon: Upload },
      { href: '/team', label: 'Team & Sub-CAs', icon: Building2 },
      { href: '/whatsapp-simulator', label: 'WhatsApp AI Portal', icon: MessageSquare }
    ];
  }

  return (
    <html lang="en">
      <head>
        <title>Smart CA Vault • AI Document Platform</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
        <meta name="description" content="Secure Document Management System for Chartered Accountants" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Arimo:ital,wght@0,400..700;1,400..700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased">
        {!isAuthPage && (
          <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-xs">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
              
              {/* Brand Logo */}
              <Link href={role === 'superadmin' ? '/superadmin' : role === 'client' ? '/portal' : '/dashboard'} className="flex items-center gap-2.5 group shrink-0">
                <div className="w-9 h-9 rounded-xl bg-slate-900 p-0.5 shadow-sm group-hover:scale-105 transition">
                  <div className="w-full h-full bg-emerald-600 rounded-[9px] flex items-center justify-center font-black text-white text-sm">
                    {role === 'superadmin' ? 'SA' : role === 'client' ? 'CP' : 'CA'}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-base tracking-tight text-slate-900">
                      Smart CA Vault
                    </span>
                    {role === 'superadmin' && (
                      <span className="text-[9px] bg-slate-900 text-white font-bold px-1.5 py-0.5 rounded-md uppercase">
                        Super Admin
                      </span>
                    )}
                    {role === 'client' && (
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-1.5 py-0.5 rounded-md uppercase">
                        Client Vault
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-slate-500 truncate max-w-[140px] sm:max-w-[200px]">
                      {user?.firmName || 'Practice Management'}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  </div>
                </div>
              </Link>

              {/* Desktop Navigation Links */}
              <nav className="hidden lg:flex items-center gap-1 bg-slate-100/80 p-1 rounded-2xl border border-slate-200">
                {navLinks.map((link) => {
                  const isActive = pathname === link.href;
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-slate-900 text-white shadow-xs font-bold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                      }`}
                    >
                      {Icon && <Icon size={14} className={isActive ? 'text-emerald-400' : 'text-slate-500'} />}
                      <span>{link.label}</span>
                      {link.badge && (
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full font-bold border border-emerald-300">
                          {link.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>

              {/* User Info & Actions */}
              <div className="hidden lg:flex items-center gap-2.5">
                {user && (
                  <div className="flex items-center gap-2 bg-slate-100/70 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700">
                    <div className="w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center text-white font-bold text-xs">
                      {user.name?.charAt(0) || 'C'}
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="leading-tight font-bold text-slate-900 max-w-[120px] truncate">{user.name}</span>
                      <span className="text-[9px] text-slate-500 capitalize">
                        {role === 'superadmin' ? 'Master Admin' : role === 'sub_ca' ? 'Associate' : role === 'client' ? 'Taxpayer / Client' : 'Firm Admin'}
                      </span>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleLogout}
                  className="liquid-btn-logout font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut size={14} className="text-slate-500" />
                  <span>Sign Out</span>
                </button>
              </div>

              {/* Mobile Menu Toggle Button */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="lg:hidden p-2 text-slate-700 hover:text-slate-900 rounded-xl hover:bg-slate-100 border border-slate-200"
                aria-label="Toggle navigation menu"
              >
                {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>

            {/* Mobile Drawer Menu */}
            {isMenuOpen && (
              <div className="lg:hidden border-t border-slate-200 bg-white/95 backdrop-blur-md p-4 space-y-1.5 shadow-lg animate-in slide-in-from-top-2 duration-200">
                {user && (
                  <div className="p-3 mb-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white font-bold text-xs">
                      {user.name?.charAt(0) || 'C'}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-xs">{user.name}</div>
                      <div className="text-[10px] text-slate-500">{user.email}</div>
                    </div>
                  </div>
                )}

                {navLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsMenuOpen(false)}
                      className={`block px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                        pathname === link.href
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        {Icon && <Icon size={16} className={pathname === link.href ? 'text-emerald-400' : 'text-slate-500'} />}
                        <span>{link.label}</span>
                      </span>
                      {link.badge && (
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full font-bold">
                          {link.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}

                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 mt-2 flex items-center gap-2 border border-slate-200"
                >
                  <LogOut size={14} className="text-slate-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </header>
        )}

        {/* Main Content Area */}
        <main className={isAuthPage ? 'flex-1 w-full min-h-screen auth-page-bg flex flex-col justify-center' : 'flex-1 p-3.5 sm:p-6 md:p-8 max-w-7xl mx-auto w-full'}>
          {children}
        </main>

        {/* Clean Modern Footer */}
        {!isAuthPage && (
          <footer className="bg-white border-t border-slate-200 text-slate-500 text-xs py-8 mt-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
              <div>
                <span className="font-extrabold text-slate-900">Smart CA Vault</span> &copy; 2026 • Professional CA Document Management
              </div>
              <div className="flex items-center gap-3 font-medium text-[11px] text-slate-500">
                {role === 'superadmin' ? (
                  <Link href="/superadmin" className="text-emerald-700 font-bold hover:underline flex items-center gap-1.5">
                    <ShieldCheck size={13} />
                    <span>Super Admin Console</span>
                  </Link>
                ) : (
                  <Link href="/team" className="text-emerald-700 font-bold hover:underline flex items-center gap-1.5">
                    <Building2 size={13} />
                    <span>Firm Team & Sub-CAs</span>
                  </Link>
                )}
                <span>•</span>
                <span>Responsive Modern Edition</span>
              </div>
            </div>
          </footer>
        )}
      </body>
    </html>
  );
}
