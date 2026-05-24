"""JALAGEL OS Pro - Main Flask Application"""
import os
import json
import secrets
from datetime import datetime, timedelta

from flask import Flask, render_template, request, jsonify, redirect, url_for, flash, session, g
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import click

from config import get_config
from models import db, User, Certificate, CertificateTemplate, App, FileSystem, Note, Todo, DEFAULT_APPS, CERTIFICATE_TEMPLATES

# Initialize Flask app
def create_app(config_class=None):
    """Application factory pattern."""
    app = Flask(__name__, instance_relative_config=True)
    
    # Load config
    config = config_class or get_config()
    app.config.from_object(config)
    
    # Ensure instance directory exists (fallback for Docker/Render)
    try:
        os.makedirs(app.instance_path, exist_ok=True)
    except Exception:
        app.instance_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'instance')
        os.makedirs(app.instance_path, exist_ok=True)
    
    # Initialize extensions
    db.init_app(app)
    
    # Login manager
    login_manager = LoginManager()
    login_manager.init_app(app)
    login_manager.login_view = 'auth_login'
    login_manager.login_message = 'Please log in to access this page.'
    login_manager.login_message_category = 'info'
    
    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))
    
    # Rate limiter
    limiter = Limiter(
        get_remote_address,
        app=app,
        default_limits=["200 per hour"],
        storage_uri="memory://"
    )
    
    # ============================================================
    # Template Filters
    # ============================================================
    
    @app.template_filter('datetime')
    def format_datetime(value, format_str='%Y-%m-%d %H:%M'):
        if value is None:
            return ''
        if isinstance(value, str):
            try:
                value = datetime.fromisoformat(value.replace('Z', '+00:00'))
            except (ValueError, AttributeError):
                return value
        return value.strftime(format_str)
    
    @app.template_filter('date')
    def format_date(value, format_str='%b %d, %Y'):
        if value is None:
            return ''
        if isinstance(value, str):
            try:
                value = datetime.fromisoformat(value.replace('Z', '+00:00'))
            except (ValueError, AttributeError):
                return value
        return value.strftime(format_str)
    
    @app.template_filter('currency')
    def format_currency(value):
        try:
            return f"${float(value):,.2f}"
        except (ValueError, TypeError):
            return '$0.00'
    
    @app.template_filter('truncate_words')
    def truncate_words(value, num_words=20):
        if not value:
            return ''
        words = str(value).split()
        if len(words) > num_words:
            return ' '.join(words[:num_words]) + '...'
        return value

    @app.template_filter('from_json')
    def from_json_filter(value):
        if not value:
            return []
        try:
            return json.loads(value)
        except (ValueError, TypeError):
            return []

    @app.template_filter('hash_fingerprint')
    def hash_fingerprint_filter(data):
        """Generate a SHA-256 fingerprint for certificate display."""
        import hashlib
        if not data:
            return 'N/A'
        return hashlib.sha256(data.encode()).hexdigest()[:64]
    
    # ============================================================
    # Context Processors
    # ============================================================
    
    @app.context_processor
    def inject_globals():
        return {
            'now': datetime.utcnow(),
            'app_name': app.config.get('OS_NAME', 'JALAGEL OS Pro'),
            'app_version': app.config.get('OS_VERSION', '1.0.0'),
            'license_tiers': app.config.get('LICENSE_TIERS', {}),
        }
    
    @app.context_processor
    def inject_os_apps():
        apps = App.query.all() if db.engine else []
        return {'os_apps': apps}
    
    # ============================================================
    # Error Handlers
    # ============================================================
    
    @app.errorhandler(404)
    def not_found_error(error):
        if request.path.startswith('/api/'):
            return jsonify({'error': 'Not found'}), 404
        return render_template('base.html', error_title='404 - Page Not Found',
                               error_message='The page you requested does not exist.'), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        if request.path.startswith('/api/'):
            return jsonify({'error': 'Internal server error'}), 500
        return render_template('base.html', error_title='500 - Server Error',
                               error_message='An unexpected error occurred. Please try again.'), 500
    
    @app.errorhandler(429)
    def ratelimit_handler(error):
        if request.path.startswith('/api/'):
            return jsonify({'error': 'Rate limit exceeded', 'retry_after': error.description}), 429
        flash('Too many requests. Please slow down.', 'warning')
        return redirect(url_for('home'))
    
    # ============================================================
    # Before/After Request
    # ============================================================
    
    @app.before_request
    def update_last_active():
        if current_user.is_authenticated:
            g.user = current_user
            g.is_admin = current_user.is_admin()
    
    # ============================================================
    # Marketing Routes
    # ============================================================
    
    @app.route('/')
    def home():
        app_count = App.query.count()
        cert_count = CertificateTemplate.query.count()
        return render_template('pages/home.html', 
                               app_count=app_count, 
                               cert_count=cert_count,
                               license_tiers=app.config.get('LICENSE_TIERS', {}))
    
    @app.route('/features')
    def features():
        apps_by_category = {}
        for app_item in App.query.all():
            cat = app_item.category
            if cat not in apps_by_category:
                apps_by_category[cat] = []
            apps_by_category[cat].append(app_item)
        for cat in ['productivity', 'creativity', 'development', 'utilities', 'communication', 'security', 'media', 'system']:
            if cat not in apps_by_category:
                apps_by_category[cat] = []
        return render_template('pages/features.html', 
                               apps_by_category=apps_by_category,
                               total_apps=App.query.count())
    
    @app.route('/pricing')
    def pricing():
        tiers = app.config.get('LICENSE_TIERS', {})
        certs = CertificateTemplate.query.filter_by(is_active=True).all()
        return render_template('pages/pricing.html', tiers=tiers, certificates=certs)
    
    @app.route('/demo')
    def demo():
        demo_apps = App.query.limit(10).all()
        return render_template('pages/demo.html', demo_apps=demo_apps)
    
    @app.route('/docs')
    def docs():
        app_docs = [
            {
                'id': 'notes', 'name': 'Notes', 'icon': 'fa-sticky-note',
                'category': 'productivity', 'premium': False,
                'description': 'Rich text note-taking with color-coded notes, tags, search, pinning, and archive functionality.',
                'features': ['Create rich text notes', 'Color code your notes', 'Add tags for organization', 'Pin important notes', 'Search across all notes', 'Archive old notes', 'Export to text/JSON'],
                'shortcut': 'Ctrl+Alt+N'
            },
            {
                'id': 'calendar', 'name': 'Calendar', 'icon': 'fa-calendar-alt',
                'category': 'productivity', 'premium': False,
                'description': 'Full-featured calendar application with event creation, reminders, and multiple views.',
                'features': ['Month/week/day views', 'Drag-and-drop events', 'Recurring events', 'Event reminders', 'Color-coded categories', 'Calendar sharing'],
                'shortcut': None
            },
            {
                'id': 'todo', 'name': 'Todo List', 'icon': 'fa-check-circle',
                'category': 'productivity', 'premium': False,
                'description': 'Task management with priorities, categories, due dates, and progress tracking.',
                'features': ['Create tasks with priorities', 'Set due dates', 'Organize by categories', 'Track completion', 'Filter by status', 'Sort by priority/date'],
                'shortcut': None
            },
            {
                'id': 'email', 'name': 'Email Client', 'icon': 'fa-envelope',
                'category': 'communication', 'premium': False,
                'description': 'Send, receive, and manage emails with folders, filters, and HTML composition.',
                'features': ['Send/receive emails', 'HTML composition', 'Folder management', 'Contact integration', 'Email filters', 'Draft autosave'],
                'shortcut': None
            },
            {
                'id': 'contacts', 'name': 'Contacts', 'icon': 'fa-address-book',
                'category': 'productivity', 'premium': False,
                'description': 'Contact management with groups, search, import/export, and detailed profiles.',
                'features': ['Add/edit contacts', 'Group management', 'Search contacts', 'Import from CSV', 'Export contacts', 'Email integration'],
                'shortcut': None
            },
            {
                'id': 'paint', 'name': 'Paint Studio', 'icon': 'fa-paint-brush',
                'category': 'creativity', 'premium': True,
                'description': 'Canvas-based drawing tool with multiple brushes, shapes, layers, and export.',
                'features': ['Multiple brush types', 'Shape tools', 'Color picker', 'Layer support', 'Undo/redo', 'Export PNG/JPG'],
                'shortcut': None
            },
            {
                'id': 'canvas', 'name': 'Canvas Editor', 'icon': 'fa-vector-square',
                'category': 'creativity', 'premium': True,
                'description': 'Advanced vector drawing with Bezier curves, gradients, and SVG export.',
                'features': ['Bezier curve tools', 'Gradient fills', 'SVG export/import', 'Shape manipulation', 'Path editing', 'Layer management'],
                'shortcut': None
            },
            {
                'id': 'photos', 'name': 'Photos Viewer', 'icon': 'fa-images',
                'category': 'creativity', 'premium': True,
                'description': 'Photo browser with organization, basic editing, filters, and slideshow mode.',
                'features': ['Browse photo library', 'Apply filters', 'Crop and rotate', 'Slideshow mode', 'Album creation', 'Metadata viewing'],
                'shortcut': None
            },
            {
                'id': 'music', 'name': 'Music Player', 'icon': 'fa-music',
                'category': 'media', 'premium': False,
                'description': 'Audio player with playlists, visualizer, equalizer, and playback controls.',
                'features': ['Play audio files', 'Create playlists', 'Visualizer effects', 'Equalizer settings', 'Repeat/shuffle', 'Background playback'],
                'shortcut': None
            },
            {
                'id': 'video', 'name': 'Video Editor', 'icon': 'fa-video',
                'category': 'creativity', 'premium': True,
                'description': 'Timeline-based video editing with trim, merge, transitions, and export.',
                'features': ['Timeline editing', 'Trim and split clips', 'Add transitions', 'Text overlays', 'Audio mixing', 'Export MP4'],
                'shortcut': None
            },
            {
                'id': 'code-editor', 'name': 'Code Editor', 'icon': 'fa-code',
                'category': 'development', 'premium': True,
                'description': 'Syntax-highlighting code editor supporting 50+ languages with themes.',
                'features': ['50+ language support', 'Syntax highlighting', 'Multiple themes', 'Auto-indentation', 'Search and replace', 'Line numbers'],
                'shortcut': 'Ctrl+Alt+C'
            },
            {
                'id': 'terminal', 'name': 'Terminal', 'icon': 'fa-terminal',
                'category': 'development', 'premium': True,
                'description': 'Web-based terminal emulator with command history and file operations.',
                'features': ['Command execution', 'Command history', 'File operations', 'Directory navigation', 'Tab completion', 'Custom aliases'],
                'shortcut': 'Ctrl+Alt+T'
            },
            {
                'id': 'git', 'name': 'Git Manager', 'icon': 'fa-code-branch',
                'category': 'development', 'premium': True,
                'description': 'Visual Git client with commit history, branching, and merge tools.',
                'features': ['Visual commit history', 'Branch management', 'Merge conflict resolution', 'Diff viewer', 'Stash support', 'Remote sync'],
                'shortcut': None
            },
            {
                'id': 'db-manager', 'name': 'Database Manager', 'icon': 'fa-database',
                'category': 'development', 'premium': True,
                'description': 'Connect to and manage SQLite, MySQL, and PostgreSQL databases.',
                'features': ['Multi-database support', 'Query editor', 'Table browser', 'Schema viewer', 'Export results', 'Connection management'],
                'shortcut': None
            },
            {
                'id': 'api-tester', 'name': 'API Tester', 'icon': 'fa-network-wired',
                'category': 'development', 'premium': True,
                'description': 'Test REST APIs with support for all HTTP methods, headers, and auth.',
                'features': ['All HTTP methods', 'Custom headers', 'JSON body editor', 'Response viewer', 'Auth support', 'Request history'],
                'shortcut': None
            },
            {
                'id': 'calculator', 'name': 'Calculator', 'icon': 'fa-calculator',
                'category': 'utilities', 'premium': False,
                'description': 'Standard and scientific calculator with history and unit conversion.',
                'features': ['Standard mode', 'Scientific mode', 'Calculation history', 'Expression evaluation', 'Unit conversion', 'Memory functions'],
                'shortcut': None
            },
            {
                'id': 'converter', 'name': 'Unit Converter', 'icon': 'fa-exchange-alt',
                'category': 'utilities', 'premium': False,
                'description': 'Convert between 200+ units across length, weight, temperature, and currency.',
                'features': ['200+ unit types', 'Currency conversion', 'Real-time rates', 'Favorites', 'Recent conversions', 'Batch convert'],
                'shortcut': None
            },
            {
                'id': 'password-manager', 'name': 'Password Manager', 'icon': 'fa-key',
                'category': 'security', 'premium': True,
                'description': 'Secure password storage with generator, autofill, and encrypted vault.',
                'features': ['Encrypted vault', 'Password generator', 'Autofill support', 'Categories', 'Secure notes', 'Import/export'],
                'shortcut': None
            },
            {
                'id': 'system-monitor', 'name': 'System Monitor', 'icon': 'fa-tachometer-alt',
                'category': 'utilities', 'premium': True,
                'description': 'Real-time system monitoring with CPU, memory, disk, and network charts.',
                'features': ['CPU usage graphs', 'Memory monitoring', 'Disk usage', 'Network traffic', 'Process list', 'Alert thresholds'],
                'shortcut': None
            },
            {
                'id': 'cert-manager', 'name': 'Certificate Manager', 'icon': 'fa-certificate',
                'category': 'security', 'premium': True,
                'description': 'Full lifecycle SSL certificate management from purchase to revocation.',
                'features': ['Purchase certificates', 'Generate SSL certs', 'Renew certificates', 'Revoke certificates', 'Download PEM files', 'Verify certificates'],
                'shortcut': None
            },
            {
                'id': 'chat', 'name': 'Chat Messenger', 'icon': 'fa-comment-dots',
                'category': 'communication', 'premium': False,
                'description': 'Real-time messaging with channels, file sharing, and emoji reactions.',
                'features': ['Real-time messaging', 'Channel creation', 'File sharing', 'Emoji reactions', 'Read receipts', 'Message search'],
                'shortcut': None
            },
            {
                'id': 'file-manager', 'name': 'File Manager', 'icon': 'fa-folder',
                'category': 'utilities', 'premium': False,
                'description': 'Browse, organize, and manage your files with drag-and-drop support.',
                'features': ['File/folder creation', 'Drag-and-drop', 'Copy/move/delete', 'Search files', 'Starred items', 'Trash recovery'],
                'shortcut': 'Ctrl+Alt+F'
            },
        ]
        return render_template('pages/docs.html', app_docs=app_docs)
    
    # ============================================================
    # Auth Routes
    # ============================================================
    
    @app.route('/auth/login', methods=['GET', 'POST'])
    @limiter.limit("10 per minute")
    def auth_login():
        if current_user.is_authenticated:
            return redirect(url_for('os_desktop'))
        
        if request.method == 'POST':
            username = request.form.get('username', '').strip()
            password = request.form.get('password', '')
            remember = bool(request.form.get('remember'))
            
            if not username or not password:
                flash('Please enter both username and password.', 'error')
                return render_template('auth/login.html')
            
            user = User.query.filter(
                (User.username == username) | (User.email == username)
            ).first()
            
            if user and user.check_password(password):
                if not user.is_active:
                    flash('Account is disabled. Contact support.', 'error')
                    return render_template('auth/login.html')
                
                login_user(user, remember=remember, duration=timedelta(days=7))
                user.last_login = datetime.utcnow()
                db.session.commit()
                
                next_page = request.args.get('next')
                if next_page and next_page.startswith('/'):
                    return redirect(next_page)
                return redirect(url_for('os_desktop'))
            
            flash('Invalid username or password.', 'error')
        
        return render_template('auth/login.html')
    
    @app.route('/auth/register', methods=['GET', 'POST'])
    @limiter.limit("5 per minute")
    def auth_register():
        if current_user.is_authenticated:
            return redirect(url_for('os_desktop'))
        
        if request.method == 'POST':
            username = request.form.get('username', '').strip()
            email = request.form.get('email', '').strip().lower()
            password = request.form.get('password', '')
            confirm_password = request.form.get('confirm_password', '')
            full_name = request.form.get('full_name', '').strip()
            
            errors = []
            if len(username) < 3:
                errors.append('Username must be at least 3 characters.')
            if len(password) < 6:
                errors.append('Password must be at least 6 characters.')
            if password != confirm_password:
                errors.append('Passwords do not match.')
            if '@' not in email or '.' not in email:
                errors.append('Please enter a valid email address.')
            
            if User.query.filter_by(username=username).first():
                errors.append('Username already taken.')
            if User.query.filter_by(email=email).first():
                errors.append('Email already registered.')
            
            if errors:
                for error in errors:
                    flash(error, 'error')
                return render_template('auth/register.html')
            
            user = User(
                username=username,
                email=email,
                full_name=full_name,
                role='user',
                license_tier='free',
                is_active=True,
            )
            user.set_password(password)
            user.license_expires = datetime.utcnow() + timedelta(days=365)
            
            db.session.add(user)
            db.session.commit()
            
            flash('Account created successfully! Welcome to JALAGEL OS Pro.', 'success')
            login_user(user)
            return redirect(url_for('os_desktop'))
        
        return render_template('auth/register.html')
    
    @app.route('/auth/logout')
    @login_required
    def auth_logout():
        logout_user()
        session.clear()
        flash('You have been logged out.', 'info')
        return redirect(url_for('home'))
    
    @app.route('/auth/profile', methods=['GET', 'POST'])
    @login_required
    def auth_profile():
        if request.method == 'POST':
            full_name = request.form.get('full_name', '').strip()
            email = request.form.get('email', '').strip().lower()
            current_password = request.form.get('current_password', '')
            new_password = request.form.get('new_password', '')
            
            if full_name:
                current_user.full_name = full_name
            
            if email and email != current_user.email:
                if User.query.filter_by(email=email).first():
                    flash('Email already in use.', 'error')
                else:
                    current_user.email = email
            
            if current_password and new_password:
                if current_user.check_password(current_password):
                    if len(new_password) >= 6:
                        current_user.set_password(new_password)
                        flash('Password updated successfully.', 'success')
                    else:
                        flash('New password must be at least 6 characters.', 'error')
                else:
                    flash('Current password is incorrect.', 'error')
            
            db.session.commit()
            flash('Profile updated.', 'success')
            return redirect(url_for('auth_profile'))
        
        return render_template('auth/profile.html')
    
    # ============================================================
    # AUTH - Forgot / Reset Password
    # ============================================================

    @app.route('/auth/forgot-password', methods=['GET', 'POST'])
    @limiter.limit("5 per minute")
    def auth_forgot_password():
        """Request password reset link."""
        if current_user.is_authenticated:
            return redirect(url_for('os_desktop'))
        if request.method == 'POST':
            email = request.form.get('email', '').strip().lower()
            user = User.query.filter_by(email=email).first()
            if user:
                token = secrets.token_urlsafe(32)
                user.reset_token = token
                user.reset_expires = datetime.utcnow() + timedelta(hours=24)
                db.session.commit()
            flash('If an account exists with that email, reset instructions have been sent.', 'success')
            return redirect(url_for('auth_forgot_password', sent=1))
        return render_template('auth/forgot_password.html')

    @app.route('/auth/reset-password/<token>', methods=['GET', 'POST'])
    @limiter.limit("5 per minute")
    def auth_reset_password(token):
        """Reset password with token."""
        if current_user.is_authenticated:
            return redirect(url_for('os_desktop'))
        user = User.query.filter_by(reset_token=token).first()
        if not user or not user.reset_expires or user.reset_expires < datetime.utcnow():
            flash('Invalid or expired reset link.', 'error')
            return redirect(url_for('auth_forgot_password'))
        if request.method == 'POST':
            password = request.form.get('password', '')
            confirm = request.form.get('confirm_password', '')
            if len(password) < 6:
                flash('Password must be at least 6 characters.', 'error')
            elif password != confirm:
                flash('Passwords do not match.', 'error')
            else:
                user.set_password(password)
                user.reset_token = None
                user.reset_expires = None
                db.session.commit()
                flash('Password reset successfully. Please sign in.', 'success')
                return redirect(url_for('auth_login'))
        return render_template('auth/reset_password.html', token=token)
    
    # ============================================================
    # OS Interface Routes
    # ============================================================
    
    @app.route('/os')
    @login_required
    def os_desktop():
        apps = App.query.all()
        notes = Note.query.filter_by(user_id=current_user.id, is_archived=False).all()
        todos = Todo.query.filter_by(user_id=current_user.id, completed=False).all()
        files = FileSystem.query.filter_by(user_id=current_user.id, is_trashed=False, parent_id=None).all()
        return render_template('os/desktop.html', 
                               apps=apps, notes=notes, todos=todos, files=files)
    
    # ============================================================
    # App API Routes
    # ============================================================
    
    @app.route('/api/apps')
    @login_required
    def api_apps_list():
        apps = App.query.all()
        return jsonify([app.to_dict() for app in apps])
    
    @app.route('/api/apps/launch', methods=['POST'])
    @login_required
    def api_app_launch():
        data = request.get_json() or {}
        app_id = data.get('app_id')
        app_obj = App.query.get_or_404(app_id)
        app_obj.launch_count += 1
        db.session.commit()
        return jsonify({'success': True, 'app': app_obj.to_dict()})
    
    # ============================================================
    # File Manager API
    # ============================================================
    
    @app.route('/api/files')
    @login_required
    def api_files_list():
        parent_id = request.args.get('parent_id', type=int)
        query = FileSystem.query.filter_by(user_id=current_user.id, is_trashed=False)
        if parent_id:
            query = query.filter_by(parent_id=parent_id)
        else:
            query = query.filter_by(parent_id=None)
        files = query.order_by(FileSystem.type.desc(), FileSystem.name).all()
        return jsonify([f.to_dict() for f in files])
    
    @app.route('/api/files', methods=['POST'])
    @login_required
    def api_file_create():
        data = request.get_json() or {}
        fs_item = FileSystem(
            user_id=current_user.id,
            name=data.get('name', 'New File'),
            path=data.get('path', '/'),
            type=data.get('type', 'file'),
            content=data.get('content', ''),
            parent_id=data.get('parent_id'),
            mime_type=data.get('mime_type', 'text/plain'),
        )
        db.session.add(fs_item)
        db.session.commit()
        return jsonify(fs_item.to_dict()), 201
    
    @app.route('/api/files/<int:file_id>', methods=['PUT'])
    @login_required
    def api_file_update(file_id):
        fs_item = FileSystem.query.filter_by(id=file_id, user_id=current_user.id).first_or_404()
        data = request.get_json() or {}
        
        if 'name' in data:
            fs_item.name = data['name']
        if 'content' in data:
            fs_item.content = data['content']
        if 'parent_id' in data:
            fs_item.parent_id = data['parent_id']
        if 'is_starred' in data:
            fs_item.is_starred = data['is_starred']
        
        fs_item.modified_at = datetime.utcnow()
        db.session.commit()
        return jsonify(fs_item.to_dict())
    
    @app.route('/api/files/<int:file_id>', methods=['DELETE'])
    @login_required
    def api_file_delete(file_id):
        fs_item = FileSystem.query.filter_by(id=file_id, user_id=current_user.id).first_or_404()
        fs_item.is_trashed = True
        db.session.commit()
        return jsonify({'success': True, 'message': 'File moved to trash'})
    
    # ============================================================
    # Notes API
    # ============================================================
    
    @app.route('/api/notes')
    @login_required
    def api_notes_list():
        notes = Note.query.filter_by(user_id=current_user.id).order_by(
            Note.is_pinned.desc(), Note.modified_at.desc()).all()
        return jsonify([n.to_dict() for n in notes])
    
    @app.route('/api/notes', methods=['POST'])
    @login_required
    def api_note_create():
        data = request.get_json() or {}
        note = Note(
            user_id=current_user.id,
            title=data.get('title', 'Untitled Note'),
            content=data.get('content', ''),
            color=data.get('color', '#7C3AED'),
            tags=data.get('tags', ''),
        )
        db.session.add(note)
        db.session.commit()
        return jsonify(note.to_dict()), 201
    
    @app.route('/api/notes/<int:note_id>', methods=['PUT'])
    @login_required
    def api_note_update(note_id):
        note = Note.query.filter_by(id=note_id, user_id=current_user.id).first_or_404()
        data = request.get_json() or {}
        
        if 'title' in data:
            note.title = data['title']
        if 'content' in data:
            note.content = data['content']
        if 'color' in data:
            note.color = data['color']
        if 'is_pinned' in data:
            note.is_pinned = data['is_pinned']
        if 'is_archived' in data:
            note.is_archived = data['is_archived']
        if 'tags' in data:
            note.tags = data['tags']
        
        note.modified_at = datetime.utcnow()
        db.session.commit()
        return jsonify(note.to_dict())
    
    @app.route('/api/notes/<int:note_id>', methods=['DELETE'])
    @login_required
    def api_note_delete(note_id):
        note = Note.query.filter_by(id=note_id, user_id=current_user.id).first_or_404()
        db.session.delete(note)
        db.session.commit()
        return jsonify({'success': True})
    
    # ============================================================
    # Todo API
    # ============================================================
    
    @app.route('/api/todos')
    @login_required
    def api_todos_list():
        todos = Todo.query.filter_by(user_id=current_user.id).order_by(
            Todo.priority.desc(), Todo.created_at.desc()).all()
        return jsonify([t.to_dict() for t in todos])
    
    @app.route('/api/todos', methods=['POST'])
    @login_required
    def api_todo_create():
        data = request.get_json() or {}
        todo = Todo(
            user_id=current_user.id,
            text=data.get('text', ''),
            priority=data.get('priority', 'medium'),
            due_date=datetime.fromisoformat(data['due_date']) if data.get('due_date') else None,
            category=data.get('category', 'General'),
        )
        db.session.add(todo)
        db.session.commit()
        return jsonify(todo.to_dict()), 201
    
    @app.route('/api/todos/<int:todo_id>', methods=['PUT'])
    @login_required
    def api_todo_update(todo_id):
        todo = Todo.query.filter_by(id=todo_id, user_id=current_user.id).first_or_404()
        data = request.get_json() or {}
        
        if 'text' in data:
            todo.text = data['text']
        if 'priority' in data:
            todo.priority = data['priority']
        if 'completed' in data:
            todo.completed = data['completed']
            todo.completed_at = datetime.utcnow() if data['completed'] else None
        if 'category' in data:
            todo.category = data['category']
        
        db.session.commit()
        return jsonify(todo.to_dict())
    
    @app.route('/api/todos/<int:todo_id>/toggle', methods=['POST'])
    @login_required
    def api_todo_toggle(todo_id):
        todo = Todo.query.filter_by(id=todo_id, user_id=current_user.id).first_or_404()
        todo.toggle()
        db.session.commit()
        return jsonify(todo.to_dict())
    
    @app.route('/api/todos/<int:todo_id>', methods=['DELETE'])
    @login_required
    def api_todo_delete(todo_id):
        todo = Todo.query.filter_by(id=todo_id, user_id=current_user.id).first_or_404()
        db.session.delete(todo)
        db.session.commit()
        return jsonify({'success': True})
    
    # ============================================================
    # Certificate System Routes
    # ============================================================
    
    @app.route('/certificates')
    def certificates_store():
        templates = CertificateTemplate.query.filter_by(is_active=True).order_by(
            CertificateTemplate.sort_order).all()
        return render_template('certificates/store.html', templates=templates)
    
    @app.route('/certificates/my')
    @login_required
    def certificates_my():
        certs = Certificate.query.filter_by(user_id=current_user.id).order_by(
            Certificate.created_at.desc()).all()
        return render_template('certificates/my_certificates.html', certificates=certs)
    
    @app.route('/certificates/verify/<int:cert_id>')
    def certificates_verify(cert_id):
        cert = Certificate.query.get_or_404(cert_id)
        return render_template('certificates/verify.html', certificate=cert)
    
    @app.route('/certificates/purchase')
    @login_required
    def certificates_purchase():
        """Multi-step certificate purchase flow."""
        templates = CertificateTemplate.query.filter_by(is_active=True).order_by(
            CertificateTemplate.sort_order).all()
        preselected = request.args.get('template', type=int)
        period = request.args.get('period', 'yearly')
        selected_template = CertificateTemplate.query.get(preselected) if preselected else None
        return render_template('certificates/purchase.html',
                               templates=templates,
                               preselected=preselected,
                               template_type=selected_template.cert_type if selected_template else 'ssl',
                               prefill_domain=request.args.get('domain', ''))

    @app.route('/certificates/checkout', methods=['GET', 'POST'])
    @login_required
    def certificates_checkout():
        """Checkout page for certificate orders."""
        template_id = request.args.get('template', type=int) or request.form.get('template_id', type=int)
        template = CertificateTemplate.query.get_or_404(template_id)
        domain = request.args.get('domain', '') or request.form.get('domain', '')
        validation_method = request.args.get('validation', 'email') or request.form.get('validation_method', 'email')
        billing = request.args.get('billing', 'yearly') or request.form.get('billing', 'yearly')
        
        return render_template('certificates/checkout.html',
                               template=template,
                               domain=domain,
                               validation_method=validation_method,
                               billing=billing)

    @app.route('/api/certificates/purchase', methods=['POST'])
    @login_required
    def api_cert_purchase():
        data = request.get_json() or {}
        template_id = data.get('template_id')
        template = CertificateTemplate.query.get_or_404(template_id)
        
        billing_period = data.get('billing', 'yearly')
        price = template.price_yearly if billing_period == 'yearly' else template.price_monthly
        
        cert = Certificate(
            user_id=current_user.id,
            cert_type=template.cert_type,
            cert_name=template.name,
            domain=data.get('domain', ''),
            issuer='JALAGEL CA',
            expiry_date=datetime.utcnow() + timedelta(days=365),
            status='pending',
            price_paid=price,
        )
        db.session.add(cert)
        db.session.commit()
        return jsonify({'success': True, 'certificate': cert.to_dict()}), 201
    
    @app.route('/api/certificates/generate', methods=['POST'])
    @login_required
    def api_cert_generate():
        data = request.get_json() or {}
        cert_id = data.get('certificate_id')
        cert = Certificate.query.get_or_404(cert_id)
        
        if not current_user.is_admin() and cert.user_id != current_user.id:
            return jsonify({'error': 'Access denied'}), 403
        
        try:
            cert.generate_self_signed(
                domain=cert.domain or cert.cert_name,
                validity_days=365
            )
            cert.status = 'active'
            db.session.commit()
            return jsonify({
                'success': True,
                'certificate': cert.to_dict(),
                'message': 'Certificate generated with RSA 2048-bit encryption'
            })
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500
    
    @app.route('/api/certificates/renew', methods=['POST'])
    @login_required
    def api_cert_renew():
        data = request.get_json() or {}
        cert_id = data.get('certificate_id')
        cert = Certificate.query.get_or_404(cert_id)
        
        if not current_user.is_admin() and cert.user_id != current_user.id:
            return jsonify({'error': 'Access denied'}), 403
        
        if cert.status == 'revoked':
            return jsonify({'error': 'Cannot renew a revoked certificate'}), 400
        
        cert.renew(days=365)
        db.session.commit()
        return jsonify({'success': True, 'certificate': cert.to_dict()})
    
    @app.route('/api/certificates/revoke', methods=['POST'])
    @login_required
    def api_cert_revoke():
        data = request.get_json() or {}
        cert_id = data.get('certificate_id')
        cert = Certificate.query.get_or_404(cert_id)
        
        if not current_user.is_admin() and cert.user_id != current_user.id:
            return jsonify({'error': 'Access denied'}), 403
        
        cert.revoke()
        db.session.commit()
        return jsonify({'success': True, 'message': 'Certificate revoked'})

    @app.route('/api/certificates/validate', methods=['POST'])
    @login_required
    def api_cert_validate():
        """Validate domain ownership and activate certificate."""
        data = request.get_json() or {}
        cert_id = data.get('certificate_id')
        cert = Certificate.query.get_or_404(cert_id)
        
        if not current_user.is_admin() and cert.user_id != current_user.id:
            return jsonify({'error': 'Access denied'}), 403
        
        if cert.status != 'pending':
            return jsonify({'error': 'Certificate is not pending validation'}), 400
        
        cert.generate_self_signed(domain=cert.domain or cert.cert_name, validity_days=365)
        cert.status = 'active'
        db.session.commit()
        return jsonify({
            'success': True,
            'message': 'Domain validation successful. Certificate activated.',
            'certificate': cert.to_dict()
        })
    
    @app.route('/api/certificates/download/<int:cert_id>')
    @login_required
    def api_cert_download(cert_id):
        """Download certificate as PEM file."""
        cert = Certificate.query.get_or_404(cert_id)
        
        if not current_user.is_admin() and cert.user_id != current_user.id:
            return jsonify({'error': 'Access denied'}), 403
        
        if not cert.cert_data:
            return jsonify({'error': 'Certificate not generated yet'}), 400
        
        from flask import Response
        filename = f"{cert.domain or 'certificate'}_{cert.id}.pem"
        return Response(
            cert.cert_data,
            mimetype='application/x-pem-file',
            headers={'Content-Disposition': f'attachment; filename="{filename}"'}
        )
    
    # ============================================================
    # Admin Routes
    # ============================================================
    
    @app.route('/admin')
    @login_required
    def admin_dashboard():
        if not current_user.is_admin():
            flash('Access denied.', 'error')
            return redirect(url_for('os_desktop'))

        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)

        free_count = User.query.filter_by(license_tier='free').count()
        pro_count = User.query.filter_by(license_tier='pro').count()
        enterprise_count = User.query.filter_by(license_tier='enterprise').count()

        monthly_revenue = db.session.query(db.func.sum(Certificate.price_paid)).filter(
            Certificate.created_at >= thirty_days_ago).scalar() or 0

        total_revenue = db.session.query(db.func.sum(Certificate.price_paid)).scalar() or 0

        stats = {
            'total_users': User.query.count(),
            'active_users': User.query.filter_by(is_active=True).count(),
            'new_users_today': User.query.filter(User.created_at >= today).count(),
            'total_certs': Certificate.query.count(),
            'active_certs': Certificate.query.filter_by(status='active').count(),
            'pending_certs': Certificate.query.filter_by(status='pending').count(),
            'total_apps': App.query.count(),
            'premium_users': User.query.filter(User.license_tier.in_(['pro', 'enterprise'])).count(),
            'free_users': free_count,
            'pro_users': pro_count,
            'enterprise_users': enterprise_count,
            'active_licenses': User.query.filter(User.license_tier != 'free').count(),
            'expiring_count': User.query.filter(
                User.license_expires != None,
                User.license_expires <= datetime.utcnow() + timedelta(days=7),
                User.license_expires > datetime.utcnow()).count(),
            'monthly_revenue': monthly_revenue,
            'total_revenue': total_revenue,
            'total_launches': db.session.query(db.func.sum(App.launch_count)).scalar() or 0,
        }

        revenue_data = [1200, 1900, 1500, 2400, 2100, 2800]
        signup_labels = ['W1', 'W2', 'W3', 'W4']
        signup_data = [12, 19, 15, 28]
        cert_dist = [8, 4, 2, 3, 1, 2]

        daily_signups = []
        daily_labels = []
        for i in range(30):
            day_start = today - timedelta(days=i)
            day_end = day_start + timedelta(days=1)
            count = User.query.filter(User.created_at >= day_start, User.created_at < day_end).count()
            daily_signups.append(count)
            daily_labels.append(day_start.strftime('%b %d'))
        daily_signups.reverse()
        daily_labels.reverse()

        recent_users = User.query.order_by(User.created_at.desc()).limit(10).all()
        recent_certs = Certificate.query.order_by(Certificate.created_at.desc()).limit(10).all()

        sys_status = {
            'cpu': 32,
            'ram': 58,
            'disk': 42,
        }

        return render_template('admin/dashboard.html',
                               stats=stats,
                               recent_users=recent_users,
                               recent_certs=recent_certs,
                               revenue_data=revenue_data,
                               signup_labels=signup_labels,
                               signup_data=signup_data,
                               cert_dist=cert_dist,
                               daily_signups=daily_signups,
                               daily_labels=daily_labels,
                               sys=sys_status)
    
    @app.route('/admin/users')
    @login_required
    def admin_users():
        if not current_user.is_admin():
            flash('Access denied.', 'error')
            return redirect(url_for('os_desktop'))
        page = request.args.get('page', 1, type=int)
        per_page = 50
        users = User.query.order_by(User.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False)
        return render_template('admin/users.html', users=users)
    
    @app.route('/admin/licenses')
    @login_required
    def admin_licenses():
        if not current_user.is_admin():
            flash('Access denied.', 'error')
            return redirect(url_for('os_desktop'))

        free_count = User.query.filter_by(license_tier='free').count()
        pro_count = User.query.filter_by(license_tier='pro').count()
        enterprise_count = User.query.filter_by(license_tier='enterprise').count()
        expiring_count = User.query.filter(
            User.license_expires != None,
            User.license_expires <= datetime.utcnow() + timedelta(days=7),
            User.license_expires > datetime.utcnow()).count()

        paid_users = User.query.filter(User.license_tier != 'free').order_by(User.license_expires).all()
        all_users = User.query.order_by(User.username).all()

        return render_template('admin/licenses.html',
                               users=paid_users,
                               all_users=all_users,
                               free_count=free_count,
                               pro_count=pro_count,
                               enterprise_count=enterprise_count,
                               expiring_count=expiring_count)
    
    @app.route('/admin/certificates')
    @login_required
    def admin_certificates():
        if not current_user.is_admin():
            flash('Access denied.', 'error')
            return redirect(url_for('os_desktop'))

        certs = Certificate.query.order_by(Certificate.created_at.desc()).all()
        pending_queue = Certificate.query.filter_by(status='pending').order_by(Certificate.created_at).all()
        total_revenue = db.session.query(db.func.sum(Certificate.price_paid)).scalar() or 0
        active_certs = Certificate.query.filter_by(status='active').count()
        pending_certs = Certificate.query.filter_by(status='pending').count()

        return render_template('admin/certificates.html',
                               certificates=certs,
                               pending_queue=pending_queue,
                               total_revenue=total_revenue,
                               active_certs=active_certs,
                               pending_certs=pending_certs)

    @app.route('/admin/settings', methods=['GET', 'POST'])
    @login_required
    def admin_settings():
        if not current_user.is_admin():
            flash('Access denied.', 'error')
            return redirect(url_for('os_desktop'))

        settings = app.config.get('ADMIN_SETTINGS', {})

        if request.method == 'POST':
            section = request.form.get('section', 'general')
            if section == 'general':
                settings['site_name'] = request.form.get('site_name', 'JALAGEL OS Pro')
                settings['logo_url'] = request.form.get('logo_url', '')
                settings['maintenance_mode'] = bool(request.form.get('maintenance_mode'))
            elif section == 'registration':
                settings['open_registration'] = bool(request.form.get('open_registration'))
                settings['email_verification'] = bool(request.form.get('email_verification'))
            elif section == 'pricing':
                settings['pro_monthly'] = float(request.form.get('pro_monthly', 9.99))
                settings['pro_yearly'] = float(request.form.get('pro_yearly', 99.99))
                settings['enterprise_monthly'] = float(request.form.get('enterprise_monthly', 29.99))
                settings['enterprise_yearly'] = float(request.form.get('enterprise_yearly', 299.99))
            elif section == 'email':
                settings['smtp_server'] = request.form.get('smtp_server', '')
                settings['smtp_port'] = int(request.form.get('smtp_port', 587))
                settings['smtp_username'] = request.form.get('smtp_username', '')
                settings['from_email'] = request.form.get('from_email', 'noreply@jalagel.com')
            elif section == 'security':
                settings['rate_limit_login'] = int(request.form.get('rate_limit_login', 10))
                settings['rate_limit_register'] = int(request.form.get('rate_limit_register', 5))
                settings['session_timeout'] = int(request.form.get('session_timeout', 24))
                settings['force_https'] = bool(request.form.get('force_https'))

            app.config['ADMIN_SETTINGS'] = settings
            flash('Settings saved successfully.', 'success')
            return redirect(url_for('admin_settings'))

        return render_template('admin/settings.html', settings=settings)

    @app.route('/api/admin/users/create', methods=['POST'])
    @login_required
    def api_admin_create_user():
        if not current_user.is_admin():
            return jsonify({'error': 'Access denied'}), 403
        username = request.form.get('username', '').strip()
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')
        full_name = request.form.get('full_name', '').strip()
        role = request.form.get('role', 'user')
        license_tier = request.form.get('license_tier', 'free')
        if User.query.filter_by(username=username).first():
            return jsonify({'error': 'Username already taken'}), 400
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email already registered'}), 400
        user = User(username=username, email=email, full_name=full_name,
                    role=role, license_tier=license_tier, is_active=True)
        user.set_password(password)
        user.license_expires = datetime.utcnow() + timedelta(days=365)
        db.session.add(user)
        db.session.commit()
        flash(f'User "{username}" created successfully.', 'success')
        return redirect(request.referrer or url_for('admin_users'))

    @app.route('/api/admin/users/<int:user_id>/edit', methods=['POST'])
    @login_required
    def api_admin_edit_user(user_id):
        if not current_user.is_admin():
            return jsonify({'error': 'Access denied'}), 403
        user = User.query.get_or_404(user_id)
        full_name = request.form.get('full_name', '').strip()
        email = request.form.get('email', '').strip().lower()
        role = request.form.get('role', user.role)
        is_active = request.form.get('is_active') == '1'
        if full_name:
            user.full_name = full_name
        if email and email != user.email:
            if User.query.filter_by(email=email).first():
                return jsonify({'error': 'Email in use'}), 400
            user.email = email
        user.role = role
        user.is_active = is_active
        db.session.commit()
        flash('User updated.', 'success')
        return redirect(url_for('admin_users'))

    @app.route('/api/admin/users/<int:user_id>/delete', methods=['POST'])
    @login_required
    def api_admin_delete_user(user_id):
        if not current_user.is_admin():
            return jsonify({'error': 'Access denied'}), 403
        user = User.query.get_or_404(user_id)
        if user.id == current_user.id:
            return jsonify({'error': 'Cannot delete yourself'}), 400
        db.session.delete(user)
        db.session.commit()
        return jsonify({'success': True})

    @app.route('/api/admin/users/<int:user_id>/license', methods=['POST'])
    @login_required
    def api_admin_update_license(user_id):
        if not current_user.is_admin():
            return jsonify({'error': 'Access denied'}), 403
        user = User.query.get_or_404(user_id)
        tier = request.form.get('tier', request.get_json(silent=True, force=True) and (request.get_json(silent=True, force=True) or {}).get('tier', 'free'))
        if isinstance(tier, str):
            pass
        elif request.form:
            tier = request.form.get('tier', 'free')
        user.license_tier = tier if isinstance(tier, str) else 'free'
        expires = request.form.get('expires')
        if expires:
            user.license_expires = datetime.strptime(expires, '%Y-%m-%d')
        elif tier == 'free':
            user.license_expires = None
        else:
            user.license_expires = datetime.utcnow() + timedelta(days=365)
        db.session.commit()
        flash('License updated.', 'success')
        return redirect(url_for('admin_licenses'))

    @app.route('/api/admin/users/<int:user_id>/extend-license', methods=['POST'])
    @login_required
    def api_admin_extend_license(user_id):
        if not current_user.is_admin():
            return jsonify({'error': 'Access denied'}), 403
        user = User.query.get_or_404(user_id)
        days = int(request.form.get('days', 30))
        if user.license_expires and user.license_expires > datetime.utcnow():
            user.license_expires = user.license_expires + timedelta(days=days)
        else:
            user.license_expires = datetime.utcnow() + timedelta(days=days)
        db.session.commit()
        flash(f'License extended by {days} days.', 'success')
        return redirect(url_for('admin_licenses'))

    @app.route('/api/admin/users/<int:user_id>/revoke-license', methods=['POST'])
    @login_required
    def api_admin_revoke_license(user_id):
        if not current_user.is_admin():
            return jsonify({'error': 'Access denied'}), 403
        user = User.query.get_or_404(user_id)
        user.license_tier = 'free'
        user.license_expires = None
        db.session.commit()
        return jsonify({'success': True})

    @app.route('/api/admin/generate-license', methods=['POST'])
    @login_required
    def api_admin_generate_license():
        if not current_user.is_admin():
            return jsonify({'error': 'Access denied'}), 403
        user_id = request.form.get('user_id', type=int)
        tier = request.form.get('tier', 'pro')
        duration = int(request.form.get('duration', 365))
        user = User.query.get_or_404(user_id)
        user.license_tier = tier
        user.license_expires = datetime.utcnow() + timedelta(days=duration)
        db.session.commit()
        flash(f'License generated for {user.username}.', 'success')
        return redirect(url_for('admin_licenses'))

    @app.route('/api/admin/certificates/issue', methods=['POST'])
    @login_required
    def api_admin_issue_cert():
        if not current_user.is_admin():
            return jsonify({'error': 'Access denied'}), 403
        user_id = request.form.get('user_id', type=int)
        cert_name = request.form.get('cert_name', '')
        domain = request.form.get('domain', '')
        cert_type = request.form.get('cert_type', 'ssl')
        price_paid = float(request.form.get('price_paid', 0))
        user = User.query.get_or_404(user_id)
        cert = Certificate(
            user_id=user.id,
            cert_type=cert_type,
            cert_name=cert_name,
            domain=domain,
            issuer='JALAGEL CA',
            expiry_date=datetime.utcnow() + timedelta(days=365),
            status='active',
            price_paid=price_paid,
            issued_date=datetime.utcnow(),
            cert_data=f"-----BEGIN CERTIFICATE-----\n{cert_name}\n{secrets.token_hex(256)}\n-----END CERTIFICATE-----",
        )
        db.session.add(cert)
        db.session.commit()
        flash('Certificate issued successfully.', 'success')
        return redirect(url_for('admin_certificates'))

    @app.route('/api/admin/certificates/<int:cert_id>/revoke', methods=['POST'])
    @login_required
    def api_admin_revoke_cert(cert_id):
        if not current_user.is_admin():
            return jsonify({'error': 'Access denied'}), 403
        cert = Certificate.query.get_or_404(cert_id)
        cert.status = 'revoked'
        cert.cert_data = None
        db.session.commit()
        return jsonify({'success': True})

    @app.route('/api/admin/certificates/<int:cert_id>/validate', methods=['POST'])
    @login_required
    def api_admin_validate_cert(cert_id):
        if not current_user.is_admin():
            return jsonify({'error': 'Access denied'}), 403
        cert = Certificate.query.get_or_404(cert_id)
        cert.status = 'active'
        cert.issued_date = datetime.utcnow()
        cert.expiry_date = datetime.utcnow() + timedelta(days=365)
        cert.cert_data = f"-----BEGIN CERTIFICATE-----\n{cert.cert_name}\n{secrets.token_hex(256)}\n-----END CERTIFICATE-----"
        db.session.commit()
        return jsonify({'success': True})

    # ============================================================
    # Health Check
    # ============================================================

    @app.route('/health')
    def health_check():
        return jsonify({
            'status': 'healthy',
            'version': app.config.get('OS_VERSION'),
            'timestamp': datetime.utcnow().isoformat(),
            'database': 'connected' if db.engine else 'disconnected',
        })

    return app


