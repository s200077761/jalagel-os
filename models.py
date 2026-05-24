"""JALAGEL OS Pro - Database Models"""
from datetime import datetime, timedelta
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
import secrets
import json

db = SQLAlchemy()


class User(UserMixin, db.Model):
    """User model with Flask-Login integration."""
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    full_name = db.Column(db.String(120), default='')
    avatar = db.Column(db.String(200), default='default-avatar.svg')
    role = db.Column(db.String(20), default='user')
    license_tier = db.Column(db.String(20), default='free')
    license_key = db.Column(db.String(64), unique=True, nullable=True)
    license_expires = db.Column(db.DateTime, nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime, nullable=True)

    # Relationships
    certificates = db.relationship('Certificate', backref='owner', lazy='dynamic',
                                   cascade='all, delete-orphan')
    files = db.relationship('FileSystem', backref='owner', lazy='dynamic',
                            cascade='all, delete-orphan')
    notes = db.relationship('Note', backref='owner', lazy='dynamic',
                            cascade='all, delete-orphan')
    todos = db.relationship('Todo', backref='owner', lazy='dynamic',
                            cascade='all, delete-orphan')

    def __init__(self, **kwargs):
        super(User, self).__init__(**kwargs)
        if not self.license_key:
            self.license_key = secrets.token_hex(32)

    def set_password(self, password):
        """Hash and set user password."""
        self.password_hash = generate_password_hash(password, method='pbkdf2:sha256', salt_length=16)

    def check_password(self, password):
        """Check password against hash."""
        return check_password_hash(self.password_hash, password)

    def is_admin(self):
        """Check if user is admin."""
        return self.role == 'admin'

    def is_premium(self):
        """Check if user has premium access."""
        return self.license_tier in ('pro', 'enterprise')

    def license_is_valid(self):
        """Check if license is still valid."""
        if self.license_tier == 'free':
            return True
        if not self.license_expires:
            return False
        return datetime.utcnow() < self.license_expires

    def days_until_expiry(self):
        """Get number of days until license expires."""
        if not self.license_expires:
            return -1
        delta = self.license_expires - datetime.utcnow()
        return max(0, delta.days)

    def to_dict(self):
        """Serialize user to dictionary."""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'full_name': self.full_name,
            'role': self.role,
            'license_tier': self.license_tier,
            'license_key': self.license_key,
            'license_expires': self.license_expires.isoformat() if self.license_expires else None,
            'license_valid': self.license_is_valid(),
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'avatar': self.avatar,
        }

    def __repr__(self):
        return f'<User {self.username}>'


