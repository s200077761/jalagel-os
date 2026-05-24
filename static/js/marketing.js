/**
 * JALAGEL OS Pro - Marketing Page Interactions
 * Smooth scroll, counter animations, scroll reveal effects
 */

(function () {
    'use strict';

    // ============================================================
    // Initialization
    // ============================================================

    function init() {
        initScrollReveal();
        initCounterAnimations();
        initNavbarScroll();
        initSmoothScroll();
        initMobileMenu();
        initPricingToggle();
        initHeroParticles();
        initFlashMessages();
        initDocsScrollSpy();
        console.log('[JALAGEL Marketing] Initialized');
    }

    // ============================================================
    // Scroll Reveal Effect
    // ============================================================

    function initScrollReveal() {
        const revealElements = document.querySelectorAll('.reveal-on-scroll');

        if (!revealElements.length) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px',
        });

        revealElements.forEach(el => observer.observe(el));
    }

    // Add reveal CSS
    const revealStyle = document.createElement('style');
    revealStyle.textContent = `
        .reveal-on-scroll {
            opacity: 0;
            transform: translateY(30px);
            transition: opacity 0.6s ease, transform 0.6s ease;
        }
        .reveal-on-scroll.revealed {
            opacity: 1;
            transform: translateY(0);
        }
    `;
    document.head.appendChild(revealStyle);

    // ============================================================
    // Counter Animation
    // ============================================================

    function initCounterAnimations() {
        const counters = document.querySelectorAll('[data-count]');
        if (!counters.length) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animateCounter(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        counters.forEach(counter => observer.observe(counter));
    }

    function animateCounter(element) {
        const target = parseInt(element.dataset.count, 10);
        const suffix = element.textContent.replace(/^\d+/, '').trim();
        const duration = 2000;
        const startTime = performance.now();

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease out cubic
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(easeProgress * target);

            element.textContent = current + (suffix ? ' ' + suffix : '');

            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                element.textContent = target + (suffix ? ' ' + suffix : '');
            }
        }

        requestAnimationFrame(update);
    }

    // ============================================================
    // Navbar Scroll Effect
    // ============================================================

    function initNavbarScroll() {
        const navbar = document.getElementById('navbar');
        if (!navbar) return;

        let ticking = false;

        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    if (window.scrollY > 20) {
                        navbar.classList.add('scrolled');
                    } else {
                        navbar.classList.remove('scrolled');
                    }
                    ticking = false;
                });
                ticking = true;
            }
        });
    }

    // ============================================================
    // Smooth Scroll Navigation
    // ============================================================

    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                const href = this.getAttribute('href');
                if (href === '#') return;

                const target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start',
                    });
                }
            });
        });
    }

    // ============================================================
    // Mobile Menu Toggle
    // ============================================================

    function initMobileMenu() {
        const toggle = document.getElementById('navMobileToggle');
        const navLinks = document.getElementById('navLinks');
        if (!toggle || !navLinks) return;

        toggle.addEventListener('click', () => {
            navLinks.classList.toggle('show');
            const icon = toggle.querySelector('i');
            if (icon) {
                if (navLinks.classList.contains('show')) {
                    icon.className = 'fa-solid fa-times';
                } else {
                    icon.className = 'fa-solid fa-bars';
                }
            }
        });

        // Close menu when clicking a link
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('show');
                const icon = toggle.querySelector('i');
                if (icon) icon.className = 'fa-solid fa-bars';
            });
        });

        // User menu dropdown
        const navUserBtn = document.getElementById('navUserBtn');
        const navDropdown = document.getElementById('navDropdown');
        if (navUserBtn && navDropdown) {
            navUserBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                navDropdown.classList.toggle('show');
            });

            document.addEventListener('click', (e) => {
                if (!navUserBtn.contains(e.target) && !navDropdown.contains(e.target)) {
                    navDropdown.classList.remove('show');
                }
            });
        }
    }

    // ============================================================
    // Pricing Toggle (Monthly/Yearly)
    // ============================================================

    function initPricingToggle() {
        const toggle = document.getElementById('pricingToggle');
        if (!toggle) return;

        const monthlyLabel = document.querySelector('.toggle-label[data-period="monthly"]');
        const yearlyLabel = document.querySelector('.toggle-label[data-period="yearly"]');

        function updatePricing(isYearly) {
            document.querySelectorAll('.pricing-amount .price').forEach(priceEl => {
                const monthly = priceEl.dataset.monthly;
                const yearly = priceEl.dataset.yearly;

                if (monthly && yearly) {
                    const newValue = isYearly ? yearly : monthly;
                    animatePriceChange(priceEl, parseFloat(newValue));
                }
            });

            document.querySelectorAll('.period').forEach(periodEl => {
                periodEl.textContent = isYearly ? '/month (billed yearly)' : '/month';
            });

            if (monthlyLabel && yearlyLabel) {
                monthlyLabel.classList.toggle('active', !isYearly);
                yearlyLabel.classList.toggle('active', isYearly);
            }
        }

        toggle.addEventListener('change', () => {
            updatePricing(toggle.checked);
        });

        // Initialize based on toggle state (checked = yearly)
        updatePricing(toggle.checked);
    }

    function animatePriceChange(element, newValue) {
        const currentText = element.textContent;
        const currentValue = parseFloat(currentText.replace('$', ''));
        if (isNaN(currentValue)) {
            element.textContent = '$' + newValue.toFixed(2);
            return;
        }

        const duration = 400;
        const startTime = performance.now();

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            const current = currentValue + (newValue - currentValue) * easeProgress;
            element.textContent = '$' + current.toFixed(2);

            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }

        requestAnimationFrame(update);
    }

    // ============================================================
    // Hero Particles Canvas
    // ============================================================

    function initHeroParticles() {
        const canvas = document.getElementById('heroParticles');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        let particles = [];
        let animationId = null;
        let isVisible = true;

        function resize() {
            const parent = canvas.parentElement;
            canvas.width = parent.offsetWidth;
            canvas.height = parent.offsetHeight;
        }

        function createParticles() {
            particles = [];
            const count = Math.min(80, Math.floor(canvas.width * canvas.height / 12000));

            for (let i = 0; i < count; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    vx: (Math.random() - 0.5) * 0.3,
                    vy: (Math.random() - 0.5) * 0.3,
                    radius: Math.random() * 2 + 0.5,
                    opacity: Math.random() * 0.5 + 0.2,
                });
            }
        }

        function draw() {
            if (!isVisible) return;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particles.forEach(p => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(124, 58, 237, ${p.opacity})`;
                ctx.fill();
            });

            // Draw connections
            const maxDist = 100;
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < maxDist) {
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = `rgba(124, 58, 237, ${0.08 * (1 - dist / maxDist)})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            }
        }

        function update() {
            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;

                if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
                if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

                p.x = Math.max(0, Math.min(canvas.width, p.x));
                p.y = Math.max(0, Math.min(canvas.height, p.y));
            });
        }

        function loop() {
            update();
            draw();
            animationId = requestAnimationFrame(loop);
        }

        // Visibility observer
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                isVisible = entry.isIntersecting;
                if (isVisible && !animationId) {
                    loop();
                }
            });
        });
        observer.observe(canvas);

        resize();
        createParticles();
        loop();

        window.addEventListener('resize', () => {
            resize();
            createParticles();
        });

        // Pause when tab is hidden
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                isVisible = false;
            } else {
                isVisible = true;
            }
        });
    }

    // ============================================================
    // Docs Scroll Spy
    // ============================================================

    function initDocsScrollSpy() {
        const sidebar = document.querySelector('.docs-sidebar');
        if (!sidebar) return;

        const sections = document.querySelectorAll('.docs-card[id], .docs-section-group[id]');
        const navLinks = sidebar.querySelectorAll('.docs-nav-link');

        if (!sections.length || !navLinks.length) return;

        function onScroll() {
            const scrollPos = window.scrollY + 150;
            let activeFound = false;

            sections.forEach(section => {
                const top = section.offsetTop;
                const height = section.offsetHeight;
                if (scrollPos >= top && scrollPos < top + height && !activeFound) {
                    const id = section.getAttribute('id');
                    navLinks.forEach(link => {
                        link.classList.remove('active');
                        if (link.getAttribute('href') === '#' + id) {
                            link.classList.add('active');
                            activeFound = true;
                        }
                    });
                }
            });
        }

        window.addEventListener('scroll', onScroll);
        onScroll(); // Initial check
    }

    // ============================================================
    // Flash Messages Auto-dismiss
    // ============================================================

    function initFlashMessages() {
        const flashMessages = document.querySelectorAll('.flash-message[data-auto-dismiss]');
        flashMessages.forEach(msg => {
            const delay = parseInt(msg.dataset.autoDismiss, 10);
            if (delay) {
                setTimeout(() => {
                    msg.style.opacity = '0';
                    msg.style.transform = 'translateX(30px)';
                    setTimeout(() => msg.remove(), 300);
                }, delay);
            }
        });
    }

    // ============================================================
    // Feature Category Tabs (Global handler)
    // ============================================================

    document.addEventListener('click', function(e) {
        const tab = e.target.closest('.app-tab[data-category]');
        if (!tab) return;

        const category = tab.dataset.category;
        const container = tab.closest('.section, .container');
        if (!container) return;

        // Deactivate all tabs in this group
        container.querySelectorAll('.app-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Show/hide category grids
        container.querySelectorAll('.feature-category-grid').forEach(grid => {
            if (grid.id === category) {
                grid.style.display = 'grid';
                grid.classList.remove('hidden');
            } else {
                grid.style.display = 'none';
                grid.classList.add('hidden');
            }
        });
    });

    // ============================================================
    // Boot
    // ============================================================

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
