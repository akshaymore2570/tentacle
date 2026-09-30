from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from extensions import db
from models import AppSetting

theme_bp = Blueprint("theme", __name__, url_prefix="/api/theme")


def _get_theme_row():
    row = AppSetting.query.get("theme")
    if not row:
        row = AppSetting(key="theme", value={})
        db.session.add(row)
        db.session.commit()
    return row


@theme_bp.get("")
def get_theme():
    row = _get_theme_row()
    return jsonify(row.value or {})


@theme_bp.put("")
@jwt_required()
def update_theme():
    row = _get_theme_row()
    row.value = request.get_json() or {}
    db.session.commit()
    return jsonify(row.value)
