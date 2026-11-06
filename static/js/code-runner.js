/**
 * code-runner.js — Public API for running Python code.
 *
 * Strategy:
 *   1. Try Pyodide in a Web Worker (runs in browser, no server needed).
 *   2. If Pyodide hasn't loaded within PYODIDE_TIMEOUT_MS, fall back to
 *      POST /api/run (server subprocess).
 *   3. If both fail, show a friendly error.
 *
 * Usage:
 *   const result = await CodeRunner.run(code, stdinText);
 *   // result: { stdout, stderr, error, engine: "pyodide"|"server" }
 *
 *   CodeRunner.onStatusChange = (status) => { ... }
 *   // status: "loading" | "pyodide" | "server" | "error"
 */

const CodeRunner = (() => {
  const PYODIDE_TIMEOUT_MS  = 10_000;   // switch to server if Pyodide hasn't loaded
  const CODE_TIMEOUT_MS     = 5_000;    // kill worker after 5 s (infinite loop guard)
  const WORKER_SRC          = "/static/js/pyodide-worker.js";

  let _worker       = null;
  let _workerReady  = false;    // has the first reply come back?
  let _pyodideFailed = false;   // did Pyodide fail to load?
  let _useServer    = false;    // forced fallback flag
  let _pendingCalls = new Map(); // id → { resolve, reject, timer }
  let _callId       = 0;
  let _loadTimer    = null;

  /** Callback — override to show status badges in the UI. */
  let onStatusChange = () => {};

  function _spawnWorker() {
    if (_worker) return;
    try {
      _worker = new Worker(WORKER_SRC);
      _worker.onmessage = ({ data }) => {
        const { id, stdout, stderr, error } = data;

        // First reply ever — Pyodide loaded OK
        if (!_workerReady) {
          _workerReady = true;
          clearTimeout(_loadTimer);
          onStatusChange("pyodide");
        }

        const call = _pendingCalls.get(id);
        if (!call) return;
        clearTimeout(call.timer);
        _pendingCalls.delete(id);
        call.resolve({ stdout, stderr, error, engine: "pyodide" });
      };

      _worker.onerror = (e) => {
        console.warn("[CodeRunner] Worker error:", e.message);
        _markPyodideFailed();
      };

      // If Pyodide hasn't responded to the first run within timeout, switch to server
      _loadTimer = setTimeout(() => {
        if (!_workerReady) _markPyodideFailed();
      }, PYODIDE_TIMEOUT_MS);

    } catch (e) {
      console.warn("[CodeRunner] Could not create worker:", e);
      _markPyodideFailed();
    }
  }

  function _markPyodideFailed() {
    _pyodideFailed = true;
    _useServer     = true;
    onStatusChange("server");

    // Reject all pending Pyodide calls so they can retry via server
    for (const [id, call] of _pendingCalls) {
      clearTimeout(call.timer);
      _pendingCalls.delete(id);
      call.reject(new Error("Pyodide unavailable — using server"));
    }

    if (_worker) { _worker.terminate(); _worker = null; }
  }

  async function _runViaPyodide(code) {
    if (!_worker) _spawnWorker();

    return new Promise((resolve, reject) => {
      const id = ++_callId;

      const timer = setTimeout(() => {
        // Worker timed out — kill it, spawn fresh for next run
        _pendingCalls.delete(id);
        if (_worker) { _worker.terminate(); _worker = null; _workerReady = false; }
        resolve({
          stdout: "",
          stderr: "",
          error:  "Your code took too long (5-second limit). Check for infinite loops.",
          engine: "pyodide",
        });
      }, CODE_TIMEOUT_MS);

      _pendingCalls.set(id, { resolve, reject, timer });
      _worker.postMessage({ id, code });
    });
  }

  async function _runViaServer(code, stdin = "") {
    const res = await fetch("/api/run", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ code, stdin }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { stdout: "", stderr: "", error: err.error || "Server error.", engine: "server" };
    }
    const data = await res.json();
    return { ...data, engine: "server" };
  }

  async function run(code, stdin = "") {
    if (!code.trim()) return { stdout: "", stderr: "", error: null, engine: "none" };

    if (!_useServer) {
      try {
        return await _runViaPyodide(code);
      } catch {
        // Pyodide gave up — try server
        _useServer = true;
        onStatusChange("server");
      }
    }

    try {
      return await _runViaServer(code, stdin);
    } catch (e) {
      onStatusChange("error");
      return { stdout: "", stderr: "", error: "Could not run code: " + e.message, engine: "error" };
    }
  }

  // Start loading Pyodide immediately in background
  function preload() {
    if (!_useServer && !_worker) _spawnWorker();
  }

  return { run, preload, get onStatusChange() { return onStatusChange; }, set onStatusChange(fn) { onStatusChange = fn; } };
})();

