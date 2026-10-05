import re
import csv
import io
from flask import Blueprint, request, jsonify, Response
from flask_jwt_extended import jwt_required
from sqlalchemy import text, inspect
from extensions import db
from models import CrmTable

crm_tables_bp = Blueprint("crm_tables", __name__, url_prefix="/api/crm-tables")


def sanitize(name):
    if not name:
        return None
    s = re.sub(r'[^a-zA-Z0-9_]', '_', str(name).strip().lower())
    s = re.sub(r'_+', '_', s).strip('_')
    if s and s[0].isdigit():
        s = 'c_' + s
    return s or None


def sql_type_for(t):
    t = (t or 'varchar').lower()
    if t in ('int', 'integer', 'serial'):   return 'INTEGER'
    if t == 'bigint':                        return 'BIGINT'
    if t in ('bool', 'boolean'):             return 'BOOLEAN'
    if t == 'date':                          return 'DATE'
    if t in ('datetime', 'timestamp'):       return 'TIMESTAMP'
    if t in ('float', 'double', 'numeric'):  return 'NUMERIC'
    if t == 'text':                          return 'TEXT'
    return 'VARCHAR(255)'


def table_exists(tname):
    return tname in inspect(db.engine).get_table_names()


def column_exists(tname, cname):
    insp = inspect(db.engine)
    if tname not in insp.get_table_names():
        return False
    return cname in [c['name'] for c in insp.get_columns(tname)]


def ensure_table(crm_table, drop_missing=False):
    """
    Create or update the staging table.
    drop_missing=True → DROP columns that are no longer in crm_table.columns
    drop_missing=False (default) → preserve old columns (safe)
    """
    tname = crm_table.staging_table_name()
    if not tname:
        raise ValueError("Invalid table name")

    # Reserved columns — never dropped
    RESERVED = {'id', 'created_at', 'updated_at'}

    # Desired columns from the definition
    columns = crm_table.columns or []
    safe_cols = []
    seen = set()
    for c in columns:
        cname = sanitize(c.get('name'))
        if not cname or cname in RESERVED:
            continue
        if cname in seen:
            i = 2
            while f"{cname}_{i}" in seen:
                i += 1
            cname = f"{cname}_{i}"
        seen.add(cname)
        safe_cols.append((cname, sql_type_for(c.get('type'))))

    if not table_exists(tname):
        # CREATE
        col_defs = [
            'id SERIAL PRIMARY KEY',
            'created_at TIMESTAMP DEFAULT NOW()',
            'updated_at TIMESTAMP DEFAULT NOW()',
        ]
        for cname, ctype in safe_cols:
            col_defs.append(f'"{cname}" {ctype}')
        sql = f'CREATE TABLE "{tname}" ({", ".join(col_defs)})'
        db.session.execute(text(sql))
        db.session.commit()
    else:
        # Existing table — get current columns
        insp = inspect(db.engine)
        existing = [c['name'] for c in insp.get_columns(tname)]
        desired = set(c[0] for c in safe_cols)

        # 1. ADD new columns
        for cname, ctype in safe_cols:
            if cname not in existing:
                db.session.execute(text(f'ALTER TABLE "{tname}" ADD COLUMN "{cname}" {ctype}'))
        db.session.commit()

        # 2. DROP missing columns (only if requested)
        if drop_missing:
            for col in existing:
                if col in RESERVED:
                    continue
                if col not in desired:
                    try:
                        db.session.execute(text(f'ALTER TABLE "{tname}" DROP COLUMN "{col}"'))
                    except Exception as e:
                        print(f"Could not drop {col}: {e}")
            db.session.commit()

    return tname


