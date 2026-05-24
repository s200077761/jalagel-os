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
    
    # Ensure instance directory exists
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
    
    # ============================================================
    # ENHANCED MARKETING ROUTES
    # ============================================================

    @app.route('/features')
    def features():
        apps_by_category = {}
        for app_item in App.query.all():
            cat = app_item.category
            if cat not in apps_by_category:
                apps_by_category[cat] = []
            apps_by_category[cat].append(app_item)
        # Ensure all 6 display categories exist even if DB is empty
        for cat in ['productivity', 'creativity', 'development', 'utilities', 'communication', 'security', 'media', 'system']:
            if cat not in apps_by_category:
                apps_by_category[cat] = []
        return render_template('pages/features.html',
                               apps_by_category=apps_by_category,
                               total_apps=App.query.count())

    @app.route('/pricing')
    def pricing():
        tiers = app.config.get('LICENSE_TIERS', {})
        certs = CertificateTemplate.query.filter_by(is_active=True).order_by(
            CertificateTemplate.price_yearly).all()
        return render_template('pages/pricing.html', tiers=tiers, certificates=certs)

    @app.route('/demo')
    def demo():
        demo_apps = App.query.limit(10).all()
        return render_template('pages/demo.html', demo_apps=demo_apps)

    @app.route('/docs')
    def docs():
        # Rich structured documentation data for 20+ apps
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
            cert_name=f"{template.name} - {data.get('domain', 'Pending')}",
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
        cert = Certificate.query.filter_by(id=cert_id, user_id=current_user.id).first_or_404()
        
        # Generate dummy cert data
        cert.status = 'active'
        cert.cert_data = f"-----BEGIN CERTIFICATE-----\n{cert.cert_name}\n{secrets.token_hex(256)}\n-----END CERTIFICATE-----"
        cert.private_key = f"-----BEGIN PRIVATE KEY-----\n{secrets.token_hex(128)}\n-----END PRIVATE KEY-----"
        cert.issued_date = datetime.utcnow()
        cert.expiry_date = datetime.utcnow() + timedelta(days=365)
        db.session.commit()
        
        return jsonify({'success': True, 'certificate': cert.to_dict()})
    
    @app.route('/api/certificates/renew', methods=['POST'])
    @login_required
    def api_cert_renew():
        data = request.get_json() or {}
        cert_id = data.get('certificate_id')
        cert = Certificate.query.filter_by(id=cert_id, user_id=current_user.id).first_or_404()
        
        if cert.status == 'revoked':
            return jsonify({'error': 'Cannot renew a revoked certificate'}), 400
        
        cert.expiry_date = datetime.utcnow() + timedelta(days=365)
        cert.status = 'active'
        db.session.commit()
        return jsonify({'success': True, 'certificate': cert.to_dict()})
    
    @app.route('/api/certificates/revoke', methods=['POST'])
    @login_required
    def api_cert_revoke():
        data = request.get_json() or {}
        cert_id = data.get('certificate_id')
        cert = Certificate.query.filter_by(id=cert_id, user_id=current_user.id).first_or_404()
        
        cert.status = 'revoked'
        cert.cert_data = None
        cert.private_key = None
        db.session.commit()
        return jsonify({'success': True})
    
    # ============================================================
    # Admin Routes
    # ============================================================
    
    @app.route('/admin')
    @login_required
    def admin_dashboard():
        if not current_user.is_admin():
            flash('Access denied.', 'error')
            return redirect(url_for('os_desktop'))
        
        stats = {
            'total_users': User.query.count(),
            'active_users': User.query.filter_by(is_active=True).count(),
            'total_certs': Certificate.query.count(),
            'pending_certs': Certificate.query.filter_by(status='pending').count(),
            'total_apps': App.query.count(),
            'premium_users': User.query.filter(User.license_tier.in_(['pro', 'enterprise'])).count(),
            'free_users': User.query.filter_by(license_tier='free').count(),
            'total_notes': Note.query.count(),
            'total_todos': Todo.query.count(),
            'files_count': FileSystem.query.count(),
        }
        
        recent_users = User.query.order_by(User.created_at.desc()).limit(10).all()
        recent_certs = Certificate.query.order_by(Certificate.created_at.desc()).limit(10).all()
        
        return render_template('admin/dashboard.html', stats=stats, 
                               recent_users=recent_users, recent_certs=recent_certs)
    
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
        
        users = User.query.filter(User.license_tier != 'free').order_by(
            User.license_expires).all()
        return render_template('admin/licenses.html', users=users)
    
    @app.route('/admin/certificates')
    @login_required
    def admin_certificates():
        if not current_user.is_admin():
            flash('Access denied.', 'error')
            return redirect(url_for('os_desktop'))
        
        certs = Certificate.query.order_by(Certificate.created_at.desc()).all()
        return render_template('admin/certificates.html', certificates=certs)
    
    @app.route('/api/admin/users/<int:user_id>/license', methods=['POST'])
    @login_required
    def api_admin_update_license(user_id):
        if not current_user.is_admin():
            return jsonify({'error': 'Access denied'}), 403
        
        user = User.query.get_or_404(user_id)
        data = request.get_json() or {}
        
        user.license_tier = data.get('tier', 'free')
        if data.get('expires'):
            user.license_expires = datetime.fromisoformat(data['expires'])
        else:
            user.license_expires = datetime.utcnow() + timedelta(days=365)
        
        db.session.commit()
        return jsonify({'success': True, 'user': user.to_dict()})
    
    # ============================================================
    # Health Check
    # ============================================================
    
    # ============================================================
    # Certificate System - Template Filter
    # ============================================================
    
    @app.template_filter('hash_fingerprint')
    def hash_fingerprint_filter(data):
        """Generate a SHA-256 fingerprint for certificate display."""
        import hashlib
        if not data:
            return 'N/A'
        return hashlib.sha256(data.encode()).hexdigest()[:64]

    # ============================================================
    # Certificate Purchase & Checkout Routes
    # ============================================================
    
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

    # ============================================================
    # Certificate Generation API
    # ============================================================
    
    @app.route('/api/certificates/purchase', methods=['POST'])
    @login_required
    def api_cert_purchase():
        """Purchase a new certificate."""
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
        """Generate a self-signed certificate using cryptography library."""
        data = request.get_json() or {}
        cert_id = data.get('certificate_id')
        cert = Certificate.query.get_or_404(cert_id)
        
        # Allow admin to generate any cert, users only their own
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
        """Renew an existing certificate."""
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
        """Revoke a certificate."""
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
        
        # Simulate domain validation
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
    # Admin Certificate Management - Enhanced
    # ============================================================
    
    @app.route('/admin/certificates')
    @login_required
    def admin_certificates():
        """Admin certificate management with stats and filtering."""
        if not current_user.is_admin():
            flash('Access denied.', 'error')
            return redirect(url_for('os_desktop'))
        
        certs = Certificate.query.order_by(Certificate.created_at.desc()).all()
        
        # Calculate revenue by month for chart
        import calendar
        from collections import defaultdict
        revenue_by_month = defaultdict(float)
        for cert in certs:
            if cert.created_at:
                month_key = cert.created_at.strftime('%b %Y')
                revenue_by_month[month_key] += cert.price_paid
        
        # Get last 12 months
        months = []
        revenues = []
        for i in range(11, -1, -1):
            d = datetime.utcnow() - timedelta(days=i * 30)
            month_key = d.strftime('%b %Y')
            months.append(month_key)
            revenues.append(round(revenue_by_month.get(month_key, 0), 2))
        
        return render_template('admin/certificates.html',
                               certificates=certs,
                               revenue_by_month={'months': months, 'values': revenues})
    
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
        # Create tables
        db.create_all()
        
        # Seed default apps
        if App.query.count() == 0:
            for app_data in DEFAULT_APPS:
                app_obj = App(**app_data)
                db.session.add(app_obj)
            db.session.commit()
            print(f"  -> Seeded {len(DEFAULT_APPS)} default apps")
        
        # Seed certificate templates
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
        
        # Create admin user if none exists
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
