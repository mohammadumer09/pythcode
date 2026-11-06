/**
 * project.js — Interactive guided mini-project runner with CodeMirror,
 * interactive checklist, and client-side automated test validation.
 */

let projectData = null;
let editor = null;
let isRunning = false;

document.addEventListener('DOMContentLoaded', () => {
  initProject();
});

async function initProject() {
  try {
    const res = await fetch(`/api/projects/${PROJECT_ID}`);
    if (!res.ok) throw new Error('Project not found');
    projectData = await res.json();
    renderProject();
  } catch (err) {
    document.getElementById('projectLoading').innerHTML = `
      <p style="font-size:2rem">😕</p>
      <p class="text-muted mt-2">Could not load this mini-project.</p>
      <a href="/map" class="btn btn-secondary mt-3">← Back to Phase Map</a>
    `;
  }
}

function renderProject() {
  document.getElementById('projectLoading').style.display = 'none';
  document.getElementById('projectShell').style.display = 'block';

  document.getElementById('projectTitle').textContent = projectData.title;
  document.getElementById('projectOverview').textContent = projectData.overview;
  document.getElementById('projectMilestone').textContent = `Unlocked after Phase ${projectData.after_phase}`;
  document.getElementById('projectBadgeLabel').textContent = `${projectData.badge_icon} ${projectData.badge_name}`;

  // Concepts
  const conceptsList = document.getElementById('conceptsList');
  conceptsList.innerHTML = projectData.concepts.map(c =>
    `<span class="stat-chip" style="font-size:0.78rem;padding:0.2rem 0.5rem">${c}</span>`
  ).join('');

  // Steps
  const stepsList = document.getElementById('stepsList');
  stepsList.innerHTML = projectData.steps.map(s => `
    <div class="step-guide-card">
      <h4><span class="step-num-pill">${s.step}</span> ${s.title}</h4>
      <p class="text-muted" style="font-size:0.86rem;margin-left:2rem">${s.desc}</p>
    </div>
  `).join('');

  // Checklist
  renderChecklist();

  // Tests
  renderTestsList();

  // Initialize CodeMirror editor
  initEditor();

  // Entrance animation with anime.js
  if (typeof anime !== 'undefined' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    anime({
      targets: '#projectShell',
      opacity: [0, 1],
      translateY: [15, 0],
      duration: 450,
      easing: 'easeOutQuad'
    });
  }
}

function initEditor() {
  const ta = document.getElementById('codeEditor');
  const savedKey = `pythcode_project_${PROJECT_ID}_code`;
  const initial = localStorage.getItem(savedKey) || projectData.starter_code;

  editor = CodeMirror.fromTextArea(ta, {
    mode: 'python',
    lineNumbers: true,
    indentUnit: 4,
    tabSize: 4,
    indentWithTabs: false,
    autoCloseBrackets: true,
    theme: 'default',
    extraKeys: {
      'Tab': cm => cm.replaceSelection('    ', 'end'),
      'Ctrl-Enter': () => runUserCode(),
      'Cmd-Enter': () => runUserCode(),
    }
  });

  editor.setValue(initial);

  // Auto-save on change
  editor.on('change', () => {
    localStorage.setItem(savedKey, editor.getValue());
  });

  setTimeout(() => editor.refresh(), 100);
}

function renderChecklist() {
  const container = document.getElementById('checklistContainer');
  const savedChecks = JSON.parse(localStorage.getItem(`pythcode_project_${PROJECT_ID}_checks`) || '{}');

  container.innerHTML = projectData.checklist.map((item, idx) => {
    const isChecked = !!savedChecks[idx];
    return `
      <label class="checklist-item ${isChecked ? 'checked' : ''}" id="check-item-${idx}">
        <input type="checkbox" onchange="toggleChecklistItem(${idx}, this.checked)" ${isChecked ? 'checked' : ''} />
        <span>${item}</span>
      </label>
    `;
  }).join('');

  updateChecklistProgress();
}

function toggleChecklistItem(idx, isChecked) {
  const savedChecks = JSON.parse(localStorage.getItem(`pythcode_project_${PROJECT_ID}_checks`) || '{}');
  savedChecks[idx] = isChecked;
  localStorage.setItem(`pythcode_project_${PROJECT_ID}_checks`, JSON.stringify(savedChecks));

  const itemEl = document.getElementById(`check-item-${idx}`);
  if (itemEl) itemEl.classList.toggle('checked', isChecked);

  updateChecklistProgress();
}

function updateChecklistProgress() {
  const total = projectData.checklist.length;
  const savedChecks = JSON.parse(localStorage.getItem(`pythcode_project_${PROJECT_ID}_checks`) || '{}');
  const count = Object.values(savedChecks).filter(Boolean).length;
  document.getElementById('checklistProgress').textContent = `${count}/${total} checked`;
}

