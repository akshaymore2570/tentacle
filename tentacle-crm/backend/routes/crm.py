from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from extensions import db
from models import CrmDesign, CampaignFull, CrmTable

crm_bp = Blueprint("crm", __name__, url_prefix="/api/crm")


@crm_bp.get("")
@jwt_required()
def list_crms():
    """
    List CRM designs.
    Filters: ?campaignId=X&subCampaign=Y&crmTableId=Z
    """
    campaign_id = request.args.get('campaignId', type=int)
    sub_campaign = request.args.get('subCampaign')
    crm_table_id = request.args.get('crmTableId', type=int)

    q = CrmDesign.query
    if campaign_id:
        q = q.filter(CrmDesign.campaign_id == campaign_id)
    if sub_campaign:
        q = q.filter(CrmDesign.sub_campaign == sub_campaign)
    if crm_table_id:
        q = q.filter(CrmDesign.crm_table_id == crm_table_id)

    items = q.order_by(CrmDesign.updated_at.desc()).all()
    out = []
    for c in items:
        d = c.to_dict()
        # Attach campaign + sub-campaign + table names
        if c.campaign_id:
            camp = CampaignFull.query.get(c.campaign_id)
            d['campaignName'] = camp.name if camp else None
        if c.crm_table_id:
            t = CrmTable.query.get(c.crm_table_id)
            d['crmTableName'] = t.name if t else None
        out.append(d)
    return jsonify(out)


@crm_bp.post("")
@jwt_required()
def create_crm():
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "CRM name is required"}), 400

    crm = CrmDesign(
        name=name,
        description=data.get("description") or "",
        fields=data.get("fields") or [],
        theme=data.get("theme") or {},
        field_count=len(data.get("fields") or []),
        # ★ New fields
        campaign_id=data.get("campaignId") or None,
        sub_campaign=data.get("subCampaign") or None,
        crm_table_id=data.get("crmTableId") or None,
    )
    db.session.add(crm)
    db.session.commit()
    return jsonify(crm.to_dict()), 201


@crm_bp.get("/<int:crm_id>")
@jwt_required()
def get_crm(crm_id):
    crm = CrmDesign.query.get_or_404(crm_id)
    d = crm.to_dict()
    if crm.campaign_id:
        camp = CampaignFull.query.get(crm.campaign_id)
        d['campaignName'] = camp.name if camp else None
    if crm.crm_table_id:
        t = CrmTable.query.get(crm.crm_table_id)
        d['crmTableName'] = t.name if t else None
    return jsonify(d)


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
    # ★ New fields
    if "campaignId" in data: crm.campaign_id = data["campaignId"] or None
    if "subCampaign" in data: crm.sub_campaign = data["subCampaign"] or None
    if "crmTableId" in data: crm.crm_table_id = data["crmTableId"] or None

    db.session.commit()
    return jsonify(crm.to_dict())


@crm_bp.delete("/<int:crm_id>")
@jwt_required()
def delete_crm(crm_id):
    crm = CrmDesign.query.get_or_404(crm_id)
    db.session.delete(crm)
    db.session.commit()
    return jsonify({"ok": True})


@crm_bp.get("/by-campaign-table")
@jwt_required()
def by_campaign_table():
    """
    Find a CRM design by campaign + sub_campaign + crm_table_id.
    Used by Batch Builder to check if a design exists for this table.
    """
    campaign_id = request.args.get('campaignId', type=int)
    sub_campaign = request.args.get('subCampaign')
    crm_table_id = request.args.get('crmTableId', type=int)

    if not crm_table_id:
        return jsonify({"error": "crmTableId required"}), 400

    q = CrmDesign.query.filter(CrmDesign.crm_table_id == crm_table_id)
    if campaign_id:
        q = q.filter(CrmDesign.campaign_id == campaign_id)
    if sub_campaign:
        q = q.filter(CrmDesign.sub_campaign == sub_campaign)

    crm = q.first()
    if not crm:
        return jsonify({"exists": False, "crm": None})

    return jsonify({"exists": True, "crm": crm.to_dict()})
