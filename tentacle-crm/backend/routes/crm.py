from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from extensions import db
from models import CrmDesign, CrmTable

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


# ==================================================
# ============ FORM SUBMIT → staging table ==========
# ==================================================
@crm_bp.post("/<int:crm_id>/submit")
@jwt_required()
def submit_form(crm_id):
    """
    Save a form submission.
    For fields of type 'CRM_TABLE_FIELD' (or with targetTable/targetColumn),
    inserts a row into the mapped staging table.
    Other fields ignored (or could be stored in a separate submissions table).
    """
    import re
    from sqlalchemy import text, inspect

    crm = CrmDesign.query.get_or_404(crm_id)
    data = request.get_json() or {}

    fields = crm.fields or []

    # Group mappings by target table
    by_table = {}
    for f in fields:
        tname = f.get('targetTable')
        cname = f.get('targetColumn')
        fid = f.get('id')
        if not tname or not cname:
            continue
        val = data.get(fid)
        if val is None or val == '':
            continue
        by_table.setdefault(tname, {})[cname] = val

    if not by_table:
        return jsonify({'error': 'No mapped columns in this CRM'}), 400

    inserted = []
    for tname, cols in by_table.items():
        # Verify table exists
        insp = inspect(db.engine)
        if tname not in insp.get_table_names():
            return jsonify({'error': f'Staging table "{tname}" not found'}), 400

        # Only allow columns that actually exist
        real_cols = [c['name'] for c in insp.get_columns(tname)]
        clean = {k: v for k, v in cols.items() if k in real_cols}
        if not clean:
            continue

        cols_sql = ', '.join(f'"{k}"' for k in clean.keys())
        vals_sql = ', '.join(f':{k}' for k in clean.keys())
        sql = text(f'INSERT INTO "{tname}" ({cols_sql}) VALUES ({vals_sql}) RETURNING id')
        new_id = db.session.execute(sql, clean).scalar()
        inserted.append({'table': tname, 'id': new_id})

    db.session.commit()
    return jsonify({'ok': True, 'inserted': inserted}), 201
