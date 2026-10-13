/**
 * Navbar.jsx — Main navigation bar
 */
import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="navbar">
      <Link to="/dashboard" className="nav-brand">
        <div className="brand-icon">C</div>
        <span>Center<span className="gradient-text">Align</span></span>
      </Link>

      <nav className="nav-links">
        <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          Operator Dashboard
        </NavLink>
        <NavLink to="/claims" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          Finance Portal
        </NavLink>
        <NavLink to="/claims/new" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          Submit Claim
        </NavLink>
        <NavLink to="/report" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          Run Report
        </NavLink>
      </nav>

      <div className="nav-user">
        {user ? (
          <>
            <div className="user-badge">
              <div className="user-avatar">{user.username ? user.username[0].toUpperCase() : 'U'}</div>
              <span>{user.username}</span>
            </div>
            <button onClick={handleLogout} className="btn btn-secondary btn-sm" id="logout-btn">
              Logout
            </button>
          </>
        ) : (
          <Link to="/login" className="btn btn-primary btn-sm">
            Login
          </Link>
        )}
      </div>
    </header>
  );
}

export default Navbar;
