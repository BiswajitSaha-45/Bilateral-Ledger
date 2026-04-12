from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import or_, and_
from database import db
from models.transaction import Transaction, TransactionStatus, TransactionType
from models.user import User
from datetime import datetime

transactions_bp = Blueprint('transactions', __name__)


def get_balance_with_user(current_user_id, other_user_id):
    confirmed = Transaction.query.filter(
        Transaction.status == TransactionStatus.CONFIRMED,
        or_(
            and_(Transaction.initiator_id == current_user_id, Transaction.counterparty_id == other_user_id),
            and_(Transaction.initiator_id == other_user_id, Transaction.counterparty_id == current_user_id)
        )
    ).all()

    balance = 0.0
    for t in confirmed:
        amount = float(t.amount)
        if t.initiator_id == current_user_id:
            if t.transaction_type == TransactionType.CREDIT:
                balance += amount
            else:
                balance -= amount
        else:
            if t.transaction_type == TransactionType.CREDIT:
                balance -= amount
            else:
                balance += amount
    return balance


@transactions_bp.route('/', methods=['POST'])
@jwt_required()
def create_transaction():
    current_user_id = int(get_jwt_identity())
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    counterparty_username = data.get('counterparty_username', '').strip()
    amount = data.get('amount')
    transaction_type = data.get('transaction_type')
    description = data.get('description', '').strip()

    if not counterparty_username or not amount or not transaction_type:
        return jsonify({'error': 'counterparty_username, amount, and transaction_type are required'}), 400

    try:
        amount = float(amount)
        if amount <= 0:
            raise ValueError
    except (ValueError, TypeError):
        return jsonify({'error': 'Amount must be a positive number'}), 400

    if transaction_type not in [t.value for t in TransactionType]:
        return jsonify({'error': 'transaction_type must be credit or debit'}), 400

    counterparty = User.query.filter_by(username=counterparty_username).first()
    if not counterparty:
        return jsonify({'error': 'Counterparty user not found'}), 404
    if counterparty.id == current_user_id:
        return jsonify({'error': 'Cannot create transaction with yourself'}), 400

    txn = Transaction(
        initiator_id=current_user_id,
        counterparty_id=counterparty.id,
        amount=amount,
        transaction_type=TransactionType(transaction_type),
        description=description,
        status=TransactionStatus.PENDING
    )
    db.session.add(txn)
    db.session.commit()

    return jsonify({
        'message': 'Transaction created and pending confirmation',
        'transaction': txn.to_dict(current_user_id)
    }), 201


@transactions_bp.route('/', methods=['GET'])
@jwt_required()
def list_transactions():
    current_user_id = int(get_jwt_identity())
    status_filter = request.args.get('status')
    partner_id = request.args.get('partner_id', type=int)
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)

    query = Transaction.query.filter(
        or_(Transaction.initiator_id == current_user_id, Transaction.counterparty_id == current_user_id)
    )

    if status_filter:
        try:
            query = query.filter(Transaction.status == TransactionStatus(status_filter))
        except ValueError:
            return jsonify({'error': 'Invalid status filter'}), 400

    if partner_id:
        query = query.filter(
            or_(
                and_(Transaction.initiator_id == current_user_id, Transaction.counterparty_id == partner_id),
                and_(Transaction.initiator_id == partner_id, Transaction.counterparty_id == current_user_id)
            )
        )

    query = query.order_by(Transaction.created_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'transactions': [t.to_dict(current_user_id) for t in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page
    }), 200


@transactions_bp.route('/<int:txn_id>', methods=['GET'])
@jwt_required()
def get_transaction(txn_id):
    current_user_id = int(get_jwt_identity())
    txn = Transaction.query.get(txn_id)
    if not txn:
        return jsonify({'error': 'Transaction not found'}), 404
    if txn.initiator_id != current_user_id and txn.counterparty_id != current_user_id:
        return jsonify({'error': 'Access denied'}), 403
    return jsonify({'transaction': txn.to_dict(current_user_id)}), 200


