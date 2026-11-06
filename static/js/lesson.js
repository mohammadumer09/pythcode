/**
 * lesson.js — Lesson page engine
 *
 * Loads phase data from /api/phases/<id>, renders:
 *   - Lesson steps (with code blocks + output)
 *   - 4 challenge types: mcq, predict, fill, code (CodeMirror editor)
 * Submits answers to /api/phases/<id>/submit (server grading).
 * Code challenges can also "Try it" via CodeRunner (Pyodide / /api/run).
 */

/* ── State ──────────────────────────────────────────────────── */
let phaseData   = null;
let currentStep = 0;
let submitted   = false;
const cmEditors = {};   // challenge_id → CodeMirror instance

/* ── Boot ───────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  if (typeof CodeRunner !== 'undefined') CodeRunner.preload();
  loadPhase(PHASE_ID);
});

async function loadPhase(id) {
  try {
    const res = await fetch(`/api/phases/${id}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      showError(err.error || `Phase ${id} not found.`);
      return;
    }
    phaseData = await res.json();
    renderShell();
  } catch (e) {
    showError('Could not connect to the server.');
  }
}

/* ── Render shell ───────────────────────────────────────────── */
function renderShell() {
  document.getElementById('lessonLoading').style.display = 'none';
  document.getElementById('lessonShell').style.display   = 'block';

  // Header
  document.getElementById('phaseTitle').textContent =
    `Phase ${phaseData.id}: ${phaseData.title}`;
  const badge = document.getElementById('phaseLevelBadge');
  badge.textContent  = phaseData.level;
  badge.className    = `level-badge ${phaseData.level}`;
  document.getElementById('phaseMinutes').textContent =
    `~${phaseData.estimated_minutes} min`;

  renderStepNav();
  renderLessonSteps();
  renderChallenges();
  initBookmark();
  activateStep(0);
  // Init CodeMirror after DOM is built
  setTimeout(initCodeEditors, 0);
}

/* ── Step navigation ────────────────────────────────────────── */
function renderStepNav() {
  const nav = document.getElementById('stepNav');
  nav.innerHTML = '';
  const steps = phaseData.lesson;
  const total  = steps.length;

  steps.forEach((step, i) => {
    const li = document.createElement('li');
    li.className = 'lesson-nav-item';
    li.dataset.step = i;
    li.setAttribute('tabindex', '0');
    li.setAttribute('role', 'button');
    li.setAttribute('aria-label', `Step ${i + 1}: ${step.heading}`);
    li.innerHTML = `
      <span class="step-dot">${i + 1}</span>
      <span>${step.heading}</span>
    `;
    li.addEventListener('click', () => activateStep(i));
    li.addEventListener('keypress', e => { if (e.key === 'Enter') activateStep(i); });
    nav.appendChild(li);
  });

  // Challenges nav item
  const chLi = document.createElement('li');
  chLi.className = 'lesson-nav-item';
  chLi.dataset.step = total;
  chLi.setAttribute('tabindex', '0');
  chLi.setAttribute('role', 'button');
  chLi.setAttribute('aria-label', 'Challenges');
  chLi.innerHTML = `
    <span class="step-dot">✦</span>
    <span>Challenges</span>
  `;
  chLi.addEventListener('click', () => activateStep(total));
  chLi.addEventListener('keypress', e => { if (e.key === 'Enter') activateStep(total); });
  nav.appendChild(chLi);
}

