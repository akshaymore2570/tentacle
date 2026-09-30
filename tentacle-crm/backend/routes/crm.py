from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from extensions import db
from models import CrmDesign

crm_bp = Blueprint("crm", __name__, url_prefix="/api/crm")


@crm_bp.get("")
@jwt_required()
def list_crms():
    items = CrmDesign.query.order_by(CrmDesign.updated_at.desc()).all()
    return jsonify([c.to_dict() for c in items])


@crm_bp.post("")
@jwt_required()
def create_crm():
    data = request.get_json() or {}
    crm = CrmDesign(
        name=data.get("name") or "Untitled CRM",
        description=data.get("description") or "",
        fields=data.get("fields") or [],
        theme=data.get("theme") or {},
        field_count=len(data.get("fields") or []),
    )
    db.session.add(crm)
    db.session.commit()
    return jsonify(crm.to_dict()), 201


@crm_bp.get("/<int:crm_id>")
@jwt_required()
def get_crm(crm_id):
    crm = CrmDesign.query.get_or_404(crm_id)
    return jsonify(crm.to_dict())


@crm_bp.put("/<int:crm_id>")
@jwt_required()
def update_crm(crm_id):
    crm = CrmDesign.query.get_or_404(crm_id)
    data = request.get_json() or {}
    if "name" in data: crm.name = data["name"]
    if "description" in data: crm.description = data["description"]
    if "fields" in data:
        crm.fields = data["fields"]
        crm.field_count = len(data["fields"] or [])
    if "theme" in data: crm.theme = data["theme"]
    db.session.commit()
    return jsonify(crm.to_dict())


@crm_bp.delete("/<int:crm_id>")
@jwt_required()
def delete_crm(crm_id):
    crm = CrmDesign.query.get_or_404(crm_id)
    db.session.delete(crm)
    db.session.commit()
    return jsonify({"ok": True})