class Certificate(db.Model):
    """SSL/Domain certificate model."""
    __tablename__ = 'certificates'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    cert_type = db.Column(db.String(50), nullable=False)
    cert_name = db.Column(db.String(200), nullable=False)
    domain = db.Column(db.String(200), default='')
    issuer = db.Column(db.String(200), default='JALAGEL CA')
    issued_date = db.Column(db.DateTime, default=datetime.utcnow)
    expiry_date = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.String(20), default='pending')
    cert_data = db.Column(db.Text)
    private_key = db.Column(db.Text)
    csr_data = db.Column(db.Text)
    price_paid = db.Column(db.Float, default=0.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def is_expired(self):
        """Check if certificate has expired."""
        return datetime.utcnow() > self.expiry_date

    def days_until_expiry(self):
        """Get days until certificate expires."""
        delta = self.expiry_date - datetime.utcnow()
        return max(0, delta.days)

    def update_status(self):
        """Auto-update status based on expiry."""
        if self.status == 'revoked':
            return
        if self.is_expired():
            self.status = 'expired'
        else:
            self.status = 'active'

    def to_dict(self):
        """Serialize certificate to dictionary."""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'cert_type': self.cert_type,
            'cert_name': self.cert_name,
            'domain': self.domain,
            'issuer': self.issuer,
            'issued_date': self.issued_date.isoformat() if self.issued_date else None,
            'expiry_date': self.expiry_date.isoformat() if self.expiry_date else None,
            'status': self.status,
            'price_paid': self.price_paid,
            'days_remaining': self.days_until_expiry(),
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f'<Certificate {self.cert_name}>'


class CertificateTemplate(db.Model):
    """Certificate template for store display."""
    __tablename__ = 'certificate_templates'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    cert_type = db.Column(db.String(50), nullable=False)
    description = db.Column(db.Text, default='')
    price_monthly = db.Column(db.Float, default=0.0)
    price_yearly = db.Column(db.Float, default=0.0)
    features = db.Column(db.Text, default='[]')
    is_active = db.Column(db.Boolean, default=True)
    icon = db.Column(db.String(50), default='fa-certificate')
    sort_order = db.Column(db.Integer, default=0)

    def get_features(self):
        """Get features as a list."""
        try:
            return json.loads(self.features)
        except (json.JSONDecodeError, TypeError):
            return []

    def set_features(self, features_list):
        """Set features from a list."""
        self.features = json.dumps(features_list)

    def to_dict(self):
        """Serialize template to dictionary."""
        return {
            'id': self.id,
            'name': self.name,
            'cert_type': self.cert_type,
            'description': self.description,
            'price_monthly': self.price_monthly,
            'price_yearly': self.price_yearly,
            'features': self.get_features(),
            'is_active': self.is_active,
            'icon': self.icon,
        }

    def __repr__(self):
        return f'<CertificateTemplate {self.name}>'


class App(db.Model):
    """OS Application model."""
    __tablename__ = 'apps'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    slug = db.Column(db.String(100), unique=True, nullable=False)
    icon = db.Column(db.String(50), default='fa-solid fa-cube')
    icon_svg = db.Column(db.Text, default='')
    category = db.Column(db.String(50), default='Utility')
    description = db.Column(db.Text, default='')
    is_system = db.Column(db.Boolean, default=False)
    is_premium = db.Column(db.Boolean, default=False)
    launch_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        """Serialize app to dictionary."""
        return {
            'id': self.id,
            'name': self.name,
            'slug': self.slug,
            'icon': self.icon,
            'category': self.category,
            'description': self.description,
            'is_system': self.is_system,
            'is_premium': self.is_premium,
            'launch_count': self.launch_count,
        }

    def __repr__(self):
        return f'<App {self.name}>'


class FileSystem(db.Model):
    """Virtual file system model."""
    __tablename__ = 'filesystem'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    path = db.Column(db.String(500), nullable=False)
    type = db.Column(db.String(20), default='file')
    size = db.Column(db.Integer, default=0)
    content = db.Column(db.Text, default='')
    mime_type = db.Column(db.String(100), default='text/plain')
    parent_id = db.Column(db.Integer, db.ForeignKey('filesystem.id'), nullable=True)
    is_starred = db.Column(db.Boolean, default=False)
    is_trashed = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    modified_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    children = db.relationship('FileSystem', backref=db.backref('parent', remote_side=[id]),
                               lazy='dynamic', cascade='all, delete-orphan')

    def get_full_path(self):
        """Get full file path."""
        if self.parent:
            return f"{self.parent.get_full_path()}/{self.name}"
        return self.path

    def get_size_display(self):
        """Get human-readable file size."""
        size = self.size
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024:
                return f"{size:.1f} {unit}"
            size /= 1024
        return f"{size:.1f} TB"

    def to_dict(self):
        """Serialize file to dictionary."""
        return {
            'id': self.id,
            'name': self.name,
            'path': self.path,
            'type': self.type,
            'size': self.size,
            'size_display': self.get_size_display(),
            'mime_type': self.mime_type,
            'parent_id': self.parent_id,
            'is_starred': self.is_starred,
            'is_trashed': self.is_trashed,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'modified_at': self.modified_at.isoformat() if self.modified_at else None,
        }

    def __repr__(self):
        return f'<FileSystem {self.name}>'


class Note(db.Model):
    """Notes application model."""
    __tablename__ = 'notes'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(200), default='Untitled Note')
    content = db.Column(db.Text, default='')
    color = db.Column(db.String(20), default='#7C3AED')
    is_pinned = db.Column(db.Boolean, default=False)
    is_archived = db.Column(db.Boolean, default=False)
    tags = db.Column(db.String(500), default='')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    modified_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def get_tags_list(self):
        """Get tags as a list."""
        return [t.strip() for t in self.tags.split(',') if t.strip()]

    def excerpt(self, length=150):
        """Get content excerpt."""
        text = self.content[:length] if self.content else ''
        if len(self.content or '') > length:
            text += '...'
        return text

    def to_dict(self):
        """Serialize note to dictionary."""
        return {
            'id': self.id,
            'title': self.title,
            'content': self.content,
            'excerpt': self.excerpt(),
            'color': self.color,
            'is_pinned': self.is_pinned,
            'is_archived': self.is_archived,
            'tags': self.get_tags_list(),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'modified_at': self.modified_at.isoformat() if self.modified_at else None,
        }

    def __repr__(self):
        return f'<Note {self.title}>'


