from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import db
from models.transaction import Transaction, TransactionStatus, TransactionType
from models.user import User
from routes.transactions import get_balance_with_user
from datetime import datetime
import razorpay
import hmac
import hashlib
import os

payments_bp = Blueprint('payments', __name__)


def _get_credentials():
    """Read Razorpay credentials at call time (after load_dotenv has run)."""
    key_id = os.environ.get('RAZORPAY_KEY_ID', '').strip()
    key_secret = os.environ.get('RAZORPAY_KEY_SECRET', '').strip()
    if not key_id or not key_secret:
        raise ValueError('Razorpay credentials not configured. Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env')
    return key_id, key_secret


@payments_bp.route('/create-order', methods=['POST'])
@jwt_required()
def create_order():
    current_user_id = int(get_jwt_identity())
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    partner_id = data.get('partner_id')
    if not partner_id:
        return jsonify({'error': 'partner_id is required'}), 400

    partner = User.query.get(partner_id)
    if not partner:
        return jsonify({'error': 'Partner not found'}), 404

    # Negative balance = current user owes money
    balance = get_balance_with_user(current_user_id, partner_id)
    if balance >= 0:
        return jsonify({'error': 'You do not owe this person anything'}), 400

    amount_rupees = abs(balance)
    amount_paise = int(round(amount_rupees * 100))  # Razorpay requires paise

    if amount_paise < 100:  # Minimum ₹1
        return jsonify({'error': 'Amount too small to process (minimum ₹1)'}), 400

    try:
        key_id, key_secret = _get_credentials()
        client = razorpay.Client(auth=(key_id, key_secret))
        order = client.order.create({
            'amount': amount_paise,
            'currency': 'INR',
            'payment_capture': 1,
            'notes': {
                'payer_id': str(current_user_id),
                'payee_id': str(partner_id),
            }
        })
    except ValueError as e:
        return jsonify({'error': str(e)}), 500
    except Exception as e:
        return jsonify({'error': f'Failed to create Razorpay order: {str(e)}'}), 500

    return jsonify({
        'order_id': order['id'],
        'amount': order['amount'],
        'currency': order['currency'],
        'key_id': key_id,
        'amount_rupees': amount_rupees,
        'partner_name': partner.display_name or partner.username,
    }), 200


@payments_bp.route('/verify', methods=['POST'])
@jwt_required()
def verify_payment():
    current_user_id = int(get_jwt_identity())
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    razorpay_order_id = data.get('razorpay_order_id')
    razorpay_payment_id = data.get('razorpay_payment_id')
    razorpay_signature = data.get('razorpay_signature')
    partner_id = data.get('partner_id')

    if not all([razorpay_order_id, razorpay_payment_id, razorpay_signature, partner_id]):
        return jsonify({'error': 'Missing required fields'}), 400

    partner = User.query.get(partner_id)
    if not partner:
        return jsonify({'error': 'Partner not found'}), 404

    # Verify HMAC-SHA256 signature
    try:
        _, key_secret = _get_credentials()
    except ValueError as e:
        return jsonify({'error': str(e)}), 500

    msg = f"{razorpay_order_id}|{razorpay_payment_id}"
    expected_sig = hmac.new(
        key_secret.encode('utf-8'),
        msg.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(expected_sig, razorpay_signature):
        return jsonify({'error': 'Invalid payment signature. Payment verification failed.'}), 400

    # Recompute current balance
    balance = get_balance_with_user(current_user_id, partner_id)
    if balance >= 0:
        return jsonify({'error': 'No outstanding dues to settle'}), 400

    amount_to_settle = abs(balance)

    # Auto-confirmed settlement transaction — offsets balance to 0
    settlement_txn = Transaction(
        initiator_id=current_user_id,
        counterparty_id=int(partner_id),
        amount=amount_to_settle,
        transaction_type=TransactionType.CREDIT,
        description=f'UPI Settlement via Razorpay (Payment ID: {razorpay_payment_id})',
        status=TransactionStatus.CONFIRMED,
        confirmed_at=datetime.utcnow(),
    )
    db.session.add(settlement_txn)
    db.session.commit()

    new_balance = get_balance_with_user(current_user_id, int(partner_id))

    return jsonify({
        'success': True,
        'message': f'Payment verified! ₹{amount_to_settle:.2f} settled with {partner.display_name or partner.username}.',
        'settlement_transaction_id': settlement_txn.id,
        'new_balance': new_balance,
        'razorpay_payment_id': razorpay_payment_id,
    }), 200