function activateStep(idx) {
  const steps = phaseData.lesson;
  currentStep = idx;

  // Update nav
  document.querySelectorAll('.lesson-nav-item').forEach((li, i) => {
    li.classList.toggle('active', i === idx);
  });

  // Update progress label
  if (idx < steps.length) {
    document.getElementById('phaseProgress').textContent =
      `Step ${idx + 1} of ${steps.length}`;
  } else {
    document.getElementById('phaseProgress').textContent = 'Challenges';
  }

  // Show/hide lesson step panels
  document.querySelectorAll('.lesson-step').forEach((el, i) => {
    el.classList.toggle('active', i === idx);
  });

  // Show/hide challenges
  const ch = document.getElementById('challengesSection');
  ch.classList.toggle('active', idx === steps.length);

  if (idx === steps.length) {
    // Refresh CodeMirror editors once visible so gutters, cursor, and line numbers align properly
    setTimeout(() => {
      Object.values(cmEditors).forEach(ed => ed.refresh());
    }, 50);
  }

  // Animate in with anime.js (respecting prefers-reduced-motion)
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!prefersReduced && typeof anime !== 'undefined') {
    const target = idx < steps.length
      ? document.querySelectorAll('.lesson-step')[idx]
      : document.getElementById('challengesSection');
    if (target) {
      anime({ targets: target, opacity: [0, 1], translateY: [12, 0], duration: 350, easing: 'easeOutExpo' });
    }
  }

  // Update tracer if this step contains one
  if (idx < steps.length && steps[idx].trace) {
    setTimeout(() => updateTracerUI(`tracer-${idx}`), 20);
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── Render lesson steps ────────────────────────────────────── */
function renderLessonSteps() {
  const container = document.getElementById('lessonSteps');
  container.innerHTML = '';
  const steps = phaseData.lesson;

  steps.forEach((step, i) => {
    const div = document.createElement('div');
    div.className = 'lesson-step card';
    div.style.marginBottom = '1rem';

    let codeHtml = '';
    if (step.code) {
      codeHtml = `
        <div class="code-block">
          <div class="code-block-header">
            <span class="code-font" style="color:var(--accent)">example.py</span>
            <div class="code-actions">
              <button class="code-action-btn" onclick="copyCodeFromBlock(this)" aria-label="Copy code">📋 Copy</button>
              <button class="code-action-btn" onclick="openCodeInPlayground(this)" aria-label="Open in playground">⚡ Playground</button>
            </div>
          </div>
          <pre>${escHtml(step.code)}</pre>
        </div>
      `;
    }

    let tracerHtml = '';
    if (step.trace) {
      tracerHtml = renderCodeTracer(step.trace, i);
    }

    let outputHtml = '';
    if (step.output) {
      outputHtml = `<div class="output-block">${escHtml(step.output)}</div>`;
    }

    div.innerHTML = `
      <h2 class="lesson-step-heading">${escHtml(step.heading)}</h2>
      <div class="lesson-text">${step.text && step.text.includes('<') ? step.text : markdownToHtml(step.text)}</div>
      ${codeHtml}
      ${tracerHtml}
      ${outputHtml}
      <div class="step-nav">
        ${i > 0
          ? `<button class="btn btn-secondary" onclick="activateStep(${i - 1})">← Previous</button>`
          : ''}
        ${i < steps.length - 1
          ? `<button class="btn btn-primary" onclick="activateStep(${i + 1})">Next step →</button>`
          : `<button class="btn btn-primary" onclick="activateStep(${steps.length})">Start challenges →</button>`}
      </div>
    `;
    container.appendChild(div);
  });
}

/* ── Render challenges ──────────────────────────────────────── */
function renderChallenges() {
  const list = document.getElementById('challengesList');
  list.innerHTML = '';
  const challenges = phaseData.challenges;

  document.getElementById('challengeCount').textContent =
    `(${challenges.length} questions)`;

  challenges.forEach((ch, i) => {
    const card = document.createElement('div');
    card.className = 'challenge-card';
    card.id = `ch-card-${ch.id}`;

    let inputHtml = '';
    switch (ch.type) {
      case 'mcq':     inputHtml = renderMCQ(ch);     break;
      case 'predict': inputHtml = renderPredict(ch);  break;
      case 'fill':    inputHtml = renderFill(ch);     break;
      case 'code':    inputHtml = renderCode(ch);     break;
    }

    const hasHints = (Array.isArray(ch.hints) && ch.hints.length > 0) || Boolean(ch.hint);
    const hintBtnLabel = Array.isArray(ch.hints) && ch.hints.length > 1
      ? `💡 Hint (1/${ch.hints.length})`
      : '💡 Show hint';

    const hintHtml = hasHints ? `
      <div style="margin-top:0.75rem">
        <button class="hint-btn" id="hint-btn-${ch.id}" onclick="toggleHint('${ch.id}')">${hintBtnLabel}</button>
        <div class="challenge-hint" id="hint-${ch.id}"></div>
      </div>` : '';

    const diffBadge = ch.difficulty ? `<span class="diff-badge ${ch.difficulty}">${ch.difficulty}</span>` : '';
    const subLabel = subtypeLabel(ch.subtype);
    const subBadge = subLabel ? `<span class="subtype-badge">${subLabel}</span>` : '';

    card.innerHTML = `
      <div class="challenge-meta-row">
        <div class="challenge-num">${typeLabel(ch.type)} · Question ${i + 1}</div>
        <div style="display:flex;gap:0.4rem;align-items:center">
          ${subBadge}
          ${diffBadge}
        </div>
      </div>
      <div class="challenge-question">${markdownToHtml(ch.question)}</div>
      ${inputHtml}
      ${hintHtml}
      <div class="challenge-feedback" id="fb-${ch.id}"></div>
      <div class="challenge-explain"  id="ex-${ch.id}">${escHtml(ch.explanation || ch.explain || '')}</div>
    `;
    list.appendChild(card);
  });
}

function typeLabel(type) {
  return { mcq: 'Multiple Choice', predict: 'Predict Output', fill: 'Fill in the Blank', code: 'Write Code' }[type] || type;
}

/* MCQ */
function renderMCQ(ch) {
  const opts = ch.options.map((opt, idx) => `
    <label class="mcq-option" id="opt-${ch.id}-${idx}">
      <input type="radio" name="mcq-${ch.id}" value="${idx}"
             onchange="clearFeedback('${ch.id}')" />
      ${escHtml(opt)}
    </label>
  `).join('');
  return `<div class="mcq-options" id="mcq-${ch.id}">${opts}</div>`;
}

/* Predict */
function renderPredict(ch) {
  const codeHtml = ch.code
    ? `<div class="code-block" style="margin-bottom:0.75rem">
         <pre>${escHtml(ch.code)}</pre>
       </div>`
    : '';
  return `
    ${codeHtml}
    <textarea class="text-input" id="ans-${ch.id}" rows="3"
              placeholder="Type the exact output here…"
              oninput="clearFeedback('${ch.id}')"></textarea>
  `;
}

/* Fill */
function renderFill(ch) {
  // Phases 11-26 embed the template inside the question using backtick code spans.
  // Fall back gracefully: if no explicit template field, show a plain text input.
  const templateHtml = ch.template
    ? `<div class="fill-template">${escHtml(ch.template)}</div>`
    : '';
  return `
    ${templateHtml}
    <input type="text" class="text-input" id="ans-${ch.id}"
           placeholder="Type your answer…"
           oninput="clearFeedback('${ch.id}')" />
  `;
}

/* Code — CodeMirror editor */
function renderCode(ch) {
  const starter = (ch.starter || '').trimEnd();
  const wrapperId = `cm-wrap-${ch.id}`;
  // Return wrapper div; CodeMirror is attached after DOM insert in initCodeEditors()
  return `
    <div class="challenge-editor-wrap" id="${wrapperId}" data-starter="${escHtml(starter)}"></div>
    <div style="display:flex;gap:0.5rem;margin-top:0.5rem;align-items:center;flex-wrap:wrap">
      <button class="btn btn-secondary btn-sm" onclick="tryCode('${ch.id}')" id="try-${ch.id}">
        ▶ Try it
      </button>
      <span style="font-size:0.72rem;color:var(--text-muted)">Tab = 4 spaces · Ctrl+Enter = run</span>
    </div>
    <div class="code-block" id="try-output-${ch.id}" style="display:none;margin-top:0.5rem">
      <div class="code-block-header"><span style="color:var(--text-muted);font-size:0.75rem">Output</span></div>
      <pre id="try-output-pre-${ch.id}" style="color:var(--success)"></pre>
    </div>
  `;
}

/* ── Collect answers ────────────────────────────────────────── */
function collectAnswers() {
  const answers = {};
  phaseData.challenges.forEach(ch => {
    if (ch.type === 'mcq') {
      const sel = document.querySelector(`input[name="mcq-${ch.id}"]:checked`);
      answers[ch.id] = sel ? sel.value : '';
    } else if (ch.type === 'code') {
      // Read from CodeMirror if available, else fallback textarea
      const cm = cmEditors[ch.id];
      answers[ch.id] = cm ? cm.getValue() : (document.getElementById(`ans-${ch.id}`)?.value || '');
    } else {
      const el = document.getElementById(`ans-${ch.id}`);
      answers[ch.id] = el ? el.value : '';
    }
  });
  return answers;
}

/* ── Init CodeMirror editors for code challenges ─────────────── */
function initCodeEditors() {
  if (typeof CodeMirror === 'undefined') return;
  phaseData.challenges.forEach(ch => {
    if (ch.type !== 'code') return;
    const wrap = document.getElementById(`cm-wrap-${ch.id}`);
    if (!wrap) return;
    const starter = wrap.dataset.starter || (ch.starter || '');
    const editor  = CodeMirror(wrap, {
      value:             starter,
      mode:              'python',
      lineNumbers:       true,
      tabSize:           4,
      indentUnit:        4,
      indentWithTabs:    false,
      autoCloseBrackets: true,
      extraKeys:         {
        Tab: cm => {
          if (cm.somethingSelected()) {
            cm.indentSelection('add');
          } else {
            cm.replaceSelection('    ', 'end');
          }
        },
        'Shift-Tab':  cm => cm.indentSelection('subtract'),
        'Ctrl-Enter': () => tryCode(ch.id),
        'Cmd-Enter':  () => tryCode(ch.id),
      },
    });
    editor.on('focus', () => editor.refresh());
    cmEditors[ch.id] = editor;
  });

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      Object.values(cmEditors).forEach(cm => cm.refresh());
    });
  }
}

