import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { useAuth } from '../context/AuthContext';

export default function SignupPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setFieldErrors((p) => ({ ...p, [e.target.name]: '' }));
    setApiError('');
  }

  function validate() {
    const e = {};
    if (!form.name || form.name.trim().length < 2) e.name = 'Name must be at least 2 characters.';
    if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Valid email is required.';
    if (!form.password || form.password.length < 8) e.password = 'Password must be at least 8 characters.';
    else if (!/[A-Z]/.test(form.password)) e.password = 'Password needs at least one uppercase letter.';
    else if (!/[a-z]/.test(form.password)) e.password = 'Password needs at least one lowercase letter.';
    else if (!/\d/.test(form.password)) e.password = 'Password needs at least one digit.';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match.';
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }
    setLoading(true);
    try {
      const data = await authService.signup({ name: form.name.trim(), email: form.email, password: form.password });
      login(data.token, data.user);
      navigate('/products');
    } catch (err) {
      setApiError(err.response?.data?.errors?.[0]?.msg || err.response?.data?.error || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  }

  function Field({ label, name, type = 'text', placeholder }) {
    return (
      <div className="fk-field">
        <label className="fk-field-label">{label}</label>
        <input className={`fk-field-input${fieldErrors[name] ? ' fk-field-input--err' : ''}`}
          type={type} name={name} value={form[name]} onChange={handleChange} placeholder={placeholder} />
        {fieldErrors[name] && <span className="fk-field-err">{fieldErrors[name]}</span>}
      </div>
    );
  }

  return (
    <div className="fk-auth-page">
      {/* Left panel */}
      <div className="fk-auth-left">
        <h2 className="fk-auth-left-title">Create Account</h2>
        <p className="fk-auth-left-sub">Shop smarter. Track orders. Get exclusive deals.</p>
      </div>

      {/* Right panel */}
      <div className="fk-auth-right">
        <h3 className="fk-auth-form-title">Create Account</h3>
        {apiError && <div className="fk-alert fk-alert--danger">{apiError}</div>}
        <form onSubmit={handleSubmit} noValidate className="fk-auth-form">
          <Field label="Full Name"       name="name"            placeholder="Jane Doe" />
          <Field label="Email address"   name="email"           type="email"    placeholder="you@example.com" />
          <Field label="Password"        name="password"        type="password" placeholder="Min. 8 chars, upper, lower, digit" />
          <Field label="Confirm Password" name="confirmPassword" type="password" placeholder="Repeat your password" />
          <button type="submit" className="fk-btn fk-btn-cart fk-auth-submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>
        <p className="fk-auth-alt">
          Already have an account? <Link to="/login" className="fk-auth-link">Login</Link>
        </p>
      </div>
    </div>
  );
}
