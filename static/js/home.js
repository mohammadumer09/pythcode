/**
 * home.js — Full DESIGN.md animations for the Home page.
 *
 * anime.js:
 *   - Staggered hero reveal (eyebrow → title → subtitle → CTA → stats)
 *   - Slow looping float on stat chips
 *   - SVG curved green line chart path draw
 *
 * motion.dev:
 *   - Scroll-reveal on all sections / card rows
 *   - Hover lift + glow on interactive cards
 *   - Smooth progress bar fill (reused on Phase Map)
 */

document.addEventListener('DOMContentLoaded', () => {

  // ── anime.js: staggered hero reveal ──────────────────────────
  if (typeof anime !== 'undefined') {

    anime.timeline({ easing: 'easeOutExpo', duration: 700 })
      .add({ targets: '#heroEyebrow',      opacity: [0,1], translateY: [24,0] })
      .add({ targets: '#heroTitle',        opacity: [0,1], translateY: [32,0], duration: 800 }, '-=500')
      .add({ targets: '#heroSubtitle',     opacity: [0,1], translateY: [20,0] }, '-=600')
      .add({ targets: '#heroCta .btn',     opacity: [0,1], translateY: [16,0], delay: anime.stagger(100) }, '-=500')
      .add({ targets: '#heroStats .stat-chip', opacity: [0,1], translateY: [20,0], delay: anime.stagger(100) }, '-=400');

    // Slow looping float on stat chips
    anime({
      targets:   '#heroStats .stat-chip',
      translateY: [0, -7],
      direction:  'alternate',
      loop:       true,
      easing:     'easeInOutSine',
      duration:   2800,
      delay:      anime.stagger(400),
    });

    // SVG chart path draw (runs after a short delay so user sees it)
    const path = document.getElementById('chartPath');
    if (path) {
      const length = path.getTotalLength();
      path.style.strokeDasharray  = length;
      path.style.strokeDashoffset = length;
      anime({
        targets:            path,
        strokeDashoffset:   [length, 0],
        easing:             'easeInOutSine',
        duration:           1800,
        delay:              800,
      });
    }

    // Animate chart dots after path
    const dots = document.querySelectorAll('.chart-dot');
    if (dots.length) {
      anime({
        targets:  dots,
        scale:    [0, 1],
        opacity:  [0, 1],
        delay:    anime.stagger(200, { start: 1600 }),
        duration: 400,
        easing:   'easeOutBack',
      });
    }
  }

  // ── motion.dev: scroll-reveal + hover effects ─────────────────
  if (typeof Motion !== 'undefined') {
    const { animate, inView } = Motion;

    // All [data-reveal] elements (attached in home.html)
    document.querySelectorAll('[data-reveal]').forEach((el, i) => {
      el.style.opacity   = '0';
      el.style.transform = 'translateY(28px)';
      inView(el, () => {
        animate(el,
          { opacity: [0, 1], y: [28, 0] },
          { duration: 0.55, delay: (i % 3) * 0.1, easing: 'ease-out' }
        );
      }, { margin: '-60px' });
    });

    // Hover lift on cards
    document.querySelectorAll('.card:not(.phase-card)').forEach(card => {
      card.addEventListener('mouseenter', () =>
        animate(card, { scale: 1.025, y: -4 }, { duration: 0.2, easing: 'ease-out' })
      );
      card.addEventListener('mouseleave', () =>
        animate(card, { scale: 1, y: 0 }, { duration: 0.22, easing: 'ease-out' })
      );
    });

    // Button press feedback
    document.querySelectorAll('.btn').forEach(btn => {
      btn.addEventListener('mousedown', () =>
        animate(btn, { scale: 0.96 }, { duration: 0.1 })
      );
      btn.addEventListener('mouseup', () =>
        animate(btn, { scale: 1 }, { duration: 0.15 })
      );
    });
  }

  // ── "Continue where you left off" banner ──────────────────────
  initContinueBanner();

  // ── Home quick lesson search ──────────────────────────────────
  initHomeSearch();
});

async function initContinueBanner() {
  const banner = document.getElementById('continueBanner');
  const badgeEl = document.getElementById('continueBadge');
  const titleEl = document.getElementById('continueTitle');
  const btnEl = document.getElementById('continueBtn');
  if (!banner) return;

  // 1. Check for explicit bookmark
  const bmStr = localStorage.getItem('pythcode_bookmark');
  if (bmStr) {
    try {
      const bm = JSON.parse(bmStr);
      badgeEl.textContent = '★ Bookmarked Lesson';
      titleEl.textContent = `Phase ${bm.id}: ${bm.title}`;
      btnEl.href = `/lesson/${bm.id}`;
      btnEl.textContent = 'Continue Lesson →';
      banner.style.display = 'flex';
      return;
    } catch (e) {}
  }

  // 2. Check for last active phase
  const lastStr = localStorage.getItem('pythcode_last_visited');
  if (lastStr) {
    try {
      const last = JSON.parse(lastStr);
      badgeEl.textContent = '⚡ Last Visited Phase';
      titleEl.textContent = `Phase ${last.id}: ${last.title}`;
      btnEl.href = `/lesson/${last.id}`;
      btnEl.textContent = 'Resume Phase →';
      banner.style.display = 'flex';
      return;
    } catch (e) {}
  }

  // 3. Fallback: check guest / user progress from API
  try {
    const res = await fetch('/api/phases');
    if (!res.ok) return;
    let phases = await res.json();
    if (window.GuestMode) phases = window.GuestMode.mergeIntoApiPhases(phases);

    // Find highest unlocked uncompleted phase, or first phase
    const current = phases.find(p => p.state === 'unlocked') || phases[0];
    if (current && current.id > 1) {
      badgeEl.textContent = '🎯 Current Goal';
      titleEl.textContent = `Phase ${current.id}: ${current.title}`;
      btnEl.href = `/lesson/${current.id}`;
      btnEl.textContent = 'Continue Phase →';
      banner.style.display = 'flex';
    }
  } catch (e) {}
}

let cachedPhases = null;
async function initHomeSearch() {
  const input = document.getElementById('homeSearchInput');
  const resultsBox = document.getElementById('homeSearchResults');
  if (!input || !resultsBox) return;

  input.addEventListener('input', async () => {
    const q = input.value.trim().toLowerCase();
    if (!q) {
      resultsBox.style.display = 'none';
      resultsBox.innerHTML = '';
      return;
    }

    if (!cachedPhases) {
      try {
        const res = await fetch('/api/phases');
        if (res.ok) cachedPhases = await res.json();
      } catch (e) {}
    }

    if (!cachedPhases) return;

    const matches = cachedPhases.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.level.toLowerCase().includes(q) ||
      String(p.id).includes(q)
    ).slice(0, 5);

    if (matches.length === 0) {
      resultsBox.innerHTML = `<div class="text-muted" style="padding:0.5rem;font-size:0.86rem">No phases matching "${q}"</div>`;
      resultsBox.style.display = 'block';
    } else {
      resultsBox.innerHTML = matches.map(p => `
        <a href="/lesson/${p.id}" style="display:flex;justify-content:space-between;align-items:center;padding:0.5rem 0.75rem;border-radius:8px;text-decoration:none;color:var(--text);border-bottom:1px solid rgba(255,255,255,0.04)">
          <span><strong>Phase ${p.id}:</strong> ${p.title}</span>
          <span class="level-badge ${p.level}">${p.level}</span>
        </a>
      `).join('');
      resultsBox.style.display = 'block';
    }
  });
}