@crm_tables_bp.get("")
@jwt_required()
def list_tables():
    items = CrmTable.query.order_by(CrmTable.updated_at.desc()).all()
    out = []
    for t in items:
        d = t.to_dict()
        tname = d['stagingTable']
        d['exists'] = table_exists(tname)
        if d['exists']:
            try:
                d['rowCount'] = db.session.execute(text(f'SELECT COUNT(*) FROM "{tname}"')).scalar() or 0
            except Exception:
                d['rowCount'] = 0
        else:
            d['rowCount'] = 0
        out.append(d)
    return jsonify(out)


@crm_tables_bp.post("")
@jwt_required()
def create_table():
    data = request.get_json() or {}
    name = sanitize(data.get('name'))
    if not name:
        return jsonify({'error': 'Table name required'}), 400

    if CrmTable.query.filter(db.func.lower(CrmTable.name) == name).first():
        return jsonify({'error': 'Table name already exists'}), 409

    t = CrmTable(
        name=name,
        display_name=data.get('displayName') or name,
        description=data.get('description') or '',
        interactions=data.get('interactions') or [],
        phone_column_name=sanitize(data.get('phoneColumnName')) or 'phone',
        phone_column_count=int(data.get('phoneColumnCount') or 1),
        columns=data.get('columns') or [],
    )
    db.session.add(t)
    db.session.commit()

    try:
        ensure_table(t)
    except Exception as e:
        return jsonify({'error': f'Saved but DB creation failed: {e}'}), 500

    return jsonify(t.to_dict()), 201


@crm_tables_bp.get("/<int:tid>")
@jwt_required()
def get_table(tid):
    t = CrmTable.query.get_or_404(tid)
    return jsonify(t.to_dict())


@crm_tables_bp.put("/<int:tid>")
@jwt_required()
def update_table(tid):
    t = CrmTable.query.get_or_404(tid)
    data = request.get_json() or {}

    if 'displayName' in data: t.display_name = data['displayName']
    if 'description' in data: t.description = data['description']
    if 'interactions' in data: t.interactions = data['interactions']
    if 'phoneColumnName' in data: t.phone_column_name = sanitize(data['phoneColumnName']) or 'phone'
    if 'phoneColumnCount' in data: t.phone_column_count = int(data['phoneColumnCount'] or 1)
    if 'columns' in data: t.columns = data['columns']
    db.session.commit()

    # dropMissing = true from frontend → also DROP removed columns
    drop_missing = bool(data.get('dropMissing'))

    try:
        ensure_table(t, drop_missing=drop_missing)
    except Exception as e:
        return jsonify({'error': f'Saved but DB sync failed: {e}'}), 500

    return jsonify(t.to_dict())


@crm_tables_bp.delete("/<int:tid>")
@jwt_required()
def delete_table(tid):
    t = CrmTable.query.get_or_404(tid)
    drop = request.args.get('drop', 'false').lower() == 'true'
    tname = t.staging_table_name()
    db.session.delete(t)
    db.session.commit()

    if drop and tname and table_exists(tname):
        try:
            db.session.execute(text(f'DROP TABLE "{tname}"'))
            db.session.commit()
        except Exception:
            pass

    return jsonify({'ok': True, 'dropped': drop})


@crm_tables_bp.get("/<int:tid>/rows")
@jwt_required()
def get_rows(tid):
    t = CrmTable.query.get_or_404(tid)
    tname = t.staging_table_name()
    if not table_exists(tname):
        return jsonify({'exists': False, 'columns': [], 'rows': []})

    insp = inspect(db.engine)
    cols = [{'name': c['name'], 'type': str(c['type'])} for c in insp.get_columns(tname)]
    rows_raw = db.session.execute(text(f'SELECT * FROM "{tname}" ORDER BY id DESC LIMIT 500')).mappings().all()
    return jsonify({
        'exists': True,
        'tableName': tname,
        'columns': cols,
        'rows': [dict(r) for r in rows_raw],
    })


