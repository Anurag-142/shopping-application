import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function LoginPage() {
  const { login } = useAuth();
  const { refreshCart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.email || !form.password) { setError('Both fields are required.'); return; }
    setLoading(true);
    try {
      const data = await authService.login(form);
      login(data.token, data.user);
      await refreshCart();
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fk-auth-page">
      {/* Left panel */}
      <div className="fk-auth-left">
        <h2 className="fk-auth-left-title">Login</h2>
        <p className="fk-auth-left-sub">Get access to your Orders, Wishlist and Recommendations</p>
      </div>

      {/* Right panel — form */}
      <div className="fk-auth-right">
        <h3 className="fk-auth-form-title">Sign In</h3>
        {error && <div className="fk-alert fk-alert--danger">{error}</div>}
        <form onSubmit={handleSubmit} noValidate className="fk-auth-form">
          <div className="fk-field">
            <label className="fk-field-label">Email address</label>
            <input className="fk-field-input" type="email" name="email" value={form.email}
              onChange={handleChange} placeholder="you@example.com" autoFocus />
          </div>
          <div className="fk-field">
            <label className="fk-field-label">Password</label>
            <input className="fk-field-input" type="password" name="password" value={form.password}
              onChange={handleChange} placeholder="Your password" />
          </div>
          <p className="fk-auth-terms">
            By continuing, you agree to Flipkart's{' '}
            <span className="fk-auth-link">Terms of Use</span> and{' '}
            <span className="fk-auth-link">Privacy Policy</span>.
          </p>
          <button type="submit" className="fk-btn fk-btn-cart fk-auth-submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Login'}
          </button>
        </form>
        <p className="fk-auth-alt">
          New to Flipkart?{' '}
          <Link to="/signup" className="fk-auth-link">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
