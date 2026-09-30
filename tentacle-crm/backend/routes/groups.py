from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from extensions import db
from models import Group, Campaign

groups_bp = Blueprint("groups", __name__, url_prefix="/api/groups")


@groups_bp.get("")
@jwt_required()
def list_groups():
    return jsonify([g.to_dict() for g in Group.query.all()])


@groups_bp.post("")
@jwt_required()
def create_group():
    data = request.get_json() or {}
    if not (data.get("name") or "").strip():
        return jsonify({"error": "name required"}), 400
    g = Group(
        name=data["name"].strip(),
        description=data.get("description") or "",
        active=bool(data.get("active", True)),
    )
    if data.get("campaigns"):
        g.campaigns = Campaign.query.filter(Campaign.id.in_(data["campaigns"])).all()
    db.session.add(g)
    db.session.commit()
    return jsonify(g.to_dict()), 201


@groups_bp.put("/<int:gid>")
@jwt_required()
def update_group(gid):
    g = Group.query.get_or_404(gid)
    data = request.get_json() or {}
    if "name" in data: g.name = data["name"]
    if "description" in data: g.description = data["description"]
    if "active" in data: g.active = bool(data["active"])
    if "campaigns" in data:
        g.campaigns = Campaign.query.filter(Campaign.id.in_(data["campaigns"] or [])).all()
    db.session.commit()
    return jsonify(g.to_dict())


@groups_bp.delete("/<int:gid>")
@jwt_required()
def delete_group(gid):
    g = Group.query.get_or_404(gid)
    db.session.delete(g)
    db.session.commit()
    return jsonify({"ok": True})


campaign_bp = Blueprint("campaigns", __name__, url_prefix="/api/campaigns")


@campaign_bp.get("")
@jwt_required()
def list_campaigns():
    return jsonify([c.to_dict() for c in Campaign.query.all()])


@campaign_bp.post("")
@jwt_required()
def create_campaign():
    data = request.get_json() or {}
    if not (data.get("name") or "").strip():
        return jsonify({"error": "name required"}), 400
    c = Campaign(name=data["name"].strip(), description=data.get("description") or "")
    db.session.add(c)
    db.session.commit()
    return jsonify(c.to_dict()), 201
