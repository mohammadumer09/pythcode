"""
Content API — load phase JSON, serve lessons, grade submissions.

Routes:
  GET  /api/phases              → list all phases with lock/star status
  GET  /api/phases/<id>         → single phase (lesson + challenges, no code-test answers)
  POST /api/phases/<id>/submit  → grade answers, save progress, award XP
"""

import json
import os
import subprocess
import sys
import tempfile
import textwrap
import threading
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request

from models import db, Progress, Attempt, User, Badge
from api.supabase_auth import current_user_id

content_bp = Blueprint("content", __name__)

# ── Helpers ────────────────────────────────────────────────────────────────

CONTENT_DIR = os.path.join(os.path.dirname(__file__), "..", "content")
TOTAL_PHASES = 30


def _load_phase(phase_id: int) -> dict | None:
    """Load a phase JSON file. Returns None if not found."""
    path = os.path.join(CONTENT_DIR, f"phase_{phase_id:02d}.json")
    if not os.path.exists(path):
        return None
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _get_user_progress(user_id: int) -> dict[int, Progress]:
    """Return a dict mapping phase_id → Progress row for this user."""
    rows = Progress.query.filter_by(user_id=user_id).all()
    return {r.phase_id: r for r in rows}


def _phase_is_unlocked(phase_id: int, progress_map: dict) -> bool:
    """Phase 1 is always unlocked. Others unlock when the previous is completed."""
    if phase_id == 1:
        return True
    prev = progress_map.get(phase_id - 1)
    return prev is not None and prev.stars > 0


def _stars_for_score(score: float) -> int:
    if score >= 90:
        return 3
    if score >= 70:
        return 2
    if score >= 50:
        return 1
    return 0


# ── List phases ─────────────────────────────────────────────────────────────

@content_bp.route("/phases", methods=["GET"])
def list_phases():
    user_id = current_user_id()
    progress_map = _get_user_progress(user_id) if user_id else {}

    TITLES = [
        "What is Python?", "Print, Comments & Basic Syntax", "Variables",
        "Data Types", "Type Conversion & Input", "Numbers & Operators",
        "Strings", "String Methods & f-strings", "Booleans & Comparisons",
        "If, elif, else", "For Loops & range()", "While Loops", "Lists",
        "Tuples & Sets", "Dictionaries", "Functions",
        "Functions in Depth", "Nested Data & Loops", "Comprehensions",
        "Error Handling", "Files", "Modules", "Classes & Objects",
        "Inheritance & OOP", "Useful Built-ins",
        "Debugging Like a Pro", "Recursion & Algorithms",
        "Decorators & Generators", "Writing Clean Python",
        "Final Projects",
    ]
    LEVELS = ["beginner"] * 10 + ["core"] * 8 + ["intermediate"] * 12

    phases = []
    for i in range(1, TOTAL_PHASES + 1):
        prog = progress_map.get(i)
        unlocked = _phase_is_unlocked(i, progress_map)
        completed = prog is not None and prog.stars > 0

        if completed:
            state = "done"
        elif unlocked:
            state = "unlocked"
        else:
            state = "locked"

        phases.append({
            "id": i,
            "title": TITLES[i - 1],
            "level": LEVELS[i - 1],
            "state": state,
            "stars": prog.stars if prog else 0,
            "best_score": prog.best_score if prog else 0,
            "has_content": os.path.exists(
                os.path.join(CONTENT_DIR, f"phase_{i:02d}.json")
            ),
        })

    return jsonify(phases)


# ── Helpers ──────────────────────────────────────────────────────────────────

def _normalise_lessons(data: dict) -> list:
    """
    Return lesson steps in the canonical {heading, text} format
    that lesson.js expects, regardless of which format the JSON uses.

    Old phases (1-10): data["lesson"] = [{heading, text, ...}, ...]
    New phases (11-26): data["lessons"] = [{title, body}, ...]
    """
    if "lesson" in data:
        # Already in old format — pass through as-is
        return data["lesson"]
    if "lessons" in data:
        # Map new {title, body} format to {heading, text}
        return [
            {"heading": step.get("title", ""), "text": step.get("body", "")}
            for step in data["lessons"]
        ]
    return []


# ── Single phase ─────────────────────────────────────────────────────────────

