"""
api/projects.py — Endpoints for guided mini-projects (after every 5 phases).
"""

import os
import json
from flask import Blueprint, jsonify, request
from models import db, User, Badge
from api.badges import award_badge, BADGE_META
from api.supabase_auth import current_user_id

projects_bp = Blueprint("projects", __name__)
PROJECTS_FILE = os.path.join(os.path.dirname(__file__), "..", "content", "mini_projects.json")


def load_projects() -> list[dict]:
    if not os.path.exists(PROJECTS_FILE):
        return []
    with open(PROJECTS_FILE, encoding="utf-8") as f:
        return json.load(f)


@projects_bp.route("/projects", methods=["GET"])
def get_projects():
    projects = load_projects()
    # Strip full test code for the summary view
    summary = []
    for p in projects:
        summary.append({
            "id": p["id"],
            "after_phase": p["after_phase"],
            "title": p["title"],
            "level": p["level"],
            "badge_key": p["badge_key"],
            "badge_name": p["badge_name"],
            "badge_icon": p["badge_icon"],
            "xp_reward": p["xp_reward"],
            "overview": p["overview"],
            "checklist_count": len(p.get("checklist", [])),
            "test_count": len(p.get("tests", [])),
        })
    return jsonify(summary)


@projects_bp.route("/projects/<int:project_id>", methods=["GET"])
def get_project_detail(project_id: int):
    projects = load_projects()
    match = next((p for p in projects if p["id"] == project_id), None)
    if not match:
        return jsonify({"error": "Project not found"}), 404
    return jsonify(match)


@projects_bp.route("/projects/<int:project_id>/complete", methods=["POST"])
def complete_project(project_id: int):
    projects = load_projects()
    match = next((p for p in projects if p["id"] == project_id), None)
    if not match:
        return jsonify({"error": "Project not found"}), 404

    xp_earned = match.get("xp_reward", 100)
    badge_key = match.get("badge_key")
    badge_awarded = None

    user_id = current_user_id()
    if user_id:
        user = db.session.get(User, user_id)
        if user:
            user.xp = (user.xp or 0) + xp_earned
            if badge_key:
                awarded = award_badge(user_id, badge_key)
                if awarded:
                    badge_awarded = awarded
            db.session.commit()
    else:
        # Guest mode: return metadata for localStorage
        if badge_key:
            badge_awarded = BADGE_META.get(badge_key)

    return jsonify({
        "success": True,
        "project_id": project_id,
        "xp_earned": xp_earned,
        "badge_awarded": badge_awarded,
        "message": f"Congratulations! You completed {match['title']}!",
    })