/* ── Try it button — run code without submitting ─────────────── */
async function tryCode(chId) {
  const btn = document.getElementById(`try-${chId}`);
  const cm  = cmEditors[chId];
  if (!cm) return;
  const code = cm.getValue();
  if (!code.trim()) return;

  btn.textContent  = '⏳ Running…';
  btn.disabled     = true;

  const outWrap = document.getElementById(`try-output-${chId}`);
  const outPre  = document.getElementById(`try-output-pre-${chId}`);

  const result = typeof CodeRunner !== 'undefined'
    ? await CodeRunner.run(code)
    : { stdout: '', stderr: 'Runner not loaded.', error: null };

  outWrap.style.display = 'block';
  if (result.error) {
    outPre.style.color = 'var(--error)';
    outPre.textContent = result.error + (result.stderr ? '\n' + result.stderr : '');
  } else if (result.stderr) {
    outPre.style.color = 'var(--error)';
    outPre.textContent = result.stdout + '\n' + result.stderr;
  } else {
    outPre.style.color = 'var(--success)';
    outPre.textContent = result.stdout || '(no output)';
  }

  btn.textContent = '▶ Try it';
  btn.disabled    = false;
}

/* ── Submit ─────────────────────────────────────────────────── */
async function submitAll() {
  if (submitted) return;

  const answers = collectAnswers();

  // Check all answered
  const unanswered = phaseData.challenges.filter(ch => {
    const a = answers[ch.id];
    return a === '' || a === null || a === undefined;
  });
  if (unanswered.length > 0) {
    showToast(`Please answer all ${unanswered.length} remaining question(s).`, 'error');
    return;
  }

  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Grading…';

  try {
    const res = await fetch(`/api/phases/${PHASE_ID}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers }),
    });
    const data = await res.json();
    submitted = true;
    // Save to guest localStorage regardless of login state
    if (window.GuestMode) {
      window.GuestMode.savePhaseResult(PHASE_ID, data.stars, data.score);
    }
    applyResults(data);
  } catch (e) {
    btn.disabled = false;
    btn.textContent = 'Submit answers →';
    showToast('Could not submit. Check your connection.', 'error');
  }
}

/* ── Apply grading results ──────────────────────────────────── */
function applyResults(data) {
  // Per-challenge feedback
  data.results.forEach(r => {
    const card = document.getElementById(`ch-card-${r.id}`);
    const fb   = document.getElementById(`fb-${r.id}`);
    const ex   = document.getElementById(`ex-${r.id}`);

    if (!card) return;

    card.classList.add(r.correct ? 'answered-correct' : 'answered-wrong');
    fb.textContent = r.correct ? '✓ ' + r.feedback : '✗ ' + r.feedback;
    fb.className   = `challenge-feedback ${r.correct ? 'correct' : 'wrong'}`;
    ex.classList.add('show');

    // Lock CM editors and regular inputs
    const ch = phaseData.challenges.find(c => c.id === r.id);
    if (ch && ch.type === 'mcq') {
      lockMCQ(ch.id, r.correct);
    } else if (ch && ch.type === 'code') {
      const cm = cmEditors[ch.id];
      if (cm) cm.setOption('readOnly', true);
      const wrap = document.getElementById(`cm-wrap-${ch.id}`);
      if (wrap) wrap.style.borderColor = r.correct ? 'var(--success)' : 'var(--error)';
    } else {
      const inp = document.getElementById(`ans-${r.id}`);
      if (inp) {
        inp.disabled = true;
        inp.classList.add(r.correct ? 'correct' : 'incorrect');
      }
    }
  });

  // Show results panel
  const panel   = document.getElementById('resultsPanel');
  const scoreEl = document.getElementById('resultsScore');
  const starsEl = document.getElementById('resultsStars');
  const msgEl   = document.getElementById('resultsMessage');
  const detEl   = document.getElementById('resultsDetails');
  const actEl   = document.getElementById('resultsActions');

  scoreEl.textContent = data.score + '%';
  starsEl.innerHTML   = renderStarsHtml(data.stars);

  if (data.passed) {
    let praise = "👏 Well done! You passed and unlocked the next phase.";
    if (data.score === 100) praise = "🌟 Perfect Score! You solved every challenge flawlessly.";
    else if (data.score >= 85) praise = "🚀 Fantastic job! You have a solid grasp of these Python concepts.";

    msgEl.innerHTML = `<strong>${praise}</strong><br><span style="font-size:0.9rem;color:var(--text-muted)">You earned +${data.xp_earned} XP</span>`;
    msgEl.className = 'results-message pass';

    // 3 bullets of what you learned
    const stepHeadings = phaseData.lesson ? phaseData.lesson.slice(0, 3).map(s => s.heading.replace(/^\d+\.\s*/, '')) : [];
    if (detEl) {
      detEl.innerHTML = `
        <div class="what-learned-card">
          <div class="what-learned-title"><span>🎓</span> What you mastered in Phase ${PHASE_ID}:</div>
          <ul class="what-learned-list">
            <li><span class="check">✓</span> ${stepHeadings[0] || 'Core syntax and foundational concepts'}</li>
            <li><span class="check">✓</span> ${stepHeadings[1] || 'Practical application and hands-on pattern solving'}</li>
            <li><span class="check">✓</span> ${stepHeadings[2] || 'Common debugging traps and Pythonic best practices'}</li>
          </ul>
        </div>
      `;
    }

    actEl.innerHTML = '';
    const nextId = PHASE_ID + 1;
    if (nextId <= 30) {
      actEl.innerHTML += `<a href="/lesson/${nextId}" class="btn btn-primary">Next phase →</a>`;
    }
    actEl.innerHTML += `<a href="/map" class="btn btn-secondary">Phase Map</a>`;
  } else {
    msgEl.innerHTML = `<strong>Don't worry — coding takes practice and mistakes are how we learn!</strong><br><span style="font-size:0.9rem;color:var(--text-muted)">Score: ${data.score}%. You need 70%+ to unlock the next phase.</span>`;
    msgEl.className = 'results-message fail';

    // Extract which challenges failed and map to recommended review sections
    const wrongResults = data.results.filter(r => !r.correct);
    const reviewSteps = new Set();
    wrongResults.forEach(r => {
      const ch = phaseData.challenges.find(c => c.id === r.id);
      if (ch) {
        if (ch.subtype === 'find_bug' || ch.type === 'error_type') {
          reviewSteps.add(4); // Section 5: Common Mistakes (0-indexed: 4)
        } else if (ch.type === 'predict' || ch.subtype === 'order') {
          reviewSteps.add(2); // Section 3: How Python Runs It (0-indexed: 2)
        } else {
          reviewSteps.add(1); // Section 2: Core Idea (0-indexed: 1)
        }
      }
    });

    if (reviewSteps.size === 0) reviewSteps.add(1);

    const pillsHtml = Array.from(reviewSteps).map(stepIdx => {
      if (phaseData.lesson && stepIdx < phaseData.lesson.length) {
        const title = phaseData.lesson[stepIdx].heading;
        return `<button type="button" class="review-pill" onclick="activateStep(${stepIdx})">📖 ${escHtml(title)}</button>`;
      }
      return '';
    }).filter(Boolean).join('');

    if (detEl) {
      detEl.innerHTML = `
        <div class="review-topics-card">
          <div class="review-topics-title">🎯 Recommended sections to review before retrying:</div>
          <p class="text-muted" style="font-size:0.82rem;margin-bottom:0.4rem">Click any section to review its concepts and examples:</p>
          <div class="review-pills-wrap">${pillsHtml}</div>
        </div>
      `;
    }

    actEl.innerHTML = `<button class="btn btn-primary" onclick="retryPhase()">Try again</button>
                       <button class="btn btn-secondary" onclick="activateStep(0)">Review Lesson</button>
                       <a href="/map" class="btn btn-secondary">Phase Map</a>`;
  }

  panel.classList.add('show');
  document.getElementById('submitBar').style.display = 'none';

  // Animate score and stars with anime.js (respecting prefers-reduced-motion)
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!prefersReduced && typeof anime !== 'undefined') {
    if (data.passed) {
      anime({
        targets: '.results-stars .star',
        scale: [0, 1.4, 1],
        opacity: [0, 1],
        rotate: [-15, 15, 0],
        delay: anime.stagger(140),
        duration: 650,
        easing: 'easeOutElastic(1, .5)',
      });
    }
    anime({
      targets: panel,
      opacity: [0, 1],
      translateY: [24, 0],
      duration: 500,
      easing: 'easeOutExpo',
    });
  }

  panel.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // Toast XP and badge
  if (data.xp_earned > 0) {
    setTimeout(() => showToast(`+${data.xp_earned} XP earned!`, 'success'), 600);
  }
  if (data.badge_earned) {
    const b = data.badge_earned;
    setTimeout(() => showToast(`🏅 Badge unlocked: ${b.icon || ''} ${b.label || b}`, 'success'), 1400);
  }
}

