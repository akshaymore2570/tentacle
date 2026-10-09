from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from extensions import db
from models import Disposition

dispositions_bp = Blueprint("dispositions", __name__, url_prefix="/api/dispositions")


# ==================================================
# ============ CRUD =================================
# ==================================================

@dispositions_bp.get("")
@jwt_required()
def list_dispositions():
    status = request.args.get('status')
    churn_type = request.args.get('churnType')
    search = (request.args.get('search') or '').strip().lower()

    q = Disposition.query
    if status and status != 'all':
        q = q.filter(Disposition.status == status)
    if churn_type and churn_type != 'all':
        q = q.filter(Disposition.churn_type == churn_type)
    if search:
        q = q.filter(db.func.lower(Disposition.name).like(f'%{search}%'))

    items = q.order_by(Disposition.sort_order.asc(), Disposition.name.asc()).all()
    return jsonify([d.to_dict() for d in items])


@dispositions_bp.post("")
@jwt_required()
def create_disposition():
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "Name is required"}), 400

    code = (data.get("code") or "").strip() or None
    if code:
        if Disposition.query.filter(db.func.lower(Disposition.code) == code.lower()).first():
            return jsonify({"error": f"Code '{code}' already exists"}), 409

    d = Disposition(
        name=name,
        code=code,
        description=data.get("description") or "",
        churn_type=data.get("churnType") or "non-churn",
        status=data.get("status") or "ACTIVE",
        color=data.get("color") or "#6b7d91",
        sort_order=int(data.get("sortOrder") or 0),
    )
    db.session.add(d)
    db.session.commit()
    return jsonify(d.to_dict()), 201


@dispositions_bp.get("/<int:did>")
@jwt_required()
def get_disposition(did):
    d = Disposition.query.get_or_404(did)
    return jsonify(d.to_dict())


@dispositions_bp.put("/<int:did>")
@jwt_required()
def update_disposition(did):
    d = Disposition.query.get_or_404(did)
    data = request.get_json() or {}

    if "name" in data: d.name = data["name"]
    if "code" in data:
        code = (data["code"] or "").strip() or None
        if code and code.lower() != (d.code or '').lower():
            existing = Disposition.query.filter(db.func.lower(Disposition.code) == code.lower()).first()
            if existing and existing.id != did:
                return jsonify({"error": f"Code '{code}' already exists"}), 409
        d.code = code
    if "description" in data: d.description = data["description"]
    if "churnType" in data: d.churn_type = data["churnType"]
    if "status" in data: d.status = data["status"]
    if "color" in data: d.color = data["color"]
    if "sortOrder" in data: d.sort_order = int(data["sortOrder"] or 0)

    db.session.commit()
    return jsonify(d.to_dict())


@dispositions_bp.delete("/<int:did>")
@jwt_required()
def delete_disposition(did):
    d = Disposition.query.get_or_404(did)
    db.session.delete(d)
    db.session.commit()
    return jsonify({"ok": True})


# ==================================================
# ============ BULK IMPORT ==========================
# ==================================================

@dispositions_bp.post("/bulk")
@jwt_required()
def bulk_create():
    data = request.get_json() or {}
    items = data.get("items") or []
    created = 0
    for item in items:
        name = (item.get("name") or "").strip()
        if not name:
            continue
        code = (item.get("code") or "").strip() or None
        if code and Disposition.query.filter(db.func.lower(Disposition.code) == code.lower()).first():
            continue
        d = Disposition(
            name=name,
            code=code,
            description=item.get("description") or "",
            churn_type=item.get("churnType") or "non-churn",
            status=item.get("status") or "ACTIVE",
            color=item.get("color") or "#6b7d91",
            sort_order=int(item.get("sortOrder") or 0),
        )
        db.session.add(d)
        created += 1
    db.session.commit()
    return jsonify({"ok": True, "created": created})


# ==================================================
# ============ IMPORT FROM CAMPAIGNS ================
# ==================================================

@dispositions_bp.post("/import-from-campaigns")
@jwt_required()
def import_from_campaigns():
    """Scan all campaigns' dispositions JSON and import unique ones into master."""
    from models import CampaignFull

    campaigns = CampaignFull.query.all()
    imported = 0
    skipped = 0
    details = []

    for c in campaigns:
        disp_list = c.dispositions or []
        for d in disp_list:
            name = (d.get("dispositionName") or d.get("dispositionType") or "").strip()
            if not name:
                skipped += 1
                continue

            existing = Disposition.query.filter(
                db.func.lower(Disposition.name) == name.lower()
            ).first()
            if existing:
                skipped += 1
                continue

            code = (d.get("dispositionType") or "").strip() or None
            if code:
                code_exists = Disposition.query.filter(
                    db.func.lower(Disposition.code) == code.lower()
                ).first()
                if code_exists:
                    code = None

            new_d = Disposition(
                name=name,
                code=code[:50] if code else None,
                description=d.get("description") or "",
                churn_type=d.get("churnType") or "non-churn",
                status=d.get("status") or "ACTIVE",
                color="#6b7d91",
                sort_order=0,
            )
            db.session.add(new_d)
            imported += 1
            details.append({"name": name, "source_campaign": c.name})

    db.session.commit()

    return jsonify({
        "ok": True,
        "imported": imported,
        "skipped": skipped,
        "details": details,
    })
