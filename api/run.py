"""
POST /api/run — Server-side Python code runner (fallback for Pyodide).

Security:
  - Subprocess with 5-second timeout
  - 50 KB output cap
  - Blocked dangerous imports (os, subprocess, socket, …)
  - Simple in-memory rate limit: 20 runs per minute per IP
"""

import time
from collections import defaultdict
from flask import Blueprint, jsonify, request

from api.content import _run_code

run_bp = Blueprint("run", __name__)

# ── Rate limiter (in-memory, per IP) ─────────────────────────
_rate_store: dict[str, list[float]] = defaultdict(list)
RATE_LIMIT   = 20     # max requests
RATE_WINDOW  = 60.0   # seconds


def _check_rate(ip: str) -> bool:
    """Return True if request is allowed, False if rate-limited."""
    now = time.monotonic()
    hits = _rate_store[ip]
    # Remove hits older than the window
    _rate_store[ip] = [t for t in hits if now - t < RATE_WINDOW]
    if len(_rate_store[ip]) >= RATE_LIMIT:
        return False
    _rate_store[ip].append(now)
    return True


# ── Endpoint ─────────────────────────────────────────────────

@run_bp.route("/run", methods=["POST"])
def run_code():
    ip = request.remote_addr or "unknown"
    if not _check_rate(ip):
        return jsonify({"error": "Too many requests. Wait a minute and try again."}), 429

    body  = request.get_json(silent=True) or {}
    code  = body.get("code", "").strip()
    stdin = body.get("stdin", "")

    if not code:
        return jsonify({"stdout": "", "stderr": "", "error": None})

    # 50 KB hard cap on input code
    if len(code) > 51_200:
        return jsonify({"error": "Code is too long (max 50 KB)."}), 400

    ok, stdout, stderr = _run_code(code, stdin)

    return jsonify({
        "stdout": stdout,
        "stderr": stderr,
        "error":  None if ok else (stderr or "Runtime error"),
    })

