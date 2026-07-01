document.addEventListener('DOMContentLoaded', () => {
    // 1. Scroll-driven animations using Intersection Observer
    const observerOptions = {
        root: null,
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Once it is visible, we can stop observing it
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const fadeElements = document.querySelectorAll('.animate-on-scroll');
    fadeElements.forEach(el => observer.observe(el));

    // 2. Active nav link highlight on scroll
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('#mainnav ul li a');

    // Add throttle to scroll listener for performance
    let isScrolling = false;
    window.addEventListener('scroll', () => {
        if (!isScrolling) {
            window.requestAnimationFrame(() => {
                let current = '';
                const scrollPosition = window.scrollY + 200; // offset for sticky nav

                sections.forEach(section => {
                    const sectionTop = section.offsetTop;
                    const sectionHeight = section.offsetHeight;
                    if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                        current = section.getAttribute('id');
                    }
                });

                // Special handling if near bottom to highlight contact
                if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 50) {
                    current = 'about-contact';
                }

                navLinks.forEach(a => {
                    a.classList.remove('active');
                    const href = a.getAttribute('href');
                    if (href === `#${current}` || (current === 'about-contact' && (href === '#about-contact' || href === '#about-contact'))) {
                        a.classList.add('active');
                    }
                });
                isScrolling = false;
            });
            isScrolling = true;
        }
    });

    // 3. Card mouse spotlight effect (premium micro-interaction)
    const cards = document.querySelectorAll('.project-card, .featured-card');
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
        });
    });

    // 4. Subtle background glow orb that follows cursor globally (desktop only)
    if (window.matchMedia('(pointer: fine)').matches) {
        const glowOrb = document.createElement('div');
        glowOrb.className = 'cursor-glow-orb';
        document.body.appendChild(glowOrb);

        let mouseX = 0, mouseY = 0;
        let orbX = 0, orbY = 0;

        window.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY + window.scrollY;
        });

        // Smooth easing/interpolation for the orb
        const tick = () => {
            orbX += (mouseX - orbX) * 0.08;
            orbY += (mouseY - orbY) * 0.08;
            glowOrb.style.transform = `translate3d(${orbX - 250}px, ${orbY - 250}px, 0)`;
            requestAnimationFrame(tick);
        };
        tick();
    }
});
