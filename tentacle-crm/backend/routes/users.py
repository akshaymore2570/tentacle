from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from extensions import db
from models import User, Role, Group

users_bp = Blueprint("users", __name__, url_prefix="/api/users")


@users_bp.get("")
@jwt_required()
def list_users():
    return jsonify([u.to_dict() for u in User.query.all()])


@users_bp.post("")
@jwt_required()
def create_user():
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    if not name or not username or not password:
        return jsonify({"error": "name, username, password required"}), 400

    if User.query.filter(db.func.lower(User.username) == username.lower()).first():
        return jsonify({"error": "Username already exists"}), 409

    user = User(name=name, username=username, active=bool(data.get("active", True)))
    user.set_password(password)

    role_ids = data.get("roles") or []
    group_ids = data.get("groups") or []
    user.roles = Role.query.filter(Role.id.in_(role_ids)).all() if role_ids else []
    user.groups = Group.query.filter(Group.id.in_(group_ids)).all() if group_ids else []

    db.session.add(user)
    db.session.commit()
    return jsonify(user.to_dict()), 201


@users_bp.put("/<int:user_id>")
@jwt_required()
def update_user(user_id):
    user = User.query.get_or_404(user_id)
    data = request.get_json() or {}
    if "name" in data: user.name = data["name"]
    if "username" in data: user.username = data["username"]
    if "password" in data and data["password"]:
        user.set_password(data["password"])
    if "active" in data: user.active = bool(data["active"])
    if "roles" in data:
        user.roles = Role.query.filter(Role.id.in_(data["roles"] or [])).all()
    if "groups" in data:
        user.groups = Group.query.filter(Group.id.in_(data["groups"] or [])).all()
    db.session.commit()
    return jsonify(user.to_dict())


@users_bp.delete("/<int:user_id>")
@jwt_required()
def delete_user(user_id):
    user = User.query.get_or_404(user_id)
    db.session.delete(user)
    db.session.commit()
    return jsonify({"ok": True})
