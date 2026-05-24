/**
 * JALAGEL OS Pro - Admin Dashboard JavaScript
 */

// ==========================================
// Sidebar
// ==========================================
function toggleSidebar() {
    var sidebar = document.getElementById('adminSidebar');
    var overlay = document.getElementById('sidebarOverlay');
    if (sidebar && overlay) {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
    }
}

// ==========================================
// Notifications
// ==========================================
function toggleNotifications() {
    var dropdown = document.getElementById('notifDropdown');
    var userDropdown = document.getElementById('adminUserDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
        if (userDropdown) userDropdown.classList.remove('show');
    }
}

// ==========================================
// User Menu
// ==========================================
function toggleUserMenu() {
    var dropdown = document.getElementById('adminUserDropdown');
    var notifDropdown = document.getElementById('notifDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
        if (notifDropdown) notifDropdown.classList.remove('show');
    }
}

// ==========================================
// Modals
// ==========================================
function openModal(modalId) {
    var modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        modal.style.display = 'flex';
    }
}

function closeModal(modalId) {
    var modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
}

// Close modals on overlay click
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('admin-modal')) {
        e.target.classList.remove('active');
        e.target.style.display = 'none';
    }
});

// Close dropdowns on outside click
document.addEventListener('click', function(e) {
    var notifBtn = document.getElementById('notifBtn');
    var notifDropdown = document.getElementById('notifDropdown');
    var userBtn = document.getElementById('adminUserBtn');
    var userDropdown = document.getElementById('adminUserDropdown');
    
    if (notifDropdown && notifDropdown.classList.contains('show') && 
        !notifDropdown.contains(e.target) && !(notifBtn && notifBtn.contains(e.target))) {
        notifDropdown.classList.remove('show');
    }
    if (userDropdown && userDropdown.classList.contains('show') && 
        !userDropdown.contains(e.target) && !(userBtn && userBtn.contains(e.target))) {
        userDropdown.classList.remove('show');
    }
});

// ==========================================
// Toast Notifications
// ==========================================
function showToast(message, type) {
    type = type || 'info';
    var toast = document.createElement('div');
    var colors = {
        success: 'linear-gradient(135deg,#10B981,#059669)',
        error: 'linear-gradient(135deg,#EF4444,#DC2626)',
        warning: 'linear-gradient(135deg,#F59E0B,#D97706)',
        info: 'linear-gradient(135deg,#7C3AED,#6D28D9)'
    };
    toast.style.cssText = 'position:fixed;top:20px;right:20px;padding:14px 20px;border-radius:12px;color:#fff;font-size:0.875rem;z-index:9999;animation:toastSlideIn .3s ease;max-width:360px;word-break:break-word;background:' + (colors[type] || colors.info) + ';box-shadow:0 8px 24px rgba(0,0,0,0.3);font-weight:500;display:flex;align-items:center;gap:10px;';
    
    var iconMap = { success: 'fa-check-circle', error: 'fa-circle-xmark', warning: 'fa-triangle-exclamation', info: 'fa-circle-info' };
    toast.innerHTML = '<i class="fa-solid ' + (iconMap[type] || 'fa-circle-info') + '"></i> <span>' + message + '</span>';
    
    document.body.appendChild(toast);
    
    setTimeout(function() {
        toast.style.animation = 'toastSlideOut .3s ease forwards';
        setTimeout(function() { toast.remove(); }, 300);
    }, 4000);
}

// Toast animations
(function() {
    var style = document.createElement('style');
    style.textContent = '@keyframes toastSlideIn{from{transform:translateX(120%);opacity:0}to{transform:translateX(0);opacity:1}}@keyframes toastSlideOut{from{transform:translateX(0);opacity:1}to{transform:translateX(120%);opacity:0}}';
    document.head.appendChild(style);
})();

// ==========================================
// AJAX Helper
// ==========================================
function ajaxPost(url, data, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    // Get CSRF token from meta or form
    var csrfToken = document.querySelector('input[name="csrf_token"]');
    if (csrfToken) {
        xhr.setRequestHeader('X-CSRFToken', csrfToken.value);
    }
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            try {
                var resp = JSON.parse(xhr.responseText);
                callback(null, resp, xhr.status);
            } catch(e) {
                callback(e, null, xhr.status);
            }
        }
    };
    xhr.send(JSON.stringify(data));
}

