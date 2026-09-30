import os
import json
import base64
from datetime import datetime
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.exceptions import InvalidSignature

LICENSE_DIR = os.path.join(os.path.dirname(__file__), "license")
LICENSE_FILE = os.path.join(LICENSE_DIR, "license.lic")
PUBLIC_KEY_FILE = os.path.join(LICENSE_DIR, "public_key.pem")
PRIVATE_KEY_FILE = os.path.join(LICENSE_DIR, "private_key.pem")

os.makedirs(LICENSE_DIR, exist_ok=True)


def _generate_keypair_if_missing():
    if os.path.exists(PUBLIC_KEY_FILE) and os.path.exists(PRIVATE_KEY_FILE):
        return
    from cryptography.hazmat.primitives.asymmetric import rsa
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    with open(PRIVATE_KEY_FILE, "wb") as f:
        f.write(private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        ))
    with open(PUBLIC_KEY_FILE, "wb") as f:
        f.write(private_key.public_key().public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        ))


def get_public_key():
    _generate_keypair_if_missing()
    with open(PUBLIC_KEY_FILE, "rb") as f:
        return serialization.load_pem_public_key(f.read())


def get_private_key():
    _generate_keypair_if_missing()
    with open(PRIVATE_KEY_FILE, "rb") as f:
        return serialization.load_pem_private_key(f.read(), password=None)


def _load_license_raw():
    if not os.path.exists(LICENSE_FILE):
        return None
    with open(LICENSE_FILE, "r") as f:
        return json.load(f)


def verify_license():
    data = _load_license_raw()
    if not data:
        return {"valid": False, "reason": "No license file installed", "payload": None, "daysLeft": 0}
    try:
        payload_b64 = data.get("payload")
        signature_b64 = data.get("signature")
        if not payload_b64 or not signature_b64:
            return {"valid": False, "reason": "Malformed license file", "payload": None, "daysLeft": 0}
        payload_bytes = base64.b64decode(payload_b64)
        signature = base64.b64decode(signature_b64)
        pub = get_public_key()
        pub.verify(signature, payload_bytes, padding.PKCS1v15(), hashes.SHA256())
        payload = json.loads(payload_bytes.decode("utf-8"))
        now = datetime.utcnow()
        start = datetime.fromisoformat(payload["validFrom"])
        end = datetime.fromisoformat(payload["validUntil"])
        if now < start:
            return {"valid": False, "reason": "License not yet active", "payload": payload, "daysLeft": 0}
        if now > end:
            return {"valid": False, "reason": "License expired", "payload": payload, "daysLeft": 0}
        days_left = (end - now).days
        return {"valid": True, "reason": "OK", "payload": payload, "daysLeft": days_left}
    except InvalidSignature:
        return {"valid": False, "reason": "Invalid license signature", "payload": None, "daysLeft": 0}
    except Exception as e:
        return {"valid": False, "reason": f"License error: {e}", "payload": None, "daysLeft": 0}


def install_license(file_bytes):
    try:
        data = json.loads(file_bytes.decode("utf-8"))
    except Exception:
        return {"ok": False, "error": "Invalid JSON in license file"}
    payload_b64 = data.get("payload")
    signature_b64 = data.get("signature")
    if not payload_b64 or not signature_b64:
        return {"ok": False, "error": "License file missing payload/signature"}
    try:
        payload_bytes = base64.b64decode(payload_b64)
        signature = base64.b64decode(signature_b64)
        pub = get_public_key()
        pub.verify(signature, payload_bytes, padding.PKCS1v15(), hashes.SHA256())
        payload = json.loads(payload_bytes.decode("utf-8"))
    except InvalidSignature:
        return {"ok": False, "error": "Signature verification failed"}
    except Exception as e:
        return {"ok": False, "error": f"Verification error: {e}"}
    with open(LICENSE_FILE, "w") as f:
        json.dump(data, f, indent=2)
    return {"ok": True, "payload": payload}


def create_license(licensee, valid_from, valid_until, features=None, extra=None):
    payload = {
        "licensee": licensee,
        "validFrom": valid_from.isoformat(),
        "validUntil": valid_until.isoformat(),
        "features": features or ["all"],
        "issuedAt": datetime.utcnow().isoformat(),
    }
    if extra:
        payload.update(extra)
    payload_bytes = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    signature = get_private_key().sign(payload_bytes, padding.PKCS1v15(), hashes.SHA256())
    return json.dumps({
        "payload": base64.b64encode(payload_bytes).decode(),
        "signature": base64.b64encode(signature).decode(),
    }, indent=2)
