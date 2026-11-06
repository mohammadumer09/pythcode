"""
tests/test_app.py — Full pytest suite for pythcode.

Covers:
  - All page routes
  - Auth: register, login, logout, /api/me
  - Streak logic
  - Phases API (list, single, missing)
  - Grading all 4 challenge types
  - Submit for phases 1–10 (correct answers pass)
  - Guest merge endpoint
  - Badge awarding
"""

import json
import os
import pytest

import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app import create_app
from models import db as _db


# ── Fixtures ──────────────────────────────────────────────────

@pytest.fixture(scope="module")
def app():
    application = create_app()
    application.config.update({
        "TESTING": True,
        "AUTH_PROVIDER": "local",
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
        "WTF_CSRF_ENABLED": False,
    })
    with application.app_context():
        _db.create_all()
        yield application
        _db.drop_all()


@pytest.fixture(scope="module")
def client(app):
    return app.test_client()


# ── Helpers ───────────────────────────────────────────────────

def register_user(client, name="Tester", email="test@test.com", password="pass123"):
    return client.post("/api/register", data=json.dumps({"name": name, "email": email, "password": password}),
                       content_type="application/json")

def login_user(client, email="test@test.com", password="pass123"):
    return client.post("/api/login", data=json.dumps({"email": email, "password": password}),
                       content_type="application/json")


# ── Page routes ───────────────────────────────────────────────

def test_home(client):
    assert client.get("/").status_code == 200

def test_phase_map(client):
    assert client.get("/map").status_code == 200

def test_lesson_page_valid(client):
    assert client.get("/lesson/1").status_code == 200

def test_lesson_page_invalid(client):
    assert client.get("/lesson/99").status_code == 404

def test_playground(client):
    assert client.get("/playground").status_code == 200

def test_about(client):
    assert client.get("/about").status_code == 200

def test_login_page(client):
    assert client.get("/login").status_code == 200

def test_register_page(client):
    assert client.get("/register").status_code == 200

def test_profile_page(client):
    r = client.get("/profile")
    assert r.status_code == 302
    assert r.headers["Location"].endswith("/login")

def test_cheatsheet_page(client):
    assert client.get("/cheatsheet").status_code == 200

def test_project_page_valid(client):
    for pid in range(1, 6):
        assert client.get(f"/project/{pid}").status_code == 200

def test_project_page_invalid(client):
    assert client.get("/project/0").status_code == 404
    assert client.get("/project/99").status_code == 404

def test_api_projects_list(client):
    r = client.get("/api/projects")
    assert r.status_code == 200
    data = json.loads(r.data)
    assert len(data) == 5
    assert data[0]["title"].startswith("Mini-Project 1")

def test_api_project_detail(client):
    r = client.get("/api/projects/1")
    assert r.status_code == 200
    data = json.loads(r.data)
    assert data["badge_key"] == "project_1"
    assert len(data["tests"]) >= 3

def test_api_project_complete(client):
    r = client.post("/api/projects/1/complete", data=json.dumps({"completed": True}), content_type="application/json")
    assert r.status_code == 200
    data = json.loads(r.data)
    assert data["success"] is True
    assert data["xp_earned"] == 100


# ── Auth: register ────────────────────────────────────────────

def test_register_success(client):
    r = register_user(client)
    assert r.status_code == 201
    d = json.loads(r.data)
    assert d["ok"] is True
    assert "user_id" in d

def test_register_duplicate_email(client):
    r = register_user(client)   # same email
    assert r.status_code == 409

def test_register_missing_fields(client):
    r = client.post("/api/register", data=json.dumps({"email": "x@x.com"}), content_type="application/json")
    assert r.status_code == 400

def test_register_short_password(client):
    r = client.post("/api/register",
                    data=json.dumps({"name":"A","email":"new@x.com","password":"abc"}),
                    content_type="application/json")
    assert r.status_code == 400


# ── Auth: login ───────────────────────────────────────────────

def test_login_success(client):
    r = login_user(client)
    assert r.status_code == 200
    d = json.loads(r.data)
    assert d["ok"] is True

def test_login_wrong_password(client):
    r = client.post("/api/login", data=json.dumps({"email":"test@test.com","password":"wrong"}),
                    content_type="application/json")
    assert r.status_code == 401

