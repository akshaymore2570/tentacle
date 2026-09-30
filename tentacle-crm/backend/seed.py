from extensions import db
from models import User, Role, Group, Campaign

PERMISSION_STRUCTURE = [
    {"id": "dashboard", "title": "Dashboard Permissions", "rows": [
        {"key": "dashboard_main", "label": "Main Dashboard", "actions": ["view"]},
        {"key": "dashboard_analytics", "label": "Analytics Panel", "actions": ["view", "download"]},
        {"key": "dashboard_realtime", "label": "Realtime Stats", "actions": ["view"]},
    ]},
    {"id": "campaign", "title": "Campaign Role Permissions", "rows": [
        {"key": "campaign_list", "label": "Campaign List", "actions": ["view", "add", "edit", "delete"]},
        {"key": "campaign_create", "label": "Create Campaign", "actions": ["view", "add"]},
        {"key": "campaign_sub", "label": "Sub Campaign", "actions": ["view", "add"]},
        {"key": "campaign_assign", "label": "Assign Campaign", "actions": ["view", "add"]},
    ]},
    {"id": "crm", "title": "CRM Role Permissions", "rows": [
        {"key": "crm_designer", "label": "CRM Designer", "actions": ["view", "add", "edit"]},
        {"key": "crm_table", "label": "CRM Table", "actions": ["view", "download"]},
        {"key": "crm_history", "label": "CRM History Report", "actions": ["view", "download"]},
        {"key": "crm_dispositions", "label": "Dispositions", "actions": ["view", "add"]},
    ]},
    {"id": "reports", "title": "Reports Role Permissions", "rows": [
        {"key": "report_campaign", "label": "Campaign", "actions": ["view"]},
        {"key": "report_summary", "label": "Summary", "actions": ["view", "download"]},
        {"key": "report_cdr", "label": "CDRReport", "actions": ["view", "download"]},
    ]},
    {"id": "users", "title": "User Management Permissions", "rows": [
        {"key": "users_list", "label": "User List", "actions": ["view", "add", "edit", "delete"]},
        {"key": "groups", "label": "Groups", "actions": ["view", "add", "edit", "delete"]},
        {"key": "roles", "label": "Roles", "actions": ["view", "add", "edit", "delete"]},
    ]},
]


def build_full_permissions():
    perms = {}
    for section in PERMISSION_STRUCTURE:
        for row in section["rows"]:
            perms[row["key"]] = list(row["actions"])
    return perms


def seed_data():
    if User.query.first():
        print("Data already seeded. Skipping.")
        return

    camps = [
        Campaign(name="Outbound Q1"),
        Campaign(name="Insurance Leads"),
        Campaign(name="Real Estate Callback"),
    ]
    db.session.add_all(camps)
    db.session.commit()

    admin_role = Role(name="Admin", description="Full access", permissions=build_full_permissions())
    agent_role = Role(name="Agent", description="Only dashboard and CRM",
                      permissions={"dashboard_main": ["view"], "crm_designer": ["view"], "crm_table": ["view"]})
    db.session.add_all([admin_role, agent_role])
    db.session.commit()

    g1 = Group(name="Sales Team A", description="Outbound sales agents")
    g1.campaigns = camps[:2]
    g2 = Group(name="Support Team", description="Inbound support")
    g2.campaigns = camps[2:]
    db.session.add_all([g1, g2])
    db.session.commit()

    admin = User(name="Akshay More", username="admin", active=True)
    admin.set_password("admin123")
    admin.roles = [admin_role]
    admin.groups = [g1]

    agent = User(name="Priya Sharma", username="priya", active=True)
    agent.set_password("priya@123")
    agent.roles = [agent_role]
    agent.groups = [g1, g2]

    demo = User(name="Demo User", username="demo", active=True)
    demo.set_password("demo")
    demo.roles = [agent_role]

    db.session.add_all([admin, agent, demo])
    db.session.commit()
    print("Seed complete! Try: admin/admin123, priya/priya@123, demo/demo")
