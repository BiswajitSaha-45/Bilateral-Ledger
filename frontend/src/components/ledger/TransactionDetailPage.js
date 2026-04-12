import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { transactionsAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function TransactionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [txn, setTxn] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    transactionsAPI.get(id)
      .then(res => setTxn(res.data.transaction))
      .catch(() => toast.error('Transaction not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleConfirm = async () => {
    setActionLoading(true);
    try {
      const res = await transactionsAPI.confirm(id);
      setTxn(res.data.transaction);
      toast.success('Transaction confirmed!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to confirm');
    } finally { setActionLoading(false); }
  };

  const handleReject = async () => {
    setActionLoading(true);
    try {
      const res = await transactionsAPI.reject(id, rejectReason);
      setTxn(res.data.transaction);
      setShowRejectModal(false);
      toast.success('Transaction rejected.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reject');
    } finally { setActionLoading(false); }
  };

  if (loading) return <div className="loading-screen">Loading...</div>;
  if (!txn) return <div className="loading-screen">Transaction not found.</div>;

  const canConfirm = txn.can_confirm;
  const canReject = txn.status === 'pending' && (txn.initiator_id === user?.id || txn.counterparty_id === user?.id);

  return (
    <div className="detail-page">
      <div className="detail-top-nav">
        <button className="btn-back" onClick={() => navigate(-1)}>← Back</button>
        <span className={`badge badge-${txn.status}`}>{txn.status}</span>
      </div>

      <div className="detail-card">
        <div className="detail-amount-hero">
          <div className="detail-type-tag">{txn.transaction_type === 'credit' ? 'Credit (Lent)' : 'Debit (Borrowed)'}</div>
          <div className={`detail-amount ${txn.transaction_type === 'credit' ? 'detail-amount-credit' : 'detail-amount-debit'}`}>
            ₹{txn.amount.toFixed(2)}
          </div>
          {txn.description && <div className="detail-description">"{txn.description}"</div>}
        </div>

        <div className="detail-parties">
          <div className="detail-party">
            <div className="user-avatar user-avatar-lg">{txn.initiator?.display_name?.[0]?.toUpperCase()}</div>
            <div>
              <div className="detail-party-name">{txn.initiator?.display_name}</div>
              <div className="detail-party-role">Initiator {txn.initiator_id === user?.id && '(You)'}</div>
            </div>
          </div>
          <div className="detail-party-arrow">→</div>
          <div className="detail-party">
            <div className="user-avatar user-avatar-lg">{txn.counterparty?.display_name?.[0]?.toUpperCase()}</div>
            <div>
              <div className="detail-party-name">{txn.counterparty?.display_name}</div>
              <div className="detail-party-role">Counterparty {txn.counterparty_id === user?.id && '(You)'}</div>
            </div>
          </div>
        </div>

        <div className="detail-timeline">
          <div className="timeline-item">
            <div className="timeline-dot" />
            <div>
              <div className="timeline-label">Created</div>
              <div className="timeline-date">{format(new Date(txn.created_at), 'dd MMM yyyy, HH:mm')}</div>
            </div>
          </div>
          {txn.confirmed_at && (
            <div className="timeline-item">
              <div className="timeline-dot timeline-dot-success" />
              <div>
                <div className="timeline-label">Confirmed</div>
                <div className="timeline-date">{format(new Date(txn.confirmed_at), 'dd MMM yyyy, HH:mm')}</div>
              </div>
            </div>
          )}
          {txn.rejected_at && (
            <div className="timeline-item">
              <div className="timeline-dot timeline-dot-danger" />
              <div>
                <div className="timeline-label">Rejected</div>
                <div className="timeline-date">{format(new Date(txn.rejected_at), 'dd MMM yyyy, HH:mm')}</div>
                {txn.rejection_reason && <div className="timeline-reject-reason">Reason: {txn.rejection_reason}</div>}
              </div>
            </div>
          )}
        </div>

        <div className="detail-meta">
          <div className="meta-item"><span className="meta-key">Transaction ID</span><span className="meta-val">#{txn.id}</span></div>
          <div className="meta-item"><span className="meta-key">Type</span><span className="meta-val">{txn.transaction_type}</span></div>
          <div className="meta-item"><span className="meta-key">Status</span><span className="meta-val">{txn.status}</span></div>
        </div>

        {txn.status === 'pending' && (
          <div className="detail-actions">
            {canConfirm && <button className="btn-success" onClick={handleConfirm} disabled={actionLoading}>{actionLoading ? 'Processing...' : '✓ Confirm Transaction'}</button>}
            {canReject  && <button className="btn-danger"  onClick={() => setShowRejectModal(true)} disabled={actionLoading}>✕ Reject</button>}
            {!canConfirm && !canReject && <div className="detail-waiting">Waiting for counterparty to confirm...</div>}
          </div>
        )}
      </div>

      {showRejectModal && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Reject Transaction</h3>
            <p className="modal-desc">Provide a reason for rejection (optional)</p>
            <textarea className="form-textarea" value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="e.g. Amount is incorrect, this transaction didn't happen..."
              rows={3} style={{ marginBottom: '16px' }} />
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setShowRejectModal(false)}>Cancel</button>
              <button className="btn-modal-danger" onClick={handleReject} disabled={actionLoading}>
                {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}