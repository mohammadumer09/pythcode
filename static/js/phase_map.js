/**
 * phase_map.js — loads phases from /api/phases and renders the grid.
 * Handles locked / unlocked / done states, progress bar, animations.
 */

document.addEventListener('DOMContentLoaded', loadPhaseMap);

async function loadPhaseMap() {
  try {
    const res = await fetch('/api/phases');
    if (!res.ok) throw new Error('API error');
    let phases = await res.json();
    // Merge localStorage guest progress so the map reflects offline progress
    if (window.GuestMode) phases = window.GuestMode.mergeIntoApiPhases(phases);
    renderMap(phases);
  } catch (e) {
    document.getElementById('mapLoading').innerHTML =
      '<p class="text-muted">Could not load phases. <a href="/map">Refresh</a></p>';
  }
}

function renderMap(phases) {
  document.getElementById('mapLoading').style.display = 'none';

  const groups = { beginner: [], core: [], intermediate: [] };
  phases.forEach(p => { if (groups[p.level]) groups[p.level].push(p); });

  renderGroup('beginner',      groups.beginner,      'beginnerGrid',      'beginnerSection');
  renderGroup('core',          groups.core,           'coreGrid',          'coreSection');
  renderGroup('intermediate',  groups.intermediate,   'intermediateGrid',  'intermediateSection');

  // Progress bar
  const done  = phases.filter(p => p.state === 'done').length;
  const total = phases.length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
  const fill  = document.getElementById('progressFill');
  const track = fill.closest('[role="progressbar"]');
  track.setAttribute('aria-valuenow', done);
  document.getElementById('progressText').textContent = `${done} / ${total} phases`;

  if (typeof Motion !== 'undefined') {
    const { animate } = Motion;
    fill.style.width = '0%';
    animate(fill, { width: pct + '%' }, { duration: 0.9, easing: 'ease-out' });
  } else {
    fill.style.width = pct + '%';
  }

  // anime.js stagger entrance
  if (typeof anime !== 'undefined') {
    anime({
      targets: '.phase-card',
      opacity: [0, 1],
      translateY: [20, 0],
      delay: anime.stagger(35),
      duration: 480,
      easing: 'easeOutExpo',
    });
  }

  // motion.dev hover lift
  if (typeof Motion !== 'undefined') {
    const { animate } = Motion;
    document.querySelectorAll('.phase-card:not(.locked)').forEach(card => {
      card.addEventListener('mouseenter', () =>
        animate(card, { scale: 1.03, y: -4 }, { duration: 0.18, easing: 'ease-out' })
      );
      card.addEventListener('mouseleave', () =>
        animate(card, { scale: 1, y: 0 }, { duration: 0.2, easing: 'ease-out' })
      );
    });
  }
  // Wire up search filter
  initSearch(phases);
}

const MILESTONE_PROJECTS = {
  5:  { id: 1, title: 'Mini-Project 1: Tip & Split Bill Calculator', icon: '🪙', desc: 'Inputs, floats, arithmetic, and formatted output', xp: 100 },
  10: { id: 2, title: 'Mini-Project 2: Number Guessing Game', icon: '🎯', desc: 'Conditionals, random logic, and attempt tracking', xp: 100 },
  15: { id: 3, title: 'Mini-Project 3: CLI Contact Book', icon: '📒', desc: 'Dictionaries, lists, CRUD, and case-insensitive search', xp: 100 },
  20: { id: 4, title: 'Mini-Project 4: File-Based Quiz System', icon: '📜', desc: 'File handling, JSON parsing, and exception validation', xp: 100 },
  25: { id: 5, title: 'Mini-Project 5: Password Generator & Analyzer', icon: '🔐', desc: 'Built-ins, string constants, generators, and any()', xp: 100 },
};

