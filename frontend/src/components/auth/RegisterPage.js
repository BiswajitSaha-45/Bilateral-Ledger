import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', display_name: '', password: '', confirm_password: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm_password) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      await register(form);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo-area">
          <div className="auth-logo-icon">₹</div>
          <h1 className="auth-logo-text">BiLedger</h1>
          <p className="auth-tagline">Create your account</p>
        </div>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-row">
            <div className="form-field">
              <label className="form-label">Username</label>
              <input className="form-input" type="text" name="username"
                value={form.username} onChange={handleChange} placeholder="unique_username" required autoFocus />
            </div>
            <div className="form-field">
              <label className="form-label">Display Name</label>
              <input className="form-input" type="text" name="display_name"
                value={form.display_name} onChange={handleChange} placeholder="Your full name" />
            </div>
          </div>
          <div className="form-field">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" name="email"
              value={form.email} onChange={handleChange} placeholder="you@example.com" required />
          </div>
          <div className="auth-row">
            <div className="form-field">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" name="password"
                value={form.password} onChange={handleChange} placeholder="Min 6 characters" required />
            </div>
            <div className="form-field">
              <label className="form-label">Confirm Password</label>
              <input className="form-input" type="password" name="confirm_password"
                value={form.confirm_password} onChange={handleChange} placeholder="Re-enter password" required />
            </div>
          </div>
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
      </div>
    </div>
  );
}