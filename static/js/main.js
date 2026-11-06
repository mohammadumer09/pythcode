/**
 * main.js — Global JS: navbar, logout, motion.dev scroll-reveal,
 * page transitions, button press feedback.
 */

// ── Navbar mobile toggle ─────────────────────────────────────
const navToggle = document.getElementById('navToggle');
const navLinks  = document.getElementById('navLinks');

if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(open));
    // Animate hamburger → X
    if (typeof anime !== 'undefined') {
      const spans = navToggle.querySelectorAll('span');
      if (open) {
        anime({ targets: spans[0], rotate: 45,  translateY: 7,  duration: 250 });
        anime({ targets: spans[1], opacity: 0,                   duration: 150 });
        anime({ targets: spans[2], rotate: -45, translateY: -7, duration: 250 });
      } else {
        anime({ targets: spans[0], rotate: 0,  translateY: 0, duration: 250 });
        anime({ targets: spans[1], opacity: 1,                duration: 150 });
        anime({ targets: spans[2], rotate: 0,  translateY: 0, duration: 250 });
      }
    }
  });
}

// ── Logout button ────────────────────────────────────────────
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/';
  });
}

// ── Page transitions (motion.dev) ────────────────────────────
// Intercept same-origin link clicks → fade out before navigate
document.addEventListener('DOMContentLoaded', () => {
  if (typeof Motion === 'undefined') return;
  const { animate } = Motion;
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto') ||
        a.target === '_blank' || a.origin !== location.origin) return;
    const mainEl = document.getElementById('main-content');
    if (!mainEl) return;
    e.preventDefault();
    animate(mainEl,
      { opacity: [1, 0], y: [0, -8] },
      { duration: 0.2, easing: 'ease-in' }
    ).then(() => { window.location.href = href; });
  });
});

// ── Global scroll-reveal (motion.dev) ────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (typeof Motion === 'undefined') return;
  const { animate, inView } = Motion;

  document.querySelectorAll('[data-reveal]').forEach((el, i) => {
    if (el.style.opacity === '0') return; // already handled by page-specific JS
    el.style.opacity   = '0';
    el.style.transform = 'translateY(24px)';
    inView(el, () => {
      animate(el,
        { opacity: [0,1], y: [24, 0] },
        { duration: 0.5, delay: (i % 4) * 0.08, easing: 'ease-out' }
      );
    }, { margin: '-50px' });
  });

  // Global button press spring
  document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('mousedown', () =>
      animate(btn, { scale: 0.96 }, { duration: 0.08 })
    );
    btn.addEventListener('mouseup',   () =>
      animate(btn, { scale: 1 },    { duration: 0.15, easing: 'spring(400,30,0,0)' })
    );
    btn.addEventListener('mouseleave', () =>
      animate(btn, { scale: 1 },    { duration: 0.1 })
    );
  });
});
