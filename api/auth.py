"""
Auth API — register, login, logout, me, streak update.
"""

from datetime import datetime, timezone, timedelta

from flask import Blueprint, jsonify, request, session
from werkzeug.security import generate_password_hash, check_password_hash

from models import db, User, Badge
from api.supabase_auth import (
    SupabaseAuthError,
    clear_session,
    current_user_id,
    sign_in,
    sign_up,
    supabase_auth_enabled,
)

auth_bp = Blueprint("auth", __name__)


# ── Register ───────────────────────────────────────────────────

@auth_bp.route("/register", methods=["POST"])
def register():
    data     = request.get_json(silent=True) or {}
    name     = data.get("name", "").strip()
    email    = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not name or not email or len(password) < 6:
        return jsonify({"error": "Name, email and a password of at least 6 characters are required."}), 400

    if supabase_auth_enabled():
        try:
            user, confirmation_required = sign_up(email, password, name)
        except SupabaseAuthError as exc:
            return jsonify({"error": exc.message}), exc.status_code
        if confirmation_required:
            return jsonify({
                "ok": True,
                "confirmation_required": True,
                "message": "Check your email to confirm your account, then log in.",
            }), 201
        return jsonify({"ok": True, "user_id": user.id, "name": user.name}), 201

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "That email is already registered. Please log in."}), 409

    user = User(
        name=name,
        email=email,
        password_hash=generate_password_hash(password),
        last_active=datetime.now(timezone.utc),
    )
    db.session.add(user)
    db.session.commit()

    session["user_id"] = user.id
    return jsonify({"ok": True, "user_id": user.id, "name": user.name}), 201


# ── Login ──────────────────────────────────────────────────────

@auth_bp.route("/login", methods=["POST"])
def login():
    data     = request.get_json(silent=True) or {}
    email    = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if supabase_auth_enabled():
        try:
            user = sign_in(email, password)
        except SupabaseAuthError as exc:
            return jsonify({"error": exc.message}), exc.status_code
        _update_streak(user)
        db.session.commit()
        return jsonify({
            "ok": True,
            "user_id": user.id,
            "name": user.name,
            "xp": user.xp,
            "streak": user.streak,
        })

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"error": "Wrong email or password."}), 401

    # Update streak
    _update_streak(user)
    db.session.commit()

    session["user_id"] = user.id
    return jsonify({
        "ok":     True,
        "user_id": user.id,
        "name":    user.name,
        "xp":      user.xp,
        "streak":  user.streak,
    })


# ── Logout ─────────────────────────────────────────────────────

@auth_bp.route("/logout", methods=["POST"])
def logout():
    if supabase_auth_enabled():
        clear_session(revoke_supabase=True)
    else:
        session.pop("user_id", None)
    return jsonify({"ok": True})


# ── Me ─────────────────────────────────────────────────────────

@auth_bp.route("/me", methods=["GET"])
def me():
    user_id = current_user_id()
    if not user_id:
        return jsonify({"error": "Not logged in."}), 401

    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "User not found."}), 404

    badges = [{"key": b.badge_key, "earned_at": b.earned_at.isoformat()} for b in user.badges]

    return jsonify({
        "id":        user.id,
        "name":      user.name,
        "email":     user.email,
        "xp":        user.xp,
        "streak":    user.streak,
        "last_active": user.last_active.isoformat() if user.last_active else None,
        "badges":    badges,
    })


# ── Merge guest progress ───────────────────────────────────────

@auth_bp.route("/merge-guest", methods=["POST"])
def merge_guest():
    """
    After sign-up, merge localStorage guest progress into the user account.
    Body: { "progress": { "1": {"stars":2,"score":85}, ... } }
    """
    user_id = current_user_id()
    if not user_id:
        return jsonify({"error": "Not logged in."}), 401

    from models import Progress, Attempt
    data     = request.get_json(silent=True) or {}
    progress = data.get("progress", {})

    for phase_id_str, pdata in progress.items():
        try:
            phase_id = int(phase_id_str)
            stars    = int(pdata.get("stars", 0))
            score    = float(pdata.get("score", 0))
        except (ValueError, TypeError):
            continue

        if stars == 0:
            continue

        prog = Progress.query.filter_by(user_id=user_id, phase_id=phase_id).first()
        if prog is None:
            prog = Progress(user_id=user_id, phase_id=phase_id)
            db.session.add(prog)

        if score > (prog.best_score or 0.0):
            prog.best_score = score
        if stars > (prog.stars or 0):
            prog.stars = stars
            if prog.completed_at is None:
                prog.completed_at = datetime.now(timezone.utc)

    # XP from merged progress
    user = db.session.get(User, user_id)
    if user:
        completed = Progress.query.filter(
            Progress.user_id == user_id,
            Progress.stars   >  0,
        ).count()
        # rough XP: 70 per completed phase (don't double-count if already higher)
        min_xp = completed * 70
        if user.xp < min_xp:
            user.xp = min_xp

    db.session.commit()
    return jsonify({"ok": True})


# ── Streak helper ──────────────────────────────────────────────

def _update_streak(user: User) -> None:
    """
    Increment streak if the user logged in on consecutive days.
    Reset to 1 if they missed a day.
    Call before commit.
    """
    now  = datetime.now(timezone.utc)
    last = user.last_active

    if last is None:
        user.streak     = 1
        user.last_active = now
        return

    # Normalise to date only
    last_date = last.date()
    today     = now.date()

    if today == last_date:
        # Same day — just update timestamp, keep streak
        user.last_active = now
    elif today == last_date + timedelta(days=1):
        # Consecutive day
        user.streak     += 1
        user.last_active = now
    else:
        # Missed days — reset
        user.streak     = 1
        user.last_active = now
