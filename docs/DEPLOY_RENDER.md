# Deploying pythcode on Render

This guide outlines how to deploy **pythcode** as a Python Web Service on [Render](https://render.com).

---

## 1. Prerequisites

1. A Git repository (GitHub or GitLab) containing this project.
2. A Supabase project with database tables and Auth configured.
3. A Render account.

---

## 2. Render Web Service Configuration

Create a new **Web Service** on Render and link your Git repository.

| Setting | Value |
|---------|-------|
| **Name** | `pythcode` (or your preferred name) |
| **Region** | Choose the region closest to your Supabase project |
| **Branch** | `master` (or `main`) |
| **Root Directory** | *(leave blank - repository root)* |
| **Runtime** | `Python 3` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `gunicorn app:app` |
| **Instance Type** | Free (or Starter) |

> **Note on Start Command:** Render automatically sets the `$PORT` environment variable. The app binds dynamically to `$PORT` via Gunicorn. The `Procfile` (`web: gunicorn app:app`) is also included in the repository.

---

## 3. Environment Variables to Set on Render

Navigate to the **Environment** tab of your Render Web Service dashboard and add the following environment variable names and their values.

> **CRITICAL SECURITY RULE:** Never put real secret values in documentation or code. Enter these directly into the Render dashboard.

### Required Environment Variables

| Variable Name | Description | Example / Recommended Value |
|---------------|-------------|-----------------------------|
| `DATABASE_URL` | Supabase PostgreSQL connection string (Session Pooler) | `postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres` |
| `SECRET_KEY` | Strong random key used by Flask to sign session cookies | Run `python -c "import secrets; print(secrets.token_hex(32))"` to generate a value |
| `SESSION_COOKIE_SECURE` | Enforce cookies over HTTPS | `true` (Render provides SSL/HTTPS by default) |
| `AUTH_PROVIDER` | Identity provider mode | `supabase` |
| `SUPABASE_URL` | Your Supabase project URL | `https://[YOUR-PROJECT-REF].supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable API key | Found in Supabase Settings → API |
| `FLASK_DEBUG` | Flask debug mode | `0` (Always keep off in production) |

### Optional Aliases & Settings

| Variable Name | Description | Default / Recommended Value |
|---------------|-------------|-----------------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supported alias for `SUPABASE_URL` | *(Same as `SUPABASE_URL`)* |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supported alias for `SUPABASE_PUBLISHABLE_KEY` | *(Same as `SUPABASE_PUBLISHABLE_KEY`)* |
| `PORT` | Web port | Set automatically by Render (defaults to 10000 on Render) |
| `PYTHON_VERSION` | Specific Python version on Render | `3.11.9` or `3.12.3` |

---

## 4. Verification After Deployment

1. Check the Render **Logs** tab during build and startup. It should show:
   - Dependencies installing successfully from `requirements.txt`.
   - Gunicorn starting `app:app` on the assigned port.
2. Open the Render provided URL (e.g. `https://pythcode.onrender.com`).
3. Verify:
   - Home page loads.
   - User registration and login work via Supabase Auth.
   - Challenge attempts and progress persist in Supabase.