@content_bp.route("/phases/<int:phase_id>", methods=["GET"])
def get_phase(phase_id):
    data = _load_phase(phase_id)
    if data is None:
        return jsonify({"error": "Phase not found or content not ready yet."}), 404

    # Strip answers from code challenges before sending to client
    safe_challenges = []
    for ch in data.get("challenges", []):
        c = dict(ch)
        if c["type"] == "code":
            c.pop("tests", None)    # never send expected test output to client
            c.pop("answer", None)   # never send expected answer to client
        safe_challenges.append(c)

    return jsonify({
        "id": data["id"],
        "title": data["title"],
        "level": data.get("level", "beginner"),
        "estimated_minutes": data.get("estimated_minutes", 10),
        # Normalise lesson steps: support both old {heading,text} and new {title,body} formats
        "lesson": _normalise_lessons(data),
        "challenges": safe_challenges,
        "pass_score": data.get("pass_score", 70),
        "total_challenges": len(safe_challenges),
    })


# ── Submit & grade ─────────────────────────────────────────────────────────

@content_bp.route("/phases/<int:phase_id>/submit", methods=["POST"])
def submit_phase(phase_id):
    data = _load_phase(phase_id)
    if data is None:
        return jsonify({"error": "Phase not found."}), 404

    body = request.get_json(silent=True) or {}
    answers = body.get("answers", {})   # {challenge_id_str: user_answer}

    challenges = data["challenges"]
    results = []
    correct = 0

    for ch in challenges:
        cid = str(ch["id"])
        user_ans = answers.get(cid, "")
        ok, feedback = _grade(ch, user_ans)
        if ok:
            correct += 1
        results.append({
            "id": ch["id"],
            "type": ch["type"],
            "correct": ok,
            "feedback": feedback,
            "explain": ch.get("explanation", ch.get("explain", "")),
        })

    score = round((correct / len(challenges)) * 100, 1) if challenges else 0
    passed = score >= data.get("pass_score", 70)
    stars = _stars_for_score(score) if passed else 0

    # Persist if logged in
    xp_earned = 0
    badge_earned = None
    user_id = current_user_id()

    if user_id:
        # Save attempt
        attempt = Attempt(user_id=user_id, phase_id=phase_id, score=score)
        db.session.add(attempt)

        # Update progress
        prog = Progress.query.filter_by(user_id=user_id, phase_id=phase_id).first()
        if prog is None:
            prog = Progress(user_id=user_id, phase_id=phase_id)
            db.session.add(prog)

        if score > (prog.best_score or 0.0):
            prog.best_score = score
        if stars > prog.stars:
            prog.stars = stars
        if passed and prog.completed_at is None:
            prog.completed_at = datetime.now(timezone.utc)

        # XP (only award on improvement to avoid grinding)
        old_score = prog.best_score - int(score) if prog.best_score > int(score) else 0
        xp_earned = max(0, int(score) - int(prog.best_score - int(score))) if True else int(score)
        xp_earned = int(score)   # 1 XP per percentage point on each attempt
        user = db.session.get(User, user_id)
        if user:
            user.xp += xp_earned

        # Phase badges
        from api.badges import PHASE_BADGES, award_badge as _award_b
        badges_list = []
        if passed:
            bkey = PHASE_BADGES.get(phase_id)
            if bkey:
                b = _award_b(user_id, bkey)
                if b:
                    badges_list.append(b)
            # Beginner complete badge (all 10 beginner phases done)
            if phase_id == 10:
                b = _award_b(user_id, "beginner_complete")
                if b:
                    badges_list.append(b)
            # Perfect score badge
            if score >= 100:
                b = _award_b(user_id, "perfect_score")
                if b:
                    badges_list.append(b)
        # Streak badges
        if user:
            if user.streak >= 7:
                b = _award_b(user_id, "streak_7")
                if b:
                    badges_list.append(b)
            elif user.streak >= 3:
                b = _award_b(user_id, "streak_3")
                if b:
                    badges_list.append(b)
            if user.xp >= 100:
                b = _award_b(user_id, "century")
                if b:
                    badges_list.append(b)

        badge_earned = badges_list[0] if badges_list else None
        db.session.commit()

    return jsonify({
        "score": score,
        "passed": passed,
        "stars": stars,
        "correct": correct,
        "total": len(challenges),
        "xp_earned": xp_earned,
        "badge_earned": badge_earned,
        "results": results,
    })


# ── Grading logic ──────────────────────────────────────────────────────────

