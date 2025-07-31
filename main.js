// Main JavaScript functionality for Fresh Bins website

// --- Square Checkout Window ---
function showCheckoutWindow(e) {
    e.preventDefault();

    const url = e.currentTarget.getAttribute('data-url');
    if (!url || url.includes('placeholder')) {
        alert('This payment link is not configured yet. Please contact support.');
        return;
    }
    const title = 'Square Payment';

    const topWindow = window.top ? window.top : window;
    const dualScreenLeft = topWindow.screenLeft !== undefined ? topWindow.screenLeft : topWindow.screenX;
    const dualScreenTop = topWindow.screenTop !== undefined ? topWindow.screenTop : topWindow.screenY;

    const width = topWindow.innerWidth ? topWindow.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : screen.width;
    const height = topWindow.innerHeight ? topWindow.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : screen.height;

    const h = height * 0.75;
    const w = 500;

    const systemZoom = width / topWindow.screen.availWidth;
    const left = (width - w) / 2 / systemZoom + dualScreenLeft;
    const top = (height - h) / 2 / systemZoom + dualScreenTop;
    const newWindow = window.open(url, title, `scrollbars=yes, width=${w / systemZoom}, height=${h / systemZoom}, top=${top}, left=${left}`);

    if (window.focus) newWindow.focus();
}

// Make showCheckoutWindow available globally for Firebase module
window.showCheckoutWindow = showCheckoutWindow;

