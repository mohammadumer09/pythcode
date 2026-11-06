"""Server-side Supabase Auth helpers.

Supabase credentials and refresh tokens never reach the browser: the browser
only receives Flask's signed, opaque session cookie.  The corresponding
Supabase tokens live in the application's database and are checked whenever a
protected route is requested.
"""

import json
import secrets
from datetime import datetime, timezone
from urllib import error, parse, request

from flask import current_app, session

from models import AuthIdentity, AuthSession, User, db


class SupabaseAuthError(Exception):
    """An expected authentication failure returned to an API client."""

    def __init__(self, message: str, status_code: int = 401):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def supabase_auth_enabled() -> bool:
    """Return whether this deployment uses Supabase as its identity provider."""
    return current_app.config.get("AUTH_PROVIDER") == "supabase"


def _config() -> tuple[str, str]:
    url = (current_app.config.get("SUPABASE_URL") or "").rstrip("/")
    publishable_key = current_app.config.get("SUPABASE_PUBLISHABLE_KEY") or ""
    if not url or not publishable_key:
        raise SupabaseAuthError(
            "Supabase Auth is not configured. Set SUPABASE_URL and "
            "SUPABASE_PUBLISHABLE_KEY.",
            503,
        )
    return url, publishable_key


def _error_message(body: object, fallback: str) -> str:
    if isinstance(body, dict):
        return str(body.get("msg") or body.get("message") or body.get("error_description") or fallback)
    return fallback


