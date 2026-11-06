"""
Badge definitions and award logic used by content.py.
"""

BADGE_META = {
    "first_print":    {"label": "First Print",     "icon": "🖨️",  "desc": "Completed Phase 1"},
    "syntax_star":    {"label": "Syntax Star",      "icon": "✨",  "desc": "Completed Phase 2"},
    "variable_vault": {"label": "Variable Vault",   "icon": "📦",  "desc": "Completed Phase 3"},
    "type_master":    {"label": "Type Master",      "icon": "🏷️",  "desc": "Completed Phase 4"},
    "converter":      {"label": "Converter",        "icon": "🔄",  "desc": "Completed Phase 5"},
    "number_cruncher":{"label": "Number Cruncher",  "icon": "🔢",  "desc": "Completed Phase 6"},
    "string_wizard":  {"label": "String Wizard",    "icon": "🧵",  "desc": "Completed Phase 7"},
    "format_pro":     {"label": "Format Pro",       "icon": "🎨",  "desc": "Completed Phase 8"},
    "logic_hero":     {"label": "Logic Hero",       "icon": "⚡",  "desc": "Completed Phase 9"},
    "brancher":       {"label": "Brancher",         "icon": "🌿",  "desc": "Completed Phase 10"},
    "beginner_complete": {"label": "Beginner Complete", "icon": "🏁", "desc": "Finished all 10 beginner phases"},
    "streak_3":       {"label": "On a Roll",        "icon": "🔥",  "desc": "3-day streak"},
    "streak_7":       {"label": "Week Warrior",     "icon": "🗓️",  "desc": "7-day streak"},
    "century":        {"label": "Century Club",     "icon": "💯",  "desc": "Earned 100 XP"},
    "perfect_score":  {"label": "Perfect Score",    "icon": "⭐",  "desc": "Scored 100% on any phase"},
    "project_1":      {"label": "Tip Calculator Pro", "icon": "🪙", "desc": "Completed Mini-Project 1: Tip & Split Bill Calculator"},
    "project_2":      {"label": "Guess Master",     "icon": "🎯",  "desc": "Completed Mini-Project 2: Number Guessing Game"},
    "project_3":      {"label": "Contact Pro",      "icon": "📒",  "desc": "Completed Mini-Project 3: CLI Contact Book"},
    "project_4":      {"label": "Quiz Architect",   "icon": "📜",  "desc": "Completed Mini-Project 4: File-Based Quiz"},
    "project_5":      {"label": "Vault Keeper",     "icon": "🔐",  "desc": "Completed Mini-Project 5: Password Generator & Security Analyzer"},
}

# Map phase_id → badge_key awarded on completion
PHASE_BADGES = {
    1:  "first_print",
    2:  "syntax_star",
    3:  "variable_vault",
    4:  "type_master",
    5:  "converter",
    6:  "number_cruncher",
    7:  "string_wizard",
    8:  "format_pro",
    9:  "logic_hero",
    10: "brancher",
}


def award_badge(user_id: int, badge_key: str, session=None) -> dict | None:
    """
    Award a badge if the user doesn't already have it.
    Returns badge meta dict on success, None if already owned.
    Pass db session via import — caller must commit.
    """
    from models import Badge
    from models import db

    exists = Badge.query.filter_by(user_id=user_id, badge_key=badge_key).first()
    if exists:
        return None
    badge = Badge(user_id=user_id, badge_key=badge_key)
    db.session.add(badge)
    return BADGE_META.get(badge_key)

