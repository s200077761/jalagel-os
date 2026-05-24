/**
 * JALAGEL OS Pro - OS Kernel JavaScript
 * Desktop environment, window management, virtual desktops, widgets, and app system
 * Complete interface components
 */

(function () {
    'use strict';

    // ============================================================
    // OS State
    // ============================================================

    const OS = {
        windows: new Map(),
        windowIdCounter: 0,
        zIndexCounter: 100,
        desktopIcons: [],
        apps: [],
        taskbarItems: new Map(),
        notifications: [],
        systemNotifications: [],
        settings: {
            wallpaper: 'gradient',
            theme: 'dark',
            animations: true,
            snapEnabled: true,
            dndEnabled: false,
            desktopView: 'large',
        },
        isDraggingWindow: false,
        isResizingWindow: false,
        dragOffset: { x: 0, y: 0 },
        resizeDirection: '',
        activeWindow: null,
        startMenuOpen: false,
        notifPanelOpen: false,
        contextMenuOpen: false,
        pinnedApps: ['terminal', 'browser', 'code-editor', 'notes', 'settings'],
        // Virtual desktops
        virtualDesktops: [
            { id: 0, name: 'Desktop 1', windows: new Set() },
            { id: 1, name: 'Desktop 2', windows: new Set() },
            { id: 2, name: 'Desktop 3', windows: new Set() },
            { id: 3, name: 'Desktop 4', windows: new Set() },
        ],
        currentDesktop: 0,
        desktopSwitcherVisible: false,
        desktopGridVisible: false,
        // Recent apps
        recentApps: [],
        // Widgets
        widgets: {
            notes: [],
            weather: null,
            certificates: [],
        },
        // System
        uptime: Date.now(),
        volume: 80,
        muted: false,
    };

    // DOM Elements cache
    const $ = {
        desktop: null,
        desktopIcons: null,
        windowContainer: null,
        taskbarItems: null,
        taskbarStartBtn: null,
        taskbarPins: null,
        startMenu: null,
        startMenuOverlay: null,
        startSearchInput: null,
        startAppGrid: null,
        startCategories: null,
        startRecentGrid: null,
        startPowerDropdown: null,
        notificationCenter: null,
        notificationCenterOverlay: null,
        ncList: null,
        ncSystemList: null,
        ncCount: null,
        ncClearAll: null,
        ncDndToggle: null,
        notifBadge: null,
        contextMenu: null,
        snapZones: null,
        trayClock: null,
        trayTime: null,
        trayDate: null,
        trayNetwork: null,
        trayVolume: null,
        trayBattery: null,
        trayLang: null,
        trayNotifications: null,
        calendarPopup: null,
        calDays: null,
        calTitle: null,
        volumePopup: null,
        volSlider: null,
        volValue: null,
        langPopup: null,
        loadingOverlay: null,
        // New elements
        virtualDesktopSwitcher: null,
        desktopGridView: null,
        desktopWidgets: null,
        widgetContextMenu: null,
        windowPreviewTooltip: null,
        snapIndicatorOverlay: null,
        tilingOverlay: null,
        toastContainer: null,
    };

    // ============================================================
    // Initialization
    // ============================================================

    function init() {
        cacheElements();
        bindEvents();
        bindKeyboardEvents();
        startClock();
        initWidgets();
        initCalendar();
        initVirtualDesktops();
        initWindowPreview();
        loadApps().then(() => {
            renderDesktopIcons();
            renderStartMenu();
            renderTaskbarPins();
            renderRecentApps();
            loadMockNotifications();
            hideLoadingOverlay();
            console.log('[JALAGEL OS] Kernel initialized - v' + (window.OS_CONFIG?.version || '1.0'));
        });
    }

    function cacheElements() {
        $.desktop = document.getElementById('osDesktop');
        $.desktopIcons = document.getElementById('desktopIcons');
        $.windowContainer = document.getElementById('windowContainer');
        $.taskbarItems = document.getElementById('taskbarItems');
        $.taskbarStartBtn = document.getElementById('taskbarStartBtn');
        $.taskbarPins = document.getElementById('taskbarPins');
        $.startMenu = document.getElementById('startMenu');
        $.startMenuOverlay = document.getElementById('startMenuOverlay');
        $.startSearchInput = document.getElementById('startSearchInput');
        $.startAppGrid = document.getElementById('startAppGrid');
        $.startCategories = document.getElementById('startCategories');
        $.startRecentGrid = document.getElementById('startRecentGrid');
        $.startPowerDropdown = document.getElementById('startPowerDropdown');
        $.notificationCenter = document.getElementById('notificationCenter');
        $.notificationCenterOverlay = document.getElementById('notificationCenterOverlay');
        $.ncList = document.getElementById('ncList');
        $.ncSystemList = document.getElementById('ncSystemList');
        $.ncCount = document.getElementById('ncCount');
        $.ncClearAll = document.getElementById('ncClearAll');
        $.ncDndToggle = document.getElementById('ncDndToggle');
        $.notifBadge = document.getElementById('notifBadge');
        $.contextMenu = document.getElementById('contextMenu');
        $.snapZones = document.getElementById('snapZones');
        $.trayClock = document.getElementById('trayClock');
        $.trayTime = document.getElementById('trayTime');
        $.trayDate = document.getElementById('trayDate');
        $.trayNetwork = document.getElementById('trayNetwork');
        $.trayVolume = document.getElementById('trayVolume');
        $.trayBattery = document.getElementById('trayBattery');
        $.trayLang = document.getElementById('trayLang');
        $.trayNotifications = document.getElementById('trayNotifications');
        $.calendarPopup = document.getElementById('calendarPopup');
        $.calDays = document.getElementById('calDays');
        $.calTitle = document.getElementById('calTitle');
        $.volumePopup = document.getElementById('volumePopup');
        $.volSlider = document.getElementById('volSlider');
        $.volValue = document.getElementById('volValue');
        $.langPopup = document.getElementById('langPopup');
        $.loadingOverlay = document.getElementById('osLoadingOverlay');
        // New elements
        $.virtualDesktopSwitcher = document.getElementById('virtualDesktopSwitcher');
        $.desktopGridView = document.getElementById('desktopGridView');
        $.desktopWidgets = document.getElementById('desktopWidgets');
        $.widgetContextMenu = document.getElementById('widgetContextMenu');
        $.windowPreviewTooltip = document.getElementById('windowPreviewTooltip');
        $.snapIndicatorOverlay = document.getElementById('snapIndicatorOverlay');
        $.tilingOverlay = document.getElementById('tilingOverlay');
        $.toastContainer = document.getElementById('toastContainer');
        $.dndIndicator = document.getElementById('dndIndicator');
    }

    function hideLoadingOverlay() {
        if ($.loadingOverlay) {
            setTimeout(() => {
                $.loadingOverlay.classList.add('hidden');
            }, 800);
        }
    }

    // ============================================================
    // Event Binding
    // ============================================================

    function bindEvents() {
        // Taskbar Start button
        if ($.taskbarStartBtn) {
            $.taskbarStartBtn.addEventListener('click', toggleStartMenu);
        }

        // Start menu overlay (click outside to close)
        if ($.startMenuOverlay) {
            $.startMenuOverlay.addEventListener('click', closeStartMenu);
        }

        // Start menu close
        const startCloseBtn = document.getElementById('startMenuClose');
        if (startCloseBtn) {
            startCloseBtn.addEventListener('click', closeStartMenu);
        }

        // Start search
        if ($.startSearchInput) {
            $.startSearchInput.addEventListener('input', (e) => {
                filterStartApps(e.target.value);
            });
        }

        // Start category tabs
        if ($.startCategories) {
            $.startCategories.addEventListener('click', (e) => {
                const tab = e.target.closest('.start-cat-tab');
                if (tab) {
                    filterByCategory(tab.dataset.category);
                    $.startCategories.querySelectorAll('.start-cat-tab').forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                }
            });
        }

        // Start settings button
        const startSettingsBtn = document.getElementById('startSettingsBtn');
        if (startSettingsBtn) {
            startSettingsBtn.addEventListener('click', () => {
                launchAppBySlug('settings');
                closeStartMenu();
            });
        }

        // Power menu toggle
        const startPowerToggle = document.getElementById('startPowerToggle');
        if (startPowerToggle) {
            startPowerToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                $.startPowerDropdown.classList.toggle('show');
            });
        }

        // Power menu items
        if ($.startPowerDropdown) {
            $.startPowerDropdown.addEventListener('click', (e) => {
                const item = e.target.closest('.power-item');
                if (item) {
                    handlePowerAction(item.dataset.action);
                    $.startPowerDropdown.classList.remove('show');
                    closeStartMenu();
                }
            });
        }

        // Clear recent apps
        const clearRecentBtn = document.getElementById('clearRecentApps');
        if (clearRecentBtn) {
            clearRecentBtn.addEventListener('click', () => {
                OS.recentApps = [];
                renderRecentApps();
            });
        }

        // Notification center
        if ($.trayNotifications) {
            $.trayNotifications.addEventListener('click', toggleNotificationCenter);
        }

        if ($.ncClearAll) {
            $.ncClearAll.addEventListener('click', clearAllNotifications);
        }

        if ($.ncDndToggle) {
            $.ncDndToggle.addEventListener('click', toggleDnd);
        }

        const ncCloseBtn = document.getElementById('ncCloseBtn');
        if (ncCloseBtn) {
            ncCloseBtn.addEventListener('click', closeNotificationCenter);
        }

        if ($.notificationCenterOverlay) {
            $.notificationCenterOverlay.addEventListener('click', closeNotificationCenter);
        }

        // Desktop context menu
        if ($.desktop) {
            $.desktop.addEventListener('contextmenu', handleDesktopContextMenu);
        }

        // Context menu actions
        if ($.contextMenu) {
            $.contextMenu.addEventListener('click', (e) => {
                const item = e.target.closest('.context-item, .accent-dot');
                if (item) {
                    if (item.classList.contains('accent-dot')) {
                        setAccentColor(item.dataset.color);
                    } else if (item.dataset.action) {
                        handleContextAction(item.dataset.action);
                    }
                    closeContextMenu();
                }
            });
        }

        // Global click to close menus
        document.addEventListener('click', (e) => {
            if (OS.startMenuOpen && !$.startMenu?.contains(e.target) && !$.taskbarStartBtn?.contains(e.target)) {
                closeStartMenu();
            }
            if ($.startPowerDropdown && !$.startPowerDropdown.contains(e.target) && !e.target.closest('#startPowerToggle')) {
                $.startPowerDropdown.classList.remove('show');
            }
            if (OS.contextMenuOpen && !$.contextMenu?.contains(e.target)) {
                closeContextMenu();
            }
            if (OS.notifPanelOpen && !$.notificationCenter?.contains(e.target) && !$.trayNotifications?.contains(e.target)) {
                closeNotificationCenter();
            }
            if ($.calendarPopup && !$.calendarPopup.contains(e.target) && !$.trayClock?.contains(e.target)) {
                $.calendarPopup.classList.remove('show');
            }
            if ($.volumePopup && !$.volumePopup.contains(e.target) && !$.trayVolume?.contains(e.target)) {
                $.volumePopup.classList.remove('show');
            }
            if ($.langPopup && !$.langPopup.contains(e.target) && !$.trayLang?.contains(e.target)) {
                $.langPopup.classList.remove('show');
            }
        });

        // Global mouse events for window drag/resize
        document.addEventListener('mousemove', handleGlobalMouseMove);
        document.addEventListener('mouseup', handleGlobalMouseUp);

        // Tray clock -> calendar
        if ($.trayClock) {
            $.trayClock.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleCalendar();
            });
        }

        // Calendar navigation
        const calPrev = document.getElementById('calPrevMonth');
        const calNext = document.getElementById('calNextMonth');
        const calToday = document.getElementById('calTodayBtn');
        if (calPrev) calPrev.addEventListener('click', () => changeCalendarMonth(-1));
        if (calNext) calNext.addEventListener('click', () => changeCalendarMonth(1));
        if (calToday) calToday.addEventListener('click', () => { calendarDate = new Date(); renderCalendar(); });

        // Volume
        if ($.trayVolume) {
            $.trayVolume.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleVolumePopup();
            });
        }

        if ($.volSlider) {
            $.volSlider.addEventListener('input', (e) => {
                setVolume(parseInt(e.target.value));
            });
        }

        const volMuteBtn = document.getElementById('volMuteBtn');
        if (volMuteBtn) {
            volMuteBtn.addEventListener('click', toggleMute);
        }

        // Language
        if ($.trayLang) {
            $.trayLang.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleLangPopup();
            });
        }

        const langList = document.getElementById('langList');
        if (langList) {
            langList.addEventListener('click', (e) => {
                const item = e.target.closest('.lang-item');
                if (item) {
                    setLanguage(item.dataset.lang, item.dataset.code);
                    $.langPopup.classList.remove('show');
                }
            });
        }

        // Network
        if ($.trayNetwork) {
            $.trayNetwork.addEventListener('click', () => {
                addNotification('Network', 'Network settings opened', 'info');
            });
        }

        // Battery
        if ($.trayBattery) {
            $.trayBattery.addEventListener('click', () => {
                addNotification('Battery', 'Battery: 85% - Power settings opened', 'info');
            });
        }

        // Show desktop button
        const showDesktopBtn = document.getElementById('trayShowDesktop');
        if (showDesktopBtn) {
            showDesktopBtn.addEventListener('click', minimizeAllWindows);
        }

        // Desktop click (deselect icons)
        if ($.desktop) {
            $.desktop.addEventListener('click', (e) => {
                if (e.target === $.desktop || e.target.closest('.desktop-bg')) {
                    deselectAllIcons();
                }
            });
        }

        // Widget context menu
        if ($.desktopWidgets) {
            $.desktopWidgets.addEventListener('contextmenu', (e) => {
                const widget = e.target.closest('.widget');
                if (widget) {
                    e.preventDefault();
                    showWidgetContextMenu(e.clientX, e.clientY, widget.dataset.widget);
                }
            });
        }

        if ($.widgetContextMenu) {
            $.widgetContextMenu.addEventListener('click', (e) => {
                const item = e.target.closest('.wcm-item');
                if (item) {
                    handleWidgetContextAction(item.dataset.action);
                    $.widgetContextMenu.classList.remove('show');
                }
            });
        }

        // Virtual desktop controls
        const vdPrev = document.getElementById('vdPrev');
        const vdNext = document.getElementById('vdNext');
        const vdNew = document.getElementById('vdNewDesktop');
        if (vdPrev) vdPrev.addEventListener('click', () => switchDesktop(OS.currentDesktop - 1));
        if (vdNext) vdNext.addEventListener('click', () => switchDesktop(OS.currentDesktop + 1));
        if (vdNew) vdNew.addEventListener('click', addVirtualDesktop);

        const vdDots = document.getElementById('vdDots');
        if (vdDots) {
            vdDots.addEventListener('click', (e) => {
                const dot = e.target.closest('.vd-dot');
                if (dot) switchDesktop(parseInt(dot.dataset.desktop));
            });
        }

        // Desktop grid view
        const dgvClose = document.getElementById('dgvClose');
        if (dgvClose) {
            dgvClose.addEventListener('click', hideDesktopGrid);
        }

        // Tiling
        if ($.tilingOverlay) {
            $.tilingOverlay.addEventListener('click', (e) => {
                if (e.target === $.tilingOverlay) {
                    $.tilingOverlay.classList.remove('active');
                }
            });

            $.tilingOverlay.querySelectorAll('.tiling-preset').forEach(btn => {
                btn.addEventListener('click', () => {
                    tileWindows(btn.dataset.tile);
                    $.tilingOverlay.classList.remove('active');
                });
            });
        }

        // Quick notes
        const quickNoteAdd = document.getElementById('quickNoteAdd');
        const quickNoteInput = document.getElementById('quickNoteInput');
        if (quickNoteAdd && quickNoteInput) {
            quickNoteAdd.addEventListener('click', addQuickNote);
            quickNoteInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') addQuickNote();
            });
        }

        // Desktop grid click
        if ($.desktopGridView) {
            $.desktopGridView.addEventListener('click', (e) => {
                if (e.target === $.desktopGridView) {
                    hideDesktopGrid();
                }
            });
        }

        // System monitor widget click -> open system monitor
        const widgetSystem = document.getElementById('widgetSystem');
        if (widgetSystem) {
            widgetSystem.addEventListener('dblclick', () => {
                launchAppBySlug('system-monitor');
            });
        }

        // Clock widget click -> open clock app
        const widgetClock = document.getElementById('widgetClock');
        if (widgetClock) {
            widgetClock.addEventListener('dblclick', () => {
                launchAppBySlug('clock');
            });
        }

        // Calendar widget click -> open calendar app
        const widgetCalendar = document.getElementById('widgetCalendar');
        if (widgetCalendar) {
            widgetCalendar.addEventListener('dblclick', () => {
                launchAppBySlug('calendar');
            });
        }
    }

    // ============================================================
    // App Loading
    // ============================================================

    async function loadApps() {
        try {
            const response = await fetch('/api/apps');
            if (response.ok) {
                OS.apps = await response.json();
            } else {
                OS.apps = getFallbackApps();
            }
        } catch (error) {
            OS.apps = getFallbackApps();
        }
    }

    function getFallbackApps() {
        return [
            { id: 1, name: 'Settings', slug: 'settings', icon: 'fa-solid fa-gear', category: 'System', description: 'System settings' },
            { id: 2, name: 'File Manager', slug: 'file-manager', icon: 'fa-solid fa-folder-open', category: 'System', description: 'Browse files' },
            { id: 3, name: 'Terminal', slug: 'terminal', icon: 'fa-solid fa-terminal', category: 'System', description: 'Command line' },
            { id: 4, name: 'System Monitor', slug: 'system-monitor', icon: 'fa-solid fa-chart-line', category: 'System', description: 'Monitor resources' },
            { id: 5, name: 'Notes', slug: 'notes', icon: 'fa-solid fa-note-sticky', category: 'Productivity', description: 'Create notes' },
            { id: 6, name: 'Todo List', slug: 'todo', icon: 'fa-solid fa-list-check', category: 'Productivity', description: 'Task management' },
            { id: 7, name: 'Calendar', slug: 'calendar', icon: 'fa-solid fa-calendar-days', category: 'Productivity', description: 'Calendar and events' },
            { id: 8, name: 'Clock', slug: 'clock', icon: 'fa-solid fa-clock', category: 'Productivity', description: 'Clock and alarms' },
            { id: 9, name: 'Timer', slug: 'timer', icon: 'fa-solid fa-stopwatch', category: 'Productivity', description: 'Timer and stopwatch' },
            { id: 10, name: 'World Clock', slug: 'world-clock', icon: 'fa-solid fa-earth-americas', category: 'Productivity', description: 'Time zones' },
            { id: 11, name: 'Contacts', slug: 'contacts', icon: 'fa-solid fa-address-book', category: 'Productivity', description: 'Contacts' },
            { id: 12, name: 'Music Player', slug: 'music-player', icon: 'fa-solid fa-music', category: 'Media', description: 'Play music' },
            { id: 13, name: 'Video Player', slug: 'video-player', icon: 'fa-solid fa-film', category: 'Media', description: 'Video playback' },
            { id: 14, name: 'Photos', slug: 'photos', icon: 'fa-solid fa-images', category: 'Media', description: 'Photo viewer' },
            { id: 15, name: 'Camera', slug: 'camera', icon: 'fa-solid fa-camera', category: 'Media', description: 'Camera' },
            { id: 16, name: 'Voice Recorder', slug: 'voice-recorder', icon: 'fa-solid fa-microphone', category: 'Media', description: 'Record audio' },
            { id: 17, name: 'Screenshot', slug: 'screenshot', icon: 'fa-solid fa-camera-retro', category: 'Media', description: 'Screenshots' },
            { id: 18, name: 'Code Editor', slug: 'code-editor', icon: 'fa-solid fa-code', category: 'Development', description: 'Code editor', is_premium: true },
            { id: 19, name: 'JSON Formatter', slug: 'json-formatter', icon: 'fa-solid fa-brackets-curly', category: 'Development', description: 'Format JSON' },
            { id: 20, name: 'Regex Tester', slug: 'regex-tester', icon: 'fa-solid fa-spell-check', category: 'Development', description: 'Test regex' },
            { id: 21, name: 'Base64', slug: 'base64', icon: 'fa-solid fa-lock', category: 'Development', description: 'Base64 encode/decode' },
            { id: 22, name: 'Hash Generator', slug: 'hash-generator', icon: 'fa-solid fa-fingerprint', category: 'Development', description: 'Generate hashes' },
            { id: 23, name: 'Database Manager', slug: 'database-manager', icon: 'fa-solid fa-database', category: 'Development', description: 'Database tool', is_premium: true },
            { id: 24, name: 'Network Tools', slug: 'network-tools', icon: 'fa-solid fa-network-wired', category: 'Development', description: 'Network tools' },
            { id: 25, name: 'Paint', slug: 'paint', icon: 'fa-solid fa-palette', category: 'Creative', description: 'Digital painting' },
            { id: 26, name: 'Canvas Drawing', slug: 'canvas', icon: 'fa-solid fa-paintbrush', category: 'Creative', description: 'Canvas drawing' },
            { id: 27, name: 'Whiteboard', slug: 'whiteboard', icon: 'fa-solid fa-chalkboard', category: 'Creative', description: 'Collaborative whiteboard', is_premium: true },
            { id: 28, name: 'Color Picker', slug: 'color-picker', icon: 'fa-solid fa-eye-dropper', category: 'Creative', description: 'Color picker' },
            { id: 29, name: 'Mind Map', slug: 'mind-map', icon: 'fa-solid fa-diagram-project', category: 'Creative', description: 'Mind mapping', is_premium: true },
            { id: 30, name: 'Calculator', slug: 'calculator', icon: 'fa-solid fa-calculator', category: 'Utilities', description: 'Calculator' },
            { id: 31, name: 'Calculator Pro', slug: 'calculator-pro', icon: 'fa-solid fa-square-root-variable', category: 'Utilities', description: 'Scientific calc', is_premium: true },
            { id: 32, name: 'Unit Converter', slug: 'unit-converter', icon: 'fa-solid fa-right-left', category: 'Utilities', description: 'Unit conversion' },
            { id: 33, name: 'Translator', slug: 'translator', icon: 'fa-solid fa-language', category: 'Utilities', description: 'Translation' },
            { id: 34, name: 'Weather', slug: 'weather', icon: 'fa-solid fa-cloud-sun', category: 'Utilities', description: 'Weather forecast' },
            { id: 35, name: 'Password Manager', slug: 'password-manager', icon: 'fa-solid fa-key', category: 'Utilities', description: 'Passwords', is_premium: true },
            { id: 36, name: 'Maps', slug: 'maps', icon: 'fa-solid fa-map-location-dot', category: 'Utilities', description: 'Interactive maps' },
            { id: 37, name: 'QR Code', slug: 'qr-code', icon: 'fa-solid fa-qrcode', category: 'Utilities', description: 'QR code generator' },
            { id: 38, name: 'Barcode', slug: 'barcode', icon: 'fa-solid fa-barcode', category: 'Utilities', description: 'Barcode scanner' },
            { id: 39, name: 'Text Editor', slug: 'text-editor', icon: 'fa-solid fa-file-lines', category: 'Documents', description: 'Text editor' },
            { id: 40, name: 'PDF Viewer', slug: 'pdf-viewer', icon: 'fa-solid fa-file-pdf', category: 'Documents', description: 'View PDFs' },
            { id: 41, name: 'Spreadsheet', slug: 'spreadsheet', icon: 'fa-solid fa-table-cells', category: 'Documents', description: 'Spreadsheets', is_premium: true },
            { id: 42, name: 'Slides', slug: 'slides', icon: 'fa-solid fa-person-chalkboard', category: 'Documents', description: 'Presentations', is_premium: true },
            { id: 43, name: 'Kanban', slug: 'kanban', icon: 'fa-solid fa-columns', category: 'Documents', description: 'Kanban board', is_premium: true },
            { id: 44, name: 'Time Tracker', slug: 'time-tracker', icon: 'fa-solid fa-hourglass-half', category: 'Documents', description: 'Time tracking', is_premium: true },
            { id: 45, name: 'Browser', slug: 'browser', icon: 'fa-solid fa-globe', category: 'Communication', description: 'Web browser' },
            { id: 46, name: 'Email', slug: 'email', icon: 'fa-solid fa-envelope', category: 'Communication', description: 'Email client', is_premium: true },
            { id: 47, name: 'Chat', slug: 'chat', icon: 'fa-solid fa-comments', category: 'Communication', description: 'Messenger', is_premium: true },
            { id: 48, name: 'News', slug: 'news', icon: 'fa-solid fa-newspaper', category: 'Information', description: 'News reader' },
            { id: 49, name: 'Stocks', slug: 'stocks', icon: 'fa-solid fa-arrow-trend-up', category: 'Information', description: 'Stock ticker', is_premium: true },
            { id: 50, name: 'Certificate Manager', slug: 'certificate-manager', icon: 'fa-solid fa-shield-halved', category: 'Security', description: 'SSL certificates', is_premium: true },
        ];
    }

    // ============================================================
    // Desktop Icons
    // ============================================================

    function renderDesktopIcons() {
        if (!$.desktopIcons) return;
        $.desktopIcons.innerHTML = '';
        const iconsToShow = OS.apps.slice(0, 16);
        iconsToShow.forEach((app, index) => {
            const iconEl = createDesktopIcon(app, index);
            $.desktopIcons.appendChild(iconEl);
        });
    }

    function createDesktopIcon(app, index) {
        const el = document.createElement('div');
        el.className = 'desktop-icon';
        el.dataset.appId = app.id;
        el.dataset.slug = app.slug;
        el.style.animationDelay = `${index * 0.02}s`;
        el.innerHTML = `
            <div class="desktop-icon-icon">
                <i class="${app.icon}"></i>
            </div>
            <div class="desktop-icon-label">${app.name}</div>
        `;
        el.addEventListener('dblclick', () => launchApp(app.id));
        el.addEventListener('click', (e) => { e.stopPropagation(); selectIcon(el); });
        return el;
    }

    function selectIcon(el) {
        deselectAllIcons();
        el.classList.add('selected');
    }

    function deselectAllIcons() {
        document.querySelectorAll('.desktop-icon.selected').forEach(el => el.classList.remove('selected'));
    }

    // ============================================================
    // Window Management (Enhanced)
    // ============================================================

    function createWindow(appId, title, icon, contentUrl) {
        const app = OS.apps.find(a => a.id === appId);
        if (!app) return null;

        // Check if window already exists
        for (const [id, win] of OS.windows) {
            if (win.appId === appId && !win.minimized) {
                focusWindow(id);
                return win.element;
            }
        }

        OS.windowIdCounter++;
        const windowId = OS.windowIdCounter;
        OS.zIndexCounter++;

        const winTitle = title || app.name;
        const winIcon = icon || app.icon;

        const el = document.createElement('div');
        el.className = 'os-window focused';
        el.dataset.windowId = windowId;
        el.dataset.desktop = OS.currentDesktop;
        el.style.zIndex = OS.zIndexCounter;

        // Default window size and position
        const width = Math.min(900, window.innerWidth * 0.75);
        const height = Math.min(600, window.innerHeight * 0.7);
        const left = 60 + (OS.windows.size * 30) % (window.innerWidth - width - 100);
        const top = 40 + (OS.windows.size * 30) % (window.innerHeight - height - 120);

        el.style.width = width + 'px';
        el.style.height = height + 'px';
        el.style.left = left + 'px';
        el.style.top = top + 'px';

        // Resize handles
        const resizeHandles = ['n', 'e', 's', 'w', 'ne', 'nw', 'se', 'sw'].map(dir =>
            `<div class="resize-handle resize-${dir}" data-resize="${dir}"></div>`
        ).join('');

        el.innerHTML = `
            ${resizeHandles}
            <div class="window-titlebar" oncontextmenu="return false;">
                <div class="window-titlebar-drag-region">
                    <div class="window-icon"><i class="${winIcon}"></i></div>
                    <div class="window-title">${winTitle}</div>
                </div>
                <div class="window-controls">
                    <button class="win-btn win-pin" title="Always on top" data-action="pin">
                        <i class="fa-solid fa-thumbtack"></i>
                    </button>
                    <button class="win-btn win-minimize" title="Minimize" data-action="minimize">
                        <i class="fa-solid fa-minus"></i>
                    </button>
                    <button class="win-btn win-maximize" title="Maximize" data-action="maximize">
                        <i class="fa-regular fa-square"></i>
                    </button>
                    <button class="win-btn win-close" title="Close" data-action="close">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
            </div>
            <div class="window-controls-menu" id="wcm-${windowId}">
                <div class="wcm-item" data-action="restore"><i class="fa-solid fa-window-restore"></i> Restore</div>
                <div class="wcm-item" data-action="minimize"><i class="fa-solid fa-minus"></i> Minimize</div>
                <div class="wcm-item" data-action="maximize"><i class="fa-regular fa-square"></i> Maximize</div>
                <div class="wcm-divider"></div>
                <div class="wcm-item" data-action="always-on-top"><i class="fa-solid fa-arrow-up"></i> Always on Top<span class="wcm-check"><i class="fa-solid fa-check"></i></span></div>
                <div class="wcm-item wcm-transparency"><i class="fa-solid fa-droplet"></i> Transparency<input type="range" class="wcm-transparency-slider" min="30" max="100" value="100"></div>
                <div class="wcm-divider"></div>
                <div class="wcm-item" data-action="snap-left"><i class="fa-solid fa-arrow-left"></i> Snap Left</div>
                <div class="wcm-item" data-action="snap-right"><i class="fa-solid fa-arrow-right"></i> Snap Right</div>
                <div class="wcm-item" data-action="snap-full"><i class="fa-solid fa-expand"></i> Snap Fullscreen</div>
                <div class="wcm-divider"></div>
                <div class="wcm-item" data-action="close"><i class="fa-solid fa-xmark"></i> Close</div>
            </div>
            <div class="window-toolbar" style="display:none"></div>
            <div class="window-content">
                <div class="window-app-content" style="width:100%;height:100%;padding:16px;overflow:auto;">
                    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--text-muted);gap:16px;">
                        <i class="${winIcon}" style="font-size:3rem;opacity:0.3;"></i>
                        <div style="font-size:1.25rem;font-weight:600;color:var(--text-primary);">${winTitle}</div>
                        <p>Application content loading...</p>
                        <div class="os-loading-spinner" style="width:24px;height:24px;border-width:2px;"></div>
                    </div>
                </div>
            </div>
            <div class="window-statusbar" style="display:none">
                <span class="status-text">Ready</span>
                <span class="status-indicator"></span>
            </div>
        `;

        // Bind title bar drag
        const titlebar = el.querySelector('.window-titlebar');
        const dragRegion = el.querySelector('.window-titlebar-drag-region');
        (dragRegion || titlebar).addEventListener('mousedown', (e) => {
            if (e.target.closest('.window-controls')) return;
            startWindowDrag(e, windowId);
        });

        // Right-click on titlebar -> show controls menu
        titlebar.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showWindowControlsMenu(e.clientX, e.clientY, windowId);
        });

        // Bind control buttons
        el.querySelectorAll('.window-controls .win-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                if (action === 'close') closeWindow(windowId);
                else if (action === 'minimize') minimizeWindow(windowId);
                else if (action === 'maximize') toggleMaximize(windowId);
                else if (action === 'pin') toggleAlwaysOnTop(windowId);
            });
        });

        // Bind resize handles
        el.querySelectorAll('.resize-handle').forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                startResize(e, windowId, handle.dataset.resize);
            });
        });

        // Focus on click
        el.addEventListener('mousedown', () => focusWindow(windowId));

        // Bind window controls menu
        const wcm = el.querySelector('.window-controls-menu');
        if (wcm) {
            wcm.addEventListener('click', (e) => {
                const item = e.target.closest('.wcm-item');
                if (!item) return;
                const action = item.dataset.action;
                const slider = e.target.closest('.wcm-transparency-slider');
                if (slider) return; // Let slider do its thing
                handleWindowMenuAction(windowId, action, item);
                wcm.classList.remove('show');
            });

            const slider = wcm.querySelector('.wcm-transparency-slider');
            if (slider) {
                slider.addEventListener('input', (e) => {
                    setWindowTransparency(windowId, e.target.value);
                });
            }
        }

        if ($.windowContainer) {
            $.windowContainer.appendChild(el);
        }

        // Store window reference
        OS.windows.set(windowId, {
            id: windowId,
            appId: appId,
            title: winTitle,
            icon: winIcon,
            element: el,
            minimized: false,
            maximized: false,
            alwaysOnTop: false,
            transparency: 100,
            prevRect: null,
            desktop: OS.currentDesktop,
        });

        // Add to current virtual desktop
        OS.virtualDesktops[OS.currentDesktop].windows.add(windowId);

        focusWindow(windowId);
        addTaskbarItem(windowId, winTitle, winIcon);
        addToRecentApps(app);
        trackAppLaunch(appId);

        return el;
    }

    function closeWindow(windowId) {
        const win = OS.windows.get(windowId);
        if (!win) return;

        win.element.classList.add('closing');
        setTimeout(() => {
            if (win.element.parentNode) {
                win.element.parentNode.removeChild(win.element);
            }
            OS.windows.delete(windowId);
            removeTaskbarItem(windowId);

            // Remove from virtual desktop
            OS.virtualDesktops.forEach(vd => vd.windows.delete(windowId));
        }, 200);
    }

    function minimizeWindow(windowId) {
        const win = OS.windows.get(windowId);
        if (!win) return;
        win.element.classList.add('minimized');
        win.minimized = true;
        win.element.classList.remove('focused');
        updateTaskbarItem(windowId, 'minimized');
    }

    function restoreWindow(windowId) {
        const win = OS.windows.get(windowId);
        if (!win) return;
        win.element.classList.remove('minimized');
        win.minimized = false;
        focusWindow(windowId);
        updateTaskbarItem(windowId, 'active');
    }

    function maximizeWindow(windowId) {
        const win = OS.windows.get(windowId);
        if (!win || win.maximized) return;
        win.prevRect = {
            left: win.element.style.left,
            top: win.element.style.top,
            width: win.element.style.width,
            height: win.element.style.height,
        };
        win.element.classList.add('maximized');
        win.maximized = true;
        const maxBtn = win.element.querySelector('.win-maximize i');
        if (maxBtn) {
            maxBtn.className = 'fa-regular fa-clone';
            maxBtn.parentElement.title = 'Restore';
        }
    }

    function unmaximizeWindow(windowId) {
        const win = OS.windows.get(windowId);
        if (!win || !win.maximized) return;
        win.element.classList.remove('maximized');
        win.maximized = false;
        if (win.prevRect) {
            win.element.style.left = win.prevRect.left;
            win.element.style.top = win.prevRect.top;
            win.element.style.width = win.prevRect.width;
            win.element.style.height = win.prevRect.height;
        }
        const maxBtn = win.element.querySelector('.win-maximize i');
        if (maxBtn) {
            maxBtn.className = 'fa-regular fa-square';
            maxBtn.parentElement.title = 'Maximize';
        }
    }

    function toggleMaximize(windowId) {
        const win = OS.windows.get(windowId);
        if (!win) return;
        if (win.maximized) unmaximizeWindow(windowId);
        else maximizeWindow(windowId);
    }

    function focusWindow(windowId) {
        const win = OS.windows.get(windowId);
        if (!win || win.minimized) return;

        OS.windows.forEach((w, id) => {
            if (id !== windowId) w.element.classList.remove('focused');
        });

        OS.zIndexCounter++;
        win.element.style.zIndex = OS.zIndexCounter;
        win.element.classList.add('focused');
        OS.activeWindow = windowId;
        updateTaskbarItem(windowId, 'active');
    }

    function minimizeAllWindows() {
        OS.windows.forEach((win, id) => {
            if (!win.minimized) minimizeWindow(id);
        });
    }

    function showDesktop() {
        const anyVisible = Array.from(OS.windows.values()).some(w => !w.minimized);
        if (anyVisible) minimizeAllWindows();
        else {
            // Restore all
            OS.windows.forEach((win, id) => {
                if (win.minimized) restoreWindow(id);
            });
        }
    }

    // Always-on-top
    function toggleAlwaysOnTop(windowId) {
        const win = OS.windows.get(windowId);
        if (!win) return;
        win.alwaysOnTop = !win.alwaysOnTop;
        win.element.classList.toggle('always-on-top', win.alwaysOnTop);

        if (win.alwaysOnTop) {
            win.element.style.zIndex = 10000 + OS.zIndexCounter;
        } else {
            OS.zIndexCounter++;
            win.element.style.zIndex = OS.zIndexCounter;
        }

        const pinBtn = win.element.querySelector('.win-pin');
        if (pinBtn) pinBtn.classList.toggle('active', win.alwaysOnTop);
    }

    // Window transparency
    function setWindowTransparency(windowId, value) {
        const win = OS.windows.get(windowId);
        if (!win) return;
        win.transparency = value;
        win.element.style.opacity = value / 100;
        if (value < 100) {
            win.element.style.backdropFilter = `blur(${(100 - value) / 10}px)`;
        } else {
            win.element.style.backdropFilter = '';
        }
    }

    // Window Controls Menu
    function showWindowControlsMenu(x, y, windowId) {
        const win = OS.windows.get(windowId);
        if (!win) return;
        const wcm = win.element.querySelector('.window-controls-menu');
        if (!wcm) return;

        // Position
        const rect = win.element.getBoundingClientRect();
        wcm.style.left = Math.min(x - rect.left, rect.width - 230) + 'px';
        wcm.style.top = (y - rect.top) + 'px';

        // Update states
        const alwaysOnTopItem = wcm.querySelector('[data-action="always-on-top"]');
        if (alwaysOnTopItem) {
            alwaysOnTopItem.classList.toggle('active', win.alwaysOnTop);
        }

        const slider = wcm.querySelector('.wcm-transparency-slider');
        if (slider) slider.value = win.transparency;

        wcm.classList.add('show');

        // Close on click outside
        const closeMenu = (e) => {
            if (!wcm.contains(e.target)) {
                wcm.classList.remove('show');
                document.removeEventListener('click', closeMenu);
            }
        };
        setTimeout(() => document.addEventListener('click', closeMenu), 10);
    }

    function handleWindowMenuAction(windowId, action, item) {
        switch (action) {
            case 'restore': restoreWindow(windowId); break;
            case 'minimize': minimizeWindow(windowId); break;
            case 'maximize': toggleMaximize(windowId); break;
            case 'always-on-top': toggleAlwaysOnTop(windowId); break;
            case 'snap-left': snapWindow(windowId, 'left'); break;
            case 'snap-right': snapWindow(windowId, 'right'); break;
            case 'snap-full': snapWindow(windowId, 'full'); break;
            case 'close': closeWindow(windowId); break;
        }
    }

    // ============================================================
    // Window Dragging (Enhanced with Snap)
    // ============================================================

    function startWindowDrag(e, windowId) {
        const win = OS.windows.get(windowId);
        if (!win || win.maximized) return;

        // If maximized, unmaximize and center under cursor
        if (win.maximized) {
            unmaximizeWindow(windowId);
            const rect = win.element.getBoundingClientRect();
            OS.dragOffset.x = rect.width / 2;
            OS.dragOffset.y = 20;
            win.element.style.left = (e.clientX - OS.dragOffset.x) + 'px';
            win.element.style.top = (e.clientY - OS.dragOffset.y) + 'px';
        } else {
            const rect = win.element.getBoundingClientRect();
            OS.dragOffset.x = e.clientX - rect.left;
            OS.dragOffset.y = e.clientY - rect.top;
        }

        OS.isDraggingWindow = true;
        OS.activeWindow = windowId;
        win.element.style.transition = 'none';
        focusWindow(windowId);
    }

    function startResize(e, windowId, direction) {
        const win = OS.windows.get(windowId);
        if (!win || win.maximized) return;
        OS.isResizingWindow = true;
        OS.activeWindow = windowId;
        OS.resizeDirection = direction;
        win.element.style.transition = 'none';
        focusWindow(windowId);
    }

    function handleGlobalMouseMove(e) {
        if (OS.isDraggingWindow && OS.activeWindow) {
            const win = OS.windows.get(OS.activeWindow);
            if (win) {
                const x = e.clientX - OS.dragOffset.x;
                const y = e.clientY - OS.dragOffset.y;
                win.element.style.left = x + 'px';
                win.element.style.top = y + 'px';

                if (OS.settings.snapEnabled && !win.maximized) {
                    checkSnapZones(e.clientX, e.clientY);
                }
            }
        }

        if (OS.isResizingWindow && OS.activeWindow) {
            const win = OS.windows.get(OS.activeWindow);
            if (win) {
                const rect = win.element.getBoundingClientRect();
                const dir = OS.resizeDirection;
                if (dir.includes('e')) win.element.style.width = Math.max(320, e.clientX - rect.left) + 'px';
                if (dir.includes('s')) win.element.style.height = Math.max(200, e.clientY - rect.top) + 'px';
                if (dir.includes('w')) {
                    const newWidth = rect.right - e.clientX;
                    if (newWidth >= 320) { win.element.style.width = newWidth + 'px'; win.element.style.left = e.clientX + 'px'; }
                }
                if (dir.includes('n')) {
                    const newHeight = rect.bottom - e.clientY;
                    if (newHeight >= 200) { win.element.style.height = newHeight + 'px'; win.element.style.top = e.clientY + 'px'; }
                }
            }
        }
    }

    function handleGlobalMouseUp() {
        if (OS.isDraggingWindow && OS.activeWindow) {
            const win = OS.windows.get(OS.activeWindow);
            if (win) {
                win.element.style.transition = '';
                if (OS.settings.snapEnabled) {
                    const snap = getSnapZone();
                    if (snap) snapWindow(OS.activeWindow, snap);
                }
            }
        }
        if (OS.isResizingWindow && OS.activeWindow) {
            const win = OS.windows.get(OS.activeWindow);
            if (win) win.element.style.transition = '';
        }
        OS.isDraggingWindow = false;
        OS.isResizingWindow = false;
        hideSnapZones();
    }

    // ============================================================
    // Snap Zones (Enhanced)
    // ============================================================

    function checkSnapZones(mouseX, mouseY) {
        if (!$.snapZones) return;
        const screenW = window.innerWidth;
        const screenH = window.innerHeight;
        const edgeSize = 16;
        let zone = null;

        if (mouseX <= edgeSize && mouseY < screenH - 48) zone = 'left';
        else if (mouseX >= screenW - edgeSize && mouseY < screenH - 48) zone = 'right';
        else if (mouseY <= edgeSize) zone = 'top';
        else if (mouseY >= screenH - 48 - edgeSize && mouseY < screenH - 48) zone = 'full';

        if (zone) {
            $.snapZones.classList.add('active');
            document.querySelectorAll('.snap-zone').forEach(el => {
                el.classList.toggle('highlight', el.dataset.zone === zone);
            });
        } else {
            hideSnapZones();
        }
    }

    function hideSnapZones() {
        if ($.snapZones) {
            $.snapZones.classList.remove('active');
            document.querySelectorAll('.snap-zone').forEach(el => el.classList.remove('highlight'));
        }
    }

    function getSnapZone() {
        const highlighted = document.querySelector('.snap-zone.highlight');
        return highlighted ? highlighted.dataset.zone : null;
    }

    function snapWindow(windowId, zone) {
        const win = OS.windows.get(windowId);
        if (!win) return;
        const screenW = window.innerWidth;
        const screenH = window.innerHeight - 48;

        // Save previous rect if not maximized
        if (!win.maximized) {
            win.prevRect = {
                left: win.element.style.left,
                top: win.element.style.top,
                width: win.element.style.width,
                height: win.element.style.height,
            };
        }

        win.element.classList.remove('maximized');
        win.maximized = false;

        const maxBtn = win.element.querySelector('.win-maximize i');
        if (maxBtn) { maxBtn.className = 'fa-regular fa-square'; maxBtn.parentElement.title = 'Maximize'; }

        switch (zone) {
            case 'left':
                win.element.style.left = '0px'; win.element.style.top = '0px';
                win.element.style.width = (screenW / 2) + 'px'; win.element.style.height = screenH + 'px';
                break;
            case 'right':
                win.element.style.left = (screenW / 2) + 'px'; win.element.style.top = '0px';
                win.element.style.width = (screenW / 2) + 'px'; win.element.style.height = screenH + 'px';
                break;
            case 'top':
                win.element.style.left = '0px'; win.element.style.top = '0px';
                win.element.style.width = screenW + 'px'; win.element.style.height = (screenH / 2) + 'px';
                break;
            case 'full':
                maximizeWindow(windowId); return;
        }

        // Show snap indicator
        showSnapIndicator(zone);
    }

    function showSnapIndicator(zone) {
        if (!$.snapIndicatorOverlay) return;
        document.querySelectorAll('.snap-indicator').forEach(el => el.classList.remove('active'));
        const ind = $.snapIndicatorOverlay.querySelector(`.snap-ind-${zone}`);
        if (ind) ind.classList.add('active');
        $.snapIndicatorOverlay.classList.add('active');
        setTimeout(() => {
            $.snapIndicatorOverlay.classList.remove('active');
        }, 400);
    }

    // ============================================================
    // Window Tiling
    // ============================================================

    function showTilingOverlay() {
        if ($.tilingOverlay) $.tilingOverlay.classList.add('active');
    }

    function tileWindows(mode) {
        const windows = Array.from(OS.windows.values()).filter(w => !w.minimized);
        if (windows.length === 0) return;

        const screenW = window.innerWidth;
        const screenH = window.innerHeight - 48;

        switch (mode) {
            case 'cascade':
                windows.forEach((win, i) => {
                    unmaximizeWindow(win.id);
                    win.element.style.left = (30 + i * 30) + 'px';
                    win.element.style.top = (20 + i * 30) + 'px';
                    win.element.style.width = Math.min(800, screenW - 100) + 'px';
                    win.element.style.height = Math.min(500, screenH - 100) + 'px';
                    focusWindow(win.id);
                });
                break;
            case 'horizontal':
                const hCount = windows.length;
                const hWidth = screenW / hCount;
                windows.forEach((win, i) => {
                    win.element.style.left = (i * hWidth) + 'px';
                    win.element.style.top = '0px';
                    win.element.style.width = hWidth + 'px';
                    win.element.style.height = screenH + 'px';
                    win.element.classList.remove('maximized');
                    win.maximized = false;
                });
                break;
            case 'vertical':
                const vCount = windows.length;
                const vHeight = screenH / vCount;
                windows.forEach((win, i) => {
                    win.element.style.left = '0px';
                    win.element.style.top = (i * vHeight) + 'px';
                    win.element.style.width = screenW + 'px';
                    win.element.style.height = vHeight + 'px';
                    win.element.classList.remove('maximized');
                    win.maximized = false;
                });
                break;
            case 'grid':
                const cols = Math.ceil(Math.sqrt(windows.length));
                const rows = Math.ceil(windows.length / cols);
                const gWidth = screenW / cols;
                const gHeight = screenH / rows;
                windows.forEach((win, i) => {
                    const col = i % cols;
                    const row = Math.floor(i / cols);
                    win.element.style.left = (col * gWidth) + 'px';
                    win.element.style.top = (row * gHeight) + 'px';
                    win.element.style.width = gWidth + 'px';
                    win.element.style.height = gHeight + 'px';
                    win.element.classList.remove('maximized');
                    win.maximized = false;
                });
                break;
        }

        addNotification('Window Manager', `Windows tiled: ${mode}`, 'success');
    }

    // ============================================================
    // Virtual Desktops
    // ============================================================

    function initVirtualDesktops() {
        // Thumbnail click handlers
        const vdList = document.getElementById('vdDesktopList');
        if (vdList) {
            vdList.addEventListener('click', (e) => {
                const thumb = e.target.closest('.vd-thumb');
                if (thumb) switchDesktop(parseInt(thumb.dataset.desktop));
            });
        }
    }

    function switchDesktop(index) {
        if (index < 0 || index >= OS.virtualDesktops.length) return;

        const prevDesktop = OS.currentDesktop;
        OS.currentDesktop = index;

        // Update visibility of windows
        OS.windows.forEach((win, id) => {
            if (win.desktop === index) {
                win.element.style.display = '';
            } else {
                win.element.style.display = 'none';
            }
        });

        // Update thumbnails
        document.querySelectorAll('.vd-thumb').forEach((thumb, i) => {
            thumb.classList.toggle('active', i === index);
        });

        // Update dots
        document.querySelectorAll('.vd-dot').forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });

        // Auto-hide switcher after switch
        setTimeout(() => {
            if ($.virtualDesktopSwitcher) {
                $.virtualDesktopSwitcher.classList.remove('show');
            }
        }, 600);
    }

    function addVirtualDesktop() {
        if (OS.virtualDesktops.length >= 8) {
            addNotification('Desktop', 'Maximum 8 virtual desktops allowed', 'warning');
            return;
        }
        const newId = OS.virtualDesktops.length;
        OS.virtualDesktops.push({ id: newId, name: `Desktop ${newId + 1}`, windows: new Set() });
        renderVirtualDesktopThumbs();
        addNotification('Desktop', `Virtual desktop ${newId + 1} created`, 'success');
    }

    function renderVirtualDesktopThumbs() {
        const vdList = document.getElementById('vdDesktopList');
        if (!vdList) return;

        vdList.innerHTML = OS.virtualDesktops.map((vd, i) => `
            <div class="vd-thumb ${i === OS.currentDesktop ? 'active' : ''}" data-desktop="${i}">
                <div class="vd-thumb-content"></div>
                <span class="vd-thumb-label">${i + 1}</span>
            </div>
        `).join('');

        // Update dots
        const vdDots = document.getElementById('vdDots');
        if (vdDots) {
            vdDots.innerHTML = OS.virtualDesktops.map((vd, i) =>
                `<span class="vd-dot ${i === OS.currentDesktop ? 'active' : ''}" data-desktop="${i}"></span>`
            ).join('');
        }
    }

    function showDesktopSwitcher() {
        if ($.virtualDesktopSwitcher) {
            $.virtualDesktopSwitcher.classList.add('show');
            setTimeout(() => {
                $.virtualDesktopSwitcher.classList.remove('show');
            }, 2000);
        }
    }

    function showDesktopGrid() {
        if (!$.desktopGridView) return;
        const dgvDesktops = document.getElementById('dgvDesktops');
        if (dgvDesktops) {
            dgvDesktops.innerHTML = OS.virtualDesktops.map((vd, i) => `
                <div class="dgv-desktop-item ${i === OS.currentDesktop ? 'active' : ''}" data-desktop="${i}">
                    <div style="padding:8px;font-size:0.625rem;color:var(--text-muted);">
                        ${vd.windows.size} windows
                    </div>
                    <span class="dgv-desktop-label">${vd.name}</span>
                </div>
            `).join('') + `
                <div class="dgv-desktop-item add-new" id="dgvAddDesktop">
                    <i class="fa-solid fa-plus"></i>
                </div>
            `;

            dgvDesktops.querySelectorAll('.dgv-desktop-item:not(.add-new)').forEach(item => {
                item.addEventListener('click', () => {
                    switchDesktop(parseInt(item.dataset.desktop));
                    hideDesktopGrid();
                });
            });

            const addBtn = document.getElementById('dgvAddDesktop');
            if (addBtn) {
                addBtn.addEventListener('click', () => {
                    addVirtualDesktop();
                    showDesktopGrid(); // Refresh
                });
            }
        }
        $.desktopGridView.classList.add('show');
        OS.desktopGridVisible = true;
    }

    function hideDesktopGrid() {
        if ($.desktopGridView) {
            $.desktopGridView.classList.remove('show');
        }
        OS.desktopGridVisible = false;
    }

    // ============================================================
    // Window Preview on Taskbar Hover
    // ============================================================

    function initWindowPreview() {
        // Event delegation for taskbar items
        if ($.taskbarItems) {
            $.taskbarItems.addEventListener('mouseenter', (e) => {
                const item = e.target.closest('.taskbar-item');
                if (item && item.dataset.windowId && $.windowPreviewTooltip) {
                    showWindowPreview(parseInt(item.dataset.windowId), item);
                }
            }, true);

            $.taskbarItems.addEventListener('mouseleave', (e) => {
                if (!e.relatedTarget?.closest('.window-preview-tooltip')) {
                    hideWindowPreview();
                }
            }, true);
        }

        if ($.windowPreviewTooltip) {
            $.windowPreviewTooltip.addEventListener('mouseleave', hideWindowPreview);

            const closeBtn = $.windowPreviewTooltip.querySelector('.wpt-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    const title = $.windowPreviewTooltip.querySelector('.wpt-title')?.textContent;
                    for (const [id, win] of OS.windows) {
                        if (win.title === title) {
                            closeWindow(id);
                            hideWindowPreview();
                            break;
                        }
                    }
                });
            }
        }
    }

    function showWindowPreview(windowId, taskbarItem) {
        const win = OS.windows.get(windowId);
        if (!win || !$.windowPreviewTooltip) return;

        const titleEl = $.windowPreviewTooltip.querySelector('.wpt-title');
        const appEl = $.windowPreviewTooltip.querySelector('.wpt-app');
        if (titleEl) titleEl.textContent = win.title;

        const app = OS.apps.find(a => a.id === win.appId);
        if (appEl) appEl.textContent = app?.name || 'Application';

        // Position above taskbar item
        const rect = taskbarItem.getBoundingClientRect();
        let left = rect.left + rect.width / 2 - 110;
        left = Math.max(8, Math.min(left, window.innerWidth - 228));
        $.windowPreviewTooltip.style.left = left + 'px';
        $.windowPreviewTooltip.style.bottom = '52px';
        $.windowPreviewTooltip.classList.add('show');
    }

    function hideWindowPreview() {
        if ($.windowPreviewTooltip) $.windowPreviewTooltip.classList.remove('show');
    }

    // ============================================================
    // Taskbar
    // ============================================================

    function addTaskbarItem(windowId, title, icon) {
        if (!$.taskbarItems) return;
        const btn = document.createElement('button');
        btn.className = 'taskbar-item';
        btn.dataset.windowId = windowId;
        btn.innerHTML = `
            <span class="taskbar-item-icon"><i class="${icon}"></i></span>
            <span class="taskbar-item-title">${title}</span>
        `;
        btn.addEventListener('click', () => {
            const win = OS.windows.get(windowId);
            if (!win) return;
            if (win.minimized) restoreWindow(windowId);
            else if (win.element.classList.contains('focused')) minimizeWindow(windowId);
            else focusWindow(windowId);
        });
        $.taskbarItems.appendChild(btn);
        OS.taskbarItems.set(windowId, btn);
    }

    function removeTaskbarItem(windowId) {
        const btn = OS.taskbarItems.get(windowId);
        if (btn && btn.parentNode) btn.parentNode.removeChild(btn);
        OS.taskbarItems.delete(windowId);
    }

    function updateTaskbarItem(windowId, state) {
        const btn = OS.taskbarItems.get(windowId);
        if (!btn) return;
        btn.classList.remove('active', 'minimized');
        if (state === 'active') btn.classList.add('active');
        else if (state === 'minimized') btn.classList.add('minimized');
    }

    function renderTaskbarPins() {
        if (!$.taskbarPins) return;
        $.taskbarPins.innerHTML = '';
        OS.pinnedApps.forEach(slug => {
            const app = OS.apps.find(a => a.slug === slug);
            if (!app) return;
            const btn = document.createElement('button');
            btn.className = 'taskbar-item';
            btn.title = app.name;
            btn.innerHTML = `<span class="taskbar-item-icon"><i class="${app.icon}"></i></span>`;
            btn.addEventListener('click', () => launchApp(app.id));
            $.taskbarPins.appendChild(btn);
        });
    }

    // ============================================================
    // Start Menu (Enhanced)
    // ============================================================

    function toggleStartMenu() {
        if (OS.startMenuOpen) closeStartMenu();
        else openStartMenu();
    }

    function openStartMenu() {
        if (!$.startMenu) return;
        closeNotificationCenter();
        if ($.startMenuOverlay) $.startMenuOverlay.classList.add('show');
        $.startMenu.classList.add('show');
        OS.startMenuOpen = true;
        $.taskbarStartBtn?.classList.add('active');
        if ($.startSearchInput) setTimeout(() => $.startSearchInput.focus(), 100);
        renderRecentApps();
    }

    function closeStartMenu() {
        if (!$.startMenu) return;
        if ($.startMenuOverlay) $.startMenuOverlay.classList.remove('show');
        $.startMenu.classList.remove('show');
        OS.startMenuOpen = false;
        $.taskbarStartBtn?.classList.remove('active');
        if ($.startSearchInput) $.startSearchInput.value = '';
        // Reset filter
        filterStartApps('');
    }

    function renderStartMenu() {
        if (!$.startAppGrid) return;
        $.startAppGrid.innerHTML = '';

        OS.apps.forEach(app => {
            const item = document.createElement('div');
            item.className = 'start-app-item' + (app.is_premium ? ' premium' : '');
            item.dataset.appId = app.id;
            item.dataset.slug = app.slug;
            item.dataset.name = app.name.toLowerCase();
            item.dataset.category = app.category || 'Other';
            item.innerHTML = `
                <div class="start-app-item-icon"><i class="${app.icon}"></i></div>
                <div class="start-app-item-name">${app.name}</div>
            `;
            item.addEventListener('click', () => {
                launchApp(app.id);
                closeStartMenu();
            });
            $.startAppGrid.appendChild(item);
        });

        updateAppCount(OS.apps.length);
    }

    function filterStartApps(query) {
        if (!$.startAppGrid) return;
        const items = $.startAppGrid.querySelectorAll('.start-app-item');
        const q = query.toLowerCase().trim();
        let visible = 0;

        items.forEach(item => {
            const name = item.dataset.name;
            const slug = item.dataset.slug;
            if (!q || name.includes(q) || slug.includes(q)) {
                item.style.display = '';
                item.classList.remove('hidden');
                visible++;
            } else {
                item.style.display = 'none';
                item.classList.add('hidden');
            }
        });

        updateAppCount(visible);

        // Update title
        const titleEl = document.getElementById('startAppGridTitle');
        if (titleEl) titleEl.textContent = q ? `Search results for "${q}"` : 'All Applications';
    }

    function filterByCategory(category) {
        if (!$.startAppGrid) return;
        const items = $.startAppGrid.querySelectorAll('.start-app-item');
        let visible = 0;

        items.forEach(item => {
            if (category === 'all' || item.dataset.category === category) {
                item.style.display = '';
                item.classList.remove('hidden');
                visible++;
            } else {
                item.style.display = 'none';
                item.classList.add('hidden');
            }
        });

        updateAppCount(visible);

        const titleEl = document.getElementById('startAppGridTitle');
        if (titleEl) titleEl.textContent = category === 'all' ? 'All Applications' : category;
    }

    function updateAppCount(count) {
        const countEl = document.getElementById('startAppCount');
        if (countEl) countEl.textContent = count + ' apps';
    }

    function addToRecentApps(app) {
        // Remove if already exists
        OS.recentApps = OS.recentApps.filter(a => a.id !== app.id);
        // Add to front
        OS.recentApps.unshift({ ...app, lastUsed: Date.now() });
        // Keep max 8
        OS.recentApps = OS.recentApps.slice(0, 8);
    }

    function renderRecentApps() {
        if (!$.startRecentGrid) return;

        if (OS.recentApps.length === 0) {
            $.startRecentGrid.innerHTML = '<div class="start-recent-empty">No recent apps</div>';
            return;
        }

        $.startRecentGrid.innerHTML = OS.recentApps.slice(0, 6).map(app => `
            <div class="start-recent-item" data-app-id="${app.id}">
                <i class="${app.icon}"></i>
                <span class="start-recent-item-name">${app.name}</span>
            </div>
        `).join('');

        $.startRecentGrid.querySelectorAll('.start-recent-item').forEach(item => {
            item.addEventListener('click', () => {
                const appId = parseInt(item.dataset.appId);
                launchApp(appId);
                closeStartMenu();
            });
        });
    }

    // ============================================================
    // Power Options
    // ============================================================

    function handlePowerAction(action) {
        switch (action) {
            case 'settings':
                launchAppBySlug('settings');
                break;
            case 'lock':
                showToast('System', 'Screen locked', 'info', 2000);
                break;
            case 'logout':
                if (confirm('Are you sure you want to log out?')) {
                    window.location.href = '/auth/logout';
                }
                break;
            case 'restart':
                showToast('System', 'Restarting system...', 'warning', 3000);
                setTimeout(() => window.location.reload(), 2000);
                break;
            case 'shutdown':
                showToast('System', 'Shutting down...', 'error', 3000);
                setTimeout(() => {
                    document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0a0a0a;color:#333;font-family:monospace;">It is now safe to turn off your computer.</div>';
                }, 2000);
                break;
        }
    }

    // ============================================================
    // Context Menu (Enhanced)
    // ============================================================

    function handleDesktopContextMenu(e) {
        if (e.target.closest('.desktop-icon') ||
            e.target.closest('.os-window') ||
            e.target.closest('.os-taskbar') ||
            e.target.closest('.widget') ||
            e.target.closest('.desktop-widgets')) {
            return;
        }
        e.preventDefault();
        showContextMenu(e.clientX, e.clientY);
    }

    function showContextMenu(x, y) {
        if (!$.contextMenu) return;
        closeStartMenu();
        closeNotificationCenter();

        const rect = $.contextMenu.getBoundingClientRect();
        const finalX = x + 220 > window.innerWidth ? window.innerWidth - 230 : x;
        const finalY = y + 350 > window.innerHeight ? window.innerHeight - 360 : y;

        $.contextMenu.style.left = finalX + 'px';
        $.contextMenu.style.top = finalY + 'px';
        $.contextMenu.classList.add('show');
        OS.contextMenuOpen = true;
    }

    function closeContextMenu() {
        if (!$.contextMenu) return;
        $.contextMenu.classList.remove('show');
        OS.contextMenuOpen = false;
    }

    function handleContextAction(action) {
        switch (action) {
            case 'refresh':
                renderDesktopIcons();
                showToast('Desktop', 'Desktop refreshed', 'success', 2000);
                break;
            case 'new-folder':
                showToast('File Manager', 'New folder created on Desktop', 'success', 2000);
                break;
            case 'new-text':
                showToast('File Manager', 'New text document created', 'success', 2000);
                break;
            case 'new-shortcut':
                showToast('File Manager', 'Create shortcut wizard opened', 'info', 2000);
                break;
            case 'new-note':
                showToast('Notes', 'New sticky note added', 'success', 2000);
                break;
            case 'view-large': OS.settings.desktopView = 'large'; renderDesktopIcons(); break;
            case 'view-small': OS.settings.desktopView = 'small'; renderDesktopIcons(); break;
            case 'view-list': OS.settings.desktopView = 'list'; renderDesktopIcons(); break;
            case 'sort-name': case 'sort-size': case 'sort-type': case 'sort-date':
            case 'sort-asc': case 'sort-desc':
                showToast('Desktop', `Sorted by ${action.replace('sort-', '')}`, 'info', 1500);
                break;
            case 'wallpaper':
                showToast('Personalization', 'Wallpaper settings opened', 'info', 2000);
                break;
            case 'theme':
                launchAppBySlug('settings');
                break;
            case 'terminal':
                launchAppBySlug('terminal');
                break;
            case 'properties':
                showToast('Desktop', 'Desktop properties', 'info', 2000);
                break;
        }
    }

    function setAccentColor(color) {
        document.documentElement.style.setProperty('--color-primary', color);
        showToast('Personalization', 'Accent color updated', 'success', 2000);
    }

    // ============================================================
    // Notification Center (Enhanced)
    // ============================================================

    function toggleNotificationCenter() {
        if (OS.notifPanelOpen) closeNotificationCenter();
        else openNotificationCenter();
    }

    function openNotificationCenter() {
        if (!$.notificationCenter) return;
        closeStartMenu();
        if ($.notificationCenterOverlay) $.notificationCenterOverlay.classList.add('show');
        $.notificationCenter.classList.add('show');
        OS.notifPanelOpen = true;
        renderNotifications();
        renderSystemNotifications();
    }

    function closeNotificationCenter() {
        if (!$.notificationCenter) return;
        if ($.notificationCenterOverlay) $.notificationCenterOverlay.classList.remove('show');
        $.notificationCenter.classList.remove('show');
        OS.notifPanelOpen = false;
    }

    function addNotification(title, message, type = 'info') {
        const id = Date.now() + Math.random();
        const notif = { id, title, message, type, time: new Date(), read: false };
        OS.notifications.unshift(notif);

        // Update badge
        updateNotifBadge();

        // Show toast
        if (!OS.settings.dndEnabled) {
            showToast(title, message, type);
        }

        // Update panel if open
        if (OS.notifPanelOpen) renderNotifications();
    }

    function renderNotifications() {
        if (!$.ncList) return;

        const unreadCount = OS.notifications.filter(n => !n.read).length;
        if ($.ncCount) {
            $.ncCount.textContent = unreadCount > 0 ? `${unreadCount} new notification${unreadCount !== 1 ? 's' : ''}` : 'No new notifications';
        }

        if (OS.notifications.length === 0) {
            $.ncList.innerHTML = `
                <div class="nc-empty">
                    <div class="nc-empty-icon"><i class="fa-solid fa-bell-slash"></i></div>
                    <p>No notifications</p>
                    <span>We'll let you know when something arrives</span>
                </div>
            `;
            return;
        }

        $.ncList.innerHTML = OS.notifications.map(n => `
            <div class="nc-item ${n.read ? '' : 'unread'}" data-id="${n.id}">
                <div class="nc-item-icon ${n.type}"><i class="fa-solid ${getNotifIcon(n.type)}"></i></div>
                <div class="nc-item-content">
                    <div class="nc-item-title">${n.title}</div>
                    <div class="nc-item-message">${n.message}</div>
                    <div class="nc-item-time">${formatTime(n.time)}</div>
                </div>
                <button class="nc-item-close" data-id="${n.id}"><i class="fa-solid fa-xmark"></i></button>
            </div>
        `).join('');

        // Bind close buttons
        $.ncList.querySelectorAll('.nc-item-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = parseFloat(btn.dataset.id);
                removeNotification(id);
            });
        });

        // Mark as read on click
        $.ncList.querySelectorAll('.nc-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = parseFloat(item.dataset.id);
                const notif = OS.notifications.find(n => n.id === id);
                if (notif) notif.read = true;
                item.classList.remove('unread');
                updateNotifBadge();
                const count = OS.notifications.filter(n => !n.read).length;
                if ($.ncCount) {
                    $.ncCount.textContent = count > 0 ? `${count} new notification${count !== 1 ? 's' : ''}` : 'No new notifications';
                }
            });
        });
    }

    function removeNotification(id) {
        const idx = OS.notifications.findIndex(n => n.id === id);
        if (idx >= 0) {
            OS.notifications.splice(idx, 1);
            renderNotifications();
            updateNotifBadge();
        }
    }

    function clearAllNotifications() {
        OS.notifications = [];
        renderNotifications();
        updateNotifBadge();
        if ($.ncCount) $.ncCount.textContent = 'No new notifications';
    }

    function updateNotifBadge() {
        if (!$.notifBadge) return;
        const count = OS.notifications.filter(n => !n.read).length;
        if (count > 0) {
            $.notifBadge.textContent = count > 99 ? '99+' : count;
            $.notifBadge.style.display = '';
            $.trayNotifications?.classList.add('has-unread');
        } else {
            $.notifBadge.style.display = 'none';
            $.trayNotifications?.classList.remove('has-unread');
        }
    }

    function toggleDnd() {
        OS.settings.dndEnabled = !OS.settings.dndEnabled;
        $.ncDndToggle?.classList.toggle('dnd-active', OS.settings.dndEnabled);
        if ($.dndIndicator) {
            $.dndIndicator.style.display = OS.settings.dndEnabled ? 'flex' : 'none';
        }
        showToast('Focus Mode', OS.settings.dndEnabled ? 'Do not disturb enabled' : 'Do not disturb disabled', 'info', 2000);
    }

    function loadMockNotifications() {
        // Load some demo system notifications
        setTimeout(() => {
            addNotification('JALAGEL OS Pro', 'Welcome back, ' + (window.OS_CONFIG?.user?.name || 'User') + '!', 'success');
        }, 1500);

        setTimeout(() => {
            addSystemNotification('Certificate', 'SSL certificate expires in 7 days', 'warning');
        }, 3000);
    }

    // System Notifications
    function addSystemNotification(title, message, type = 'info') {
        const id = Date.now() + Math.random();
        OS.systemNotifications.unshift({ id, title, message, type, time: new Date() });

        const sysSection = document.getElementById('ncSystemSection');
        if (sysSection) sysSection.style.display = '';
        if (OS.notifPanelOpen) renderSystemNotifications();
    }

    function renderSystemNotifications() {
        if (!$.ncSystemList) return;

        if (OS.systemNotifications.length === 0) {
            const sysSection = document.getElementById('ncSystemSection');
            if (sysSection) sysSection.style.display = 'none';
            return;
        }

        const sysSection = document.getElementById('ncSystemSection');
        if (sysSection) sysSection.style.display = '';

        $.ncSystemList.innerHTML = OS.systemNotifications.map(n => `
            <div class="nc-item" data-id="${n.id}">
                <div class="nc-item-icon ${n.type}"><i class="fa-solid ${getNotifIcon(n.type)}"></i></div>
                <div class="nc-item-content">
                    <div class="nc-item-title">${n.title}</div>
                    <div class="nc-item-message">${n.message}</div>
                    <div class="nc-item-time">${formatTime(n.time)}</div>
                </div>
            </div>
        `).join('');
    }

    function getNotifIcon(type) {
        const icons = {
            info: 'fa-info-circle', success: 'fa-check-circle',
            warning: 'fa-exclamation-triangle', error: 'fa-times-circle',
            system: 'fa-server',
        };
        return icons[type] || icons.info;
    }

    // Toast Notifications
    function showToast(title, message, type = 'info', duration = 4000) {
        if (!$.toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `os-toast toast-${type}`;
        const iconMap = { info: 'fa-info-circle', success: 'fa-check-circle', warning: 'fa-exclamation-triangle', error: 'fa-times-circle' };

        toast.innerHTML = `
            <div class="toast-icon ${type}"><i class="fa-solid ${iconMap[type] || iconMap.info}"></i></div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <div class="toast-actions">
                <button class="toast-close"><i class="fa-solid fa-xmark"></i></button>
            </div>
        `;

        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.classList.add('toast-out');
            setTimeout(() => toast.remove(), 300);
        });

        $.toastContainer.appendChild(toast);

        if (duration > 0) {
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.classList.add('toast-out');
                    setTimeout(() => toast.remove(), 300);
                }
            }, duration);
        }
    }

    // ============================================================
    // Clock & Calendar
    // ============================================================

    function startClock() {
        updateClock();
        setInterval(updateClock, 1000);
        setInterval(updateAnalogClock, 1000);
        setInterval(updateSystemMonitor, 2000);
    }

    function updateClock() {
        if (!$.trayTime || !$.trayDate) return;
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;

        $.trayTime.textContent = `${displayHours}:${minutes} ${ampm}`;
        $.trayDate.textContent = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        // Update digital clock widget
        const clockDigital = document.getElementById('clockDigital');
        if (clockDigital) {
            const seconds = now.getSeconds().toString().padStart(2, '0');
            clockDigital.textContent = `${displayHours}:${minutes}:${seconds} ${ampm}`;
        }

        const clockDate = document.getElementById('clockDate');
        if (clockDate) {
            clockDate.textContent = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        }
    }

    function updateAnalogClock() {
        const now = new Date();
        const hours = now.getHours() % 12;
        const minutes = now.getMinutes();
        const seconds = now.getSeconds();

        const hourDeg = (hours * 30) + (minutes * 0.5);
        const minuteDeg = minutes * 6;
        const secondDeg = seconds * 6;

        const hourHand = document.getElementById('hourHand');
        const minuteHand = document.getElementById('minuteHand');
        const secondHand = document.getElementById('secondHand');

        if (hourHand) hourHand.setAttribute('transform', `rotate(${hourDeg} 50 50)`);
        if (minuteHand) minuteHand.setAttribute('transform', `rotate(${minuteDeg} 50 50)`);
        if (secondHand) secondHand.setAttribute('transform', `rotate(${secondDeg} 50 50)`);
    }

    // Calendar
    let calendarDate = new Date();

    function initCalendar() {
        renderCalendar();
        renderWidgetCalendar();
    }

    function toggleCalendar() {
        if (!$.calendarPopup) return;
        $.calendarPopup.classList.toggle('show');
        if ($.calendarPopup.classList.contains('show')) renderCalendar();
    }

    function changeCalendarMonth(delta) {
        calendarDate.setMonth(calendarDate.getMonth() + delta);
        renderCalendar();
    }

    function renderCalendar() {
        if (!$.calDays || !$.calTitle) return;
        const year = calendarDate.getFullYear();
        const month = calendarDate.getMonth();
        $.calTitle.textContent = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();

        let html = '';
        // Previous month days
        const prevMonthDays = new Date(year, month, 0).getDate();
        for (let i = firstDay - 1; i >= 0; i--) {
            html += `<div class="cal-day other-month">${prevMonthDays - i}</div>`;
        }
        // Current month days
        for (let day = 1; day <= daysInMonth; day++) {
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            const hasEvent = [5, 12, 18, 25].includes(day); // Demo events
            html += `<div class="cal-day ${isToday ? 'today' : ''} ${hasEvent ? 'has-event' : ''}">${day}</div>`;
        }
        // Next month days
        const remaining = (7 - ((firstDay + daysInMonth) % 7)) % 7;
        for (let day = 1; day <= remaining; day++) {
            html += `<div class="cal-day other-month">${day}</div>`;
        }

        $.calDays.innerHTML = html;
    }

    // Widget Calendar
    let widgetCalendarDate = new Date();

    function renderWidgetCalendar() {
        const wcalDays = document.getElementById('wcalDays');
        const wcalMonthYear = document.getElementById('wcalMonthYear');
        if (!wcalDays || !wcalMonthYear) return;

        const year = widgetCalendarDate.getFullYear();
        const month = widgetCalendarDate.getMonth();
        wcalMonthYear.textContent = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();

        let html = '';
        for (let i = firstDay - 1; i >= 0; i--) {
            html += `<div class="wcal-day other-month">${new Date(year, month, 0).getDate() - i}</div>`;
        }
        for (let day = 1; day <= daysInMonth; day++) {
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            html += `<div class="wcal-day ${isToday ? 'today' : ''}">${day}</div>`;
        }
        const remaining = (7 - ((firstDay + daysInMonth) % 7)) % 7;
        for (let day = 1; day <= remaining; day++) {
            html += `<div class="wcal-day other-month">${day}</div>`;
        }
        wcalDays.innerHTML = html;
    }

    // Bind widget calendar nav
    const wcalPrev = document.getElementById('wcalPrev');
    const wcalNext = document.getElementById('wcalNext');
    if (wcalPrev) wcalPrev.addEventListener('click', () => { widgetCalendarDate.setMonth(widgetCalendarDate.getMonth() - 1); renderWidgetCalendar(); });
    if (wcalNext) wcalNext.addEventListener('click', () => { widgetCalendarDate.setMonth(widgetCalendarDate.getMonth() + 1); renderWidgetCalendar(); });

    // ============================================================
    // Volume
    // ============================================================

    function toggleVolumePopup() {
        if ($.volumePopup) $.volumePopup.classList.toggle('show');
    }

    function setVolume(value) {
        OS.volume = value;
        if ($.volSlider) $.volSlider.value = value;
        if ($.volValue) $.volValue.textContent = value + '%';
        OS.muted = value === 0;
        updateVolumeIcon();
    }

    function toggleMute() {
        OS.muted = !OS.muted;
        if (OS.muted) {
            if ($.volSlider) $.volSlider.value = 0;
            if ($.volValue) $.volValue.textContent = '0%';
        } else {
            if ($.volSlider) $.volSlider.value = OS.volume || 80;
            if ($.volValue) $.volValue.textContent = (OS.volume || 80) + '%';
        }
        updateVolumeIcon();
    }

    function updateVolumeIcon() {
        const volIcon = document.getElementById('trayVolumeIcon');
        const muteBtnIcon = document.querySelector('.vol-mute-btn i');
        if (!volIcon) return;

        let iconClass = 'fa-volume-high';
        if (OS.muted || OS.volume === 0) iconClass = 'fa-volume-xmark';
        else if (OS.volume < 30) iconClass = 'fa-volume-low';
        else if (OS.volume < 70) iconClass = 'fa-volume-low';

        volIcon.className = `fa-solid ${iconClass}`;
        if (muteBtnIcon) muteBtnIcon.className = `fa-solid ${iconClass}`;
    }

    // ============================================================
    // Language
    // ============================================================

    function toggleLangPopup() {
        if ($.langPopup) $.langPopup.classList.toggle('show');
    }

    function setLanguage(lang, code) {
        const langCodeEl = document.getElementById('trayLangCode');
        if (langCodeEl) langCodeEl.textContent = code;
        document.querySelectorAll('.lang-item').forEach(item => {
            item.classList.toggle('active', item.dataset.lang === lang);
        });
        showToast('Language', `Input language set to ${code}`, 'info', 2000);
    }

    // ============================================================
    // Desktop Widgets
    // ============================================================

    function initWidgets() {
        // Generate clock ticks
        const ticksEl = document.getElementById('clockTicks');
        if (ticksEl) {
            for (let i = 0; i < 12; i++) {
                const angle = (i * 30) * Math.PI / 180;
                const x1 = 50 + 38 * Math.sin(angle);
                const y1 = 50 - 38 * Math.cos(angle);
                const x2 = 50 + 42 * Math.sin(angle);
                const y2 = 50 - 42 * Math.cos(angle);
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', x1); line.setAttribute('y1', y1);
                line.setAttribute('x2', x2); line.setAttribute('y2', y2);
                ticksEl.appendChild(line);
            }
        }

        // Initial weather render
        renderWeather();

        // Initial system monitor
        updateSystemMonitor();

        // Load demo quick notes
        OS.widgets.notes = [
            { id: 1, text: 'Review certificate expiry dates', done: false },
            { id: 2, text: 'Update SSL config', done: true },
            { id: 3, text: 'Schedule backup', done: false },
        ];
        renderQuickNotes();

        // Load demo certificates
        OS.widgets.certificates = [
            { name: '*.jalagel.com', status: 'ok', expiry: '90 days' },
            { name: 'api.jalagel.com', status: 'ok', expiry: '120 days' },
            { name: 'dev.jalagel.com', status: 'warn', expiry: '7 days' },
        ];
        renderCertificates();

        // Update uptime
        setInterval(() => {
            const elapsed = Date.now() - OS.uptime;
            const hours = Math.floor(elapsed / 3600000);
            const mins = Math.floor((elapsed % 3600000) / 60000);
            const uptimeVal = document.getElementById('uptimeValue');
            if (uptimeVal) uptimeVal.textContent = `${hours}h ${mins}m`;
        }, 60000);
    }

    function renderWeather() {
        // Mock weather data - in production this would be fetched from API
        const forecasts = [
            { day: 'Mon', icon: 'fa-cloud-sun', temp: '72°' },
            { day: 'Tue', icon: 'fa-sun', temp: '75°' },
            { day: 'Wed', icon: 'fa-cloud-rain', temp: '68°' },
        ];

        const forecastEl = document.getElementById('weatherForecast');
        if (forecastEl) {
            forecastEl.innerHTML = forecasts.map(f => `
                <div class="forecast-day">
                    <div class="forecast-day-name">${f.day}</div>
                    <div class="forecast-day-icon"><i class="fa-solid ${f.icon}"></i></div>
                    <div class="forecast-day-temp">${f.temp}</div>
                </div>
            `).join('');
        }
    }

    function updateSystemMonitor() {
        // Mock system data - in production this would use Performance API
        const cpu = Math.floor(Math.random() * 40 + 10);
        const ram = Math.floor(Math.random() * 30 + 40);
        const disk = Math.floor(Math.random() * 10 + 55);

        const cpuBar = document.getElementById('sysCpuBar');
        const cpuVal = document.getElementById('sysCpuValue');
        const ramBar = document.getElementById('sysRamBar');
        const ramVal = document.getElementById('sysRamValue');
        const diskBar = document.getElementById('sysDiskBar');
        const diskVal = document.getElementById('sysDiskValue');

        if (cpuBar) cpuBar.style.width = cpu + '%';
        if (cpuVal) cpuVal.textContent = cpu + '%';
        if (ramBar) ramBar.style.width = ram + '%';
        if (ramVal) ramVal.textContent = ram + '%';
        if (diskBar) diskBar.style.width = disk + '%';
        if (diskVal) diskVal.textContent = disk + '%';
    }

    // Quick Notes
    function renderQuickNotes() {
        const list = document.getElementById('quickNotesList');
        if (!list) return;

        if (OS.widgets.notes.length === 0) {
            list.innerHTML = '<div style="font-size:0.6875rem;color:var(--text-muted);text-align:center;padding:12px 0;">No notes yet</div>';
            return;
        }

        list.innerHTML = OS.widgets.notes.map(note => `
            <div class="note-item" data-id="${note.id}">
                <div class="note-checkbox ${note.done ? 'checked' : ''}" data-id="${note.id}">
                    ${note.done ? '<i class="fa-solid fa-check"></i>' : ''}
                </div>
                <span class="note-text ${note.done ? 'done' : ''}">${note.text}</span>
                <button class="note-delete" data-id="${note.id}"><i class="fa-solid fa-xmark"></i></button>
            </div>
        `).join('');

        list.querySelectorAll('.note-checkbox').forEach(cb => {
            cb.addEventListener('click', () => {
                const id = parseInt(cb.dataset.id);
                const note = OS.widgets.notes.find(n => n.id === id);
                if (note) { note.done = !note.done; renderQuickNotes(); }
            });
        });

        list.querySelectorAll('.note-delete').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.id);
                OS.widgets.notes = OS.widgets.notes.filter(n => n.id !== id);
                renderQuickNotes();
            });
        });
    }

    function addQuickNote() {
        const input = document.getElementById('quickNoteInput');
        if (!input || !input.value.trim()) return;
        OS.widgets.notes.push({
            id: Date.now(), text: input.value.trim(), done: false
        });
        input.value = '';
        renderQuickNotes();
    }

    // Certificates Widget
    function renderCertificates() {
        const list = document.getElementById('certList');
        const activeCount = document.getElementById('certActiveCount');
        const okCount = document.getElementById('certOkCount');
        const warnCount = document.getElementById('certWarnCount');
        const errorCount = document.getElementById('certErrorCount');
        const ring = document.getElementById('certRingActive');

        if (activeCount) activeCount.textContent = OS.widgets.certificates.length;
        const ok = OS.widgets.certificates.filter(c => c.status === 'ok').length;
        const warn = OS.widgets.certificates.filter(c => c.status === 'warn').length;
        const err = OS.widgets.certificates.filter(c => c.status === 'error').length;
        if (okCount) okCount.textContent = ok;
        if (warnCount) warnCount.textContent = warn;
        if (errorCount) errorCount.textContent = err;

        if (ring) {
            const total = OS.widgets.certificates.length || 1;
            const goodRatio = ok / total;
            const circumference = 2 * Math.PI * 26;
            ring.style.strokeDashoffset = circumference * (1 - goodRatio);
        }

        if (list) {
            list.innerHTML = OS.widgets.certificates.map(cert => `
                <div class="cert-item cert-${cert.status}">
                    <i class="fa-solid ${cert.status === 'ok' ? 'fa-check-circle' : cert.status === 'warn' ? 'fa-triangle-exclamation' : 'fa-circle-xmark'}"></i>
                    <span class="cert-item-name">${cert.name}</span>
                    <span class="cert-item-expiry">${cert.expiry}</span>
                </div>
            `).join('');
        }
    }

    // Widget Context Menu
    function showWidgetContextMenu(x, y, widgetType) {
        if (!$.widgetContextMenu) return;
        const finalX = x + 160 > window.innerWidth ? window.innerWidth - 170 : x;
        const finalY = y + 200 > window.innerHeight ? window.innerHeight - 210 : y;
        $.widgetContextMenu.style.left = finalX + 'px';
        $.widgetContextMenu.style.top = finalY + 'px';
        $.widgetContextMenu.classList.add('show');
    }

    function handleWidgetContextAction(action) {
        switch (action) {
            case 'refresh': updateSystemMonitor(); renderWeather(); break;
            case 'configure': showToast('Widgets', 'Widget configuration', 'info', 2000); break;
            case 'small': case 'medium': case 'large': break; // Handled via CSS classes
            case 'hide':
                if ($.desktopWidgets) $.desktopWidgets.style.display = 'none';
                break;
        }
    }

    // ============================================================
    // Keyboard Shortcuts (Comprehensive)
    // ============================================================

    function bindKeyboardEvents() {
        document.addEventListener('keydown', handleKeyboard);
    }

    function handleKeyboard(e) {
        const isMeta = e.metaKey || e.ctrlKey;

        // Win/Super key -> Open start menu
        if (e.key === 'Meta' || e.key === 'OS') {
            e.preventDefault();
            toggleStartMenu();
            return;
        }

        // Esc -> Close menus
        if (e.key === 'Escape') {
            if (OS.desktopGridVisible) { hideDesktopGrid(); return; }
            if (OS.startMenuOpen) { closeStartMenu(); return; }
            if (OS.notifPanelOpen) { closeNotificationCenter(); return; }
            if (OS.contextMenuOpen) { closeContextMenu(); return; }
            if ($.tilingOverlay?.classList.contains('active')) { $.tilingOverlay.classList.remove('active'); return; }
            return;
        }

        // Win+D -> Show desktop
        if (isMeta && e.key === 'd') {
            e.preventDefault();
            showDesktop();
            return;
        }

        // Win+M -> Minimize all
        if (isMeta && e.key === 'm') {
            e.preventDefault();
            minimizeAllWindows();
            return;
        }

        // Win+Arrow keys -> Snap windows
        if (isMeta) {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                if (OS.activeWindow) snapWindow(OS.activeWindow, 'left');
                return;
            }
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                if (OS.activeWindow) snapWindow(OS.activeWindow, 'right');
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (OS.activeWindow) maximizeWindow(OS.activeWindow);
                return;
            }
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (OS.activeWindow) unmaximizeWindow(OS.activeWindow);
                return;
            }
        }

        // Alt+F4 -> Close window
        if (e.altKey && e.key === 'F4') {
            e.preventDefault();
            if (OS.activeWindow) closeWindow(OS.activeWindow);
            return;
        }

        // Win+Tab -> Desktop grid
        if (isMeta && e.key === 'Tab') {
            e.preventDefault();
            if (OS.desktopGridVisible) hideDesktopGrid();
            else showDesktopGrid();
            return;
        }

        // Ctrl+Shift+Esc -> System Monitor
        if (e.ctrlKey && e.shiftKey && e.key === 'Escape') {
            e.preventDefault();
            launchAppBySlug('system-monitor');
            return;
        }

        // Win+T -> Show tiling overlay
        if (isMeta && e.key === 't' && !e.shiftKey) {
            e.preventDefault();
            showTilingOverlay();
            return;
        }

        // Win+number -> Switch virtual desktop
        if (isMeta && e.key >= '1' && e.key <= '9') {
            e.preventDefault();
            const desktop = parseInt(e.key) - 1;
            if (desktop < OS.virtualDesktops.length) {
                switchDesktop(desktop);
                showDesktopSwitcher();
            }
            return;
        }

        // Win+Ctrl+D -> New virtual desktop
        if (isMeta && e.ctrlKey && e.key === 'd') {
            e.preventDefault();
            addVirtualDesktop();
            return;
        }

        // App shortcuts
        if (e.ctrlKey && e.altKey && e.key === 't') {
            e.preventDefault(); launchAppBySlug('terminal'); return;
        }
        if (e.ctrlKey && e.altKey && e.key === 'b') {
            e.preventDefault(); launchAppBySlug('browser'); return;
        }
        if (e.ctrlKey && e.altKey && e.key === 's') {
            e.preventDefault(); launchAppBySlug('settings'); return;
        }
        if (e.ctrlKey && e.altKey && e.key === 'f') {
            e.preventDefault(); launchAppBySlug('file-manager'); return;
        }
        if (e.ctrlKey && e.altKey && e.key === 'n') {
            e.preventDefault(); launchAppBySlug('notes'); return;
        }
    }

    // ============================================================
    // App Launching
    // ============================================================

    function launchApp(appId) {
        const app = OS.apps.find(a => a.id === appId);
        if (!app) return;
        createWindow(app.id, app.name, app.icon);
    }

    function launchAppBySlug(slug) {
        const app = OS.apps.find(a => a.slug === slug);
        if (app) launchApp(app.id);
        else console.warn(`[JALAGEL OS] App not found: ${slug}`);
    }

    async function trackAppLaunch(appId) {
        try {
            await fetch('/api/apps/launch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ app_id: appId }),
            });
        } catch (error) {}
    }

    // ============================================================
    // Utilities
    // ============================================================

    function formatTime(date) {
        const now = new Date();
        const diff = Math.floor((now - date) / 1000);
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    }

    // ============================================================
    // Expose API Globally
    // ============================================================

    window.JalagelOS = {
        createWindow,
        closeWindow,
        minimizeWindow,
        maximizeWindow,
        focusWindow,
        launchApp,
        launchAppBySlug,
        minimizeAllWindows,
        showDesktop,
        addNotification,
        showToast,
        snapWindow,
        tileWindows,
        switchDesktop,
        showDesktopGrid,
        toggleAlwaysOnTop,
        setWindowTransparency,
        toggleDnd,
        setVolume,
        getState: () => ({ ...OS }),
    };

    // ============================================================
    // Boot
    // ============================================================

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
