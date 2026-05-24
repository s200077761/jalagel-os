/**
 * JALAGEL OS Pro - OS Kernel JavaScript
 * Desktop environment, window management, and app system
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
        settings: {
            wallpaper: 'gradient',
            theme: 'dark',
            animations: true,
            snapEnabled: true,
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
        startSearchInput: null,
        startAppGrid: null,
        notificationPanel: null,
        notificationList: null,
        notifBadge: null,
        contextMenu: null,
        snapZones: null,
        trayClock: null,
        trayTime: null,
        trayDate: null,
        loadingOverlay: null,
    };

    // ============================================================
    // Initialization
    // ============================================================

    function init() {
        cacheElements();
        bindEvents();
        startClock();
        loadApps().then(() => {
            renderDesktopIcons();
            renderStartMenu();
            renderTaskbarPins();
            hideLoadingOverlay();
        });
        console.log('[JALAGEL OS] Kernel initialized');
    }

    function cacheElements() {
        $.desktop = document.getElementById('osDesktop');
        $.desktopIcons = document.getElementById('desktopIcons');
        $.windowContainer = document.getElementById('windowContainer');
        $.taskbarItems = document.getElementById('taskbarItems');
        $.taskbarStartBtn = document.getElementById('taskbarStartBtn');
        $.taskbarPins = document.getElementById('taskbarPins');
        $.startMenu = document.getElementById('startMenu');
        $.startSearchInput = document.getElementById('startSearchInput');
        $.startAppGrid = document.getElementById('startAppGrid');
        $.notificationPanel = document.getElementById('notificationPanel');
        $.notificationList = document.getElementById('notificationList');
        $.notifBadge = document.getElementById('notifBadge');
        $.contextMenu = document.getElementById('contextMenu');
        $.snapZones = document.getElementById('snapZones');
        $.trayClock = document.getElementById('trayClock');
        $.trayTime = document.getElementById('trayTime');
        $.trayDate = document.getElementById('trayDate');
        $.loadingOverlay = document.getElementById('osLoadingOverlay');
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

        // Tray notifications
        const trayNotif = document.getElementById('trayNotifications');
        if (trayNotif) {
            trayNotif.addEventListener('click', toggleNotificationPanel);
        }

        const notifClearAll = document.getElementById('notifClearAll');
        if (notifClearAll) {
            notifClearAll.addEventListener('click', clearAllNotifications);
        }

        // Desktop context menu
        if ($.desktop) {
            $.desktop.addEventListener('contextmenu', handleDesktopContextMenu);
        }

        // Close context menu on click
        document.addEventListener('click', (e) => {
            if (OS.contextMenuOpen && !$.contextMenu.contains(e.target)) {
                closeContextMenu();
            }
            // Also close start menu / notif panel if clicking outside
            if (OS.startMenuOpen && !$.startMenu.contains(e.target) && !$.taskbarStartBtn.contains(e.target)) {
                closeStartMenu();
            }
            if (OS.notifPanelOpen && !$.notificationPanel.contains(e.target) && !(trayNotif && trayNotif.contains(e.target))) {
                closeNotificationPanel();
            }
        });

        // Context menu items
        if ($.contextMenu) {
            $.contextMenu.addEventListener('click', (e) => {
                const item = e.target.closest('.context-item');
                if (item) {
                    handleContextAction(item.dataset.action);
                    closeContextMenu();
                }
            });
        }

        // Global mouse events for window drag/resize
        document.addEventListener('mousemove', handleGlobalMouseMove);
        document.addEventListener('mouseup', handleGlobalMouseUp);

        // Keyboard shortcuts
        document.addEventListener('keydown', handleKeyboard);

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
                // Fallback: use hardcoded app list
                OS.apps = getFallbackApps();
            }
        } catch (error) {
            console.warn('[JALAGEL OS] Failed to load apps from API, using fallback:', error);
            OS.apps = getFallbackApps();
        }
    }

    function getFallbackApps() {
        // These match the DEFAULT_APPS from models.py
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

        const iconsToShow = OS.apps.slice(0, 16); // Show first 16 apps on desktop

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

        // Double click to open
        el.addEventListener('dblclick', () => {
            launchApp(app.id);
        });

        // Single click to select
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            selectIcon(el);
        });

        return el;
    }

    function selectIcon(el) {
        deselectAllIcons();
        el.classList.add('selected');
    }

    function deselectAllIcons() {
        document.querySelectorAll('.desktop-icon.selected').forEach(el => {
            el.classList.remove('selected');
        });
    }

    // ============================================================
    // Window Management
    // ============================================================

    function createWindow(appId, title, icon, contentUrl) {
        const app = OS.apps.find(a => a.id === appId);
        if (!app) return null;

        // Check if window already exists
        for (const [id, win] of OS.windows) {
            if (win.appId === appId) {
                focusWindow(id);
                if (win.minimized) {
                    restoreWindow(id);
                }
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
            <div class="window-titlebar">
                <div class="window-icon">
                    <i class="${winIcon}"></i>
                </div>
                <div class="window-title">${winTitle}</div>
                <div class="window-controls">
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
        `;

        // Bind title bar events
        const titlebar = el.querySelector('.window-titlebar');
        titlebar.addEventListener('mousedown', (e) => {
            if (e.target.closest('.window-controls')) return;
            startWindowDrag(e, windowId);
        });

        // Bind control buttons
        el.querySelectorAll('.window-controls .win-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                if (action === 'close') closeWindow(windowId);
                else if (action === 'minimize') minimizeWindow(windowId);
                else if (action === 'maximize') toggleMaximize(windowId);
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
        el.addEventListener('mousedown', () => {
            focusWindow(windowId);
        });

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
            prevRect: null,
        });

        focusWindow(windowId);
        addTaskbarItem(windowId, winTitle, winIcon);

        // Track launch
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

        // Update maximize button icon
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
        if (win.maximized) {
            unmaximizeWindow(windowId);
        } else {
            maximizeWindow(windowId);
        }
    }

    function focusWindow(windowId) {
        const win = OS.windows.get(windowId);
        if (!win || win.minimized) return;

        // Unfocus all other windows
        OS.windows.forEach((w, id) => {
            if (id !== windowId) {
                w.element.classList.remove('focused');
            }
        });

        OS.zIndexCounter++;
        win.element.style.zIndex = OS.zIndexCounter;
        win.element.classList.add('focused');
        OS.activeWindow = windowId;

        updateTaskbarItem(windowId, 'active');
    }

    function minimizeAllWindows() {
        OS.windows.forEach((win, id) => {
            if (!win.minimized) {
                minimizeWindow(id);
            }
        });
    }

    // ============================================================
    // Window Dragging
    // ============================================================

    function startWindowDrag(e, windowId) {
        const win = OS.windows.get(windowId);
        if (!win || win.maximized) return;

        OS.isDraggingWindow = true;
        OS.activeWindow = windowId;

        const rect = win.element.getBoundingClientRect();
        OS.dragOffset.x = e.clientX - rect.left;
        OS.dragOffset.y = e.clientY - rect.top;

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

                // Check snap zones
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

                if (dir.includes('e')) {
                    win.element.style.width = Math.max(320, e.clientX - rect.left) + 'px';
                }
                if (dir.includes('s')) {
                    win.element.style.height = Math.max(200, e.clientY - rect.top) + 'px';
                }
                if (dir.includes('w')) {
                    const newWidth = rect.right - e.clientX;
                    if (newWidth >= 320) {
                        win.element.style.width = newWidth + 'px';
                        win.element.style.left = e.clientX + 'px';
                    }
                }
                if (dir.includes('n')) {
                    const newHeight = rect.bottom - e.clientY;
                    if (newHeight >= 200) {
                        win.element.style.height = newHeight + 'px';
                        win.element.style.top = e.clientY + 'px';
                    }
                }
            }
        }
    }

    function handleGlobalMouseUp() {
        if (OS.isDraggingWindow && OS.activeWindow) {
            const win = OS.windows.get(OS.activeWindow);
            if (win) {
                win.element.style.transition = '';

                // Check for snap
                if (OS.settings.snapEnabled) {
                    const snap = getSnapZone();
                    if (snap) {
                        applySnap(OS.activeWindow, snap);
                    }
                }
            }
        }

        if (OS.isResizingWindow && OS.activeWindow) {
            const win = OS.windows.get(OS.activeWindow);
            if (win) {
                win.element.style.transition = '';
            }
        }

        OS.isDraggingWindow = false;
        OS.isResizingWindow = false;
        hideSnapZones();
    }

    // ============================================================
    // Snap Zones
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
            document.querySelectorAll('.snap-zone').forEach(el => {
                el.classList.remove('highlight');
            });
        }
    }

    function getSnapZone() {
        const highlighted = document.querySelector('.snap-zone.highlight');
        return highlighted ? highlighted.dataset.zone : null;
    }

    function applySnap(windowId, zone) {
        const win = OS.windows.get(windowId);
        if (!win) return;

        const screenW = window.innerWidth;
        const screenH = window.innerHeight - 48; // minus taskbar

        if (zone === 'left') {
            win.element.style.left = '0px';
            win.element.style.top = '0px';
            win.element.style.width = (screenW / 2) + 'px';
            win.element.style.height = screenH + 'px';
            win.maximized = false;
        } else if (zone === 'right') {
            win.element.style.left = (screenW / 2) + 'px';
            win.element.style.top = '0px';
            win.element.style.width = (screenW / 2) + 'px';
            win.element.style.height = screenH + 'px';
            win.maximized = false;
        } else if (zone === 'top') {
            win.element.style.left = '0px';
            win.element.style.top = '0px';
            win.element.style.width = screenW + 'px';
            win.element.style.height = (screenH / 2) + 'px';
            win.maximized = false;
        } else if (zone === 'full') {
            win.element.style.left = '0px';
            win.element.style.top = '0px';
            win.element.style.width = screenW + 'px';
            win.element.style.height = screenH + 'px';
            win.maximized = false;
        }

        win.prevRect = null;
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

            if (win.minimized) {
                restoreWindow(windowId);
            } else if (win.element.classList.contains('focused')) {
                minimizeWindow(windowId);
            } else {
                focusWindow(windowId);
            }
        });

        $.taskbarItems.appendChild(btn);
        OS.taskbarItems.set(windowId, btn);
    }

    function removeTaskbarItem(windowId) {
        const btn = OS.taskbarItems.get(windowId);
        if (btn && btn.parentNode) {
            btn.parentNode.removeChild(btn);
        }
        OS.taskbarItems.delete(windowId);
    }

    function updateTaskbarItem(windowId, state) {
        const btn = OS.taskbarItems.get(windowId);
        if (!btn) return;

        btn.classList.remove('active', 'minimized');

        if (state === 'active') {
            btn.classList.add('active');
        } else if (state === 'minimized') {
            btn.classList.add('minimized');
        }
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
            btn.innerHTML = `
                <span class="taskbar-item-icon"><i class="${app.icon}"></i></span>
            `;

            btn.addEventListener('click', () => {
                launchApp(app.id);
            });

            $.taskbarPins.appendChild(btn);
        });
    }

    // ============================================================
    // Start Menu
    // ============================================================

    function toggleStartMenu() {
        if (OS.startMenuOpen) {
            closeStartMenu();
        } else {
            openStartMenu();
        }
    }

    function openStartMenu() {
        if (!$.startMenu) return;
        closeNotificationPanel();
        $.startMenu.classList.add('show');
        OS.startMenuOpen = true;
        $.taskbarStartBtn.classList.add('active');

        if ($.startSearchInput) {
            setTimeout(() => $.startSearchInput.focus(), 100);
        }
    }

    function closeStartMenu() {
        if (!$.startMenu) return;
        $.startMenu.classList.remove('show');
        OS.startMenuOpen = false;
        $.taskbarStartBtn.classList.remove('active');
    }

    function renderStartMenu() {
        if (!$.startAppGrid) return;
        $.startAppGrid.innerHTML = '';

        OS.apps.forEach(app => {
            const item = document.createElement('div');
            item.className = 'start-app-item';
            item.dataset.appId = app.id;
            item.dataset.slug = app.slug;
            item.dataset.name = app.name.toLowerCase();
            item.innerHTML = `
                <div class="start-app-item-icon">
                    <i class="${app.icon}"></i>
                </div>
                <div class="start-app-item-name">${app.name}</div>
            `;

            item.addEventListener('click', () => {
                launchApp(app.id);
                closeStartMenu();
            });

            $.startAppGrid.appendChild(item);
        });
    }

    function filterStartApps(query) {
        if (!$.startAppGrid) return;
        const items = $.startAppGrid.querySelectorAll('.start-app-item');
        const q = query.toLowerCase().trim();

        items.forEach(item => {
            const name = item.dataset.name;
            const slug = item.dataset.slug;
            if (!q || name.includes(q) || slug.includes(q)) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
    }

    // ============================================================
    // Context Menu
    // ============================================================

    function handleDesktopContextMenu(e) {
        // Only show on desktop background (not on icons, windows, etc.)
        if (e.target.closest('.desktop-icon') || 
            e.target.closest('.os-window') ||
            e.target.closest('.os-taskbar')) {
            return;
        }

        e.preventDefault();
        showContextMenu(e.clientX, e.clientY);
    }

    function showContextMenu(x, y) {
        if (!$.contextMenu) return;
        closeStartMenu();
        closeNotificationPanel();

        // Keep within viewport
        const rect = $.contextMenu.getBoundingClientRect();
        const finalX = x + rect.width > window.innerWidth ? window.innerWidth - rect.width - 10 : x;
        const finalY = y + rect.height > window.innerHeight ? window.innerHeight - rect.height - 10 : y;

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
                addNotification('System', 'Desktop refreshed', 'info');
                break;
            case 'new-folder':
                addNotification('File Manager', 'New folder created on Desktop', 'success');
                break;
            case 'new-file':
                addNotification('File Manager', 'New text document created', 'success');
                break;
            case 'settings':
                launchAppBySlug('settings');
                break;
        }
    }

    // ============================================================
    // Notifications
    // ============================================================

    function toggleNotificationPanel() {
        if (OS.notifPanelOpen) {
            closeNotificationPanel();
        } else {
            openNotificationPanel();
        }
    }

    function openNotificationPanel() {
        if (!$.notificationPanel) return;
        closeStartMenu();
        $.notificationPanel.classList.add('show');
        OS.notifPanelOpen = true;
    }

    function closeNotificationPanel() {
        if (!$.notificationPanel) return;
        $.notificationPanel.classList.remove('show');
        OS.notifPanelOpen = false;
    }

    function addNotification(title, message, type = 'info') {
        const id = Date.now();
        const notif = { id, title, message, type, time: new Date() };
        OS.notifications.unshift(notif);

        // Update badge
        updateNotifBadge();

        // Render if panel open
        if (OS.notifPanelOpen) {
            renderNotifications();
        }

        // Auto-dismiss after 5s if panel is closed
        if (!OS.notifPanelOpen) {
            setTimeout(() => {
                const idx = OS.notifications.findIndex(n => n.id === id);
                if (idx >= 0) {
                    OS.notifications.splice(idx, 1);
                    updateNotifBadge();
                }
            }, 5000);
        }

        console.log(`[Notification] ${title}: ${message}`);
    }

    function renderNotifications() {
        if (!$.notificationList) return;

        if (OS.notifications.length === 0) {
            $.notificationList.innerHTML = `
                <div class="notification-empty">
                    <i class="fa-solid fa-bell-slash"></i>
                    <p>No notifications</p>
                </div>
            `;
            return;
        }

        $.notificationList.innerHTML = OS.notifications.map(n => `
            <div class="notification-item" data-id="${n.id}">
                <div class="notif-icon ${n.type}">
                    <i class="fa-solid ${getNotifIcon(n.type)}"></i>
                </div>
                <div class="notif-content">
                    <div class="notif-title">${n.title}</div>
                    <div class="notif-body">${n.message}</div>
                    <div class="notif-time">${formatTime(n.time)}</div>
                </div>
            </div>
        `).join('');
    }

    function clearAllNotifications() {
        OS.notifications = [];
        renderNotifications();
        updateNotifBadge();
    }

    function updateNotifBadge() {
        if (!$.notifBadge) return;
        const count = OS.notifications.length;
        if (count > 0) {
            $.notifBadge.textContent = count > 99 ? '99+' : count;
            $.notifBadge.style.display = '';
        } else {
            $.notifBadge.style.display = 'none';
        }
    }

    function getNotifIcon(type) {
        const icons = {
            info: 'fa-info-circle',
            success: 'fa-check-circle',
            warning: 'fa-exclamation-triangle',
            error: 'fa-times-circle',
        };
        return icons[type] || icons.info;
    }

    // ============================================================
    // Clock
    // ============================================================

    function startClock() {
        updateClock();
        setInterval(updateClock, 1000);
    }

    function updateClock() {
        if (!$.trayTime || !$.trayDate) return;

        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;

        $.trayTime.textContent = `${displayHours}:${minutes} ${ampm}`;
        $.trayDate.textContent = now.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    // ============================================================
    // Keyboard Shortcuts
    // ============================================================

    function handleKeyboard(e) {
        // Start Menu: Super/Meta key
        if (e.key === 'Meta') {
            e.preventDefault();
            toggleStartMenu();
        }

        // Terminal: Ctrl+Alt+T
        if (e.ctrlKey && e.altKey && e.key === 't') {
            e.preventDefault();
            launchAppBySlug('terminal');
        }

        // Browser: Ctrl+Alt+B
        if (e.ctrlKey && e.altKey && e.key === 'b') {
            e.preventDefault();
            launchAppBySlug('browser');
        }

        // Settings: Ctrl+Alt+S
        if (e.ctrlKey && e.altKey && e.key === 's') {
            e.preventDefault();
            launchAppBySlug('settings');
        }

        // File Manager: Ctrl+Alt+F
        if (e.ctrlKey && e.altKey && e.key === 'f') {
            e.preventDefault();
            launchAppBySlug('file-manager');
        }

        // Notes: Ctrl+Alt+N
        if (e.ctrlKey && e.altKey && e.key === 'n') {
            e.preventDefault();
            launchAppBySlug('notes');
        }

        // Close focused window: Alt+F4
        if (e.altKey && e.key === 'F4') {
            e.preventDefault();
            if (OS.activeWindow) {
                closeWindow(OS.activeWindow);
            }
        }

        // Minimize all: Windows+D
        if (e.key === 'd' && e.metaKey) {
            e.preventDefault();
            minimizeAllWindows();
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
        if (app) {
            launchApp(app.id);
        } else {
            console.warn(`[JALAGEL OS] App not found: ${slug}`);
        }
    }

    async function trackAppLaunch(appId) {
        try {
            await fetch('/api/apps/launch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ app_id: appId }),
            });
        } catch (error) {
            // Silently fail - not critical
        }
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
    // Expose API globally
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
        addNotification,
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
