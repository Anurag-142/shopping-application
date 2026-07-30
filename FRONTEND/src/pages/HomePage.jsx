import React from 'react';
import { Link } from 'react-router-dom';

const CATEGORIES = [
  { label: 'Electronics',       icon: '📱', color: '#e3f2fd' },
  { label: 'Clothing',          icon: '👕', color: '#fce4ec' },
  { label: 'Books',             icon: '📚', color: '#e8f5e9' },
  { label: 'Home & Kitchen',    icon: '🏠', color: '#fff8e1' },
  { label: 'Sports & Outdoors', icon: '⚽', color: '#f3e5f5' },
];

const OFFERS = [
  { label: 'Electronics',    discount: 'Up to 60% off', bg: '#2874f0', text: '#fff' },
  { label: 'Fashion',        discount: 'Min 50% off',   bg: '#ff6161', text: '#fff' },
  { label: 'Home & Kitchen', discount: 'Up to 45% off', bg: '#388e3c', text: '#fff' },
  { label: 'Books',          discount: 'Up to 30% off', bg: '#fb641b', text: '#fff' },
];

export default function HomePage() {
  return (
    <div className="fk-home">

      {/* ── Hero banner ── */}
      <div className="fk-hero">
        <div className="fk-hero-content">
          <p className="fk-hero-tag">India's #1 Shopping Destination</p>
          <h1 className="fk-hero-title">Big Billion Days Sale</h1>
          <p className="fk-hero-sub">Unbeatable prices on Electronics, Fashion, Home & more</p>
          <Link to="/products" className="fk-hero-cta">Shop Now</Link>
        </div>
        <div className="fk-hero-art">
          <div className="fk-hero-badge">UP TO<br /><span>80%</span><br />OFF</div>
        </div>
      </div>

      {/* ── Offer strips ── */}
      <div className="fk-offers-row">
        {OFFERS.map((o) => (
          <Link key={o.label} to="/products" className="fk-offer-tile" style={{ background: o.bg, color: o.text }}>
            <span className="fk-offer-label">{o.label}</span>
            <span className="fk-offer-disc">{o.discount}</span>
          </Link>
        ))}
      </div>

      {/* ── Category tiles ── */}
      <div className="fk-section">
        <h2 className="fk-section-title">Shop by Category</h2>
        <div className="fk-cat-grid">
          {CATEGORIES.map((c) => (
            <Link key={c.label} to="/products" className="fk-cat-tile" style={{ background: c.color }}>
              <span className="fk-cat-icon">{c.icon}</span>
              <span className="fk-cat-label">{c.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Trust badges ── */}
      <div className="fk-trust-row">
        {[
          { icon: '🔒', title: 'Secure Checkout',  sub: 'JWT auth + bcrypt encryption' },
          { icon: '🚀', title: 'Fast Delivery',     sub: 'Same-day dispatch on most orders' },
          { icon: '↩️', title: '30-Day Returns',    sub: 'Hassle-free return policy' },
          { icon: '💬', title: '24/7 Support',      sub: 'We are always here to help' },
        ].map((t) => (
          <div key={t.title} className="fk-trust-tile">
            <span className="fk-trust-icon">{t.icon}</span>
            <span className="fk-trust-title">{t.title}</span>
            <span className="fk-trust-sub">{t.sub}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
