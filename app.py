"""
pythcode — Flask app factory and page routes.
"""

import os
from functools import wraps

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from flask import Flask, render_template, session, abort, redirect, url_for
from flask_migrate import Migrate

from models import db


def create_app(config_override=None):
    app = Flask(__name__)

    # ── Config ──────────────────────────────────────────────────────────────
    supabase_url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
    supabase_key = os.environ.get("SUPABASE_PUBLISHABLE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "")

    app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev-secret-change-in-prod")
    raw_db_url = os.environ.get("DATABASE_URL", "sqlite:///pythcode.db")
    if raw_db_url.startswith("postgres://"):
        raw_db_url = raw_db_url.replace("postgres://", "postgresql+psycopg2://", 1)
    elif raw_db_url.startswith("postgresql://") and not raw_db_url.startswith("postgresql+"):
        raw_db_url = raw_db_url.replace("postgresql://", "postgresql+psycopg2://", 1)
    app.config["SQLALCHEMY_DATABASE_URI"] = raw_db_url
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
        "pool_pre_ping": True,
        "pool_recycle": 300,
    }
    app.config["AUTH_PROVIDER"] = os.environ.get(
        "AUTH_PROVIDER",
        "supabase" if supabase_url else "local",
    ).lower()
    app.config["SUPABASE_URL"] = supabase_url
    app.config["SUPABASE_PUBLISHABLE_KEY"] = supabase_key
    app.config["SESSION_COOKIE_HTTPONLY"] = True
    app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
    app.config["SESSION_COOKIE_SECURE"] = os.environ.get("SESSION_COOKIE_SECURE", "false").lower() == "true"

    if config_override:
        app.config.update(config_override)

    # ── Extensions ──────────────────────────────────────────────────────────
    db.init_app(app)
    Migrate(app, db)

    if app.config["SQLALCHEMY_DATABASE_URI"].startswith("sqlite"):
        with app.app_context():
            db.create_all()

    # ── Context processor ───────────────────────────────────────────────────
    @app.context_processor
    def inject_user():
        user_id = session.get("user_id")
        user    = None
        if user_id:
            from models import User
            user = db.session.get(User, user_id)
        from api.supabase_auth import is_authenticated
        return {
            "current_user_id": user_id,
            "logged_in": is_authenticated(),
            "current_user": user,
        }

    def login_required(view):
        """Redirect pages to login unless their Flask/Supabase session is valid."""
        @wraps(view)
        def wrapped(*args, **kwargs):
            from api.supabase_auth import current_user_id
            if current_user_id() is None:
                return redirect(url_for("login"))
            return view(*args, **kwargs)
        return wrapped

    # ── Page routes ─────────────────────────────────────────────────────────
    @app.route("/")
    def home():
        return render_template("home.html")

    @app.route("/map")
    def phase_map():
        return render_template("phase_map.html")

    @app.route("/lesson/<int:phase_id>")
    def lesson(phase_id):
        if phase_id < 1 or phase_id > 30:
            abort(404)
        return render_template("lesson.html", phase_id=phase_id)

    @app.route("/playground")
    def playground():
        return render_template("playground.html")

    @app.route("/about")
    def about():
        return render_template("about.html")

    @app.route("/login")
    def login():
        from api.supabase_auth import current_user_id
        if current_user_id():
            return redirect(url_for("profile"))
        return render_template("login.html")

    @app.route("/register")
    def register():
        from api.supabase_auth import current_user_id
        if current_user_id():
            return redirect(url_for("profile"))
        return render_template("register.html")

    @app.route("/profile")
    @login_required
    def profile():
        return render_template("profile.html")

    @app.route("/dashboard")
    @login_required
    def dashboard():
        return render_template("dashboard.html")

    @app.route("/project/<int:project_id>")
    def project(project_id):
        if project_id < 1 or project_id > 5:
            abort(404)
        return render_template("project.html", project_id=project_id)

    @app.route("/cheatsheet")
    def cheatsheet():
        return render_template("cheatsheet.html")

    # ── API blueprints ───────────────────────────────────────────────────────
    from api.auth     import auth_bp
    from api.content  import content_bp
    from api.progress import progress_bp
    from api.run      import run_bp
    from api.projects import projects_bp

    app.register_blueprint(auth_bp,     url_prefix="/api")
    app.register_blueprint(content_bp,  url_prefix="/api")
    app.register_blueprint(progress_bp, url_prefix="/api")
    app.register_blueprint(run_bp,      url_prefix="/api")
    app.register_blueprint(projects_bp, url_prefix="/api")

    # ── Error handlers ───────────────────────────────────────────────────────
    @app.errorhandler(404)
    def not_found(e):
        return render_template("404.html"), 404

    return app


# ── Run ─────────────────────────────────────────────────────────────────────
app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    host = os.environ.get("HOST", "127.0.0.1")
    debug = os.environ.get("FLASK_DEBUG", "0").strip() in ("1", "true", "True")
    app.run(host=host, port=port, debug=debug)
