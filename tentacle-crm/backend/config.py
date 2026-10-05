import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "tentacle-secret-2025")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "jwt-tentacle-secret-2025")
    JWT_ACCESS_TOKEN_EXPIRES = False

    DB_USER = os.getenv("DB_USER", "postgres")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "5432")
    DB_NAME = os.getenv("DB_NAME", "tentacle_crm")

    SQLALCHEMY_DATABASE_URI = (
        f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False


class SuperAdminConfig:
    USERNAME = os.getenv("SUPERADMIN_USERNAME", "superadmin")
    PASSWORD = os.getenv("SUPERADMIN_PASSWORD", "SuperAdmin@2025")
