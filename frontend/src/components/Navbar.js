import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Navbar.css';

function Navbar({ onLogout }) {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/dashboard" onClick={closeMenu}>📊 CA Document System</Link>
      </div>

      <button
        type="button"
        className="navbar-toggle"
        aria-label="Toggle navigation"
        aria-expanded={isMenuOpen}
        onClick={() => setIsMenuOpen(!isMenuOpen)}
      >
        ☰
      </button>

      <div className={`navbar-links ${isMenuOpen ? 'open' : ''}`}>
        <Link to="/dashboard" onClick={closeMenu}>Dashboard</Link>
        <Link to="/clients" onClick={closeMenu}>Clients</Link>
        <Link to="/add-client" onClick={closeMenu}>Add Client</Link>
        <Link to="/upload-document" onClick={closeMenu}>Upload Document</Link>
        <span className="user-name">👤 {user.name || 'CA User'}</span>
        <button onClick={handleLogout} className="logout-btn">Logout</button>
      </div>
    </nav>
  );
}

export default Navbar;
