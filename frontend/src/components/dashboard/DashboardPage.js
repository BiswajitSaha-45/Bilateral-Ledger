import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { transactionsAPI } from '../../utils/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const { user } = useAuth();
  const [partners, setPartners] = useState([]);
  const [pendingTxns, setPendingTxns] = useState([]);
  const [stats, setStats] = useState({ totalOwed: 0, totalOwe: 0, pendingCount: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [partnersRes, pendingRes] = await Promise.all([
          transactionsAPI.getPartners(),
          transactionsAPI.list({ status: 'pending', per_page: 5 }),
        ]);
        const p = partnersRes.data.partners;
        setPartners(p);
        setPendingTxns(pendingRes.data.transactions);
        setStats({
          totalOwed: p.filter(x => x.balance > 0).reduce((s, x) => s + x.balance, 0),
          totalOwe:  p.filter(x => x.balance < 0).reduce((s, x) => s + Math.abs(x.balance), 0),
          pendingCount: p.reduce((s, x) => s + x.pending_count, 0),
        });
      } catch { toast.error('Failed to load dashboard'); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) return <div className="loading-screen">Loading dashboard...</div>;

  return (
    <div className="dashboard-page">
      <div>
        <h2 className="dashboard-welcome-text">Good day, <span>{user?.display_name || user?.username}</span> 👋</h2>
        <p className="dashboard-welcome-sub">Here's your financial overview</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-card-owed">
          <div className="stat-label">You are owed</div>
          <div className="stat-value">₹{stats.totalOwed.toFixed(2)}</div>
          <div className="stat-meta">{partners.filter(p => p.balance > 0).length} people owe you</div>
        </div>
        <div className="stat-card stat-card-owe">
          <div className="stat-label">You owe</div>
          <div className="stat-value">₹{stats.totalOwe.toFixed(2)}</div>
          <div className="stat-meta">to {partners.filter(p => p.balance < 0).length} people</div>
        </div>
        <div className="stat-card stat-card-pending">
          <div className="stat-label">Pending</div>
          <div className="stat-value">{stats.pendingCount}</div>
          <div className="stat-meta">awaiting confirmation</div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="section-card">
          <div className="section-header">
            <h3 className="section-title">People</h3>
            <Link to="/ledger" className="section-see-all">See all →</Link>
          </div>
          {partners.length === 0 ? (
            <div className="empty-state">
              <p>No transactions yet.</p>
              <Link to="/ledger/new" className="empty-state-link">Create your first entry →</Link>
            </div>
          ) : (
            <div className="partner-list">
              {partners.slice(0, 6).map(p => (
                <Link to={`/ledger?partner_id=${p.id}`} key={p.id} className="partner-row">
                  <div className="user-avatar user-avatar-md">{p.display_name?.[0]?.toUpperCase()}</div>
                  <div className="partner-info">
                    <div className="partner-name">{p.display_name}</div>
                    <div className="partner-handle">@{p.username}</div>
                  </div>
                  <div className="partner-right">
                    <div className={`partner-balance ${p.balance > 0 ? 'text-positive' : p.balance < 0 ? 'text-negative' : 'text-neutral'}`}>
                      {p.balance > 0 ? '+' : ''}{p.balance.toFixed(2)}
                    </div>
                    {p.pending_count > 0 && <div className="partner-pending">{p.pending_count} pending</div>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="section-card">
          <div className="section-header">
            <h3 className="section-title">Needs Action</h3>
            <Link to="/ledger?status=pending" className="section-see-all">See all →</Link>
          </div>
          {pendingTxns.length === 0 ? (
            <div className="empty-state"><p>No pending transactions.</p></div>
          ) : (
            <div className="pending-list">
              {pendingTxns.map(t => (
                <Link to={`/ledger/${t.id}`} key={t.id} className="pending-row">
                  <div className="pending-left">
                    <div className="pending-parties">
                      <span>{t.initiator?.display_name}</span>
                      <span className="pending-arrow">→</span>
                      <span>{t.counterparty?.display_name}</span>
                    </div>
                    <div className="pending-desc">{t.description || 'No description'}</div>
                    <div className="pending-date">{format(new Date(t.created_at), 'dd MMM yyyy')}</div>
                  </div>
                  <div className="pending-right">
                    <div className={`pending-amount ${t.transaction_type === 'credit' ? 'text-positive' : 'text-negative'}`}>
                      ₹{t.amount.toFixed(2)}
                    </div>
                    {t.can_confirm && <div className="pending-action-needed">Action needed</div>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}