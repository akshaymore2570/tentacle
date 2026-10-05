from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from extensions import db
from models import CampaignFull, CrmDesign

campaigns_bp = Blueprint("campaigns_v2", __name__, url_prefix="/api/ten-campaigns")


@campaigns_bp.get("")
@jwt_required()
def list_campaigns():
    items = CampaignFull.query.order_by(CampaignFull.updated_at.desc()).all()
    out = []
    for c in items:
        d = c.to_dict()
        # Attach CRM name
        if c.crm_id:
            crm = CrmDesign.query.get(c.crm_id)
            d['crmName'] = crm.name if crm else None
        else:
            d['crmName'] = None
        out.append(d)
    return jsonify(out)


@campaigns_bp.post("")
@jwt_required()
def create_campaign():
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "Campaign name is required"}), 400

    c = CampaignFull(
        name=name,
        description=data.get("description") or "",
        status=data.get("status") or "INACTIVE",
        auto_dispose=data.get("autoDispose") or "DISALLOW",
        crm_id=data.get("crmId") or None,
        crm_history=data.get("crmHistory") or "NO",
        start_call_url=data.get("startCallUrl") or "",
        mask=data.get("mask") or "",
        dispositions=data.get("dispositions") or [],
        skills=data.get("skills") or [],
    )
    db.session.add(c)
    db.session.commit()
    return jsonify(c.to_dict()), 201


@campaigns_bp.get("/<int:cid>")
@jwt_required()
def get_campaign(cid):
    c = CampaignFull.query.get_or_404(cid)
    d = c.to_dict()
    if c.crm_id:
        crm = CrmDesign.query.get(c.crm_id)
        d['crmName'] = crm.name if crm else None
    return jsonify(d)


@campaigns_bp.put("/<int:cid>")
@jwt_required()
def update_campaign(cid):
    c = CampaignFull.query.get_or_404(cid)
    data = request.get_json() or {}

    if "name" in data: c.name = data["name"]
    if "description" in data: c.description = data["description"]
    if "status" in data: c.status = data["status"]
    if "autoDispose" in data: c.auto_dispose = data["autoDispose"]
    if "crmId" in data: c.crm_id = data["crmId"] or None
    if "crmHistory" in data: c.crm_history = data["crmHistory"]
    if "startCallUrl" in data: c.start_call_url = data["startCallUrl"]
    if "mask" in data: c.mask = data["mask"]
    if "dispositions" in data: c.dispositions = data["dispositions"]
    if "skills" in data: c.skills = data["skills"]

    db.session.commit()
    return jsonify(c.to_dict())


@campaigns_bp.delete("/<int:cid>")
@jwt_required()
def delete_campaign(cid):
    c = CampaignFull.query.get_or_404(cid)
    db.session.delete(c)
    db.session.commit()
    return jsonify({"ok": True})


@campaigns_bp.get("/dropdowns")
@jwt_required()
def dropdowns():
    """Options for the campaign form"""
    crms = CrmDesign.query.order_by(CrmDesign.name).all()
    return jsonify({
        "crms": [{"id": c.id, "name": c.name} for c in crms],
        "statuses": ["ACTIVE", "INACTIVE", "PAUSED"],
        "autoDisposes": ["DISALLOW", "ALLOW", "ASK"],
        "yesNo": ["YES", "NO"],
    })
