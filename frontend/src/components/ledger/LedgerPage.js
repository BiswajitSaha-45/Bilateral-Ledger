import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTransactions } from '../../hooks/useTransactions';
import { format } from 'date-fns';

const STATUS_TABS = ['all', 'pending', 'confirmed', 'rejected'];

export default function LedgerPage() {
  const [searchParams] = useSearchParams();
  const partnerIdParam = searchParams.get('partner_id');
  const statusParam = searchParams.get('status');
  const [activeStatus, setActiveStatus] = useState(statusParam || 'all');
  const [page, setPage] = useState(1);
  const { transactions, loading, pagination, fetchTransactions } = useTransactions();

  useEffect(() => {
    const params = { page, per_page: 20 };
    if (activeStatus !== 'all') params.status = activeStatus;
    if (partnerIdParam) params.partner_id = partnerIdParam;
    fetchTransactions(params);
  }, [activeStatus, page, partnerIdParam, fetchTransactions]);

  return (
    <div className="ledger-page">
      <div className="page-header">
        <h2 className="page-title">Ledger</h2>
        <Link to="/ledger/new" className="btn-new">+ New Entry</Link>
      </div>

      <div className="status-tabs">
        {STATUS_TABS.map(s => (
          <button key={s} className={`tab-btn ${activeStatus === s ? 'active' : ''}`}
            onClick={() => { setActiveStatus(s); setPage(1); }}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>Loading transactions...</div>
      ) : transactions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <p>No transactions found</p>
          <Link to="/ledger/new" className="empty-state-link">Create your first entry →</Link>
        </div>
      ) : (
        <>
          <div className="ledger-table">
            <div className="table-header">
              <span>From → To</span><span>Description</span><span>Amount</span><span>Status</span><span>Date</span>
            </div>
            {transactions.map(t => (
              <Link to={`/ledger/${t.id}`} key={t.id} className="table-row">
                <span className="row-parties">
                  <span className="row-party-name">{t.initiator?.display_name}</span>
                  <span className="row-party-arrow">→</span>
                  <span className="row-party-name">{t.counterparty?.display_name}</span>
                </span>
                <span className="row-desc">{t.description || <em>No description</em>}</span>
                <span className={`row-amount ${t.transaction_type === 'credit' ? 'row-amount-credit' : 'row-amount-debit'}`}>
                  {t.transaction_type === 'credit' ? '+' : '-'}₹{t.amount.toFixed(2)}
                  <small className="row-type-label">{t.transaction_type}</small>
                </span>
                <span><span className={`badge badge-${t.status}`}>{t.status}</span></span>
                <span className="row-date">{format(new Date(t.created_at), 'dd MMM yy')}</span>
              </Link>
            ))}
          </div>
          {pagination.pages > 1 && (
            <div className="pagination">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="page-btn">← Prev</button>
              <span className="page-info">{page} / {pagination.pages}</span>
              <button disabled={page === pagination.pages} onClick={() => setPage(p => p + 1)} className="page-btn">Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}