def _grade(challenge: dict, user_answer: str) -> tuple[bool, str]:
    """Return (is_correct, feedback_message)."""
    ctype = challenge["type"]

    if ctype == "mcq":
        return _grade_mcq(challenge, user_answer)
    if ctype == "predict":
        return _grade_predict(challenge, user_answer)
    if ctype == "fill":
        return _grade_fill(challenge, user_answer)
    if ctype == "code":
        return _grade_code(challenge, user_answer)

    return False, "Unknown challenge type."


def _grade_mcq(ch: dict, user_answer: str) -> tuple[bool, str]:
    if user_answer is None or str(user_answer).strip() == "":
        return False, "No option selected."

    correct_ans = ch["answer"]
    options = ch.get("options", [])

    try:
        idx = int(user_answer)
    except (ValueError, TypeError):
        idx = None

    if isinstance(correct_ans, int):
        if idx is not None and idx == correct_ans:
            return True, "Correct!"
        correct_text = options[correct_ans] if 0 <= correct_ans < len(options) else str(correct_ans)
        return False, f"Not quite. The correct answer is: {correct_text}"
    else:
        # String answer
        if idx is not None and 0 <= idx < len(options) and str(options[idx]).strip() == str(correct_ans).strip():
            return True, "Correct!"
        if str(user_answer).strip() == str(correct_ans).strip():
            return True, "Correct!"
        return False, f"Not quite. The correct answer is: {correct_ans}"


def _clean_quotes(s: str) -> str:
    s = s.strip()
    for q in ('"', "'"):
        if s.startswith(q) and s.endswith(q) and len(s) >= 2:
            return s[1:-1].strip()
    return s


def _grade_predict(ch: dict, user_answer: str) -> tuple[bool, str]:
    if user_answer is None:
        return False, "No answer provided."

    # Normalise: strip trailing spaces on each line
    expected_raw = str(ch.get("answer", "")).strip()
    given_raw    = str(user_answer).strip()

    expected_lines = [line.rstrip() for line in expected_raw.splitlines()]
    given_lines    = [line.rstrip() for line in given_raw.splitlines()]
    expected = "\n".join(expected_lines)
    given    = "\n".join(given_lines)

    # 1. Direct match
    if given == expected:
        return True, "Correct!"

    # 2. Ignore surrounding quotes on single or full string: 'Hello' vs "Hello" vs Hello
    if _clean_quotes(given) == _clean_quotes(expected):
        return True, "Correct!"

    # 3. Path separators: notes\\todo.txt vs notes\todo.txt vs notes/todo.txt
    if given.replace("\\\\", "\\").replace("/", "\\") == expected.replace("\\\\", "\\").replace("/", "\\"):
        return True, "Correct!"

    # 4. AST literal evaluation for data structures (e.g. [{"name": "Alice"}] == [{'name': 'Alice'}])
    try:
        import ast
        if ast.literal_eval(given) == ast.literal_eval(expected):
            return True, "Correct!"
    except Exception:
        pass

    return False, f"Not quite. Expected output:\n{expected}"


def _grade_fill(ch: dict, user_answer: str) -> tuple[bool, str]:
    if user_answer is None:
        return False, "No answer provided."

    # Normalise both sides: strip whitespace, strip matching outer quotes
    def normalise(s: str) -> str:
        s = s.strip()
        for q in ('"', "'"):
            if s.startswith(q) and s.endswith(q) and len(s) >= 2:
                s = s[1:-1]
                break
        return s.strip().lower()

    u = str(user_answer).strip()
    a = str(ch.get("answer", "")).strip()

    # 1. Normalised string match
    if normalise(u) == normalise(a):
        return True, "Correct!"

    # 2. Slicing equality: :3 is identical to 0:3
    norm_u = u.replace(" ", "")
    norm_a = a.replace(" ", "")
    if norm_u == norm_a:
        return True, "Correct!"
    if norm_a == ":3" and norm_u in (":3", "0:3"):
        return True, "Correct!"
    if norm_a == "0:3" and norm_u in (":3", "0:3"):
        return True, "Correct!"

    # 3. Comma-separated arguments: e.g. "3, 7" vs "3,7" or "(3, 7)"
    if norm_u.strip("()") == norm_a.strip("()"):
        return True, "Correct!"

    # 4. Floating point literal check (e.g. Phase 4 ch 7: 3.14, 1.0, 2.5)
    if norm_a == "3.14":
        try:
            float(u)
            if "." in u:
                return True, "Correct!"
        except ValueError:
            pass

    # 5. AST literal equality
    try:
        import ast
        if ast.literal_eval(u) == ast.literal_eval(a):
            return True, "Correct!"
    except Exception:
        pass

    return False, f"Not quite. The answer is: {ch['answer']}"