function renderTestsList(results = {}) {
  const list = document.getElementById('testResultsList');
  list.innerHTML = projectData.tests.map((t, idx) => {
    const res = results[idx];
    let pill = '<span class="test-status-pill pending">Pending</span>';
    let detail = '';

    if (res) {
      if (res.passed) {
        pill = '<span class="test-status-pill pass">✓ Passed</span>';
      } else {
        pill = '<span class="test-status-pill fail">✗ Failed</span>';
        detail = `<div style="color:var(--error);font-size:0.78rem;margin-top:0.25rem;font-family:monospace">${res.error || 'Assertion failed'}</div>`;
      }
    }

    return `
      <div style="background:var(--surface);padding:0.6rem 0.8rem;border-radius:8px;border:1px solid var(--border)">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-weight:500;color:var(--text)">${t.name}</span>
          ${pill}
        </div>
        ${detail}
      </div>
    `;
  }).join('');
}

function resetProjectCode() {
  if (confirm('Reset your code back to the starting template?')) {
    editor.setValue(projectData.starter_code);
    localStorage.removeItem(`pythcode_project_${PROJECT_ID}_code`);
    showToast('Code reset to starter template.', 'info');
  }
}

function clearOutput() {
  document.getElementById('consoleOutput').textContent = '';
}

async function runUserCode() {
  if (isRunning) return;
  const code = editor.getValue();
  const outEl = document.getElementById('consoleOutput');
  const btn = document.getElementById('runCodeBtn');

  isRunning = true;
  btn.disabled = true;
  outEl.textContent = 'Running...';

  try {
    const res = await CodeRunner.runCode(code);
    if (res.error) {
      outEl.textContent = res.error;
      outEl.style.color = 'var(--error)';
    } else {
      outEl.textContent = res.output || '(No output produced)';
      outEl.style.color = 'var(--text)';
    }
  } catch (err) {
    outEl.textContent = 'Error executing code: ' + err.message;
    outEl.style.color = 'var(--error)';
  } finally {
    isRunning = false;
    btn.disabled = false;
  }
}

async function runProjectTests() {
  if (isRunning) return;
  const userCode = editor.getValue();
  const runTestsBtn = document.getElementById('runTestsBtn');
  const summaryPill = document.getElementById('testSummaryPill');

  isRunning = true;
  runTestsBtn.disabled = true;
  runTestsBtn.textContent = 'Running Tests…';
  summaryPill.className = 'test-status-pill pending';
  summaryPill.textContent = 'Evaluating…';

  const results = {};
  let allPassed = true;

  for (let i = 0; i < projectData.tests.length; i++) {
    const test = projectData.tests[i];
    // Combine user code with test harness assertion
    const testHarness = `
${userCode}

# --- AUTOMATED TEST CASE: ${test.name} ---
${test.code}
`;
    try {
      const res = await CodeRunner.runCode(testHarness);
      if (res.error) {
        results[i] = { passed: false, error: res.error.trim().split('\n').pop() };
        allPassed = false;
      } else {
        results[i] = { passed: true };
      }
    } catch (e) {
      results[i] = { passed: false, error: e.message };
      allPassed = false;
    }
  }

  renderTestsList(results);

  if (allPassed) {
    summaryPill.className = 'test-status-pill pass';
    summaryPill.textContent = 'All Tests Passed! ✓';
    await onProjectComplete();
  } else {
    summaryPill.className = 'test-status-pill fail';
    summaryPill.textContent = 'Some Tests Failed';
    showToast('Check the test failures and revise your code.', 'error');
  }

  isRunning = false;
  runTestsBtn.disabled = false;
  runTestsBtn.textContent = '🚀 Run Tests →';
}

async function onProjectComplete() {
  try {
    const res = await fetch(`/api/projects/${PROJECT_ID}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: true })
    });
    const data = await res.json();

    // Save in localStorage for offline / guest mode
    const completedProjects = JSON.parse(localStorage.getItem('pythcode_completed_projects') || '[]');
    if (!completedProjects.includes(PROJECT_ID)) {
      completedProjects.push(PROJECT_ID);
      localStorage.setItem('pythcode_completed_projects', JSON.stringify(completedProjects));
    }

    // Show completion modal
    openCompletionModal(data);
  } catch (e) {
    // Guest fallback
    openCompletionModal({
      xp_earned: 100,
      badge_awarded: { label: projectData.badge_name, icon: projectData.badge_icon }
    });
  }
}

function openCompletionModal(data) {
  const modal = document.getElementById('completionModal');
  document.getElementById('modalBadgeIcon').textContent = projectData.badge_icon;
  document.getElementById('modalBadgeName').textContent = projectData.badge_name;
  modal.style.display = 'flex';

  if (typeof anime !== 'undefined' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    anime({
      targets: '.project-completion-card',
      scale: [0.8, 1],
      opacity: [0, 1],
      duration: 500,
      easing: 'easeOutBack'
    });
    anime({
      targets: '#modalBadgeIcon',
      scale: [0, 1.4, 1],
      rotate: [-15, 15, 0],
      duration: 800,
      easing: 'easeOutElastic(1, .6)'
    });
  }
}

function closeCompletionModal() {
  document.getElementById('completionModal').style.display = 'none';
}

