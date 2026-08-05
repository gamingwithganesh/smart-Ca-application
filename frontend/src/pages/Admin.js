import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './Admin.css';

const API = process.env.REACT_APP_API_URL || 'https://ca-backend-cqed.onrender.com/api';
const ADMIN_HEADERS = { 'x-admin-password': 'zintechca' };

function Admin() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetail, setUserDetail] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '' });
  const [msg, setMsg] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/users`, { headers: ADMIN_HEADERS });
      setUsers(res.data.users);
    } catch {
      setMsg('Failed to load users');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authed) fetchUsers();
  }, [authed, fetchUsers]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === 'zintechca') {
      setAuthed(true);
      setAuthError('');
    } else {
      setAuthError('Wrong password');
    }
  };

  const handleViewDetail = async (userId) => {
    setSelectedUser(userId);
    try {
      const res = await axios.get(`${API}/admin/users/${userId}`, { headers: ADMIN_HEADERS });
      setUserDetail(res.data);
    } catch {
      setMsg('Failed to load user details');
    }
  };

  const handleDelete = async (userId, userName) => {
    if (!window.confirm(`Delete user "${userName}" and ALL their data? This cannot be undone.`)) return;
    try {
      await axios.delete(`${API}/admin/users/${userId}`, { headers: ADMIN_HEADERS });
      setMsg(`User "${userName}" deleted successfully`);
      setSelectedUser(null);
      setUserDetail(null);
      fetchUsers();
    } catch {
      setMsg('Failed to delete user');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/admin/users`, newUser, { headers: ADMIN_HEADERS });
      setMsg(`User "${newUser.name}" created successfully`);
      setNewUser({ name: '', email: '', password: '' });
      setShowCreate(false);
      fetchUsers();
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to create user');
    }
  };

  // ── Login screen ──────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="admin-login">
        <div className="admin-login-card">
          <div className="admin-logo">🔐</div>
          <h1>Admin Panel</h1>
          <p>ZintechCA Management</p>
          {authError && <div className="admin-error">{authError}</div>}
          <form onSubmit={handleLogin}>
            <input
              type="password"
              placeholder="Enter admin password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoFocus
            />
            <button type="submit">Login</button>
          </form>
        </div>
      </div>
    );
  }

  // ── Main admin panel ──────────────────────────────────────────────────────
  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>🛠 Admin Panel</h1>
        <div className="admin-header-right">
          <button className="btn-create" onClick={() => setShowCreate(!showCreate)}>
            + New User
          </button>
          <button className="btn-logout" onClick={() => setAuthed(false)}>Logout</button>
        </div>
      </div>

      {msg && (
        <div className="admin-msg" onClick={() => setMsg('')}>{msg} ✕</div>
      )}

      {/* Create user form */}
      {showCreate && (
        <div className="admin-card create-form">
          <h3>Create New User</h3>
          <form onSubmit={handleCreate}>
            <div className="form-row">
              <input
                placeholder="Full Name"
                value={newUser.name}
                onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={newUser.email}
                onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={newUser.password}
                onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                required
              />
              <button type="submit" className="btn-save">Create</button>
              <button type="button" className="btn-cancel" onClick={() => setShowCreate(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="admin-body">
        {/* Users list */}
        <div className="admin-card users-list">
          <h3>Users ({users.length})</h3>
          {loading ? (
            <p className="loading">Loading...</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Clients</th>
                  <th>Docs</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id} className={selectedUser === u._id ? 'selected' : ''}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td><span className="badge blue">{u.clientCount}</span></td>
                    <td><span className="badge green">{u.docCount}</span></td>
                    <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button className="btn-view" onClick={() => handleViewDetail(u._id)}>View</button>
                      <button className="btn-del" onClick={() => handleDelete(u._id, u.name)}>Delete</button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan="6" className="empty">No users found</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* User detail panel */}
        {userDetail && (
          <div className="admin-card user-detail">
            <div className="detail-header">
              <h3>👤 {userDetail.user.name}</h3>
              <button className="btn-close" onClick={() => { setSelectedUser(null); setUserDetail(null); }}>✕</button>
            </div>
            <p className="detail-email">{userDetail.user.email}</p>
            <div className="detail-stats">
              <div className="stat-box">
                <span className="stat-num">{userDetail.clients.length}</span>
                <span className="stat-label">Clients</span>
              </div>
              <div className="stat-box">
                <span className="stat-num">{userDetail.docCount}</span>
                <span className="stat-label">Documents</span>
              </div>
            </div>
            <h4>Clients</h4>
            {userDetail.clients.length === 0 ? (
              <p className="empty">No clients yet</p>
            ) : (
              <ul className="client-list">
                {userDetail.clients.map(c => (
                  <li key={c._id}>
                    <span className="client-name">{c.name}</span>
                    <span className="client-num">{c.whatsappNumber}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Admin;