@crm_tables_bp.post("/<int:tid>/rows")
@jwt_required()
def insert_row(tid):
    t = CrmTable.query.get_or_404(tid)
    tname = t.staging_table_name()
    if not table_exists(tname):
        return jsonify({'error': 'Table does not exist'}), 400

    data = request.get_json() or {}
    insp = inspect(db.engine)
    allowed = [c['name'] for c in insp.get_columns(tname) if c['name'] not in ('id', 'created_at', 'updated_at')]
    clean = {k: v for k, v in data.items() if k in allowed}
    if not clean:
        return jsonify({'error': 'No valid columns'}), 400

    cols_sql = ', '.join(f'"{k}"' for k in clean.keys())
    vals_sql = ', '.join(f':{k}' for k in clean.keys())
    sql = text(f'INSERT INTO "{tname}" ({cols_sql}) VALUES ({vals_sql}) RETURNING id')
    try:
        new_id = db.session.execute(sql, clean).scalar()
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        msg = str(e.orig) if hasattr(e, 'orig') else str(e)
        # Human-friendly error
        if 'invalid input syntax' in msg.lower() or 'parse numeric' in msg.lower():
            # Find which column failed
            friendly = 'One or more values have the wrong data type. Please check that number columns contain only numbers and date columns have valid dates.'
        else:
            friendly = 'Could not save this row. Please verify your input.'
        return jsonify({'error': friendly, 'details': msg}), 400

    return jsonify({'ok': True, 'id': new_id}), 201


@crm_tables_bp.delete("/<int:tid>/rows/<int:rid>")
@jwt_required()
def delete_row(tid, rid):
    t = CrmTable.query.get_or_404(tid)
    tname = t.staging_table_name()
    if not table_exists(tname):
        return jsonify({'error': 'Table missing'}), 400
    db.session.execute(text(f'DELETE FROM "{tname}" WHERE id = :id'), {'id': rid})
    db.session.commit()
    return jsonify({'ok': True})


@crm_tables_bp.get("/<int:tid>/export")
@jwt_required()
def export_csv(tid):
    t = CrmTable.query.get_or_404(tid)
    tname = t.staging_table_name()
    if not table_exists(tname):
        return jsonify({'error': 'Table missing'}), 400

    cols = [c['name'] for c in inspect(db.engine).get_columns(tname)]
    rows = db.session.execute(text(f'SELECT * FROM "{tname}" ORDER BY id ASC')).mappings().all()

    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(cols)
    for r in rows:
        w.writerow([r[c] for c in cols])

    return Response(
        buf.getvalue(),
        mimetype='text/csv',
        headers={'Content-Disposition': f'attachment; filename={tname}.csv'},
    )


@crm_tables_bp.get("/dropdown")
@jwt_required()
def dropdown():
    items = CrmTable.query.all()
    return jsonify([
        {
            'id': t.id,
            'name': t.name,
            'displayName': t.display_name or t.name,
            'columns': t.columns or [],
        }
        for t in items
    ])


@crm_tables_bp.delete("/<int:tid>/column/<string:colname>")
@jwt_required()
def drop_column(tid, colname):
    """
    Physically drop a single column from PostgreSQL.
    Column must NOT be in the CRM definition (removed from UI first).
    """
    t = CrmTable.query.get_or_404(tid)
    tname = t.staging_table_name()
    if not table_exists(tname):
        return jsonify({'error': 'Table does not exist'}), 400

    # Safety: never allow dropping reserved
    if colname in ('id', 'created_at', 'updated_at'):
        return jsonify({'error': 'Cannot drop reserved column'}), 400

    if not column_exists(tname, colname):
        return jsonify({'error': 'Column does not exist'}), 404

    # Safety: don't drop if still in CRM definition
    defined_cols = [sanitize(c.get('name')) for c in (t.columns or [])]
    if colname in defined_cols:
        return jsonify({'error': 'Column still in definition — remove from UI first'}), 400

    try:
        db.session.execute(text(f'ALTER TABLE "{tname}" DROP COLUMN "{colname}"'))
        db.session.commit()
        return jsonify({'ok': True, 'dropped': colname})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