class Todo(db.Model):
    """Todo list application model."""
    __tablename__ = 'todos'

    PRIORITY_LEVELS = {
        'low': 1,
        'medium': 2,
        'high': 3,
        'urgent': 4,
    }

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    text = db.Column(db.String(500), nullable=False)
    completed = db.Column(db.Boolean, default=False)
    priority = db.Column(db.String(20), default='medium')
    due_date = db.Column(db.DateTime, nullable=True)
    category = db.Column(db.String(50), default='General')
    sort_order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)

    def toggle(self):
        """Toggle completion status."""
        self.completed = not self.completed
        if self.completed:
            self.completed_at = datetime.utcnow()
        else:
            self.completed_at = None

    def priority_value(self):
        """Get numeric priority value."""
        return self.PRIORITY_LEVELS.get(self.priority, 2)

    def is_overdue(self):
        """Check if todo is overdue."""
        if self.completed or not self.due_date:
            return False
        return datetime.utcnow() > self.due_date

    def to_dict(self):
        """Serialize todo to dictionary."""
        return {
            'id': self.id,
            'text': self.text,
            'completed': self.completed,
            'priority': self.priority,
            'priority_value': self.priority_value(),
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'category': self.category,
            'is_overdue': self.is_overdue(),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
        }

    def __repr__(self):
        return f'<Todo {self.text[:30]}>'


