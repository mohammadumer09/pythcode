"""
Progress API — phases list with live user state, profile data.
"""

from flask import Blueprint, jsonify
from models import db, User, Progress, Badge
from api.supabase_auth import current_user_id

progress_bp = Blueprint("progress", __name__)


@progress_bp.route("/progress", methods=["GET"])
def get_progress():
    user_id = current_user_id()
    if not user_id:
        return jsonify({"error": "Not logged in."}), 401

    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "User not found."}), 404

    phases_done = Progress.query.filter(
        Progress.user_id == user_id,
        Progress.stars   >  0,
    ).count()

    badges = [{"key": b.badge_key, "earned_at": b.earned_at.isoformat()} for b in user.badges]

    return jsonify({
        "xp":          user.xp,
        "streak":      user.streak,
        "phases_done": phases_done,
        "badges":      badges,
    })

