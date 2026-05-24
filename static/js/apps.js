/**
 * JALAGEL OS Pro - App Registry & Shared Functionality
 * Handles app launching, data storage, and shared utilities for all 50+ apps
 */

(function() {
    'use strict';

    // ============================================================
    // APP REGISTRY
    // ============================================================

    const APP_REGISTRY = {
        // Tier 1: Core
        'calculator':       { name: 'Calculator',       icon: 'fa-solid fa-calculator',       category: 'Utilities',    tier: 1, hasJS: true },
        'calendar':         { name: 'Calendar',         icon: 'fa-solid fa-calendar-days',    category: 'Productivity', tier: 1, hasJS: true },
        'clock':            { name: 'Clock',            icon: 'fa-solid fa-clock',            category: 'Productivity', tier: 1, hasJS: true },
        'code-editor':      { name: 'Code Editor',      icon: 'fa-solid fa-code',             category: 'Development',  tier: 1, hasJS: true, isPremium: true },
        'file-manager':     { name: 'File Manager',     icon: 'fa-solid fa-folder-open',       category: 'System',       tier: 1, hasJS: true },
        'music-player':     { name: 'Music Player',     icon: 'fa-solid fa-music',            category: 'Media',        tier: 1, hasJS: true },
        'notes':            { name: 'Notes',            icon: 'fa-solid fa-note-sticky',       category: 'Productivity', tier: 1, hasJS: true },
        'paint':            { name: 'Paint',            icon: 'fa-solid fa-palette',           category: 'Creative',     tier: 1, hasJS: true },
        'settings':         { name: 'Settings',         icon: 'fa-solid fa-gear',             category: 'System',       tier: 1, hasJS: true },
        'terminal':         { name: 'Terminal',         icon: 'fa-solid fa-terminal',          category: 'System',       tier: 1, hasJS: true },
        'text-editor':      { name: 'Text Editor',      icon: 'fa-solid fa-file-lines',        category: 'Documents',    tier: 1, hasJS: true },
        'todo':             { name: 'Todo List',        icon: 'fa-solid fa-list-check',        category: 'Productivity', tier: 1, hasJS: true },
        'weather':          { name: 'Weather',          icon: 'fa-solid fa-cloud-sun',         category: 'Utilities',    tier: 1, hasJS: true },
        'browser':          { name: 'Browser',          icon: 'fa-solid fa-globe',             category: 'Communication',tier: 1, hasJS: true },
        'photos':           { name: 'Photos',           icon: 'fa-solid fa-images',            category: 'Media',        tier: 1, hasJS: true },
        'video-player':     { name: 'Video Player',     icon: 'fa-solid fa-film',              category: 'Media',        tier: 1, hasJS: true },
        'camera':           { name: 'Camera',           icon: 'fa-solid fa-camera',            category: 'Media',        tier: 1, hasJS: true },
        'canvas':           { name: 'Canvas Drawing',   icon: 'fa-solid fa-paintbrush',        category: 'Creative',     tier: 1, hasJS: true },

        // Tier 2: Productivity
        'spreadsheet':      { name: 'Spreadsheet',      icon: 'fa-solid fa-table-cells',       category: 'Documents',    tier: 2, hasJS: true, isPremium: true },
        'slides':           { name: 'Presentations',    icon: 'fa-solid fa-person-chalkboard', category: 'Documents',    tier: 2, hasJS: true, isPremium: true },
        'email':            { name: 'Email Client',     icon: 'fa-solid fa-envelope',          category: 'Communication',tier: 2, hasJS: true, isPremium: true },
        'contacts':         { name: 'Contacts',         icon: 'fa-solid fa-address-book',      category: 'Productivity', tier: 2, hasJS: true },
        'chat':             { name: 'Chat',             icon: 'fa-solid fa-comments',          category: 'Communication',tier: 2, hasJS: true, isPremium: true },
        'database-manager': { name: 'Database Manager', icon: 'fa-solid fa-database',          category: 'Development',  tier: 2, hasJS: true, isPremium: true },
        'pdf-viewer':       { name: 'PDF Viewer',       icon: 'fa-solid fa-file-pdf',          category: 'Documents',    tier: 2, hasJS: true },

        // Tier 3: Utilities
        'unit-converter':   { name: 'Unit Converter',   icon: 'fa-solid fa-right-left',        category: 'Utilities',    tier: 3, hasJS: true },
        'password-manager': { name: 'Password Manager', icon: 'fa-solid fa-key',               category: 'Utilities',    tier: 3, hasJS: true, isPremium: true },
        'system-monitor':   { name: 'System Monitor',   icon: 'fa-solid fa-chart-line',        category: 'System',       tier: 3, hasJS: true },
        'color-picker':     { name: 'Color Picker',     icon: 'fa-solid fa-eye-dropper',       category: 'Creative',     tier: 3, hasJS: true },
        'qr-code':          { name: 'QR Code Generator',icon: 'fa-solid fa-qrcode',            category: 'Utilities',    tier: 3, hasJS: true },
        'timer':            { name: 'Timer & Stopwatch',icon: 'fa-solid fa-stopwatch',         category: 'Productivity', tier: 3, hasJS: true },
        'voice-recorder':   { name: 'Voice Recorder',   icon: 'fa-solid fa-microphone',        category: 'Media',        tier: 3, hasJS: true },
        'news':             { name: 'News Reader',      icon: 'fa-solid fa-newspaper',         category: 'Information',  tier: 3, hasJS: true },
        'stocks':           { name: 'Stocks & Ticker',  icon: 'fa-solid fa-arrow-trend-up',    category: 'Information',  tier: 3, hasJS: true, isPremium: true },
        'translator':       { name: 'Translator',       icon: 'fa-solid fa-language',          category: 'Utilities',    tier: 3, hasJS: true },
        'maps':             { name: 'Maps',             icon: 'fa-solid fa-map-location-dot',  category: 'Utilities',    tier: 3, hasJS: true },

        // Tier 4: Developer Tools
        'json-formatter':   { name: 'JSON Formatter',   icon: 'fa-solid fa-brackets-curly',    category: 'Development',  tier: 4, hasJS: true },
        'base64':           { name: 'Base64 Converter', icon: 'fa-solid fa-lock',              category: 'Development',  tier: 4, hasJS: true },
        'hash-generator':   { name: 'Hash Generator',   icon: 'fa-solid fa-fingerprint',       category: 'Development',  tier: 4, hasJS: true },
        'regex-tester':     { name: 'Regex Tester',     icon: 'fa-solid fa-spell-check',       category: 'Development',  tier: 4, hasJS: true },
        'diff-tool':        { name: 'Diff Tool',        icon: 'fa-solid fa-code-compare',      category: 'Development',  tier: 4, hasJS: true },
        'api-tester':       { name: 'API Tester',       icon: 'fa-solid fa-plug',              category: 'Development',  tier: 4, hasJS: true },
        'color-palette':    { name: 'Color Palette',    icon: 'fa-solid fa-swatchbook',        category: 'Creative',     tier: 4, hasJS: true },
        'screenshot':       { name: 'Screenshot Tool',  icon: 'fa-solid fa-camera-retro',      category: 'Media',        tier: 4, hasJS: true },
        'network-tools':    { name: 'Network Tools',    icon: 'fa-solid fa-network-wired',     category: 'Development',  tier: 4, hasJS: true },

        // Tier 5: Creative/Specialty
        'whiteboard':       { name: 'Whiteboard',       icon: 'fa-solid fa-chalkboard',        category: 'Creative',     tier: 5, hasJS: true, isPremium: true },
        'mind-map':         { name: 'Mind Map',         icon: 'fa-solid fa-diagram-project',   category: 'Creative',     tier: 5, hasJS: true, isPremium: true },
        'kanban':           { name: 'Kanban Board',     icon: 'fa-solid fa-columns',           category: 'Documents',    tier: 5, hasJS: true, isPremium: true },
        'calculator-pro':   { name: 'Scientific Calc',  icon: 'fa-solid fa-square-root-variable', category: 'Utilities', tier: 5, hasJS: true, isPremium: true },
        'certificate-manager': { name: 'Certificate Manager', icon: 'fa-solid fa-shield-halved', category: 'Security',    tier: 5, hasJS: true, isPremium: true },
        'white-noise':      { name: 'White Noise',      icon: 'fa-solid fa-wave-square',       category: 'Media',        tier: 5, hasJS: true },
        'typing-test':      { name: 'Typing Speed Test',icon: 'fa-solid fa-keyboard',          category: 'Utilities',    tier: 5, hasJS: true },
    };

    // ============================================================
    // APP STORAGE - LocalStorage wrapper
    // ============================================================

    const AppStorage = {
        prefix: 'jalagel_app_',

        key(appName, key) {
            return this.prefix + appName + '_' + key;
        },

        get(appName, key, defaultValue) {
            try {
                const val = localStorage.getItem(this.key(appName, key));
                return val !== null ? JSON.parse(val) : defaultValue;
            } catch (e) {
                return defaultValue;
            }
        },

        set(appName, key, value) {
            try {
                localStorage.setItem(this.key(appName, key), JSON.stringify(value));
            } catch (e) {
                console.warn('[AppStorage] Failed to save:', e);
            }
        },

        remove(appName, key) {
            localStorage.removeItem(this.key(appName, key));
        },

        clear(appName) {
            const p = this.prefix + appName + '_';
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key && key.startsWith(p)) {
                    localStorage.removeItem(key);
                }
            }
        }
    };

    // ============================================================
    // APP UTILITIES
    // ============================================================

    const AppUtils = {
        // Generate unique ID
        uid() {
            return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        },

        // Format number with commas
        formatNumber(num) {
            return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        },

        // Format file size
        formatBytes(bytes) {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
        },

        // Debounce function
        debounce(fn, ms) {
            let timer;
            return function(...args) {
                clearTimeout(timer);
                timer = setTimeout(() => fn.apply(this, args), ms);
            };
        },

        // Simple hash (for password simulation)
        simpleHash(str) {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash |= 0;
            }
            return Math.abs(hash).toString(16).padStart(8, '0');
        },

        // Copy text to clipboard
        async copyToClipboard(text) {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch (e) {
                // Fallback
                const ta = document.createElement('textarea');
                ta.value = text;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                return true;
            }
        },

        // Download text as file
        downloadText(text, filename, mime) {
            const blob = new Blob([text], { type: mime || 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        },

        // Read file as text
        readFile(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target.result);
                reader.onerror = reject;
                reader.readAsText(file);
            });
        },

        // Generate random color
        randomColor() {
            const colors = [
                '#7C3AED', '#EC4899', '#06B6D4', '#10B981',
                '#F59E0B', '#EF4444', '#8B5CF6', '#14B8A6',
                '#F97316', '#3B82F6', '#E11D48', '#6366F1'
            ];
            return colors[Math.floor(Math.random() * colors.length)];
        },

        // Convert hex to RGB
        hexToRgb(hex) {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        },

        // Convert RGB to hex
        rgbToHex(r, g, b) {
            return '#' + [r, g, b].map(x => {
                const hex = Math.max(0, Math.min(255, x)).toString(16);
                return hex.length === 1 ? '0' + hex : hex;
            }).join('');
        },

        // HSL to hex
        hslToHex(h, s, l) {
            s /= 100; l /= 100;
            const a = s * Math.min(l, 1 - l);
            const f = n => {
                const k = (n + h / 30) % 12;
                const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
                return Math.round(255 * color).toString(16).padStart(2, '0');
            };
            return `#${f(0)}${f(8)}${f(4)}`;
        },

        // Current timestamp formatted
        now() {
            return new Date().toISOString();
        },

        // Parse date
        parseDate(str) {
            const d = new Date(str);
            return isNaN(d.getTime()) ? null : d;
        },

        // Show toast notification
        toast(message, type) {
            if (window.OS && window.OS.showToast) {
                window.OS.showToast(message, type);
            } else {
                // Simple fallback toast
                const toast = document.createElement('div');
                toast.style.cssText = `
                    position: fixed; bottom: 60px; right: 20px;
                    padding: 10px 18px; border-radius: 8px; font-size: 13px;
                    z-index: 99999; animation: fadeIn 0.3s ease;
                    background: ${type === 'error' ? '#EF4444' : type === 'success' ? '#10B981' : '#7C3AED'};
                    color: white; font-weight: 500;
                `;
                toast.textContent = message;
                document.body.appendChild(toast);
                setTimeout(() => {
                    toast.style.opacity = '0';
                    toast.style.transition = 'opacity 0.3s';
                    setTimeout(() => toast.remove(), 300);
                }, 2500);
            }
        }
    };

    // ============================================================
    // EXPOSE TO GLOBAL
    // ============================================================

    window.JALAGEL = window.JALAGEL || {};
    window.JALAGEL.APPS = APP_REGISTRY;
    window.JALAGEL.Storage = AppStorage;
    window.JALAGEL.Utils = AppUtils;

    // Console greeting
    console.log('[JALAGEL OS] App system loaded. 50+ apps ready.');

})();
