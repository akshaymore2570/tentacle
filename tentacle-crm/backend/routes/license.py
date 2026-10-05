from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from extensions import db
from models import LicenseRecord
from license_manager import verify_license, install_license

license_bp = Blueprint("license", __name__, url_prefix="/api/license")


def _is_superadmin():
    return bool(get_jwt().get("is_superadmin"))


@license_bp.get("/status")
def status():
    info = verify_license()
    return jsonify({
        "valid": info["valid"],
        "reason": info["reason"],
        "daysLeft": info["daysLeft"],
        "payload": info["payload"],
    })


@license_bp.post("/upload")
@jwt_required()
def upload():
    if not _is_superadmin():
        return jsonify({"error": "Super admin access required"}), 403

    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    if not file.filename.endswith(".lic"):
        return jsonify({"error": "Only .lic files allowed"}), 400

    content = file.read()
    result = install_license(content)
    if not result["ok"]:
        return jsonify({"error": result["error"]}), 400

    payload = result["payload"]

    rec = LicenseRecord(
        customer=payload.get("customer") or payload.get("licensee") or "Unknown",
        valid_from=datetime.fromisoformat(payload["validFrom"]),
        valid_until=datetime.fromisoformat(payload["validUntil"]),
        serial=payload.get("serial"),
        features=payload.get("features") or [],
        filename=file.filename,
    )
    db.session.add(rec)
    db.session.commit()

    return jsonify({
        "ok": True,
        "message": "License installed successfully",
        "payload": payload,
        "record": rec.to_dict(),
    })


@license_bp.get("/records")
@jwt_required()
def list_records():
    if not _is_superadmin():
        return jsonify({"error": "Super admin access required"}), 403
    records = LicenseRecord.query.order_by(LicenseRecord.uploaded_at.desc()).all()
    return jsonify([r.to_dict() for r in records])


@license_bp.put("/record/<int:rid>")
@jwt_required()
def update_record(rid):
    if not _is_superadmin():
        return jsonify({"error": "Super admin access required"}), 403

    rec = LicenseRecord.query.get_or_404(rid)
    data = request.get_json() or {}

    if "customer" in data:
        rec.customer = data["customer"]
    if "validFrom" in data:
        rec.valid_from = datetime.fromisoformat(data["validFrom"])
    if "validUntil" in data:
        rec.valid_until = datetime.fromisoformat(data["validUntil"])
    if "features" in data:
        rec.features = data["features"]

    db.session.commit()
    return jsonify(rec.to_dict())


@license_bp.post("/remove")
@jwt_required()
def remove():
    if not _is_superadmin():
        return jsonify({"error": "Super admin access required"}), 403
    import os
    from license_manager import LICENSE_FILE
    if os.path.exists(LICENSE_FILE):
        os.remove(LICENSE_FILE)
    return jsonify({"ok": True, "message": "License removed"})