def _grade_code(ch: dict, user_answer: str) -> tuple[bool, str]:
    """
    Run user code in a subprocess with a 5-second timeout.
    Supports two grading modes:
      - 'tests' list: compare stdout exactly to expected
      - 'check: output_contains' + 'answer': check that answer substring appears in stdout
    """
    code = user_answer.strip()
    if not code:
        return False, "No code submitted."

    check_mode = ch.get("check", "exact")
    tests = ch.get("tests", [])

    # New format: output_contains — run once and check substring
    if check_mode == "output_contains" or (not tests and "answer" in ch):
        expected_fragment = ch.get("answer", "").strip()
        ok, actual, err = _run_code(code, "")
        if not ok:
            return False, f"Runtime error:\n{err}"
        actual_stripped = actual.strip()
        norm_expected = "\n".join(l.rstrip() for l in expected_fragment.splitlines())
        norm_actual = "\n".join(l.rstrip() for l in actual_stripped.splitlines())
        if norm_expected in norm_actual or expected_fragment in actual_stripped:
            return True, "Output looks correct!"
        return False, f"Expected output to contain:\n{expected_fragment}\n\nGot:\n{actual_stripped}"

    # Legacy format: tests list with exact match
    if not tests:
        return True, "No tests defined — marked correct."

    all_pass = True
    messages = []

    for test in tests:
        expected = test.get("expected", "").strip()
        stdin_data = test.get("input", "")
        ok, actual, err = _run_code(code, stdin_data)
        if not ok:
            return False, f"Runtime error:\n{err}"
        actual = actual.strip()
        if actual == expected:
            messages.append("✓ Test passed")
        else:
            all_pass = False
            messages.append(
                f"✗ Expected:\n{expected}\n\nGot:\n{actual}"
            )

    if all_pass:
        return True, "All tests passed!"
    return False, "\n\n".join(messages)


def _run_code(code: str, stdin_data: str = "") -> tuple[bool, str, str]:
    """
    Execute Python code in a subprocess.
    Returns (success, stdout, stderr).
    Hard limits: 5-second timeout, 50 KB output.
    """
    # Wrap in a safety preamble that blocks dangerous modules
    preamble = textwrap.dedent("""\
        import sys as _sys
        _BLOCKED = {"os", "subprocess", "socket", "shutil", "importlib",
                    "ctypes", "multiprocessing", "threading", "signal"}
        _real_import = __builtins__.__import__ if hasattr(__builtins__, '__import__') else __import__
        def _safe_import(name, *args, **kwargs):
            if name in _BLOCKED or name.startswith("os."):
                raise ImportError(f"Module '{name}' is not allowed in challenges.")
            return _real_import(name, *args, **kwargs)
        __builtins__.__import__ = _safe_import
    """)

    full_code = preamble + "\n" + code

    try:
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".py", delete=False, encoding="utf-8"
        ) as f:
            f.write(full_code)
            tmp_path = f.name

        result = subprocess.run(
            [sys.executable, tmp_path],
            input=stdin_data,
            capture_output=True,
            text=True,
            timeout=5,
        )
        stdout = result.stdout[:51200]  # 50 KB cap
        stderr = result.stderr[:2048]

        if result.returncode != 0:
            # Clean up the preamble line numbers from tracebacks
            clean_err = _clean_traceback(stderr, tmp_path)
            return False, stdout, clean_err
        return True, stdout, ""

    except subprocess.TimeoutExpired:
        return False, "", "Your code took too long (5-second limit). Check for infinite loops."
    except Exception as exc:
        return False, "", str(exc)
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass


def _clean_traceback(tb: str, tmp_path: str = "") -> str:
    """Remove the preamble lines and temp-file paths from tracebacks shown to the learner."""
    lines = tb.splitlines()
    cleaned = []
    # Normalise tmp_path so we can substring-match regardless of slash direction
    norm_tmp = tmp_path.replace("\\", "/").lower() if tmp_path else ""
    skip_next = False
    for line in lines:
        norm_line = line.replace("\\", "/").lower()
        # Filter lines that reference our temp file or preamble helpers
        if (norm_tmp and norm_tmp in norm_line) or "_safe_import" in line or "_real_import" in line:
            skip_next = True
            continue
        if skip_next and line.startswith("    "):
            skip_next = False
            continue
        skip_next = False
        cleaned.append(line)
    return "\n".join(cleaned)