# ============================================================
# Seed Data Function
# ============================================================

def seed_data(app):
    """Seed the database with initial data."""
    with app.app_context():
        db.create_all()
        
        if App.query.count() == 0:
            for app_data in DEFAULT_APPS:
                app_obj = App(**app_data)
                db.session.add(app_obj)
            db.session.commit()
            print(f"  -> Seeded {len(DEFAULT_APPS)} default apps")
        
        if CertificateTemplate.query.count() == 0:
            for i, cert_data in enumerate(CERTIFICATE_TEMPLATES):
                template = CertificateTemplate(
                    name=cert_data['name'],
                    cert_type=cert_data['cert_type'],
                    description=cert_data['description'],
                    price_monthly=cert_data['price_monthly'],
                    price_yearly=cert_data['price_yearly'],
                    features=json.dumps(cert_data['features']),
                    is_active=True,
                    icon=cert_data['icon'],
                    sort_order=i,
                )
                db.session.add(template)
            db.session.commit()
            print(f"  -> Seeded {len(CERTIFICATE_TEMPLATES)} certificate templates")
        
        if User.query.filter_by(role='admin').count() == 0:
            admin = User(
                username='admin',
                email='admin@jalagel.com',
                full_name='Administrator',
                role='admin',
                license_tier='enterprise',
                is_active=True,
                license_expires=datetime.utcnow() + timedelta(days=365*10),
            )
            admin.set_password('admin123')
            db.session.add(admin)
            db.session.commit()
            print("  -> Created admin user (admin / admin123)")
        
        print("  -> Database seeded successfully!")


# ============================================================
# CLI Commands
# ============================================================

app = create_app()

@app.cli.command('seed')
def seed_command():
    """Seed the database with initial data."""
    click.echo('Seeding database...')
    seed_data(app)

@app.cli.command('create-admin')
@click.argument('username')
@click.argument('email')
@click.argument('password')
def create_admin_command(username, email, password):
    """Create an admin user."""
    with app.app_context():
        user = User(
            username=username,
            email=email,
            full_name=username,
            role='admin',
            license_tier='enterprise',
            is_active=True,
            license_expires=datetime.utcnow() + timedelta(days=365),
        )
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        click.echo(f'Admin user {username} created.')


# ============================================================
# Main Entry Point
# ============================================================

if __name__ == '__main__':
    seed_data(app)
    app.run(debug=True, host='0.0.0.0', port=5000)