function lockMCQ(chId, wasCorrect) {
  document.querySelectorAll(`input[name="mcq-${chId}"]`).forEach(inp => {
    inp.disabled = true;
    const lbl = inp.closest('.mcq-option');
    if (inp.checked) {
      lbl.classList.add(wasCorrect ? 'correct' : 'incorrect');
    }
  });
}

function renderStarsHtml(count) {
  return [1,2,3].map(i =>
    `<span class="star ${i <= count ? 'filled' : ''}" style="font-size:2.5rem" aria-label="${i <= count ? 'filled' : 'empty'} star">★</span>`
  ).join('');
}

function retryPhase() {
  submitted = false;
  document.getElementById('resultsPanel').classList.remove('show');
  document.getElementById('submitBar').style.display = 'flex';
  document.getElementById('submitBtn').disabled = false;
  document.getElementById('submitBtn').textContent = 'Submit answers →';

  // Reset all challenge cards
  phaseData.challenges.forEach(ch => {
    const card = document.getElementById(`ch-card-${ch.id}`);
    if (card) {
      card.classList.remove('answered-correct', 'answered-wrong');
    }
    const fb = document.getElementById(`fb-${ch.id}`);
    if (fb) { fb.className = 'challenge-feedback'; fb.textContent = ''; }
    const ex = document.getElementById(`ex-${ch.id}`);
    if (ex) { ex.classList.remove('show'); }

    if (ch.type === 'mcq') {
      document.querySelectorAll(`input[name="mcq-${ch.id}"]`).forEach(inp => {
        inp.disabled = false;
        inp.closest('.mcq-option').classList.remove('correct', 'incorrect', 'selected');
      });
    } else if (ch.type === 'code') {
      const cm = cmEditors[ch.id];
      if (cm) cm.setOption('readOnly', false);
      const wrap = document.getElementById(`cm-wrap-${ch.id}`);
      if (wrap) wrap.style.borderColor = '';
      const outWrap = document.getElementById(`try-output-${ch.id}`);
      if (outWrap) outWrap.style.display = 'none';
    } else {
      const inp = document.getElementById(`ans-${ch.id}`);
      if (inp) {
        inp.disabled = false;
        inp.classList.remove('correct', 'incorrect');
      }
    }
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── Helpers ────────────────────────────────────────────────── */
const hintState = {}; // chId -> current level (0, 1, 2, ...)

function toggleHint(chId) {
  const ch = phaseData.challenges.find(c => String(c.id) === String(chId));
  if (!ch) return;
  const el = document.getElementById(`hint-${chId}`);
  const btn = document.getElementById(`hint-btn-${chId}`);
  if (!el) return;

  const hints = Array.isArray(ch.hints) && ch.hints.length > 0
    ? ch.hints
    : (ch.hint ? [ch.hint] : []);

  if (!hints.length) return;

  const current = hintState[chId] || 0;
  if (current >= hints.length) {
    hintState[chId] = 0;
    el.classList.remove('show');
    el.innerHTML = '';
    if (btn) btn.textContent = hints.length > 1 ? `💡 Hint (1/${hints.length})` : '💡 Show hint';
    return;
  }

  const next = current + 1;
  hintState[chId] = next;
  el.classList.add('show');

  const levelLabels = ['Small hint', 'Bigger hint', 'Solution'];
  el.innerHTML = hints.slice(0, next).map((h, idx) => {
    const lbl = levelLabels[idx] || `Hint ${idx + 1}`;
    return `<div class="hint-level-item"><strong>💡 Level ${idx + 1} (${lbl}):</strong><br>${markdownToHtml(h)}</div>`;
  }).join('<hr style="border:0;border-top:1px dashed var(--border);margin:0.5rem 0">');

  if (btn) {
    btn.textContent = next < hints.length
      ? `💡 Next hint (${next + 1}/${hints.length})`
      : '💡 Hide hints';
  }
}

function subtypeLabel(st) {
  const map = {
    find_bug: '🐛 Find the Bug',
    order: '🔢 Line Order',
    error: '⚠️ What Error?',
    mini_task: '🚀 Mini Task',
  };
  return map[st] || '';
}

function clearFeedback(chId) {
  if (submitted) return;
  const fb = document.getElementById(`fb-${chId}`);
  if (fb) { fb.className = 'challenge-feedback'; fb.textContent = ''; }
}

function handleTab(e) {
  if (e.key === 'Tab') {
    e.preventDefault();
    const ta = e.target;
    const start = ta.selectionStart;
    const end   = ta.selectionEnd;
    ta.value = ta.value.substring(0, start) + '    ' + ta.value.substring(end);
    ta.selectionStart = ta.selectionEnd = start + 4;
  }
}

function escHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Markdown-to-HTML: fenced code blocks, bold, inline code, newlines. */
function markdownToHtml(text) {
  if (!text) return '';
  // HTML-escape first so code content is safe
  let s = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // Fenced code blocks (```python ... ``` or ``` ... ```) — must run before inline `code`
  s = s.replace(/```(?:python)?\n([\s\S]*?)```/g,
    '<div class="code-block" style="margin:0.5rem 0"><pre>$1</pre></div>');
  // Inline bold and code
  s = s
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
  // Newlines — but don't add <br> inside block elements we just inserted
  s = s.replace(/\n(?!<\/pre>|<\/div>)/g, '<br>');
  return s;
}

/* ── Toast ──────────────────────────────────────────────────── */
let toastTimer = null;
function showToast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className   = `toast ${type} show`;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = `toast ${type}`; }, 3500);
}