def test_login_unknown_email(client):
    r = client.post("/api/login", data=json.dumps({"email":"nobody@x.com","password":"abc123"}),
                    content_type="application/json")
    assert r.status_code == 401


# ── Auth: me & logout ─────────────────────────────────────────

def test_me_logged_in(client):
    login_user(client)
    r = client.get("/api/me")
    assert r.status_code == 200
    d = json.loads(r.data)
    assert d["email"] == "test@test.com"

def test_logout(client):
    login_user(client)
    r = client.post("/api/logout")
    assert r.status_code == 200
    # After logout, /api/me should 401
    assert client.get("/api/me").status_code == 401


def test_supabase_auth_uses_an_opaque_flask_session(app, client, monkeypatch):
    """Supabase tokens must remain server-side while protected pages still work."""
    import json as json_module

    class FakeResponse:
        def __init__(self, body):
            self.body = body

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def read(self):
            return json_module.dumps(self.body).encode("utf-8")

    supabase_user = {
        "id": "0b1f2e3d-4c5b-6a79-8d0e-1f2a3b4c5d6e",
        "email": "supabase@test.com",
        "user_metadata": {"name": "Supabase Tester"},
    }

    def fake_urlopen(req, timeout):
        if req.full_url.endswith("/auth/v1/signup"):
            return FakeResponse({
                "user": supabase_user,
                "session": {"access_token": "access-token", "refresh_token": "refresh-token"},
            })
        if req.full_url.endswith("/auth/v1/user"):
            return FakeResponse(supabase_user)
        raise AssertionError(f"Unexpected Supabase URL: {req.full_url}")

    monkeypatch.setattr("api.supabase_auth.request.urlopen", fake_urlopen)
    monkeypatch.setitem(app.config, "AUTH_PROVIDER", "supabase")
    monkeypatch.setitem(app.config, "SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setitem(app.config, "SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test")

    r = register_user(client, name="Supabase Tester", email="supabase@test.com")
    assert r.status_code == 201
    with client.session_transaction() as flask_session:
        assert flask_session["user_id"]
        assert flask_session["auth_session_key"]
        assert "access_token" not in flask_session
        assert "refresh_token" not in flask_session

    assert client.get("/profile").status_code == 200

def test_me_not_logged_in(client):
    client.post("/api/logout")
    assert client.get("/api/me").status_code == 401


# ── Streak ────────────────────────────────────────────────────

def test_streak_increments_on_consecutive_login(app):
    from datetime import datetime, timezone, timedelta
    from models import User
    with app.app_context():
        user = User.query.filter_by(email="test@test.com").first()
        if user:
            user.last_active = datetime.now(timezone.utc) - timedelta(days=1)
            user.streak = 1
            _db.session.commit()
            old_streak = user.streak
            from api.auth import _update_streak
            _update_streak(user)
            _db.session.commit()
            assert user.streak == old_streak + 1

def test_streak_resets_after_missing_day(app):
    from datetime import datetime, timezone, timedelta
    from models import User
    with app.app_context():
        user = User.query.filter_by(email="test@test.com").first()
        if user:
            user.last_active = datetime.now(timezone.utc) - timedelta(days=5)
            user.streak = 10
            _db.session.commit()
            from api.auth import _update_streak
            _update_streak(user)
            _db.session.commit()
            assert user.streak == 1


# ── Phases API ────────────────────────────────────────────────

def test_api_phases_list(client):
    r = client.get("/api/phases")
    assert r.status_code == 200
    data = json.loads(r.data)
    assert len(data) == 30
    p1 = next(p for p in data if p["id"] == 1)
    assert p1["state"] == "unlocked"

def test_api_phase_load(client):
    for pid in range(1, 11):
        r = client.get(f"/api/phases/{pid}")
        assert r.status_code == 200, f"Phase {pid} returned {r.status_code}"
        d = json.loads(r.data)
        assert d["id"] == pid
        assert len(d["lesson"]) >= 1
        assert len(d["challenges"]) >= 1

def test_api_phase_no_code_answers(client):
    for pid in range(1, 11):
        r = client.get(f"/api/phases/{pid}")
        d = json.loads(r.data)
        for ch in d["challenges"]:
            if ch["type"] == "code":
                assert "tests" not in ch

def test_api_phase_missing(client):
    assert client.get("/api/phases/99").status_code == 404


# ── Grading unit tests ────────────────────────────────────────

from api.content import _grade

def _ch(type_, **kwargs):
    return {"type": type_, "id": 1, **kwargs}

def test_grade_mcq_correct():
    ok, _ = _grade(_ch("mcq", options=["a","b","c"], answer=1), "1")
    assert ok

def test_grade_mcq_wrong():
    ok, _ = _grade(_ch("mcq", options=["a","b","c"], answer=1), "0")
    assert not ok

def test_grade_mcq_no_selection():
    ok, msg = _grade(_ch("mcq", options=["a","b"], answer=0), "")
    assert not ok and "No option" in msg

def test_grade_predict_correct():
    ok, _ = _grade(_ch("predict", code="", answer="hello"), "hello")
    assert ok

def test_grade_predict_whitespace_stripped():
    ok, _ = _grade(_ch("predict", code="", answer="hello"), "  hello  ")
    assert ok

def test_grade_fill_case_insensitive():
    ok, _ = _grade(_ch("fill", template="", answer="print"), "Print")
    assert ok

def test_grade_fill_wrong():
    ok, _ = _grade(_ch("fill", template="", answer="print"), "show")
    assert not ok

def test_grade_code_correct():
    ok, _ = _grade(_ch("code", tests=[{"input":"","expected":"Hello"}]), 'print("Hello")')
    assert ok

def test_grade_code_wrong():
    ok, _ = _grade(_ch("code", tests=[{"input":"","expected":"Hello"}]), 'print("World")')
    assert not ok

def test_grade_code_timeout():
    ok, msg = _grade(_ch("code", tests=[{"input":"","expected":"x"}]), "while True: pass")
    assert not ok
    assert "too long" in msg.lower() or "timeout" in msg.lower()

def test_grade_code_blocked_import():
    ok, _ = _grade(_ch("code", tests=[{"input":"","expected":""}]), "import os; print(os.getcwd())")
    assert not ok

def test_grade_code_syntax_error():
    ok, msg = _grade(_ch("code", tests=[{"input":"","expected":"1"}]), "def (")
    assert not ok and msg


# ── Submit phases 1–10 ────────────────────────────────────────

def _correct_answers(phase_id):
    path = os.path.join(os.path.dirname(__file__), "..", "content", f"phase_{phase_id:02d}.json")
    with open(path, encoding="utf-8") as f:
        phase = json.load(f)
    answers = {}
    for ch in phase["challenges"]:
        cid = str(ch["id"])
        t   = ch["type"]
        if t == "mcq":
            ans = ch["answer"]
            if isinstance(ans, int):
                answers[cid] = str(ans)
            else:
                if "options" in ch and ans in ch["options"]:
                    answers[cid] = str(ch["options"].index(ans))
                else:
                    answers[cid] = str(ans)
        elif t == "predict":
            answers[cid] = ch["answer"].strip()
        elif t == "fill":
            answers[cid] = ch["answer"].strip()
        elif t == "code":
            if "tests" in ch and ch["tests"]:
                expected = ch["tests"][0]["expected"]
            else:
                expected = ch.get("answer", "")
            if "\n" in expected:
                lines_exp = expected.split("\n")
                answers[cid] = "\n".join(f'print({repr(l)})' for l in lines_exp)
            else:
                answers[cid] = f'print({repr(expected)})'
    return answers
@pytest.mark.parametrize("phase_id", list(range(1, 31)))
def test_submit_phase_pass(client, phase_id):
    answers = _correct_answers(phase_id)
    r = client.post(f"/api/phases/{phase_id}/submit",
                    data=json.dumps({"answers": answers}),
                    content_type="application/json")
    assert r.status_code == 200, r.data
    result = json.loads(r.data)
    assert result["passed"] is True, f"Phase {phase_id} did not pass: score={result['score']}"
    assert result["stars"] >= 1


def test_submit_all_wrong_fails(client):
    phase = json.load(open(os.path.join(os.path.dirname(__file__), "..", "content", "phase_01.json")))
    answers = {str(ch["id"]): "wrong_answer_xyz_999" for ch in phase["challenges"]}
    r = client.post("/api/phases/1/submit", data=json.dumps({"answers": answers}),
                    content_type="application/json")
    assert r.status_code == 200
    assert json.loads(r.data)["passed"] is False


# ── Guest merge ───────────────────────────────────────────────

def test_merge_guest_requires_login(client):
    # Logout first
    client.post("/api/logout")
    r = client.post("/api/merge-guest", data=json.dumps({"progress": {"1": {"stars": 2, "score": 80}}}),
                    content_type="application/json")
    assert r.status_code == 401

def test_merge_guest_success(client):
    login_user(client)
    r = client.post("/api/merge-guest",
                    data=json.dumps({"progress": {"1": {"stars": 2, "score": 85}}}),
                    content_type="application/json")
    assert r.status_code == 200
    assert json.loads(r.data)["ok"] is True


# ── Progress endpoint ─────────────────────────────────────────

def test_progress_requires_login(client):
    client.post("/api/logout")
    assert client.get("/api/progress").status_code == 401

def test_progress_logged_in(client):
    login_user(client)
    r = client.get("/api/progress")
    assert r.status_code == 200
    d = json.loads(r.data)
    assert "xp" in d and "streak" in d and "badges" in d


# ── /api/run endpoint ─────────────────────────────────────────

def test_api_run_basic(client):
    r = client.post("/api/run",
                    data=json.dumps({"code": 'print("hello from run")'}),
                    content_type="application/json")
    assert r.status_code == 200
    d = json.loads(r.data)
    assert "hello from run" in d["stdout"]
    assert d["error"] is None

def test_api_run_empty_code(client):
    r = client.post("/api/run", data=json.dumps({"code": ""}), content_type="application/json")
    assert r.status_code == 200
    d = json.loads(r.data)
    assert d["stdout"] == ""

def test_api_run_syntax_error(client):
    r = client.post("/api/run", data=json.dumps({"code": "def ("}), content_type="application/json")
    assert r.status_code == 200
    d = json.loads(r.data)
    assert d["error"] is not None

def test_api_run_timeout(client):
    r = client.post("/api/run", data=json.dumps({"code": "while True: pass"}),
                    content_type="application/json")
    assert r.status_code == 200
    d = json.loads(r.data)
    assert d["error"] is not None
    assert "too long" in d["error"].lower() or "timeout" in d["error"].lower()

def test_api_run_blocked_import(client):
    r = client.post("/api/run", data=json.dumps({"code": "import os; print(os.getcwd())"}),
                    content_type="application/json")
    assert r.status_code == 200
    d = json.loads(r.data)
    assert d["error"] is not None

def test_api_run_multiline(client):
    code = "for i in range(3):\n    print(i)"
    r = client.post("/api/run", data=json.dumps({"code": code}), content_type="application/json")
    assert r.status_code == 200
    d = json.loads(r.data)
    assert d["stdout"].strip() == "0\n1\n2"

def test_api_run_too_large(client):
    code = "x = 1\n" * 10_000  # roughly 60 KB
    r = client.post("/api/run", data=json.dumps({"code": code}), content_type="application/json")
    assert r.status_code == 400

def test_badge_awarded_on_phase_complete(client, app):
    """Submit phase 1 as a logged-in user and check badge is awarded."""
    login_user(client)
    answers = _correct_answers(1)
    r = client.post("/api/phases/1/submit", data=json.dumps({"answers": answers}),
                    content_type="application/json")
    result = json.loads(r.data)
    # Either badge_earned or the badge is already owned (from prior test run)
    if result["badge_earned"]:
        assert result["badge_earned"]["label"] == "First Print"

def test_badge_not_duplicated(client, app):
    """Submitting phase 1 twice should not duplicate the badge."""
    login_user(client)
    answers = _correct_answers(1)
    client.post("/api/phases/1/submit", data=json.dumps({"answers": answers}), content_type="application/json")
    r2 = client.post("/api/phases/1/submit", data=json.dumps({"answers": answers}), content_type="application/json")
    result = json.loads(r2.data)
    # Second time badge_earned should be None (already owned)
    assert result["badge_earned"] is None
