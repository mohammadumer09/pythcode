/**
 * guest.js — Guest mode: saves phase progress to localStorage.
 *
 * API surface (window.GuestMode):
 *   .isGuest()                   → true if guest, false if logged in
 *   .getProgress()               → { "1": {stars,score}, ... }
 *   .savePhaseResult(id, stars, score)
 *   .isUnlocked(phaseId)         → bool
 *   .phaseDone(phaseId)          → bool
 *   .getStars(phaseId)           → 0-3
 *   .mergeIntoApiPhases(phases)  → enrich API phase list with guest data
 */

(function () {
  const STORAGE_KEY = 'pc_guest_progress';
  const GUEST_KEY   = 'pc_guest';

  function isGuest() {
    return localStorage.getItem(GUEST_KEY) === '1' || Object.keys(getProgress()).length > 0;
  }

  function getProgress() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
      return {};
    }
  }

  function savePhaseResult(phaseId, stars, score) {
    localStorage.setItem(GUEST_KEY, '1');
    const prog = getProgress();
    const id   = String(phaseId);
    const prev = prog[id] || { stars: 0, score: 0 };
    prog[id] = {
      stars: Math.max(prev.stars, stars),
      score: Math.max(prev.score, score),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prog));
  }

  function isUnlocked(phaseId) {
    if (phaseId === 1) return true;
    const prog = getProgress();
    const prev = prog[String(phaseId - 1)];
    return prev && prev.stars > 0;
  }

  function phaseDone(phaseId) {
    const prog = getProgress();
    const p    = prog[String(phaseId)];
    return p && p.stars > 0;
  }

  function getStars(phaseId) {
    const prog = getProgress();
    const p    = prog[String(phaseId)];
    return p ? p.stars : 0;
  }

  /**
   * Merge guest progress into the phases array returned by /api/phases.
   * This lets the Phase Map show correct states for guests.
   */
  function mergeIntoApiPhases(phases) {
    if (!isGuest()) return phases;
    const prog = getProgress();
    return phases.map(p => {
      const gdata = prog[String(p.id)];
      if (gdata && gdata.stars > 0) {
        return { ...p, state: 'done', stars: gdata.stars };
      }
      // Re-evaluate lock state based on guest progress
      if (p.id === 1) return { ...p, state: p.state === 'done' ? 'done' : 'unlocked' };
      const prevDone = prog[String(p.id - 1)] && prog[String(p.id - 1)].stars > 0;
      if (prevDone && p.state === 'locked') return { ...p, state: 'unlocked' };
      return p;
    });
  }

  window.GuestMode = { isGuest, getProgress, savePhaseResult, isUnlocked, phaseDone, getStars, mergeIntoApiPhases };
})();