/* ── Error state ────────────────────────────────────────────── */
function showError(msg) {
  document.getElementById('lessonLoading').style.display = 'none';
  document.getElementById('lessonError').style.display   = 'block';
  document.getElementById('lessonErrorMsg').textContent  = msg;
}

/* ── Code block actions (Copy & Playground) ─────────────────── */
function copyCodeFromBlock(btn) {
  const codeBlock = btn.closest('.code-block');
  const pre = codeBlock ? codeBlock.querySelector('pre') : null;
  if (!pre) return;
  const text = pre.innerText || pre.textContent;
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.innerHTML;
    btn.innerHTML = '✓ Copied!';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.innerHTML = orig;
      btn.classList.remove('copied');
    }, 2000);
  }).catch(() => {
    showToast('Failed to copy to clipboard', 'error');
  });
}

function openCodeInPlayground(btn) {
  const codeBlock = btn.closest('.code-block');
  const pre = codeBlock ? codeBlock.querySelector('pre') : null;
  if (!pre) return;
  const text = pre.innerText || pre.textContent;
  sessionStorage.setItem('pythcode_playground_code', text);
  window.location.href = '/playground';
}

/* ── Bookmark helper ────────────────────────────────────────── */
function initBookmark() {
  const saved = localStorage.getItem('pythcode_bookmark');
  const bmBtn = document.getElementById('bookmarkBtn');
  if (bmBtn && saved) {
    try {
      const data = JSON.parse(saved);
      if (data.id === PHASE_ID) {
        bmBtn.classList.add('bookmarked');
        const iconEl = document.getElementById('bmIcon');
        const textEl = document.getElementById('bmText');
        if (iconEl) iconEl.textContent = '★';
        if (textEl) textEl.textContent = 'Bookmarked';
      }
    } catch (e) {}
  }
  // Record last visited phase
  localStorage.setItem('pythcode_last_visited', JSON.stringify({
    id: PHASE_ID,
    title: phaseData ? phaseData.title : `Phase ${PHASE_ID}`,
    time: Date.now()
  }));
}

