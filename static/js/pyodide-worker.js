/**
 * pyodide-worker.js — Runs Python code inside a Web Worker.
 *
 * The main thread sends: { id, code }
 * This worker replies:   { id, stdout, stderr, error }
 *
 * Pyodide is loaded once and reused across calls.
 * The worker is terminated from the main thread after 5 seconds
 * if it has not replied, so infinite loops cannot hang the page.
 */

/* global loadPyodide */
importScripts(
  "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js"
);

const PYODIDE_INDEX = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/";

let _pyodide = null;

async function getPyodide() {
  if (_pyodide) return _pyodide;
  _pyodide = await loadPyodide({ indexURL: PYODIDE_INDEX });
  // Block dangerous modules
  _pyodide.runPython(`
import sys as _sys
_BLOCKED = {"os", "subprocess", "socket", "shutil", "importlib",
            "ctypes", "multiprocessing", "threading", "signal"}
_orig_import = __builtins__.__import__ if hasattr(__builtins__, "__import__") else __import__
def _safe_import(name, *a, **kw):
    root = name.split(".")[0]
    if root in _BLOCKED:
        raise ImportError(f"Module '{name}' is not allowed.")
    return _orig_import(name, *a, **kw)
__builtins__.__import__ = _safe_import
`);
  return _pyodide;
}

self.onmessage = async ({ data: { id, code } }) => {
  try {
    const py = await getPyodide();

    // Redirect stdout / stderr every run
    py.runPython(`
import sys, io
sys.stdout = io.StringIO()
sys.stderr = io.StringIO()
`);

    let error = null;
    try {
      await py.runPythonAsync(code);
    } catch (err) {
      error = err.message || String(err);
    }

    const stdout = py.runPython("sys.stdout.getvalue()");
    const stderr = py.runPython("sys.stderr.getvalue()");

    self.postMessage({ id, stdout, stderr, error });
  } catch (err) {
    self.postMessage({
      id,
      stdout: "",
      stderr: "",
      error: "Failed to load Pyodide: " + (err.message || String(err)),
    });
  }
};