function renderGroup(level, phases, gridId, sectionId) {
  const grid    = document.getElementById(gridId);
  const section = document.getElementById(sectionId);
  if (!phases.length) return;
  section.style.display = 'block';

  const completedProjects = JSON.parse(localStorage.getItem('pythcode_completed_projects') || '[]');

  let html = '';
  phases.forEach(p => {
    html += phaseCardHtml(p);
    // Check if a milestone mini-project follows this phase
    if (MILESTONE_PROJECTS[p.id]) {
      const mp = MILESTONE_PROJECTS[p.id];
      const isComplete = completedProjects.includes(mp.id);
      const isUnlocked = p.state === 'done' || p.state === 'unlocked';
      html += `
        <div class="milestone-card" onclick="window.location='/project/${mp.id}'"
             style="${!isUnlocked ? 'opacity:0.6;filter:grayscale(0.7);cursor:not-allowed;' : ''}">
          <div class="milestone-info">
            <div class="milestone-icon">${mp.icon}</div>
            <div>
              <div style="display:flex;align-items:center;gap:0.5rem">
                <span class="stat-label" style="color:var(--accent);font-weight:700;font-size:0.75rem">PROJECT MILESTONE</span>
                ${isComplete ? '<span class="test-status-pill pass">✓ Completed</span>' : '<span class="test-status-pill pending">Ready</span>'}
              </div>
              <h3 style="font-size:1.05rem;color:var(--text);margin-top:0.2rem">${escHtml(mp.title)}</h3>
              <p class="text-muted" style="font-size:0.84rem;margin-top:0.2rem">${escHtml(mp.desc)}</p>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:0.75rem">
            <span class="stat-chip" style="font-size:0.82rem;padding:0.25rem 0.6rem">⭐ +${mp.xp} XP</span>
            <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();window.location='/project/${mp.id}'">
              ${isComplete ? 'Review Project →' : 'Start Project →'}
            </button>
          </div>
        </div>
      `;
    }
  });

  grid.innerHTML = html;
}

function initSearch(allPhases) {
  const searchInput = document.getElementById('phaseSearchInput');
  const clearBtn = document.getElementById('clearSearchBtn');
  const statsEl = document.getElementById('searchStats');
  if (!searchInput) return;

  function doSearch() {
    const q = searchInput.value.trim().toLowerCase();
    if (clearBtn) clearBtn.style.display = q ? 'inline-block' : 'none';

    let matchCount = 0;
    const cards = document.querySelectorAll('.phase-card');
    cards.forEach(card => {
      const text = card.textContent.toLowerCase();
      const match = !q || text.includes(q);
      card.style.display = match ? '' : 'none';
      if (match) matchCount++;
    });

    document.querySelectorAll('.milestone-card').forEach(mc => {
      const text = mc.textContent.toLowerCase();
      mc.style.display = !q || text.includes(q) ? '' : 'none';
    });

    if (statsEl) {
      if (q) {
        statsEl.style.display = 'block';
        statsEl.textContent = `Showing ${matchCount} of ${allPhases.length} phases matching "${q}"`;
      } else {
        statsEl.style.display = 'none';
      }
    }
  }

  searchInput.addEventListener('input', doSearch);
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      doSearch();
      searchInput.focus();
    });
  }
}

function phaseCardHtml(p) {
  const { id, title, level, state, stars, has_content } = p;
  const isLocked  = state === 'locked';
  const isDone    = state === 'done';
  const isCurrent = state === 'unlocked';

  const lockIcon  = isLocked ? '<span class="phase-card-lock" aria-label="Locked">🔒</span>' : '';
  const doneIcon  = isDone   ? '<span class="phase-card-lock" aria-label="Completed" style="color:var(--accent)">✓</span>' : '';
  const startText = isCurrent && has_content ? '<span style="color:var(--accent);font-weight:600">Start →</span>' : '';

  const starsHtml = [1,2,3].map(i =>
    `<span class="star ${i <= stars ? 'filled' : ''}" aria-hidden="true">★</span>`
  ).join('');

  const clickAttr = !isLocked && has_content
    ? `onclick="window.location='/lesson/${id}'" tabindex="0" role="link"
       onkeypress="if(event.key==='Enter')window.location='/lesson/${id}'"
       style="cursor:pointer"`
    : isLocked ? '' : `style="opacity:0.6;cursor:default"`;

  return `
    <div class="card phase-card ${state}" ${clickAttr}
         aria-label="Phase ${id}: ${escHtml(title)}, ${state}">
      ${lockIcon}${doneIcon}
      <span class="phase-card-num">${String(id).padStart(2, '0')}</span>
      <span class="phase-card-title">${escHtml(title)}</span>
      <div class="stars" aria-label="${stars} of 3 stars">${starsHtml}</div>
      <div class="phase-card-meta">
        <span class="level-badge ${level}">${level}</span>
        ${startText}
        ${!has_content && !isLocked ? '<span style="color:var(--text-muted);font-size:0.72rem">coming soon</span>' : ''}
      </div>
    </div>
  `;
}

function escHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