function toggleBookmark() {
  const bmBtn = document.getElementById('bookmarkBtn');
  if (!bmBtn) return;
  const isBookmarked = bmBtn.classList.contains('bookmarked');
  const iconEl = document.getElementById('bmIcon');
  const textEl = document.getElementById('bmText');

  if (isBookmarked) {
    localStorage.removeItem('pythcode_bookmark');
    bmBtn.classList.remove('bookmarked');
    if (iconEl) iconEl.textContent = '🔖';
    if (textEl) textEl.textContent = 'Bookmark';
    showToast('Bookmark removed', 'info');
  } else {
    localStorage.setItem('pythcode_bookmark', JSON.stringify({
      id: PHASE_ID,
      title: phaseData ? phaseData.title : `Phase ${PHASE_ID}`,
      time: Date.now()
    }));
    bmBtn.classList.add('bookmarked');
    if (iconEl) iconEl.textContent = '★';
    if (textEl) textEl.textContent = 'Bookmarked';
    showToast('Lesson bookmarked! You can continue from Home.', 'success');
  }
}

/* ── Code Tracer Component ─────────────────────────────────── */
const tracerStates = {};

function renderCodeTracer(trace, stepIdx) {
  const tracerId = `tracer-${stepIdx}`;
  tracerStates[tracerId] = {
    currentStep: 0,
    timer: null,
    autoPlaying: false,
    data: trace
  };

  const lines = trace.code.split('\n');
  const codeLinesHtml = lines.map((line, idx) => {
    const lineNum = idx + 1;
    return `
      <div class="tracer-line" id="${tracerId}-line-${lineNum}">
        <span class="tracer-line-num">${lineNum}</span>
        <span class="tracer-line-code">${escHtml(line) || '&nbsp;'}</span>
      </div>
    `;
  }).join('');

  return `
    <div class="code-tracer" id="${tracerId}">
      <div class="tracer-header">
        <div class="tracer-title">
          <span>🔍</span> ${escHtml(trace.title || 'Step-by-Step Code Tracer')}
        </div>
        <div class="tracer-controls">
          <button type="button" class="tracer-btn" onclick="resetTrace('${tracerId}')">⏮ Reset</button>
          <button type="button" class="tracer-btn" id="${tracerId}-prev-btn" onclick="prevTrace('${tracerId}')" disabled>◀ Prev</button>
          <button type="button" class="tracer-btn" id="${tracerId}-next-btn" onclick="nextTrace('${tracerId}')">Next ▶</button>
          <button type="button" class="tracer-btn" id="${tracerId}-auto-btn" onclick="toggleAutoPlay('${tracerId}')">▶ Auto-play</button>
          <span class="text-muted" id="${tracerId}-counter" style="font-size:0.75rem;margin-left:0.3rem">Step 1 of ${trace.steps.length}</span>
        </div>
      </div>
      <div class="tracer-body">
        <div class="tracer-code-pane">
          ${codeLinesHtml}
        </div>
        <div class="tracer-vars-pane">
          <div style="font-weight:600;font-size:0.8rem;color:var(--text);display:flex;justify-content:space-between">
            <span>Execution State</span>
            <span class="text-muted" style="font-size:0.75rem">Variables in Scope</span>
          </div>
          <table class="tracer-vars-table">
            <thead>
              <tr><th>Variable</th><th>Value</th></tr>
            </thead>
            <tbody id="${tracerId}-vars-body"></tbody>
          </table>
          <div id="${tracerId}-stack-container" style="display:none">
            <div style="font-weight:600;font-size:0.75rem;color:var(--text-muted);margin-bottom:0.25rem;text-transform:uppercase">Call Stack</div>
            <div class="tracer-stack-box" id="${tracerId}-stack-body"></div>
          </div>
          <div class="tracer-note-box" id="${tracerId}-note-body"></div>
        </div>
      </div>
    </div>
  `;
}

