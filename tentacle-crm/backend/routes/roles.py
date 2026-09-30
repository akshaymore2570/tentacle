from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from extensions import db
from models import Role

roles_bp = Blueprint("roles", __name__, url_prefix="/api/roles")


@roles_bp.get("")
@jwt_required()
def list_roles():
    return jsonify([r.to_dict() for r in Role.query.all()])


@roles_bp.post("")
@jwt_required()
def create_role():
    data = request.get_json() or {}
    if not (data.get("name") or "").strip():
        return jsonify({"error": "name required"}), 400
    r = Role(
        name=data["name"].strip(),
        description=data.get("description") or "",
        permissions=data.get("permissions") or {},
    )
    db.session.add(r)
    db.session.commit()
    return jsonify(r.to_dict()), 201


@roles_bp.put("/<int:rid>")
@jwt_required()
def update_role(rid):
    r = Role.query.get_or_404(rid)
    data = request.get_json() or {}
    if "name" in data: r.name = data["name"]
    if "description" in data: r.description = data["description"]
    if "permissions" in data: r.permissions = data["permissions"] or {}
    db.session.commit()
    return jsonify(r.to_dict())


@roles_bp.delete("/<int:rid>")
@jwt_required()
def delete_role(rid):
    r = Role.query.get_or_404(rid)
    db.session.delete(r)
    db.session.commit()
    return jsonify({"ok": True})
