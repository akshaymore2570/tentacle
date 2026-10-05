from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from extensions import db
from models import User
from config import SuperAdminConfig

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.post("/login")
def login():
    data = request.get_json() or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400

    # ---------- SUPER ADMIN (env-based, not in DB) ----------
    if username == SuperAdminConfig.USERNAME and password == SuperAdminConfig.PASSWORD:
        token = create_access_token(
            identity="superadmin",
            additional_claims={"is_superadmin": True},
        )
        return jsonify({
            "token": token,
            "user": {
                "id": 0,
                "username": SuperAdminConfig.USERNAME,
                "name": "Super Admin",
                "active": True,
                "isSuperAdmin": True,
                "roles": [],
                "roleNames": ["SuperAdmin"],
                "groups": [],
            },
        })

    # ---------- NORMAL DB USERS ----------
    user = User.query.filter(db.func.lower(User.username) == username.lower()).first()
    if not user or not user.check_password(password) or not user.active:
        return jsonify({"error": "Invalid username or password"}), 401

    token = create_access_token(
        identity=str(user.id),
        additional_claims={"is_superadmin": False},
    )
    return jsonify({
        "token": token,
        "user": user.to_dict(),
    })


@auth_bp.get("/me")
@jwt_required()
def me():
    identity = get_jwt_identity()
    claims = get_jwt()

    if claims.get("is_superadmin"):
        return jsonify({
            "id": 0,
            "username": SuperAdminConfig.USERNAME,
            "name": "Super Admin",
            "active": True,
            "isSuperAdmin": True,
            "roles": [],
            "roleNames": ["SuperAdmin"],
            "groups": [],
        })

    uid = int(identity)
    user = User.query.get(uid)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user.to_dict())
