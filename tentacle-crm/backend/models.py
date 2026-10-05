from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from extensions import db


user_roles = db.Table(
    "user_roles",
    db.Column("user_id", db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    db.Column("role_id", db.Integer, db.ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
)

user_groups = db.Table(
    "user_groups",
    db.Column("user_id", db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    db.Column("group_id", db.Integer, db.ForeignKey("groups.id", ondelete="CASCADE"), primary_key=True),
)

group_campaigns = db.Table(
    "group_campaigns",
    db.Column("group_id", db.Integer, db.ForeignKey("groups.id", ondelete="CASCADE"), primary_key=True),
    db.Column("campaign_id", db.Integer, db.ForeignKey("campaigns.id", ondelete="CASCADE"), primary_key=True),
)


class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    roles = db.relationship("Role", secondary=user_roles, backref="users", lazy="joined")
    groups = db.relationship("Group", secondary=user_groups, backref="users", lazy="joined")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "username": self.username,
            "active": self.active,
            "roles": [r.id for r in self.roles],
            "roleNames": [r.name for r in self.roles],
            "groups": [g.id for g in self.groups],
        }


class Role(db.Model):
    __tablename__ = "roles"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), unique=True, nullable=False)
    description = db.Column(db.Text, default="")
    permissions = db.Column(db.JSON, default=dict)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description or "",
            "permissions": self.permissions or {},
        }


class Group(db.Model):
    __tablename__ = "groups"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text, default="")
    active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    campaigns = db.relationship("Campaign", secondary=group_campaigns, backref="groups", lazy="joined")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description or "",
            "active": self.active,
            "campaigns": [c.id for c in self.campaigns],
        }


class Campaign(db.Model):
    __tablename__ = "campaigns"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, default="")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {"id": self.id, "name": self.name, "description": self.description or ""}


class CrmDesign(db.Model):
    __tablename__ = "crm_designs"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, default="")
    fields = db.Column(db.JSON, default=list)
    theme = db.Column(db.JSON, default=dict)
    field_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description or "",
            "fields": self.fields or [],
            "theme": self.theme or {},
            "fieldCount": self.field_count,
            "lastEdited": self.updated_at.isoformat() if self.updated_at else None,
        }


class AppSetting(db.Model):
    __tablename__ = "app_settings"
    key = db.Column(db.String(50), primary_key=True)
    value = db.Column(db.JSON, nullable=False, default=dict)

    def to_dict(self):
        return {"key": self.key, "value": self.value or {}}


class LicenseRecord(db.Model):
    __tablename__ = "license_records"
    id = db.Column(db.Integer, primary_key=True)
    customer = db.Column(db.String(150), nullable=False)
    valid_from = db.Column(db.DateTime, nullable=False)
    valid_until = db.Column(db.DateTime, nullable=False)
    serial = db.Column(db.String(64))
    features = db.Column(db.JSON, default=list)
    filename = db.Column(db.String(255))
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "customer": self.customer,
            "validFrom": self.valid_from.isoformat(),
            "validUntil": self.valid_until.isoformat(),
            "serial": self.serial,
            "features": self.features or [],
            "filename": self.filename,
            "uploadedAt": self.uploaded_at.isoformat() if self.uploaded_at else None,
        }


class CrmTable(db.Model):
    """A CRM Table = a data table definition created by user.
    Creates real Postgres table: {name}_stagging
    Columns are dynamic (defined in `columns` JSON).
    """
    __tablename__ = "crm_tables"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False, unique=True)
    display_name = db.Column(db.String(150))
    description = db.Column(db.Text, default="")
    interactions = db.Column(db.JSON, default=list)   # ["Call", "Email", ...]
    phone_column_name = db.Column(db.String(80), default="phone")
    phone_column_count = db.Column(db.Integer, default=1)
    columns = db.Column(db.JSON, default=list)
    # columns: [{"name": "leadid", "type": "varchar", "primaryKey": false, "mask": false, "updateTimestamp": false}, ...]
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def staging_table_name(self):
        import re
        base = re.sub(r'[^a-zA-Z0-9_]', '_', (self.name or '').strip().lower())
        base = re.sub(r'_+', '_', base).strip('_')
        if base and base[0].isdigit():
            base = 'c_' + base
        return f"{base}_stagging" if base else None

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "displayName": self.display_name or self.name,
            "description": self.description or "",
            "interactions": self.interactions or [],
            "phoneColumnName": self.phone_column_name or "phone",
            "phoneColumnCount": self.phone_column_count or 1,
            "columns": self.columns or [],
            "stagingTable": self.staging_table_name(),
        }


class CampaignFull(db.Model):
    """Full campaign entity — stored in ten_campaigns table."""
    __tablename__ = "ten_campaigns"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, default="")
    status = db.Column(db.String(50), default="INACTIVE")  # ACTIVE/INACTIVE/PAUSED
    auto_dispose = db.Column(db.String(50), default="DISALLOW")
    crm_id = db.Column(db.Integer, db.ForeignKey("crm_designs.id", ondelete="SET NULL"), nullable=True)
    crm_history = db.Column(db.String(10), default="NO")  # YES/NO
    start_call_url = db.Column(db.String(500), default="")
    mask = db.Column(db.String(50), default="")
    dispositions = db.Column(db.JSON, default=list)
    skills = db.Column(db.JSON, default=list)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description or "",
            "status": self.status or "INACTIVE",
            "autoDispose": self.auto_dispose or "DISALLOW",
            "crmId": self.crm_id,
            "crmHistory": self.crm_history or "NO",
            "startCallUrl": self.start_call_url or "",
            "mask": self.mask or "",
            "dispositions": self.dispositions or [],
            "skills": self.skills or [],
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
        }