// ==========================================
// Confirmation Dialogs
// ==========================================
function confirmAction(message, onConfirm) {
    if (confirm(message)) {
        onConfirm();
    }
}

// ==========================================
// License Key Generator
// ==========================================
function generateLicenseKey() {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    var key = 'JOS-';
    for (var i = 0; i < 4; i++) {
        for (var j = 0; j < 4; j++) {
            key += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        if (i < 3) key += '-';
    }
    showToast('Generated key: ' + key + ' (copied to clipboard)', 'success');
    // Copy to clipboard if available
    if (navigator.clipboard) {
        navigator.clipboard.writeText(key);
    }
}

// ==========================================
// Form Handling - Auto-enable submit buttons
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    // Re-enable submit buttons on page load (in case of back button)
    document.querySelectorAll('.profile-btn, .btn-login, .btn-register, .btn-auth').forEach(function(btn) {
        btn.disabled = false;
        btn.style.opacity = '1';
    });

    // Add loading state to all admin forms
    document.querySelectorAll('.admin-modal form').forEach(function(form) {
        form.addEventListener('submit', function() {
            var submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.dataset.originalHtml = submitBtn.innerHTML;
                submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Processing...';
                submitBtn.disabled = true;
                submitBtn.style.opacity = '0.7';
            }
        });
    });

    // Auto-hide flash messages after 6 seconds
    setTimeout(function() {
        document.querySelectorAll('.flash-message').forEach(function(msg) {
            msg.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            msg.style.opacity = '0';
            msg.style.transform = 'translateX(100%)';
            setTimeout(function() { msg.remove(); }, 500);
        });
    }, 6000);
});

// ==========================================
// Table Sorting
// ==========================================
function initSortableTables() {
    document.querySelectorAll('.admin-table thead th').forEach(function(th) {
        if (th.textContent.toLowerCase().includes('actions')) return;
        th.style.cursor = 'pointer';
        th.addEventListener('click', function() {
            var table = th.closest('table');
            var tbody = table.querySelector('tbody');
            var index = Array.from(th.parentNode.children).indexOf(th);
            var asc = !th.dataset.asc || th.dataset.asc === 'desc';
            th.dataset.asc = asc ? 'asc' : 'desc';
            
            var rows = Array.from(tbody.querySelectorAll('tr'));
            rows.sort(function(a, b) {
                var aVal = a.cells[index].textContent.trim();
                var bVal = b.cells[index].textContent.trim();
                var aNum = parseFloat(aVal.replace(/[^0-9.-]/g, ''));
                var bNum = parseFloat(bVal.replace(/[^0-9.-]/g, ''));
                if (!isNaN(aNum) && !isNaN(bNum) && aVal !== '' && bVal !== '') {
                    return asc ? aNum - bNum : bNum - aNum;
                }
                return asc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            });
            rows.forEach(function(row) { tbody.appendChild(row); });
        });
    });
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSortableTables);
} else {
    initSortableTables();
}

// ==========================================
// Chart.js Defaults
// ==========================================
if (typeof Chart !== 'undefined') {
    Chart.defaults.color = '#94A3B8';
    Chart.defaults.borderColor = 'rgba(51,65,85,0.3)';
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.plugins.tooltip.backgroundColor = '#1A1A2E';
    Chart.defaults.plugins.tooltip.borderColor = '#334155';
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.titleColor = '#F1F5F9';
    Chart.defaults.plugins.tooltip.bodyColor = '#94A3B8';
    Chart.defaults.plugins.tooltip.padding = 12;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.padding = 16;
}

// ==========================================
// Keyboard Shortcuts
// ==========================================
document.addEventListener('keydown', function(e) {
    // ESC to close modals
    if (e.key === 'Escape') {
        document.querySelectorAll('.admin-modal.active').forEach(function(modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
        });
    }
    // / to focus search
    if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        var searchInput = document.querySelector('.admin-search input');
        if (searchInput && document.activeElement !== searchInput) {
            e.preventDefault();
            searchInput.focus();
        }
    }
});
