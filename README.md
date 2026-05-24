# JALAGEL OS Pro - Python Edition

## جلاجل - نظام تشغيل ويب احترافي

A commercial-grade web-based operating system rebuilt entirely in Python Flask with 50+ fully functional apps, 5-page marketing website, commercial licensing system, and premium SSL certificate management platform.

## Features

### Web OS Desktop Environment
- **Complete Desktop Environment** with wallpaper, icons, widgets
- **Window Manager** - Draggable, resizable, minimizable, maximizable windows with snap-to-grid
- **Taskbar** with running apps, system tray, clock
- **Start Menu** with app search, categories, recent apps
- **Virtual Desktops** - 4 desktops with keyboard shortcuts
- **Notification Center** with system notifications
- **Context Menu** - Right-click desktop menu
- **Keyboard Shortcuts** - Win+D, Win+M, Alt+F4, Win+Tab, and more

### 50+ Fully Functional Apps
| Category | Apps |
|----------|------|
| **Core** | Calculator, Calendar, Clock, Code Editor, File Manager, Music Player, Notes, Paint, Settings, Terminal, Text Editor, Todo, Weather, Browser, Photos, Video Player, Camera, Canvas Drawing |
| **Productivity** | Spreadsheet, Presentations, Email, Contacts, Chat, Database Manager, PDF Viewer |
| **Utilities** | Unit Converter, Password Manager, System Monitor, Color Picker, QR Code Generator, Timer, Voice Recorder, News Reader, Stocks, Translator, Maps |
| **Developer Tools** | JSON Formatter, Base64 Encoder, Hash Generator, Regex Tester, Diff Tool, API Tester, Color Palette, Screenshot Tool, Network Tools |
| **Creative** | Whiteboard, Mind Map, Kanban Board, Scientific Calculator, Certificate Manager, White Noise, Typing Test |

### 5-Page Marketing Website
1. **Home** - Hero section, feature highlights, app showcase, pricing, testimonials
2. **Features** - Detailed feature categories, animated counters, app directory
3. **Pricing** - 3 tiers (Free/Pro/Enterprise) with monthly/yearly toggle
4. **Demo** - Interactive OS preview with working mini apps
5. **Docs** - Complete documentation with API reference

### Certificate Management System (BEST for Sale)
| Certificate | Price | Features |
|-------------|-------|----------|
| **DV SSL** | $9.99/yr | Domain Validated, Basic encryption |
| **OV SSL** | $49.99/yr | Organization Validated, Trust seal |
| **EV SSL** | $149.99/yr | Extended Validation, Green bar |
| **Wildcard SSL** | $199.99/yr | Unlimited subdomains |
| **Multi-Domain SAN** | $299.99/yr | Up to 250 domains |
| **Code Signing** | $199.99/yr | Software trust |
| **Enterprise CA** | $499.99/yr | Private CA, API access |
| **JALAGEL Premium** | $99.99/yr | Branded trust seal |

### Authentication & Admin
- **User Authentication** - Login, register, password reset, profile management
- **Role-Based Access** - Admin, User, Guest roles
- **Admin Dashboard** - Charts, statistics, user management
- **License Management** - Generate, extend, revoke licenses
- **Certificate Admin** - Manage all certificates, approve/revoke

## Tech Stack
- **Backend**: Python 3.11 + Flask 3.0
- **Database**: SQLite + SQLAlchemy ORM
- **Auth**: Flask-Login + Werkzeug
- **Security**: Rate limiting, CSRF protection, bcrypt hashing
- **Frontend**: Jinja2 Templates + Vanilla JS + CSS3
- **Charts**: Chart.js
- **Fonts**: Space Grotesk + Inter + JetBrains Mono
- **Icons**: Font Awesome + SVG

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd jalagel-os-pro

# Create virtual environment
python -m venv venv

# Activate (Linux/Mac)
source venv/bin/activate

# Activate (Windows)
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the application
python app.py
```

The application will be available at `http://localhost:5000`

## Default Login
- **Username**: admin
- **Password**: admin123

## API Endpoints

### Marketing
- `GET /` - Home page
- `GET /features` - Features page
- `GET /pricing` - Pricing page
- `GET /demo` - Demo page
- `GET /docs` - Documentation

### Auth
- `GET/POST /auth/login` - Login
- `GET/POST /auth/register` - Register
- `GET /auth/logout` - Logout
- `GET/POST /auth/profile` - Profile
- `GET/POST /auth/forgot-password` - Password reset request
- `GET/POST /auth/reset-password/<token>` - Reset password

### OS
- `GET /os` - OS Desktop (authenticated)
- `GET /api/apps` - List all apps
- `POST /api/apps/launch` - Launch app

### Files
- `GET /api/files` - List files
- `POST /api/files` - Create file/folder
- `PUT /api/files/<id>` - Update file
- `DELETE /api/files/<id>` - Delete file

### Notes
- `GET /api/notes` - List notes
- `POST /api/notes` - Create note
- `PUT /api/notes/<id>` - Update note
- `DELETE /api/notes/<id>` - Delete note

### Todos
- `GET /api/todos` - List todos
- `POST /api/todos` - Create todo
- `PUT /api/todos/<id>` - Toggle/Update
- `DELETE /api/todos/<id>` - Delete

### Certificates
- `GET /certificates` - Certificate store
- `GET /certificates/purchase` - Purchase page
- `GET/POST /certificates/checkout` - Checkout
- `GET /certificates/my` - My certificates
- `GET /certificates/verify/<id>` - Verify certificate
- `POST /api/certificates/purchase` - Purchase API
- `POST /api/certificates/generate` - Generate SSL
- `POST /api/certificates/renew` - Renew certificate
- `POST /api/certificates/revoke` - Revoke certificate
- `POST /api/certificates/validate` - Validate domain
- `GET /api/certificates/download/<id>` - Download PEM

### Admin
- `GET /admin` - Dashboard
- `GET /admin/users` - User management
- `GET /admin/licenses` - License management
- `GET /admin/certificates` - Certificate management
- `GET/POST /admin/settings` - System settings

## Project Structure
```
.
├── app.py                      # Main Flask application (55 routes)
├── config.py                   # Configuration
├── models.py                   # Database models
├── requirements.txt            # Dependencies
├── static/
│   ├── css/                   # Stylesheets
│   │   ├── style.css          # Global styles
│   │   ├── os.css             # OS desktop styles
│   │   ├── marketing.css      # Marketing pages
│   │   ├── apps.css           # App styles
│   │   ├── certificates.css   # Certificate styles
│   │   └── admin.css          # Admin styles
│   ├── js/                    # JavaScript
│   │   ├── os.js              # OS kernel
│   │   ├── marketing.js       # Marketing interactions
│   │   ├── apps.js            # App functionality
│   │   ├── certificates.js    # Certificate system
│   │   └── admin.js           # Admin dashboard
│   └── images/                # Image assets
├── templates/
│   ├── base.html              # Base template
│   ├── os_base.html           # OS interface base
│   ├── pages/                 # Marketing pages
│   ├── os/                    # OS components
│   ├── apps/                  # 50+ app templates
│   ├── auth/                  # Auth pages
│   ├── certificates/          # Certificate pages
│   └── admin/                 # Admin pages
└── instance/
    └── jalagel_os.db          # SQLite database
```

## License
Commercial License - JALAGEL OS Pro

## Author
MOHAMMED SAAD MOHAMMED ALOHAYDIB

## Website
https://s200077761.github.io/jalagel-os/
