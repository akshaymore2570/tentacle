from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import User
from license_manager import verify_license, install_license

license_bp = Blueprint("license", __name__, url_prefix="/api/license")


def _is_admin():
    uid = int(get_jwt_identity())
    user = User.query.get(uid)
    if not user:
        return False
    return any(r.name.lower() == "admin" for r in user.roles)


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
    if not _is_admin():
        return jsonify({"error": "Admin access required"}), 403
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    file = request.files["file"]
    if not file.filename.endswith(".lic"):
        return jsonify({"error": "Only .lic files allowed"}), 400
    content = file.read()
    result = install_license(content)
    if not result["ok"]:
        return jsonify({"error": result["error"]}), 400
    return jsonify({
        "ok": True,
        "message": "License installed successfully",
        "payload": result["payload"],
    })