function updateTracerUI(tracerId) {
  const state = tracerStates[tracerId];
  if (!state) return;
  const trace = state.data;
  const curIdx = state.currentStep;
  const step = trace.steps[curIdx];

  // Update line highlight
  document.querySelectorAll(`#${tracerId} .tracer-line`).forEach(el => el.classList.remove('active'));
  if (step && step.line) {
    const activeLine = document.getElementById(`${tracerId}-line-${step.line}`);
    if (activeLine) activeLine.classList.add('active');
  }

  // Update variables table
  const tbody = document.getElementById(`${tracerId}-vars-body`);
  if (tbody) {
    const vars = (step && step.vars) ? step.vars : {};
    const keys = Object.keys(vars);
    if (keys.length === 0) {
      tbody.innerHTML = '<tr><td colspan="2" class="text-muted" style="font-style:italic">No variables defined yet</td></tr>';
    } else {
      tbody.innerHTML = keys.map(k => {
        const val = typeof vars[k] === 'object' ? JSON.stringify(vars[k]) : String(vars[k]);
        return `<tr><td style="font-family:monospace;font-weight:600">${escHtml(k)}</td><td><span class="tracer-var-val">${escHtml(val)}</span></td></tr>`;
      }).join('');
    }
  }

  // Update call stack if present
  const stackBox = document.getElementById(`${tracerId}-stack-container`);
  const stackBody = document.getElementById(`${tracerId}-stack-body`);
  if (stackBox && stackBody) {
    if (step && step.stack && step.stack.length > 0) {
      stackBox.style.display = 'block';
      stackBody.innerHTML = step.stack.map((frame, i) =>
        `<div class="tracer-stack-frame">${i === step.stack.length - 1 ? '▶ ' : '  '}${escHtml(frame)}</div>`
      ).join('');
    } else {
      stackBox.style.display = 'none';
    }
  }

  // Update note
  const noteBody = document.getElementById(`${tracerId}-note-body`);
  if (noteBody) {
    noteBody.textContent = step ? step.note : '';
  }

  // Update buttons & counter
  const prevBtn = document.getElementById(`${tracerId}-prev-btn`);
  const nextBtn = document.getElementById(`${tracerId}-next-btn`);
  const counter = document.getElementById(`${tracerId}-counter`);

  if (prevBtn) prevBtn.disabled = curIdx === 0;
  if (nextBtn) nextBtn.disabled = curIdx === trace.steps.length - 1;
  if (counter) counter.textContent = `Step ${curIdx + 1} of ${trace.steps.length}`;
}

