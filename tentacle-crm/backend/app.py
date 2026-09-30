from flask import Flask, jsonify, request
from config import Config
from extensions import db, jwt, cors

from routes.auth import auth_bp
from routes.crm import crm_bp
from routes.users import users_bp
from routes.groups import groups_bp, campaign_bp
from routes.roles import roles_bp
from routes.theme import theme_bp
from routes.license import license_bp

from license_manager import verify_license


# Routes that are always allowed even if license is expired
LICENSE_EXEMPT_PATHS = {
    "/api/health",
    "/api/auth/login",
    "/api/auth/me",
    "/api/license/status",
    "/api/license/upload",
}


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    jwt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}})

    app.register_blueprint(auth_bp)
    app.register_blueprint(crm_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(groups_bp)
    app.register_blueprint(campaign_bp)
    app.register_blueprint(roles_bp)
    app.register_blueprint(theme_bp)
    app.register_blueprint(license_bp)

    # ---------------- LICENSE MIDDLEWARE ----------------
    @app.before_request
    def enforce_license():
        # skip non-API routes
        if not request.path.startswith("/api/"):
            return None

        # skip exempt endpoints
        if request.path in LICENSE_EXEMPT_PATHS:
            return None

        info = verify_license()
        if not info["valid"]:
            return jsonify({
                "error": "License expired or invalid",
                "reason": info["reason"],
                "licenseBlocked": True,
            }), 403

        return None

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok"})

    with app.app_context():
        from models import User, Role, Group, Campaign, CrmDesign, AppSetting
        db.create_all()
        from seed import seed_data
        seed_data()

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=True)
