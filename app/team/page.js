'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  UserPlus,
  Mail,
  Phone,
  Pencil,
  Trash2,
  AlertTriangle,
  Loader2,
  X
} from 'lucide-react';
import SubscriptionPausedBanner from '@/components/SubscriptionPausedBanner';

export default function TeamManagementPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [subCas, setSubCas] = useState([]);
  const [stats, setStats] = useState({ totalCount: 0, maxAllowed: 5, seatsRemaining: 5 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedSubCa, setSelectedSubCa] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    designation: 'Associate CA'
  });

  useEffect(() => {
    loadTeam();
  }, []);

  const loadTeam = async () => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const user = JSON.parse(userStr || '{}');
      setCurrentUser(user);

      if (user.role === 'sub_ca') {
        setError('Sub-CAs do not have permission to manage team members.');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/sub-cas', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to load team');
      }

      const data = await res.json();
      setSubCas(data.subCas || []);
      setStats({
        totalCount: data.totalCount || 0,
        maxAllowed: data.maxAllowed || 5,
        seatsRemaining: data.seatsRemaining || 0
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubCa = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/sub-cas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to add Sub-CA');

      setIsAddModalOpen(false);
      setFormData({
        name: '',
        email: '',
        phone: '',
        password: '',
        designation: 'Associate CA'
      });
      await loadTeam();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSubCa = async (e) => {
    e.preventDefault();
    if (!selectedSubCa) return;
    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/sub-cas/${selectedSubCa._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: selectedSubCa.name,
          email: selectedSubCa.email,
          phone: selectedSubCa.phone,
          status: selectedSubCa.status,
          password: selectedSubCa.newPassword || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update Sub-CA');

      setIsEditModalOpen(false);
      await loadTeam();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSubCa = async (subCa) => {
    if (!confirm(`Are you sure you want to remove Sub-CA "${subCa.name}" (${subCa.email})?`)) return;
    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/sub-cas/${subCa._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete Sub-CA');

      await loadTeam();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300 pb-12">
      {/* Subscription Paused Banner */}
      <SubscriptionPausedBanner user={currentUser} />

      {/* Header */}
      <div className="liquid-glass rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900 text-white font-extrabold text-[11px] uppercase tracking-wider">
              <Users size={12} />
              <span>Team & Sub-CAs</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold text-[11px] border border-emerald-200">
              {stats.totalCount} / {stats.maxAllowed} Seats Used
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-slate-900">
            Sub-CAs & Associate Team
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
            Grant your firm associates login credentials to manage client records and documents under your firm.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          disabled={stats.seatsRemaining <= 0 || currentUser?.isPaused}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl btn-primary text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <UserPlus size={15} />
          <span>Add Sub-CA Associate</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle size={15} className="text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Sub-CAs Table */}
      <div className="liquid-glass rounded-2xl sm:rounded-3xl border border-slate-200 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-white/70 flex items-center justify-between">
          <h3 className="font-extrabold text-sm text-slate-900">
            Active Team Members ({subCas.length})
          </h3>
          <span className="text-xs font-bold text-emerald-700">
            {stats.seatsRemaining} seats available
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
            <Loader2 size={24} className="animate-spin text-slate-700" />
            <span>Loading team members...</span>
          </div>
        ) : subCas.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs space-y-3">
            <p className="font-semibold text-slate-700">No Sub-CAs added yet.</p>
            <p className="text-slate-400">Click below to create login credentials for your first associate.</p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 rounded-xl btn-primary text-xs inline-flex items-center gap-1.5"
            >
              <UserPlus size={14} />
              <span>Add First Sub-CA</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[550px]">
              <thead className="bg-slate-100 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="p-4">Member Name</th>
                  <th className="p-4">Contact Info</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {subCas.map((subCa) => (
                  <tr key={subCa._id} className="hover:bg-slate-50 transition">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {subCa.name?.charAt(0) || 'S'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{subCa.name}</div>
                          <div className="text-[10px] text-slate-400">
                            Created {new Date(subCa.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="space-y-1">
                        <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <Mail size={13} className="text-slate-500" />
                          <span>{subCa.email}</span>
                        </div>
                        {subCa.phone && (
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                            <Phone size={12} className="text-slate-400" />
                            <span>{subCa.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="p-4">
                      <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 font-bold text-[10px] border border-slate-300">
                        Associate Sub-CA
                      </span>
                    </td>

                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        subCa.status === 'active'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                          : 'bg-slate-200 text-slate-800 border border-slate-300'
                      }`}>
                        {subCa.status}
                      </span>
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedSubCa(subCa);
                            setIsEditModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-xl btn-outline text-xs flex items-center gap-1"
                        >
                          <Pencil size={12} />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteSubCa(subCa)}
                          className="p-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-400 hover:text-rose-600 font-bold border border-slate-200 transition"
                          title="Delete Member"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Sub-CA Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 sm:p-7 max-w-md w-full border border-slate-200 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Add Sub-CA Member</h3>
                <p className="text-[11px] text-slate-500">Provide login credentials for your associate.</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleAddSubCa} className="space-y-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Login Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Initial Password *</label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Phone / WhatsApp</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl btn-primary disabled:opacity-50"
                >
                  {actionLoading ? 'Adding...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Sub-CA Modal */}
      {isEditModalOpen && selectedSubCa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 sm:p-7 max-w-md w-full border border-slate-200 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Edit Sub-CA Member</h3>
                <p className="text-[11px] text-slate-500">Update member credentials or status.</p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleEditSubCa} className="space-y-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Full Name</label>
                <input
                  type="text"
                  required
                  value={selectedSubCa.name || ''}
                  onChange={(e) => setSelectedSubCa({ ...selectedSubCa, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Email</label>
                <input
                  type="email"
                  required
                  value={selectedSubCa.email || ''}
                  onChange={(e) => setSelectedSubCa({ ...selectedSubCa, email: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Phone</label>
                <input
                  type="tel"
                  value={selectedSubCa.phone || ''}
                  onChange={(e) => setSelectedSubCa({ ...selectedSubCa, phone: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Reset Password (Optional)</label>
                <input
                  type="password"
                  placeholder="Leave empty to keep current"
                  value={selectedSubCa.newPassword || ''}
                  onChange={(e) => setSelectedSubCa({ ...selectedSubCa, newPassword: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl btn-primary disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
