"""JALAGEL OS Pro - Configuration Settings"""
import os
import secrets
from datetime import timedelta

# Base directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
INSTANCE_DIR = os.path.join(BASE_DIR, 'instance')
UPLOAD_DIR = os.path.join(BASE_DIR, 'static', 'uploads')

# Ensure directories exist
os.makedirs(INSTANCE_DIR, exist_ok=True)
os.makedirs(UPLOAD_DIR, exist_ok=True)


class Config:
    """Base configuration class."""

    # Flask core
    SECRET_KEY = os.environ.get('SECRET_KEY') or secrets.token_hex(32)

    # Database
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL'
    ) or f'sqlite:///{os.path.join(INSTANCE_DIR, "jalagel_os.db")}'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
    }

    # Upload settings
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file upload
    UPLOAD_FOLDER = UPLOAD_DIR
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'svg', 'pdf', 'txt', 'doc', 'docx'}

    # Session settings
    PERMANENT_SESSION_LIFETIME = timedelta(days=7)
    SESSION_COOKIE_SECURE = False  # Set to True in production with HTTPS
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'

    # Rate limiting
    RATELIMIT_STORAGE_URI = 'memory://'
    RATELIMIT_STRATEGY = 'fixed-window'
    RATELIMIT_DEFAULT = "200 per hour"
    RATELIMIT_STORAGE_OPTIONS = {}

    # Auth settings
    LOGIN_DISABLED = False

    # Security
    WTF_CSRF_ENABLED = True
    WTF_CSRF_TIME_LIMIT = 3600  # 1 hour

    # License tiers
    LICENSE_TIERS = {
        'free': {
            'name': 'Free',
            'price_monthly': 0,
            'price_yearly': 0,
            'max_apps': 10,
            'max_storage': 100 * 1024 * 1024,  # 100MB
            'features': ['Basic Apps', 'Community Support'],
        },
        'pro': {
            'name': 'Pro',
            'price_monthly': 19.99,
            'price_yearly': 199.99,
            'max_apps': 35,
            'max_storage': 1024 * 1024 * 1024,  # 1GB
            'features': ['All Apps', 'Priority Support', 'Certificate Manager', 'Cloud Sync'],
        },
        'enterprise': {
            'name': 'Enterprise',
            'price_monthly': 49.99,
            'price_yearly': 499.99,
            'max_apps': 999,
            'max_storage': 10 * 1024 * 1024 * 1024,  # 10GB
            'features': ['Everything in Pro', 'Custom Branding', 'API Access', 'Dedicated Support', 'SSO'],
        }
    }

    # OS settings
    OS_VERSION = '1.0.0'
    OS_BUILD = '2024.01.15'
    OS_NAME = 'JALAGEL OS Pro'


class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True
    TESTING = False
    SQLALCHEMY_ECHO = False


class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False
    TESTING = False
    SESSION_COOKIE_SECURE = True
    WTF_CSRF_ENABLED = True


class TestingConfig(Config):
    """Testing configuration."""
    TESTING = True
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    WTF_CSRF_ENABLED = False


# Config mapping
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig,
}


def get_config():
    """Get configuration based on environment."""
    env = os.environ.get('FLASK_ENV', 'development')
    return config.get(env, config['default'])
