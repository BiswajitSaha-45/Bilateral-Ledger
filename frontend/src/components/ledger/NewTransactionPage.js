import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usersAPI } from '../../utils/api';
import { useTransactions } from '../../hooks/useTransactions';
import toast from 'react-hot-toast';

function debounce(fn, delay) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
}

export default function NewTransactionPage() {
  const navigate = useNavigate();
  const { createTransaction } = useTransactions();
  const [form, setForm] = useState({ counterparty_username: '', amount: '', transaction_type: 'credit', description: '' });
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const doSearch = useCallback(debounce(async (q) => {
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await usersAPI.search(q);
      setSearchResults(res.data.users);
    } catch { /* silent */ }
    finally { setSearching(false); }
  }, 300), []);

  const handleSearchChange = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (selectedUser) { setSelectedUser(null); setForm(f => ({ ...f, counterparty_username: '' })); }
    doSearch(q);
  };

  const selectUser = (u) => {
    setSelectedUser(u);
    setSearchQuery(u.display_name || u.username);
    setForm(f => ({ ...f, counterparty_username: u.username }));
    setSearchResults([]);
  };

  const clearUser = () => {
    setSelectedUser(null);
    setSearchQuery('');
    setForm(f => ({ ...f, counterparty_username: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) { toast.error('Please select a counterparty'); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { toast.error('Enter a valid amount'); return; }
    setSubmitting(true);
    try {
      const txn = await createTransaction(form);
      navigate(`/ledger/${txn.id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create transaction');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="new-txn-page">
      <div className="new-txn-header">
        <button className="btn-back" onClick={() => navigate(-1)}>← Back</button>
        <h2 className="page-title">New Ledger Entry</h2>
      </div>

      <div className="new-txn-card">
        <form onSubmit={handleSubmit} className="new-txn-form">
          <div className="form-field">
            <label className="form-label">Counterparty</label>
            <p className="form-hint">Search by name or username</p>
            <div className="search-wrapper">
              <input className="form-input" type="text" value={searchQuery}
                onChange={handleSearchChange} placeholder="Search users..." autoComplete="off" />
              {searching && <div className="search-spinner">...</div>}
              {searchResults.length > 0 && (
                <div className="search-dropdown">
                  {searchResults.map(u => (
                    <div key={u.id} className="search-dropdown-item" onClick={() => selectUser(u)}>
                      <div className="user-avatar user-avatar-sm">{u.display_name?.[0]?.toUpperCase()}</div>
                      <div>
                        <div className="dropdown-name">{u.display_name}</div>
                        <div className="dropdown-handle">@{u.username}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {selectedUser && (
              <div className="selected-user">
                <div className="user-avatar user-avatar-sm">{selectedUser.display_name?.[0]?.toUpperCase()}</div>
                <div>
                  <div className="selected-user-name">{selectedUser.display_name}</div>
                  <div className="selected-user-handle">@{selectedUser.username}</div>
                </div>
                <button type="button" className="clear-user-btn" onClick={clearUser}>×</button>
              </div>
            )}
          </div>

          <div className="form-field">
            <label className="form-label">Amount (₹)</label>
            <input className="form-input form-input-lg" type="number" min="0.01" step="0.01"
              value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="0.00" required />
          </div>

          <div className="form-field">
            <label className="form-label">Transaction Type</label>
            <div className="type-toggle">
              <button type="button"
                className={`type-btn ${form.transaction_type === 'credit' ? 'type-credit' : ''}`}
                onClick={() => setForm(f => ({ ...f, transaction_type: 'credit' }))}>
                <span className="type-btn-icon">↑</span>
                <div>
                  <div className="type-btn-label">Credit (I Lent)</div>
                  <div className="type-btn-desc">They owe you money</div>
                </div>
              </button>
              <button type="button"
                className={`type-btn ${form.transaction_type === 'debit' ? 'type-debit' : ''}`}
                onClick={() => setForm(f => ({ ...f, transaction_type: 'debit' }))}>
                <span className="type-btn-icon">↓</span>
                <div>
                  <div className="type-btn-label">Debit (I Borrowed)</div>
                  <div className="type-btn-desc">You owe them money</div>
                </div>
              </button>
            </div>
          </div>

          <div className="form-field">
            <label className="form-label">Description <span className="form-optional">(optional)</span></label>
            <textarea className="form-textarea" value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="e.g. Dinner, electricity bill split..." rows={3} />
          </div>

          {selectedUser && form.amount && (
            <div className="txn-summary">
              <div className="txn-summary-text">
                {form.transaction_type === 'credit'
                  ? `You lent ₹${parseFloat(form.amount || 0).toFixed(2)} to ${selectedUser.display_name}. They must confirm.`
                  : `You borrowed ₹${parseFloat(form.amount || 0).toFixed(2)} from ${selectedUser.display_name}. They must confirm.`}
              </div>
            </div>
          )}

          <button className="btn-primary btn-primary-lg" type="submit" disabled={submitting || !selectedUser}>
            {submitting ? 'Creating...' : 'Create Entry → Pending Confirmation'}
          </button>
        </form>
      </div>
    </div>
  );
}