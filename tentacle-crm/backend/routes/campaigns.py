"""
Campaign management with auto-table creation.
Creating a campaign auto-creates:
    - {name}_stagging   (master data + stats)
    - {name}_working    (live dial queue)
    - {name}_history    (call history log)
"""
import re
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from sqlalchemy import text, inspect
from extensions import db
from models import CampaignFull, CrmDesign

campaigns_bp = Blueprint("campaigns_v2", __name__, url_prefix="/api/ten-campaigns")


# ============ HELPERS ============
def sanitize_identifier(name):
    if not name:
        return None
    s = re.sub(r'[^a-zA-Z0-9_]', '_', str(name).strip().lower())
    s = re.sub(r'_+', '_', s).strip('_')
    if s and s[0].isdigit():
        s = 'c_' + s
    return s or None


def table_exists(tname):
    return tname in inspect(db.engine).get_table_names()


def create_campaign_tables(campaign):
    """
    Create 3 tables for a campaign:
    1. {name}_stagging — master data + dial stats
    2. {name}_working — live dial queue
    3. {name}_history — call history log
    
    Tables auto-create only if they don't exist (safe re-run).
    """
    base = sanitize_identifier(campaign.name)
    if not base:
        raise ValueError("Invalid campaign name")

    staging = f"{base}_stagging"
    working = f"{base}_working"
    history = f"{base}_history"

    # ============ 1. STAGGING TABLE ============
    if not table_exists(staging):
        db.session.execute(text(f'''
            CREATE TABLE "{staging}" (
                id BIGSERIAL PRIMARY KEY,
                batch_id INTEGER,
                priority SMALLINT DEFAULT 3,
                dial_status VARCHAR(20) DEFAULT 'pending',
                total_attempts INTEGER DEFAULT 0,
                total_connected INTEGER DEFAULT 0,
                total_talk_time INTEGER DEFAULT 0,
                last_dial_at TIMESTAMP,
                next_dial_at TIMESTAMP,
                last_disposition VARCHAR(80),
                last_agent_id INTEGER,
                phone VARCHAR(30),
                data JSONB,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        '''))
        # Indexes for fast lookup
        db.session.execute(text(f'CREATE INDEX idx_{base}_stag_batch ON "{staging}" (batch_id, dial_status)'))
        db.session.execute(text(f'CREATE INDEX idx_{base}_stag_phone ON "{staging}" (phone)'))
        db.session.commit()
        print(f"[CAMPAIGN] Created staging table: {staging}")

    # ============ 2. WORKING TABLE ============
    if not table_exists(working):
        db.session.execute(text(f'''
            CREATE TABLE "{working}" (
                id BIGSERIAL PRIMARY KEY,
                staging_id BIGINT,
                batch_id INTEGER,
                priority SMALLINT DEFAULT 3,
                dial_status VARCHAR(20) DEFAULT 'pending',
                assigned_agent_id INTEGER,
                attempts INTEGER DEFAULT 0,
                last_dial_at TIMESTAMP,
                last_disposition VARCHAR(80),
                phone VARCHAR(30),
                data JSONB,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        '''))
        # Fast dialer index
        db.session.execute(text(f'CREATE INDEX idx_{base}_work_dialer ON "{working}" (batch_id, dial_status, priority, id)'))
        db.session.execute(text(f'CREATE INDEX idx_{base}_work_agent ON "{working}" (assigned_agent_id, dial_status)'))
        db.session.commit()
        print(f"[CAMPAIGN] Created working table: {working}")

    # ============ 3. HISTORY TABLE ============
    if not table_exists(history):
        db.session.execute(text(f'''
            CREATE TABLE "{history}" (
                id BIGSERIAL PRIMARY KEY,
                lead_id BIGINT,
                staging_id BIGINT,
                batch_id INTEGER,
                campaign_id INTEGER,
                agent_id INTEGER,
                dialed_at TIMESTAMP DEFAULT NOW(),
                call_duration INTEGER DEFAULT 0,
                disposition VARCHAR(80),
                phone VARCHAR(30),
                recording_url VARCHAR(500),
                notes TEXT,
                data JSONB,
                created_at TIMESTAMP DEFAULT NOW()
            )
        '''))
        db.session.execute(text(f'CREATE INDEX idx_{base}_hist_lead ON "{history}" (lead_id)'))
        db.session.execute(text(f'CREATE INDEX idx_{base}_hist_batch ON "{history}" (batch_id)'))
        db.session.execute(text(f'CREATE INDEX idx_{base}_hist_dialed ON "{history}" (dialed_at)'))
        db.session.commit()
        print(f"[CAMPAIGN] Created history table: {history}")

    # Save table names on campaign
    campaign.staging_table = staging
    campaign.working_table = working
    campaign.history_table = history
    db.session.commit()

    return {
        "staging": staging,
        "working": working,
        "history": history,
    }


# ============ ROUTES ============

@campaigns_bp.get("")
@jwt_required()
def list_campaigns():
    items = CampaignFull.query.order_by(CampaignFull.updated_at.desc()).all()
    out = []
    for c in items:
        d = c.to_dict()
        d['stagingTable'] = c.staging_table
        d['workingTable'] = c.working_table
        d['historyTable'] = c.history_table
        out.append(d)
    return jsonify(out)


@campaigns_bp.post("")
@jwt_required()
def create_campaign():
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "Campaign name is required"}), 400

    # Check duplicate
    if CampaignFull.query.filter(db.func.lower(CampaignFull.name) == name.lower()).first():
        return jsonify({"error": "Campaign name already exists"}), 409

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

    # ★ Auto-create 3 tables
    try:
        tables = create_campaign_tables(c)
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Campaign saved but table creation failed: {str(e)}"}), 500

    result = c.to_dict()
    result['stagingTable'] = tables['staging']
    result['workingTable'] = tables['working']
    result['historyTable'] = tables['history']
    return jsonify(result), 201


@campaigns_bp.get("/<int:cid>")
@jwt_required()
def get_campaign(cid):
    c = CampaignFull.query.get_or_404(cid)
    d = c.to_dict()
    d['stagingTable'] = c.staging_table
    d['workingTable'] = c.working_table
    d['historyTable'] = c.history_table
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

    # Ensure tables exist (in case campaign was created before tables feature)
    try:
        create_campaign_tables(c)
    except Exception as e:
        return jsonify({"error": f"Update saved but table creation failed: {str(e)}"}), 500

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
    crms = CrmDesign.query.order_by(CrmDesign.name).all()
    return jsonify({
        "crms": [{"id": c.id, "name": c.name} for c in crms],
        "statuses": ["ACTIVE", "INACTIVE", "PAUSED"],
        "autoDisposes": ["DISALLOW", "ALLOW", "ASK"],
        "yesNo": ["YES", "NO"],
    })


@campaigns_bp.post("/<int:cid>/rebuild-tables")
@jwt_required()
def rebuild_tables(cid):
    """Manually trigger 3-table creation for an existing campaign."""
    c = CampaignFull.query.get_or_404(cid)
    try:
        tables = create_campaign_tables(c)
        return jsonify({"ok": True, "tables": tables})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