function nextTrace(tracerId) {
  const state = tracerStates[tracerId];
  if (!state) return;
  if (state.currentStep < state.data.steps.length - 1) {
    state.currentStep++;
    updateTracerUI(tracerId);
  } else {
    stopAutoPlay(tracerId);
  }
}

function prevTrace(tracerId) {
  const state = tracerStates[tracerId];
  if (!state) return;
  if (state.currentStep > 0) {
    state.currentStep--;
    updateTracerUI(tracerId);
  }
}

function resetTrace(tracerId) {
  const state = tracerStates[tracerId];
  if (!state) return;
  stopAutoPlay(tracerId);
  state.currentStep = 0;
  updateTracerUI(tracerId);
}

function toggleAutoPlay(tracerId) {
  const state = tracerStates[tracerId];
  if (!state) return;
  if (state.autoPlaying) {
    stopAutoPlay(tracerId);
  } else {
    startAutoPlay(tracerId);
  }
}

function startAutoPlay(tracerId) {
  const state = tracerStates[tracerId];
  if (!state) return;
  state.autoPlaying = true;
  const autoBtn = document.getElementById(`${tracerId}-auto-btn`);
  if (autoBtn) {
    autoBtn.textContent = '⏸ Pause';
    autoBtn.classList.add('active');
  }
  if (state.currentStep >= state.data.steps.length - 1) {
    state.currentStep = 0;
    updateTracerUI(tracerId);
  }
  state.timer = setInterval(() => {
    if (state.currentStep < state.data.steps.length - 1) {
      state.currentStep++;
      updateTracerUI(tracerId);
    } else {
      stopAutoPlay(tracerId);
    }
  }, 1400);
}

function stopAutoPlay(tracerId) {
  const state = tracerStates[tracerId];
  if (!state) return;
  state.autoPlaying = false;
  if (state.timer) {
    clearInterval(state.timer);
    state.timer = null;
  }
  const autoBtn = document.getElementById(`${tracerId}-auto-btn`);
  if (autoBtn) {
    autoBtn.textContent = '▶ Auto-play';
    autoBtn.classList.remove('active');
  }
}