def _supabase_request(path: str, method: str = "GET", payload: dict | None = None,
                      access_token: str | None = None) -> dict:
    """Call GoTrue with safe, short error messages for the browser."""
    url, publishable_key = _config()
    headers = {
        "apikey": publishable_key,
        "Accept": "application/json",
    }
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"
    else:
        headers["Authorization"] = f"Bearer {publishable_key}"

    data = None
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"

    req = request.Request(f"{url}/auth/v1{path}", data=data, headers=headers, method=method)
    try:
        with request.urlopen(req, timeout=5) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except error.HTTPError as exc:
        try:
            body = json.loads(exc.read().decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            body = {}
        raise SupabaseAuthError(_error_message(body, "Authentication failed."), exc.code) from exc
    except (error.URLError, TimeoutError) as exc:
        raise SupabaseAuthError("Authentication service is temporarily unavailable.", 503) from exc


def _user_details(identity: dict) -> tuple[str, str, str]:
    """Extract the stable Supabase id, email, and display name from a user."""
    supabase_id = str(identity.get("id") or "")
    email = str(identity.get("email") or "").strip().lower()
    metadata = identity.get("user_metadata") or {}
    name = str(metadata.get("name") or metadata.get("full_name") or email.split("@")[0]).strip()
    if not supabase_id or not email:
        raise SupabaseAuthError("The authentication service returned an incomplete user profile.", 502)
    return supabase_id, email, name[:100]


def _local_user(identity: dict) -> tuple[User, str]:
    """Create or find the local learning-profile associated with a Supabase user."""
    supabase_id, email, name = _user_details(identity)
    identity_record = AuthIdentity.query.filter_by(supabase_user_id=supabase_id).first()
    if identity_record is not None:
        user = db.session.get(User, identity_record.user_id)
        if user is None:
            raise SupabaseAuthError("Your learning profile could not be found.", 404)
        if user.email != email:
            email_owner = User.query.filter_by(email=email).first()
            if email_owner is None or email_owner.id == user.id:
                user.email = email
    else:
        user = User.query.filter_by(email=email).first()
        if user is None:
            # Passwords are exclusively managed by Supabase for this account.
            user = User(name=name, email=email, password_hash="supabase-managed")
            db.session.add(user)
            db.session.flush()
        elif AuthIdentity.query.filter_by(user_id=user.id).first() is not None:
            # Never use a matching email to join two distinct Supabase identities.
            raise SupabaseAuthError("This email is already linked to another account.", 409)
        db.session.add(AuthIdentity(user_id=user.id, supabase_user_id=supabase_id))

    if user is None:
        # Passwords are exclusively managed by Supabase for this account.
        user = User(name=name, email=email, password_hash="supabase-managed")
        db.session.add(user)
        db.session.flush()
    if name and user.name != name:
        user.name = name
    return user, supabase_id


def _start_server_session(identity: dict, credentials: dict) -> User:
    """Persist provider tokens server-side and put only an opaque id in Flask's cookie."""
    access_token = credentials.get("access_token")
    refresh_token = credentials.get("refresh_token")
    if not access_token or not refresh_token:
        raise SupabaseAuthError("Supabase did not return a login session. Confirm your email, then log in.", 401)

    user, supabase_id = _local_user(identity)
    auth_session = AuthSession(
        session_key=secrets.token_urlsafe(32),
        user_id=user.id,
        supabase_user_id=supabase_id,
        access_token=access_token,
        refresh_token=refresh_token,
    )
    db.session.add(auth_session)
    db.session.commit()

    session.clear()
    session["user_id"] = user.id
    session["auth_session_key"] = auth_session.session_key
    return user


def sign_up(email: str, password: str, name: str) -> tuple[User | None, bool]:
    """Create a Supabase account. The bool tells callers whether email confirmation is pending."""
    result = _supabase_request(
        "/signup",
        method="POST",
        payload={"email": email, "password": password, "data": {"name": name}},
    )
    if result.get("session"):
        return _start_server_session(result.get("user") or {}, result["session"]), False
    return None, True


def sign_in(email: str, password: str) -> User:
    result = _supabase_request(
        "/token?" + parse.urlencode({"grant_type": "password"}),
        method="POST",
        payload={"email": email, "password": password},
    )
    return _start_server_session(result.get("user") or {}, result)


def _refresh(auth_session: AuthSession) -> dict:
    result = _supabase_request(
        "/token?" + parse.urlencode({"grant_type": "refresh_token"}),
        method="POST",
        payload={"refresh_token": auth_session.refresh_token},
    )
    if not result.get("access_token") or not result.get("refresh_token"):
        raise SupabaseAuthError("Your login session has expired. Please log in again.", 401)
    auth_session.access_token = result["access_token"]
    auth_session.refresh_token = result["refresh_token"]
    auth_session.updated_at = datetime.now(timezone.utc)
    db.session.commit()
    return result


def current_user_id() -> int | None:
    """Return an authenticated local user id, validating Supabase on protected use."""
    user_id = session.get("user_id")
    if not user_id:
        return None
    if not supabase_auth_enabled():
        return user_id

    session_key = session.get("auth_session_key")
    auth_session = AuthSession.query.filter_by(session_key=session_key).first() if session_key else None
    if auth_session is None or auth_session.user_id != user_id:
        clear_session()
        return None

    try:
        identity = _supabase_request("/user", access_token=auth_session.access_token)
    except SupabaseAuthError as exc:
        if exc.status_code not in (401, 403):
            return None
        try:
            credentials = _refresh(auth_session)
            identity = _supabase_request("/user", access_token=credentials["access_token"])
        except SupabaseAuthError:
            clear_session()
            return None

    if str(identity.get("id") or "") != auth_session.supabase_user_id:
        clear_session()
        return None
    return user_id


def is_authenticated() -> bool:
    """Cheap check used for rendering; protected handlers call current_user_id()."""
    if not session.get("user_id"):
        return False
    return not supabase_auth_enabled() or bool(session.get("auth_session_key"))


def clear_session(revoke_supabase: bool = False) -> None:
    """Clear the app session and optionally revoke its Supabase refresh token."""
    session_key = session.get("auth_session_key")
    if session_key:
        auth_session = AuthSession.query.filter_by(session_key=session_key).first()
        if auth_session:
            if revoke_supabase and supabase_auth_enabled():
                try:
                    _supabase_request(
                        "/logout",
                        method="POST",
                        payload={"scope": "local"},
                        access_token=auth_session.access_token,
                    )
                except SupabaseAuthError:
                    # Local logout must still succeed if the provider is unavailable.
                    pass
            db.session.delete(auth_session)
            db.session.commit()
    session.clear()
