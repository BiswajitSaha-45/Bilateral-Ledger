from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.user import User

users_bp = Blueprint('users', __name__)


@users_bp.route('/search', methods=['GET'])
@jwt_required()
def search_users():
    current_user_id = int(get_jwt_identity())
    query = request.args.get('q', '').strip()

    if not query or len(query) < 2:
        return jsonify({'users': []}), 200

    users = User.query.filter(
        User.id != current_user_id,
        User.is_active == True,
        (User.username.ilike(f'%{query}%') | User.display_name.ilike(f'%{query}%'))
    ).limit(10).all()

    return jsonify({'users': [u.to_dict() for u in users]}), 200


@users_bp.route('/<int:user_id>', methods=['GET'])
@jwt_required()
def get_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({'user': user.to_dict()}), 200