from database import db
from datetime import datetime
from enum import Enum as PyEnum
import sqlalchemy as sa


class TransactionStatus(str, PyEnum):
    PENDING = 'pending'
    CONFIRMED = 'confirmed'
    REJECTED = 'rejected'


class TransactionType(str, PyEnum):
    CREDIT = 'credit'
    DEBIT = 'debit'


class Transaction(db.Model):
    __tablename__ = 'transactions'

    id = db.Column(db.Integer, primary_key=True)
    initiator_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    counterparty_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    transaction_type = db.Column(
        sa.Enum(TransactionType, name='transaction_type_enum'), nullable=False
    )
    description = db.Column(db.String(500), nullable=True)
    status = db.Column(
        sa.Enum(TransactionStatus, name='transaction_status_enum'),
        default=TransactionStatus.PENDING, nullable=False
    )
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    confirmed_at = db.Column(db.DateTime, nullable=True)
    rejected_at = db.Column(db.DateTime, nullable=True)
    rejection_reason = db.Column(db.String(500), nullable=True)

    __table_args__ = (
        db.CheckConstraint('initiator_id != counterparty_id', name='no_self_transaction'),
    )

    def to_dict(self, current_user_id=None):
        data = {
            'id': self.id,
            'initiator_id': self.initiator_id,
            'counterparty_id': self.counterparty_id,
            'initiator': self.initiator.to_dict() if self.initiator else None,
            'counterparty': self.counterparty.to_dict() if self.counterparty else None,
            'amount': float(self.amount),
            'transaction_type': self.transaction_type.value,
            'description': self.description,
            'status': self.status.value,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'confirmed_at': self.confirmed_at.isoformat() if self.confirmed_at else None,
            'rejected_at': self.rejected_at.isoformat() if self.rejected_at else None,
            'rejection_reason': self.rejection_reason,
        }
        if current_user_id:
            data['is_initiator'] = self.initiator_id == current_user_id
            data['can_confirm'] = (
                self.status == TransactionStatus.PENDING
                and self.counterparty_id == current_user_id
            )
        return data