// --- Mobile Menu Toggle ---
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');

    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // --- Scroll Progress Indicator ---
    const scrollIndicator = document.createElement('div');
    scrollIndicator.className = 'scroll-indicator';
    document.body.appendChild(scrollIndicator);

    window.addEventListener('scroll', () => {
        const scrollTop = window.pageYOffset;
        const docHeight = document.body.offsetHeight - window.innerHeight;
        const scrollPercent = scrollTop / docHeight;
        scrollIndicator.style.transform = `scaleX(${scrollPercent})`;
    });

    // --- Gentle Fade-in Animation on Scroll ---
    const sections = document.querySelectorAll('.fade-in-section');
    const observer = new IntersectionObserver(entries => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                // Add gentle staggered animation delay
                setTimeout(() => {
                    entry.target.classList.add('is-visible');

                    // Add subtle slide animations
                    if (index % 2 === 0) {
                        entry.target.classList.add('slide-in-left');
                    } else {
                        entry.target.classList.add('slide-in-right');
                    }
                }, index * 150);
            }
        });
    }, { threshold: 0.15 });

    sections.forEach(section => {
        observer.observe(section);
    });

    // --- Smooth scroll for anchor links ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // --- Add loading states to buttons ---
    document.addEventListener('click', function(e) {
        if (e.target.matches('.btn-primary, .btn-success')) {
            const button = e.target;

            // Add loading state
            button.classList.add('btn-loading');

            // Remove loading state after a delay (for demo purposes)
            setTimeout(() => {
                button.classList.remove('btn-loading');
            }, 2000);
        }
    });

    // --- Gentle parallax effect to hero section ---
    const heroSection = document.querySelector('.hero-gradient');
    if (heroSection) {
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const rate = scrolled * -0.3; // Gentler parallax
            heroSection.style.transform = `translateY(${rate}px)`;
        });
    }

    // --- Form enhancement for better UX ---
    const formInputs = document.querySelectorAll('.form-input');
    formInputs.forEach(input => {
        // Add gentle focus animations
        input.addEventListener('focus', function() {
            this.parentElement.classList.add('gentle-pulse');
        });

        input.addEventListener('blur', function() {
            this.parentElement.classList.remove('gentle-pulse');
        });

        // Add helpful validation feedback
        input.addEventListener('input', function() {
            if (this.value.trim() !== '') {
                this.style.borderColor = '#34d399'; // Success color
            } else {
                this.style.borderColor = '#e2e8f0'; // Default color
            }
        });
    });

    // --- Intuitive calendar day highlighting ---
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('calendar-day') && !e.target.classList.contains('disabled') && !e.target.classList.contains('full')) {
            // Add gentle success feedback
            e.target.style.transform = 'scale(1.1)';
            setTimeout(() => {
                e.target.style.transform = '';
            }, 200);
        }
    });

    // --- Backup Calendar Renderer ---
    let currentCalendarDate = new Date();

    function renderBackupCalendar() {
        const calendarGrid = document.getElementById('calendar-grid');
        const monthYear = document.getElementById('month-year');

        if (!calendarGrid || !monthYear) return;

        const year = currentCalendarDate.getFullYear();
        const month = currentCalendarDate.getMonth();

        monthYear.textContent = `${currentCalendarDate.toLocaleString('default', { month: 'long' })} ${year}`;

        // Clear existing days (keep headers)
        const existingDays = calendarGrid.querySelectorAll('.calendar-day, div:not([class*="text-gray-500"])');
        existingDays.forEach(day => day.remove());

        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Add empty cells for days before the first day of the month
        for (let i = 0; i < firstDayOfMonth; i++) {
            const emptyDay = document.createElement('div');
            calendarGrid.appendChild(emptyDay);
        }

        // Weekly availability: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
        const weeklyAvailability = { 0: 0, 1: 10, 2: 10, 3: 10, 4: 10, 5: 8, 6: 0 };

        // Add calendar days
        for (let day = 1; day <= daysInMonth; day++) {
            const dayDate = new Date(year, month, day);
            const dayEl = document.createElement('div');
            const dayOfWeek = dayDate.getDay();
            const availableSpots = weeklyAvailability[dayOfWeek];

            dayEl.className = 'calendar-day cursor-pointer';
            dayEl.dataset.date = dayDate.toISOString().split('T')[0];

            if (dayDate < today || dayOfWeek === 0 || dayOfWeek === 6) {
                // Past dates, Sunday, or Saturday (closed)
                dayEl.classList.add('disabled');
                let statusText = 'Past';
                if (dayOfWeek === 0 || dayOfWeek === 6) {
                    statusText = 'Closed';
                }
                dayEl.innerHTML = `
                    <div class="font-semibold text-gray-400">${day}</div>
                    <div class="text-xs text-gray-400">${statusText}</div>
                `;
            } else {
                // Available dates
                dayEl.innerHTML = `
                    <div class="font-semibold">${day}</div>
                    <div class="text-xs text-green-600">${availableSpots} spots</div>
                `;

                dayEl.addEventListener('click', () => {
                    // Remove previous selection
                    document.querySelectorAll('.calendar-day.selected').forEach(el =>
                        el.classList.remove('selected'));

                    // Add selection to clicked day
                    dayEl.classList.add('selected');

                    // Update selection display
                    const selectionDisplay = document.getElementById('selection-display');
                    if (selectionDisplay) {
                        selectionDisplay.innerHTML = `
                            <div class="text-center">
                                <div class="text-2xl mb-2">📅</div>
                                <div class="font-bold text-blue-600">Selected Date:</div>
                                <div class="text-lg text-gray-900">${dayDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
                            </div>
                        `;
                        selectionDisplay.className = 'p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border-2 border-green-200';
                    }
                });
            }

            calendarGrid.appendChild(dayEl);
        }

    }

    // Initialize calendar and navigation
    setTimeout(() => {
        const calendarGrid = document.getElementById('calendar-grid');
        if (calendarGrid && calendarGrid.children.length <= 7) {
            console.log('Firebase calendar not loaded, using backup...');
            renderBackupCalendar();
        }

        // Set up navigation regardless of which calendar is used
        setupCalendarNavigation();
    }, 2000);

    function setupCalendarNavigation() {
        const prevBtn = document.getElementById('prev-month');
        const nextBtn = document.getElementById('next-month');

        if (prevBtn && nextBtn) {
            // Remove any existing event listeners
            prevBtn.replaceWith(prevBtn.cloneNode(true));
            nextBtn.replaceWith(nextBtn.cloneNode(true));

            // Get the new elements after replacement
            const newPrevBtn = document.getElementById('prev-month');
            const newNextBtn = document.getElementById('next-month');

            newPrevBtn.addEventListener('click', () => {
                currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
                renderBackupCalendar();
            });

            newNextBtn.addEventListener('click', () => {
                currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
                renderBackupCalendar();
            });
        }
    }
});
