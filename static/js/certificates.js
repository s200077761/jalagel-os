/**
 * JALAGEL OS Pro - Certificate Management System JavaScript
 * Handles store, purchase flow, verification, and dashboard
 */

(function() {
    'use strict';

    // ============================================
    // Certificate Store - Billing Toggle
    // ============================================
    
    function initBillingToggle() {
        const toggle = document.getElementById('billingToggle');
        if (!toggle) return;

        let yearly = true;
        toggle.addEventListener('click', function() {
            yearly = !yearly;
            this.classList.toggle('on', yearly);
            
            document.querySelectorAll('.toggle-label-monthly').forEach(el => {
                el.classList.toggle('active', !yearly);
            });
            document.querySelectorAll('.toggle-label-yearly').forEach(el => {
                el.classList.toggle('active', yearly);
            });

            document.querySelectorAll('.cert-card-price').forEach(card => {
                card.classList.toggle('show-monthly', !yearly);
            });
        });
    }

    // ============================================
    // Certificate Store - FAQ Accordion
    // ============================================
    
    function initFaqAccordion() {
        document.querySelectorAll('.cert-faq-question').forEach(q => {
            q.addEventListener('click', function() {
                const item = this.closest('.cert-faq-item');
                const isOpen = item.classList.contains('open');
                
                // Close all
                document.querySelectorAll('.cert-faq-item').forEach(i => {
                    i.classList.remove('open');
                });
                
                // Open clicked if was closed
                if (!isOpen) {
                    item.classList.add('open');
                }
            });
        });
    }

    // ============================================
    // Certificate Store - Scroll Reveal
    // ============================================
    
    function initScrollReveal() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

        document.querySelectorAll('.cert-reveal').forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(24px)';
            el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(el);
        });
    }

    // Add revealed class style
    const revealStyle = document.createElement('style');
    revealStyle.textContent = '.cert-reveal.revealed { opacity: 1 !important; transform: translateY(0) !important; }';
    document.head.appendChild(revealStyle);

    // ============================================
    // Certificate Store - Purchase
    // ============================================
    
    window.purchaseCert = function(templateId) {
        if (!window.currentUser) {
            window.location.href = '/auth/login?next=/certificates';
            return;
        }
        window.location.href = '/certificates/purchase?template=' + templateId;
    };

    // ============================================
    // Purchase Flow - Multi-Step Wizard
    // ============================================
    
    let purchaseState = {
        step: 1,
        templateId: null,
        domain: '',
        validationMethod: '',
        period: 'yearly'
    };

    function initPurchaseFlow() {
        const container = document.getElementById('purchaseFlow');
        if (!container) return;

        const urlParams = new URLSearchParams(window.location.search);
        purchaseState.templateId = urlParams.get('template');
        purchaseState.period = urlParams.get('period') || 'yearly';

        renderPurchaseStep();
    }

    function renderPurchaseStep() {
        const container = document.getElementById('purchaseFlow');
        if (!container) return;

        // Update stepper
        document.querySelectorAll('.cert-step').forEach((step, i) => {
            step.classList.remove('active', 'completed');
            if (i + 1 < purchaseState.step) step.classList.add('completed');
            if (i + 1 === purchaseState.step) step.classList.add('active');
        });

        document.querySelectorAll('.cert-step-connector').forEach((conn, i) => {
            conn.classList.toggle('completed', i + 1 < purchaseState.step);
        });

        // Show/hide step content
        for (let i = 1; i <= 5; i++) {
            const stepEl = document.getElementById('purchaseStep' + i);
            if (stepEl) {
                stepEl.classList.toggle('hidden', i !== purchaseState.step);
            }
        }

        // Update nav buttons
        const prevBtn = document.getElementById('purchasePrev');
        const nextBtn = document.getElementById('purchaseNext');
        if (prevBtn) prevBtn.classList.toggle('hidden', purchaseState.step === 1);
        if (nextBtn) {
            nextBtn.textContent = purchaseState.step === 4 ? 'Place Order' : 
                                   purchaseState.step === 5 ? 'Done' : 'Continue';
            nextBtn.classList.toggle('btn-primary', purchaseState.step < 5);
            nextBtn.classList.toggle('btn-success', purchaseState.step === 5);
        }
    }

    window.purchaseNext = function() {
        if (purchaseState.step === 4) {
            placeOrder();
            return;
        }
        if (purchaseState.step === 5) {
            window.location.href = '/certificates/my';
            return;
        }
        if (validateStep(purchaseState.step)) {
            purchaseState.step++;
            renderPurchaseStep();
        }
    };

    window.purchasePrev = function() {
        if (purchaseState.step > 1) {
            purchaseState.step--;
            renderPurchaseStep();
        }
    };

    function validateStep(step) {
        if (step === 2) {
            const domain = document.getElementById('domainInput');
            if (!domain || !domain.value.trim()) {
                showNotification('Please enter a domain name', 'error');
                return false;
            }
            purchaseState.domain = domain.value.trim();
        }
        if (step === 3) {
            const selected = document.querySelector('input[name="validation_method"]:checked');
            if (!selected) {
                showNotification('Please select a validation method', 'error');
                return false;
            }
            purchaseState.validationMethod = selected.value;
        }
        return true;
    }

    function placeOrder() {
        const btn = document.getElementById('purchaseNext');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Processing...';
        }

        const data = {
            template_id: parseInt(purchaseState.templateId),
            domain: purchaseState.domain,
            validation_method: purchaseState.validationMethod,
            billing: purchaseState.period
        };

        fetch('/api/certificates/purchase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                purchaseState.step = 5;
                renderPurchaseStep();
                showNotification('Certificate ordered successfully!', 'success');
            } else {
                throw new Error(data.error || 'Purchase failed');
            }
        })
        .catch(err => {
            showNotification(err.message, 'error');
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Place Order';
            }
        });
    }

    // Validation method selection
    window.selectValidation = function(el) {
        document.querySelectorAll('.cert-validation-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        el.classList.add('selected');
        const radio = el.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
    };

    // Payment method selection
    window.selectPayment = function(el) {
        document.querySelectorAll('.cert-payment-method').forEach(opt => {
            opt.classList.remove('selected');
        });
        el.classList.add('selected');
    };

    // Select certificate template in purchase flow
    window.selectPurchaseTemplate = function(id, el) {
        purchaseState.templateId = id;
        document.querySelectorAll('.cert-purchase-template').forEach(card => {
            card.classList.remove('selected');
        });
        if (el) el.classList.add('selected');
    };

    // ============================================
    // My Certificates - Actions
    // ============================================
    
    window.renewCert = function(certId) {
        if (!confirm('Are you sure you want to renew this certificate?')) return;

        fetch('/api/certificates/renew', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ certificate_id: certId })
        })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                showNotification('Certificate renewed successfully!', 'success');
                setTimeout(() => location.reload(), 800);
            } else {
                throw new Error(data.error);
            }
        })
        .catch(err => showNotification(err.message, 'error'));
    };

    window.revokeCert = function(certId) {
        if (!confirm('WARNING: Revoking a certificate is irreversible. The certificate will be immediately invalidated.\n\nAre you sure you want to continue?')) return;

        fetch('/api/certificates/revoke', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ certificate_id: certId })
        })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                showNotification('Certificate revoked', 'success');
                setTimeout(() => location.reload(), 800);
            } else {
                throw new Error(data.error);
            }
        })
        .catch(err => showNotification(err.message, 'error'));
    };

    window.downloadCert = function(certId) {
        window.location.href = '/api/certificates/download/' + certId;
    };

    window.generateCert = function(certId) {
        const btn = document.getElementById('generateBtn' + certId);
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Generating...';
        }

        fetch('/api/certificates/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ certificate_id: certId })
        })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                showNotification('Certificate generated successfully!', 'success');
                setTimeout(() => location.reload(), 800);
            } else {
                throw new Error(data.error);
            }
        })
        .catch(err => {
            showNotification(err.message, 'error');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-bolt"></i> Generate';
            }
        });
    };

    // ============================================
    // Certificate Verification - Search
    // ============================================
    
    window.verifyCertSearch = function() {
        const input = document.getElementById('verifyCertId');
        if (!input || !input.value.trim()) {
            showNotification('Please enter a certificate ID', 'error');
            return;
        }
        window.location.href = '/certificates/verify/' + input.value.trim();
    };

    // ============================================
    // Admin Certificate Management
    // ============================================
    
    window.adminApproveCert = function(certId) {
        fetch('/api/certificates/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ certificate_id: certId, admin_action: 'approve' })
        })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                showNotification('Certificate approved and generated', 'success');
                setTimeout(() => location.reload(), 600);
            } else {
                throw new Error(data.error);
            }
        })
        .catch(err => showNotification(err.message, 'error'));
    };

    window.adminRevokeCert = function(certId) {
        if (!confirm('Revoke this certificate?')) return;
        fetch('/api/certificates/revoke', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ certificate_id: certId, admin_action: true })
        })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                showNotification('Certificate revoked', 'success');
                setTimeout(() => location.reload(), 600);
            }
        });
    };

    window.adminRenewCert = function(certId) {
        fetch('/api/certificates/renew', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ certificate_id: certId, admin_action: true })
        })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                showNotification('Certificate renewed', 'success');
                setTimeout(() => location.reload(), 600);
            }
        });
    };

    // Admin filters
    window.filterAdminCerts = function() {
        const typeFilter = document.getElementById('filterType');
        const statusFilter = document.getElementById('filterStatus');
        const searchFilter = document.getElementById('filterSearch');
        
        const type = typeFilter ? typeFilter.value : '';
        const status = statusFilter ? statusFilter.value : '';
        const search = searchFilter ? searchFilter.value.toLowerCase() : '';

        document.querySelectorAll('.cert-admin-row').forEach(row => {
            const rowType = row.dataset.type || '';
            const rowStatus = row.dataset.status || '';
            const rowText = row.textContent.toLowerCase();
            
            const typeMatch = !type || rowType === type;
            const statusMatch = !status || rowStatus === status;
            const searchMatch = !search || rowText.includes(search);
            
            row.style.display = (typeMatch && statusMatch && searchMatch) ? '' : 'none';
        });
    };

    // Admin bulk select
    window.toggleSelectAllCerts = function(checkbox) {
        document.querySelectorAll('.cert-select-row').forEach(cb => {
            cb.checked = checkbox.checked;
        });
    };

    // Initialize revenue chart on admin page
    function initRevenueChart() {
        const canvas = document.getElementById('revenueChart');
        if (!canvas || typeof Chart === 'undefined') return;

        const ctx = canvas.getContext('2d');
        const months = canvas.dataset.months ? JSON.parse(canvas.dataset.months) : [];
        const revenues = canvas.dataset.revenues ? JSON.parse(canvas.dataset.revenues) : [];

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: months,
                datasets: [{
                    label: 'Revenue ($)',
                    data: revenues,
                    borderColor: '#7C3AED',
                    backgroundColor: 'rgba(124, 58, 237, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#7C3AED',
                    pointBorderColor: '#fff',
                    pointRadius: 4,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(51, 65, 85, 0.3)' },
                        ticks: { color: '#94A3B8', font: { size: 10 } }
                    },
                    y: {
                        grid: { color: 'rgba(51, 65, 85, 0.3)' },
                        ticks: { 
                            color: '#94A3B8', 
                            font: { size: 10 },
                            callback: v => '$' + v
                        }
                    }
                }
            }
        });
    }

    // ============================================
    // Notifications
    // ============================================
    
    function showNotification(message, type) {
        const container = document.getElementById('flashContainer');
        if (!container) {
            // Fallback: use alert for critical errors
            if (type === 'error') console.error(message);
            return;
        }

        const iconMap = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        const msg = document.createElement('div');
        msg.className = 'flash-message flash-' + type;
        msg.setAttribute('data-auto-dismiss', '5000');
        msg.innerHTML = `
            <i class="fa-solid ${iconMap[type] || 'fa-info-circle'}"></i>
            <span>${message}</span>
            <button class="flash-close" onclick="this.parentElement.remove()">
                <i class="fa-solid fa-times"></i>
            </button>
        `;
        container.appendChild(msg);

        setTimeout(() => {
            if (msg.parentElement) msg.remove();
        }, 5000);
    }

    // ============================================
    // Initialize Everything
    // ============================================
    
    document.addEventListener('DOMContentLoaded', function() {
        initBillingToggle();
        initFaqAccordion();
        initScrollReveal();
        initPurchaseFlow();
        initRevenueChart();

        // Handle Enter key in verify search
        const verifyInput = document.getElementById('verifyCertId');
        if (verifyInput) {
            verifyInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') verifyCertSearch();
            });
        }

        // Handle Enter key in domain input
        const domainInput = document.getElementById('domainInput');
        if (domainInput) {
            domainInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    purchaseNext();
                }
            });
        }

        // Animate stat counters
        document.querySelectorAll('.cert-stat-value[data-count]').forEach(el => {
            const target = parseInt(el.dataset.count);
            const duration = 1000;
            const start = performance.now();
            
            function update(now) {
                const elapsed = now - start;
                const progress = Math.min(elapsed / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                el.textContent = Math.round(target * eased);
                if (progress < 1) requestAnimationFrame(update);
            }
            
            const observer = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        requestAnimationFrame(update);
                        observer.unobserve(el);
                    }
                });
            });
            observer.observe(el);
        });

        // Animate expiry progress bars
        document.querySelectorAll('.cert-expiry-fill').forEach(bar => {
            const target = bar.dataset.width || bar.style.width;
            bar.style.width = '0%';
            setTimeout(() => {
                bar.style.width = target;
            }, 300);
        });
    });

})();