@transactions_bp.route('/<int:txn_id>/confirm', methods=['POST'])
@jwt_required()
def confirm_transaction(txn_id):
    current_user_id = int(get_jwt_identity())
    txn = Transaction.query.with_for_update().get(txn_id)
    if not txn:
        return jsonify({'error': 'Transaction not found'}), 404
    if txn.counterparty_id != current_user_id:
        return jsonify({'error': 'Only the counterparty can confirm this transaction'}), 403
    if txn.status != TransactionStatus.PENDING:
        return jsonify({'error': f'Transaction is already {txn.status.value}'}), 409

    txn.status = TransactionStatus.CONFIRMED
    txn.confirmed_at = datetime.utcnow()
    txn.updated_at = datetime.utcnow()
    db.session.commit()

    return jsonify({'message': 'Transaction confirmed', 'transaction': txn.to_dict(current_user_id)}), 200


@transactions_bp.route('/<int:txn_id>/reject', methods=['POST'])
@jwt_required()
def reject_transaction(txn_id):
    current_user_id = int(get_jwt_identity())
    data = request.get_json() or {}
    rejection_reason = data.get('rejection_reason', '').strip()

    txn = Transaction.query.with_for_update().get(txn_id)
    if not txn:
        return jsonify({'error': 'Transaction not found'}), 404
    if txn.counterparty_id != current_user_id and txn.initiator_id != current_user_id:
        return jsonify({'error': 'Access denied'}), 403
    if txn.status != TransactionStatus.PENDING:
        return jsonify({'error': f'Transaction is already {txn.status.value}'}), 409

    txn.status = TransactionStatus.REJECTED
    txn.rejected_at = datetime.utcnow()
    txn.updated_at = datetime.utcnow()
    txn.rejection_reason = rejection_reason
    db.session.commit()

    return jsonify({'message': 'Transaction rejected', 'transaction': txn.to_dict(current_user_id)}), 200


@transactions_bp.route('/balance/<int:partner_id>', methods=['GET'])
@jwt_required()
def get_balance(partner_id):
    current_user_id = int(get_jwt_identity())
    partner = User.query.get(partner_id)
    if not partner:
        return jsonify({'error': 'Partner not found'}), 404

    balance = get_balance_with_user(current_user_id, partner_id)
    return jsonify({
        'partner': partner.to_dict(),
        'balance': balance,
        'summary': (
            f"You are owed ₹{abs(balance):.2f}" if balance > 0
            else f"You owe ₹{abs(balance):.2f}" if balance < 0
            else "You are settled up"
        )
    }), 200


@transactions_bp.route('/partners', methods=['GET'])
@jwt_required()
def get_partners():
    current_user_id = int(get_jwt_identity())

    partner_ids = set()
    txns = Transaction.query.filter(
        or_(Transaction.initiator_id == current_user_id, Transaction.counterparty_id == current_user_id)
    ).all()

    for t in txns:
        if t.initiator_id != current_user_id:
            partner_ids.add(t.initiator_id)
        if t.counterparty_id != current_user_id:
            partner_ids.add(t.counterparty_id)

    partners = []
    for pid in partner_ids:
        partner = User.query.get(pid)
        if partner:
            balance = get_balance_with_user(current_user_id, pid)
            pending_count = Transaction.query.filter(
                Transaction.status == TransactionStatus.PENDING,
                or_(
                    and_(Transaction.initiator_id == current_user_id, Transaction.counterparty_id == pid),
                    and_(Transaction.initiator_id == pid, Transaction.counterparty_id == current_user_id)
                )
            ).count()
            partners.append({**partner.to_dict(), 'balance': balance, 'pending_count': pending_count})

    partners.sort(key=lambda p: abs(p['balance']), reverse=True)
    return jsonify({'partners': partners}), 200