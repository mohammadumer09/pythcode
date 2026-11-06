"""
Database models for pythcode.
Tables: User, Progress, Attempt, Badge
"""

from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class User(db.Model):
    """Registered user account."""
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    username = db.Column(db.String(50), unique=True, nullable=True, index=True)
    email = db.Column(db.String(200), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    xp = db.Column(db.Integer, default=0, nullable=False)
    streak = db.Column(db.Integer, default=0, nullable=False)
    show_on_leaderboard = db.Column(db.Boolean, default=True, nullable=False)
    last_active = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    progress = db.relationship("Progress", backref="user", lazy=True)
    attempts = db.relationship("Attempt", backref="user", lazy=True)
    badges = db.relationship("Badge", backref="user", lazy=True)

    __table_args__ = (
        db.Index("ix_users_xp", "xp"),
    )

    def __repr__(self):
        return f"<User {self.email}>"


class AuthSession(db.Model):
    """Opaque Flask session mapped to Supabase tokens stored only on the server."""
    __tablename__ = "auth_sessions"

    id = db.Column(db.Integer, primary_key=True)
    session_key = db.Column(db.String(128), unique=True, nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    supabase_user_id = db.Column(db.String(64), nullable=False)
    access_token = db.Column(db.Text, nullable=False)
    refresh_token = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def __repr__(self):
        return f"<AuthSession user={self.user_id}>"


class AuthIdentity(db.Model):
    """Permanent mapping between a local learning profile and a Supabase user."""
    __tablename__ = "auth_identities"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), unique=True, nullable=False, index=True)
    supabase_user_id = db.Column(db.String(64), unique=True, nullable=False, index=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    def __repr__(self):
        return f"<AuthIdentity user={self.user_id}>"


class Progress(db.Model):
    """Best score and stars for each phase a user has attempted."""
    __tablename__ = "progress"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    phase_id = db.Column(db.Integer, nullable=False)
    best_score = db.Column(db.Float, default=0.0, nullable=False)
    stars = db.Column(db.Integer, default=0, nullable=False)  # 0, 1, 2, or 3
    completed_at = db.Column(db.DateTime(timezone=True), nullable=True)

    __table_args__ = (
        db.UniqueConstraint("user_id", "phase_id", name="uq_user_phase"),
        db.Index("ix_progress_user_stars", "user_id", "stars"),
    )

    def __repr__(self):
        return f"<Progress user={self.user_id} phase={self.phase_id} stars={self.stars}>"


class Attempt(db.Model):
    """Every test attempt a user makes on a phase."""
    __tablename__ = "attempts"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    phase_id = db.Column(db.Integer, nullable=False)
    score = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        db.Index("ix_attempts_user_phase", "user_id", "phase_id"),
    )

    def __repr__(self):
        return f"<Attempt user={self.user_id} phase={self.phase_id} score={self.score}>"


class Badge(db.Model):
    """Badges earned by a user."""
    __tablename__ = "badges"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    badge_key = db.Column(db.String(100), nullable=False)
    earned_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        db.UniqueConstraint("user_id", "badge_key", name="uq_user_badge"),
    )

    def __repr__(self):
        return f"<Badge user={self.user_id} key={self.badge_key}>"


class XPEvent(db.Model):
    """Audit log of XP earned by users."""
    __tablename__ = "xp_events"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    amount = db.Column(db.Integer, nullable=False)
    reason = db.Column(db.String(100), nullable=False)
    phase_id = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    # Relationship
    user = db.relationship("User", backref=db.backref("xp_events", lazy=True))

    def __repr__(self):
        return f"<XPEvent user={self.user_id} amount={self.amount} reason={self.reason}>"