# Seed data
DEFAULT_APPS = [
    {'name': 'Settings', 'slug': 'settings', 'icon': 'fa-solid fa-gear', 'category': 'System', 'is_system': True, 'description': 'System settings and preferences'},
    {'name': 'File Manager', 'slug': 'file-manager', 'icon': 'fa-solid fa-folder-open', 'category': 'System', 'is_system': True, 'description': 'Browse and manage files'},
    {'name': 'Terminal', 'slug': 'terminal', 'icon': 'fa-solid fa-terminal', 'category': 'System', 'is_system': True, 'description': 'Command line interface'},
    {'name': 'System Monitor', 'slug': 'system-monitor', 'icon': 'fa-solid fa-chart-line', 'category': 'System', 'is_system': True, 'description': 'Monitor system resources'},
    {'name': 'Notes', 'slug': 'notes', 'icon': 'fa-solid fa-note-sticky', 'category': 'Productivity', 'description': 'Create and organize notes'},
    {'name': 'Todo List', 'slug': 'todo', 'icon': 'fa-solid fa-list-check', 'category': 'Productivity', 'description': 'Task management'},
    {'name': 'Calendar', 'slug': 'calendar', 'icon': 'fa-solid fa-calendar-days', 'category': 'Productivity', 'description': 'Calendar and events'},
    {'name': 'Clock & Alarm', 'slug': 'clock', 'icon': 'fa-solid fa-clock', 'category': 'Productivity', 'description': 'Clock, alarms and timers'},
    {'name': 'Timer & Stopwatch', 'slug': 'timer', 'icon': 'fa-solid fa-stopwatch', 'category': 'Productivity', 'description': 'Countdown timer and stopwatch'},
    {'name': 'World Clock', 'slug': 'world-clock', 'icon': 'fa-solid fa-earth-americas', 'category': 'Productivity', 'description': 'Time zones around the world'},
    {'name': 'Contacts', 'slug': 'contacts', 'icon': 'fa-solid fa-address-book', 'category': 'Productivity', 'description': 'Contact management'},
    {'name': 'Music Player', 'slug': 'music-player', 'icon': 'fa-solid fa-music', 'category': 'Media', 'description': 'Play your music collection'},
    {'name': 'Video Player', 'slug': 'video-player', 'icon': 'fa-solid fa-film', 'category': 'Media', 'description': 'Video playback'},
    {'name': 'Photos Viewer', 'slug': 'photos', 'icon': 'fa-solid fa-images', 'category': 'Media', 'description': 'Browse and view photos'},
    {'name': 'Camera', 'slug': 'camera', 'icon': 'fa-solid fa-camera', 'category': 'Media', 'description': 'Camera and photo capture'},
    {'name': 'Voice Recorder', 'slug': 'voice-recorder', 'icon': 'fa-solid fa-microphone', 'category': 'Media', 'description': 'Record audio'},
    {'name': 'Screenshot Tool', 'slug': 'screenshot', 'icon': 'fa-solid fa-camera-retro', 'category': 'Media', 'description': 'Capture screenshots'},
    {'name': 'Code Editor', 'slug': 'code-editor', 'icon': 'fa-solid fa-code', 'category': 'Development', 'description': 'Source code editor', 'is_premium': True},
    {'name': 'JSON Formatter', 'slug': 'json-formatter', 'icon': 'fa-solid fa-brackets-curly', 'category': 'Development', 'description': 'Format and validate JSON'},
    {'name': 'Regex Tester', 'slug': 'regex-tester', 'icon': 'fa-solid fa-spell-check', 'category': 'Development', 'description': 'Test regular expressions'},
    {'name': 'Base64 Encoder', 'slug': 'base64', 'icon': 'fa-solid fa-lock', 'category': 'Development', 'description': 'Encode/decode Base64'},
    {'name': 'Hash Generator', 'slug': 'hash-generator', 'icon': 'fa-solid fa-fingerprint', 'category': 'Development', 'description': 'Generate file hashes'},
    {'name': 'Database Manager', 'slug': 'database-manager', 'icon': 'fa-solid fa-database', 'category': 'Development', 'is_premium': True, 'description': 'Database management tool'},
    {'name': 'Network Tools', 'slug': 'network-tools', 'icon': 'fa-solid fa-network-wired', 'category': 'Development', 'description': 'Network diagnostics'},
    {'name': 'Paint', 'slug': 'paint', 'icon': 'fa-solid fa-palette', 'category': 'Creative', 'description': 'Digital painting'},
    {'name': 'Canvas Drawing', 'slug': 'canvas', 'icon': 'fa-solid fa-paintbrush', 'category': 'Creative', 'description': 'Advanced canvas drawing'},
    {'name': 'Whiteboard', 'slug': 'whiteboard', 'icon': 'fa-solid fa-chalkboard', 'category': 'Creative', 'is_premium': True, 'description': 'Collaborative whiteboard'},
    {'name': 'Color Picker', 'slug': 'color-picker', 'icon': 'fa-solid fa-eye-dropper', 'category': 'Creative', 'description': 'Color selection tool'},
    {'name': 'Mind Map', 'slug': 'mind-map', 'icon': 'fa-solid fa-diagram-project', 'category': 'Creative', 'is_premium': True, 'description': 'Create mind maps'},
    {'name': 'Calculator', 'slug': 'calculator', 'icon': 'fa-solid fa-calculator', 'category': 'Utilities', 'description': 'Basic calculator'},
    {'name': 'Calculator Pro', 'slug': 'calculator-pro', 'icon': 'fa-solid fa-square-root-variable', 'category': 'Utilities', 'is_premium': True, 'description': 'Scientific calculator'},
    {'name': 'Unit Converter', 'slug': 'unit-converter', 'icon': 'fa-solid fa-right-left', 'category': 'Utilities', 'description': 'Convert units of measurement'},
    {'name': 'Translator', 'slug': 'translator', 'icon': 'fa-solid fa-language', 'category': 'Utilities', 'description': 'Text translation'},
    {'name': 'Weather', 'slug': 'weather', 'icon': 'fa-solid fa-cloud-sun', 'category': 'Utilities', 'description': 'Weather forecast'},
    {'name': 'Password Manager', 'slug': 'password-manager', 'icon': 'fa-solid fa-key', 'category': 'Utilities', 'is_premium': True, 'description': 'Secure password storage'},
    {'name': 'Maps', 'slug': 'maps', 'icon': 'fa-solid fa-map-location-dot', 'category': 'Utilities', 'description': 'Interactive maps'},
    {'name': 'QR Code Generator', 'slug': 'qr-code', 'icon': 'fa-solid fa-qrcode', 'category': 'Utilities', 'description': 'Generate QR codes'},
    {'name': 'Barcode Scanner', 'slug': 'barcode', 'icon': 'fa-solid fa-barcode', 'category': 'Utilities', 'description': 'Scan and generate barcodes'},
    {'name': 'Text Editor', 'slug': 'text-editor', 'icon': 'fa-solid fa-file-lines', 'category': 'Documents', 'description': 'Rich text editor'},
    {'name': 'PDF Viewer', 'slug': 'pdf-viewer', 'icon': 'fa-solid fa-file-pdf', 'category': 'Documents', 'description': 'View PDF documents'},
    {'name': 'Spreadsheet', 'slug': 'spreadsheet', 'icon': 'fa-solid fa-table-cells', 'category': 'Documents', 'is_premium': True, 'description': 'Spreadsheet application'},
    {'name': 'Slides', 'slug': 'slides', 'icon': 'fa-solid fa-person-chalkboard', 'category': 'Documents', 'is_premium': True, 'description': 'Presentation slides'},
    {'name': 'Kanban Board', 'slug': 'kanban', 'icon': 'fa-solid fa-columns', 'category': 'Documents', 'is_premium': True, 'description': 'Kanban task board'},
    {'name': 'Time Tracker', 'slug': 'time-tracker', 'icon': 'fa-solid fa-hourglass-half', 'category': 'Documents', 'is_premium': True, 'description': 'Track time spent on tasks'},
    {'name': 'Web Browser', 'slug': 'browser', 'icon': 'fa-solid fa-globe', 'category': 'Communication', 'description': 'Browse the web'},
    {'name': 'Email Client', 'slug': 'email', 'icon': 'fa-solid fa-envelope', 'category': 'Communication', 'is_premium': True, 'description': 'Email management'},
    {'name': 'Chat Messenger', 'slug': 'chat', 'icon': 'fa-solid fa-comments', 'category': 'Communication', 'is_premium': True, 'description': 'Instant messaging'},
    {'name': 'News Reader', 'slug': 'news', 'icon': 'fa-solid fa-newspaper', 'category': 'Information', 'description': 'Read news feeds'},
    {'name': 'Stocks Ticker', 'slug': 'stocks', 'icon': 'fa-solid fa-arrow-trend-up', 'category': 'Information', 'is_premium': True, 'description': 'Stock market tracker'},
    {'name': 'Certificate Manager', 'slug': 'certificate-manager', 'icon': 'fa-solid fa-shield-halved', 'category': 'Security', 'is_premium': True, 'description': 'Manage SSL certificates'},
]

