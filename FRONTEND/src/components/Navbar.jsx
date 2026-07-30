import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { authService } from '../services/authService';

export default function Navbar() {
  const { isAuthenticated, isAdmin, logout, user } = useAuth();
  const { itemCount, clearCart } = useCart();
  const navigate = useNavigate();

  async function handleLogout() {
    try { await authService.logout(); } catch { /* ignore */ }
    logout();
    clearCart();
    navigate('/');
  }

  return (
    <header className="fk-navbar">
      <div className="fk-navbar-inner">

        {/* Logo */}
        <Link to="/" className="fk-nav-logo">
          <span className="fk-nav-logo-text">Flipkart</span>
          <span className="fk-nav-logo-sub">
            <em>Explore</em>&nbsp;
            <span className="fk-nav-logo-plus">Plus</span>
          </span>
        </Link>

        {/* Search bar */}
        <div className="fk-nav-search">
          <input
            className="fk-nav-search-input"
            placeholder="Search for products, brands and more"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.target.value.trim()) {
                navigate(`/products?q=${encodeURIComponent(e.target.value.trim())}`);
              }
            }}
          />
          <button className="fk-nav-search-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </button>
        </div>

        {/* Right nav */}
        <nav className="fk-nav-right">
          {isAuthenticated ? (
            <>
              <div className="fk-nav-dropdown-wrap">
                <button className="fk-nav-btn fk-nav-btn--white">
                  {user?.name?.split(' ')[0]} ▾
                </button>
                <div className="fk-nav-dropdown">
                  {isAdmin && (
                    <Link to="/admin" className="fk-nav-dropdown-item">Admin Panel</Link>
                  )}
                  <Link to="/orders" className="fk-nav-dropdown-item">My Orders</Link>
                  <div className="fk-nav-dropdown-divider" />
                  <button className="fk-nav-dropdown-item fk-nav-dropdown-item--btn" onClick={handleLogout}>
                    Logout
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="fk-nav-btn fk-nav-btn--white">Login</Link>
              <Link to="/signup" className="fk-nav-btn fk-nav-btn--yellow">Sign Up</Link>
            </>
          )}

          <Link to="/cart" className="fk-nav-cart">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 01-8 0"/>
            </svg>
            <span className="fk-nav-cart-label">Cart</span>
            {itemCount > 0 && <span className="fk-nav-cart-badge">{itemCount}</span>}
          </Link>
        </nav>
      </div>
    </header>
  );
}