CERTIFICATE_TEMPLATES = [
    {
        'name': 'DV SSL',
        'cert_type': 'ssl',
        'description': 'Domain Validated SSL certificate. Basic encryption for your website. Validates domain ownership only. Issued within minutes.',
        'price_monthly': 0.83,
        'price_yearly': 9.99,
        'features': ['Domain Validation', '2048-bit RSA Encryption', 'Issued in Minutes', 'Browser Padlock', 'HTTPS Enabled', 'Free Reissues'],
        'icon': 'fa-solid fa-lock',
    },
    {
        'name': 'OV SSL',
        'cert_type': 'ssl',
        'description': 'Organization Validated SSL certificate. Business identity verification included. Shows your organization name in certificate details.',
        'price_monthly': 4.17,
        'price_yearly': 49.99,
        'features': ['Organization Validation', 'Business Identity Verified', '2048-bit RSA Encryption', 'Wildcard Support', '$50,000 Warranty', 'Priority Support', 'Dynamic Site Seal'],
        'icon': 'fa-solid fa-building-shield',
    },
    {
        'name': 'EV SSL',
        'cert_type': 'ssl',
        'description': 'Extended Validation SSL certificate. Maximum trust with green bar display. Full business verification for premium credibility.',
        'price_monthly': 12.50,
        'price_yearly': 149.99,
        'features': ['Extended Validation', 'Green Address Bar', 'Organization Name Displayed', 'Highest Trust Level', '$1,000,000 Warranty', 'Priority Support', 'Premium Site Seal', 'SGC (Server Gated Cryptography)'],
        'icon': 'fa-solid fa-shield-halved',
    },
    {
        'name': 'Wildcard SSL',
        'cert_type': 'ssl',
        'description': 'Secure unlimited subdomains with a single certificate. Perfect for businesses with multiple services under one domain.',
        'price_monthly': 16.67,
        'price_yearly': 199.99,
        'features': ['Unlimited Subdomains', '*.domain.com Coverage', 'Domain Validation', '2048-bit RSA Encryption', 'Auto Subdomain Detection', 'Free Reissues', '$100,000 Warranty'],
        'icon': 'fa-solid fa-asterisk',
    },
    {
        'name': 'Multi-Domain (SAN)',
        'cert_type': 'ssl',
        'description': 'Secure up to 250 domains with one certificate. Ideal for SaaS platforms and businesses managing multiple properties.',
        'price_monthly': 24.99,
        'price_yearly': 299.99,
        'features': ['Up to 250 Domains', 'SAN/UCC Support', 'Organization Validation', '2048-bit RSA Encryption', 'Unified Management', '$250,000 Warranty', 'Bulk Discount Available', 'API Automation'],
        'icon': 'fa-solid fa-server',
    },
    {
        'name': 'Code Signing',
        'cert_type': 'code',
        'description': 'Digitally sign your software and applications. Remove unknown publisher warnings and build user trust in your code.',
        'price_monthly': 16.67,
        'price_yearly': 199.99,
        'features': ['Software Signing', 'Driver Signing', 'Unknown Publisher Removal', 'Timestamping Included', 'SHA-256 Encryption', 'Windows/macOS/Linux', '$50,000 Warranty', 'EV Option Available'],
        'icon': 'fa-solid fa-file-signature',
    },
    {
        'name': 'Enterprise Certificate',
        'cert_type': 'enterprise',
        'description': 'Custom Certificate Authority solution. Full API access, dedicated support, and enterprise-grade certificate management.',
        'price_monthly': 41.67,
        'price_yearly': 499.99,
        'features': ['Private CA', 'Unlimited Certificates', 'Full API Access', 'Custom Certificate Profiles', 'LDAP/AD Integration', 'Auto Enrollment', 'Dedicated Account Manager', '24/7 Priority Support', 'Custom CRL & OCSP', 'HSM Support'],
        'icon': 'fa-solid fa-crown',
    },
    {
        'name': 'Premium JALAGEL Certificate',
        'cert_type': 'ssl',
        'description': 'Branded SSL certificate with the trusted JALAGEL seal. Includes trust badge for your website and enhanced brand recognition.',
        'price_monthly': 8.33,
        'price_yearly': 99.99,
        'features': ['JALAGEL Branded Seal', 'Organization Validation', 'Trust Badge Included', '2048-bit RSA Encryption', 'Domain Authentication', 'Priority Issuance', '$100,000 Warranty', 'Seal Customization', 'Analytics Dashboard'],
        'icon': 'fa-solid fa-certificate',
    },
]
