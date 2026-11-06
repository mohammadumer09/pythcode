# pythcode — Project Map

> **Read this file first** before opening any source file. Updated after every task.
> Run `python tools/check_map.py` before finishing any task.

---

## 1. Overview

**pythcode** is a browser-based, self-paced Python learning app built with Flask + SQLite, with Supabase Auth available as the production identity provider.
Learners progress through 30 phases (lessons + challenges) on topics from "What is Python?" to capstone final projects (calculator, to-do list, quiz engine).
Each phase has a lesson section and 13 multiple-choice / code challenges graded server-side (and client-side via Pyodide).
Users earn XP, stars, and badges; progress is saved server-side (logged-in) or in localStorage (guest).
The app runs on Python 3.14, Flask 3.1.0, SQLite, CodeMirror 5, and Pyodide v0.26.4.

---

## 2. How to Run, Test, and Deploy

```bash
# Dev server (port 5000)
cd c:\Users\Lenovo\pythcode
python app.py

# Tests (81 tests)
python -m pytest tests/test_app.py -q

# Production (Heroku-style)
gunicorn app:app          # Procfile: web: gunicorn app:app

# Map integrity check (run before finishing any task)
python tools/check_map.py
```

> **Note:** Git is not installed on this machine. Use `xcopy` for backups:
> `xcopy c:\Users\Lenovo\pythcode c:\Users\Lenovo\pythcode_backup_YYYYMMDD /E /I /Q /Y`

---

## 3. File Index

| Path | Purpose | Key symbols | Depends on |
|------|---------|-------------|------------|
| `app.py` | Flask app factory, session configuration + page routes | `create_app()`, `login_required()`, routes: `/`, `/map`, `/lesson/<id>`, `/playground`, `/profile`, `/about`, `/login`, `/register` | models, Supabase Auth helpers, api blueprints |
| `models.py` | SQLAlchemy ORM models | `User`, `AuthSession`, `Progress`, `Attempt`, `Badge` | Flask-SQLAlchemy |
| `api/__init__.py` | Registers API blueprints | — | all api modules |
| `api/auth.py` | Auth endpoints; delegates account credentials to Supabase when configured | `/api/register`, `/api/login`, `/api/logout`, `/api/me` | models, `api/supabase_auth.py` |
| `api/supabase_auth.py` | Server-side Supabase GoTrue client + opaque Flask-session helpers | `sign_up()`, `sign_in()`, `current_user_id()`, `clear_session()` | stdlib urllib, models |
| `api/content.py` | Phase data + grading | `/api/phases`, `/api/phases/<id>`, `/api/phases/<id>/submit`, `_grade_answer()`, `_grade_predict()`, `_grade_write()`, `_grade_order()` | models, content JSON |
| `api/run.py` | Server-side code runner fallback | `POST /api/run`, `run_python_code()` | subprocess |
| `api/badges.py` | Badge definitions + award logic | `BADGES`, `award_badge()`, `check_and_award_badges()` | models |
| `api/projects.py` | Guided mini-project endpoints | `/api/projects`, `/api/projects/<id>`, `/api/projects/<id>/complete` | models, badges, mini_projects.json |
| `api/progress.py` | Progress endpoints | `GET /api/progress`, `POST /api/merge-guest` | models |
| `api/supabase_auth.py` | Optional Supabase auth helper | — | — |
| `content/phase_01.json … phase_30.json` | Lesson + challenge data | see §7 | — |
| `content/mini_projects.json` | Guided milestone projects data & tests | — | — |
| `static/css/main.css` | Global styles, design tokens, layout | CSS vars `--accent`, `--bg`, `--surface`, `--text` | — |
| `static/css/lesson.css` | Lesson page, challenge cards, hint levels, diff/subtype badges | `.challenge-card`, `.hint-level-item`, `.diff-badge`, `.subtype-badge` | main.css |
| `static/css/editor.css` | CodeMirror overrides, line-number fix | `.CodeMirror`, `.cm-linenumber` | CodeMirror CSS |
| `static/js/main.js` | Navbar, theme toggle, XP bar, toast notifications | `showToast()`, `updateXPBar()` | — |
| `static/js/home.js` | Home page phase grid, lock/unlock display | `renderPhases()`, `fetchProgress()` | guest.js |
| `static/js/lesson.js` | Lesson + challenge rendering, grading, hints, XP animation | `renderLesson()`, `renderChallenges()`, `submitAnswer()`, `toggleHint()`, `subtypeLabel()` | code-runner.js, guest.js |
| `static/js/project.js` | Mini-project runner, checklist & test runner | `runProjectTests()`, `initEditor()` | code-runner.js |
| `static/js/playground.js` | Playground code editor | `runCode()` | code-runner.js |
| `static/js/phase_map.js` | Interactive phase map SVG/canvas | `drawMap()` | — |
| `static/js/guest.js` | Guest localStorage progress (save/load/merge) | `saveGuestProgress()`, `loadGuestProgress()`, `mergeGuest()` | — |
| `static/js/code-runner.js` | Pyodide Web Worker bridge + `/api/run` fallback | `runCode()`, `useWorker`, `fallbackRun()` | pyodide-worker.js |
| `static/js/pyodide-worker.js` | Pyodide v0.26.4 Web Worker | `self.onmessage` | Pyodide CDN |
| `templates/base.html` | Base template, CDN links (CodeMirror, anime.js, motion.dev) | `{% block content %}` | — |
| `templates/home.html` | Home page | — | base.html |
| `templates/lesson.html` | Lesson page (renders phase JSON via JS) | — | base.html, lesson.js |
| `templates/project.html` | Guided mini-project page | — | base.html, project.js |
| `templates/cheatsheet.html` | Printable Python syntax cheat sheet | — | base.html |
| `templates/playground.html` | Code playground | — | base.html, playground.js |
| `templates/phase_map.html` | Visual phase map | — | base.html, phase_map.js |
| `templates/profile.html` | User profile, XP, badges, streak | — | base.html |
| `templates/dashboard.html` | Protected learner dashboard (progress overview, quick actions) | — | base.html |
| `templates/about.html` | About page | — | base.html |
| `templates/login.html` | Login form | — | base.html |
| `templates/register.html` | Register form | — | base.html |
| `templates/404.html` | 404 error page | — | base.html |
| `docs/CONTENT_STANDARD.md` | Lesson writing standard (7 sections, challenge rules) | — | — |
| `docs/DEPLOY_RENDER.md` | Deployment guide for Render with commands and environment variables | — | — |
| `docs/TECH_STACK.md` | Tech stack + Phase JSON schema reference | — | — |
| `docs/PROJECT_MAP.md` | **This file** | — | — |
| `files/DESIGN.md` | Design spec (colors, typography, components) | — | — |
| `files/PRD.md` | Product requirements document | — | — |
| `files/README.md` | Project README | — | — |
| `files/TECH_STACK.md` | Original tech stack doc (also copied to docs/) | — | — |
| `files/ui-reference-1.jpg` | UI reference screenshot | — | — |
| `tools/check_map.py` | Verifies every project file is in this map | `main()` | os, sys |
| `tests/__init__.py` | Test package marker | — | — |
| `tests/test_app.py` | 87 pytest tests covering all routes, grading & projects | — | app.py |
| `Procfile` | Heroku/gunicorn entry point | `web: gunicorn app:app` | — |
| `requirements.txt` | Python dependencies (Flask, SQLAlchemy, psycopg2-binary, dotenv) | — | — |
| `.gitignore` | Git ignore rules for virtual environments, secrets, caches, and local databases | — | — |
| `.env.example` | Safe environment variable template with placeholders | `DATABASE_URL`, `AUTH_PROVIDER`, `SUPABASE_URL` | deployment environment |
| `hello.txt` | Temp file from phase 21 file I/O test | — | — |
| `test_server.ps1` | PowerShell server test script | — | — |
| `migrations/alembic.ini` | Alembic configuration for Flask-Migrate | — | — |
| `migrations/env.py` | Migration runtime environment configuration | — | — |
| `migrations/script.py.mako` | Migration template | — | — |
| `migrations/versions/875c0c33b844_baseline_existing_tables.py` | Baseline migration representing existing initial database tables | — | — |
| `migrations/versions/c7b02afa39ff_add_username_show_on_leaderboard_xp_.py` | Migration adding username, show_on_leaderboard, xp_events, and performance indexes | — | — |

---

## 4. Routes and API

### Page Routes (`app.py`)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | Home — phase grid |
| GET | `/map` | Visual phase map |
| GET | `/lesson/<phase_id>` | Lesson + challenges |
| GET | `/playground` | Code playground |
| GET | `/profile` | User profile (**authentication required**; redirects to `/login`) |
| GET | `/dashboard` | Protected learner dashboard (**authentication required**; redirects to `/login`) |
| GET | `/about` | About page |
| GET | `/login` | Login page |
| GET | `/register` | Register page |
| GET | `/project/<project_id>` | Guided milestone project (1–5) with editor & tests |
| GET | `/cheatsheet` | Printable syntax cheat sheet (Beginner, Core, Intermediate) |

### API Endpoints

| Method | Path | Purpose | Handler |
|--------|------|---------|---------|
| POST | `/api/register` | Create account in Supabase (or local development fallback); may require email confirmation | `api/auth.py` |
| POST | `/api/login` | Sign in through Supabase and set opaque Flask session (or local development fallback) | `api/auth.py` |
| POST | `/api/logout` | Clear server-side Auth session | `api/auth.py` |
| GET | `/api/me` | Current user info + XP + streak (authentication required) | `api/auth.py` |
| GET | `/api/phases` | List all phases (with user progress) | `api/content.py` |
| GET | `/api/phases/<id>` | Single phase data (lesson + challenges) | `api/content.py` |
| POST | `/api/phases/<id>/submit` | Grade answers, award XP/stars/badges | `api/content.py` |
| GET | `/api/progress` | Full progress for current user | `api/progress.py` |
| POST | `/api/merge-guest` | Merge localStorage progress on sign-up | `api/progress.py` |
| POST | `/api/run` | Server-side Python code runner fallback | `api/run.py` |
| GET | `/api/projects` | List 5 milestone mini-projects | `api/projects.py` |
| GET | `/api/projects/<id>` | Single mini-project steps, starter & tests | `api/projects.py` |
| POST | `/api/projects/<id>/complete` | Award project completion bonus XP + badge | `api/projects.py` |

---

## 5. Database

**File:** `instance/pythcode.db` (SQLite). Models in `models.py`.

| Table | Columns | Notes |
|-------|---------|-------|
| `users` | `id`, `name`, `username` (unique, nullable), `email` (unique), `password_hash`, `xp` (int, default 0, indexed), `streak` (int), `show_on_leaderboard` (bool, default true), `last_active` (timestamptz) | Password: Werkzeug or Supabase-managed; RLS enabled |
| `progress` | `id`, `user_id` (FK→users), `phase_id` (int), `best_score` (float 0–1), `stars` (int 1–3), `completed_at` | Unique on user_id+phase_id; indexed on (user_id, stars); RLS enabled |
| `attempts` | `id`, `user_id` (FK→users), `phase_id`, `score` (float), `created_at` | Append-only history; indexed on (user_id, phase_id); RLS enabled |
| `badges` | `id`, `user_id` (FK→users), `badge_key` (str), `earned_at` | Unique per user+badge_key; RLS enabled |
| `auth_sessions` | `id`, `session_key` (unique opaque value), `user_id` (FK→users), `supabase_user_id`, `access_token`, `refresh_token`, timestamps | Server-side Supabase session data; tokens never sent to browser; RLS enabled |
| `auth_identities` | `id`, `user_id` (FK→users), `supabase_user_id` (unique), `created_at` | Permanent mapping between Supabase Auth UID and local User record; RLS enabled |
| `xp_events` | `id`, `user_id` (FK→users), `amount` (int), `reason` (str), `phase_id` (nullable int), `created_at` (timestamptz) | Audit log of XP transactions; indexed on user_id and created_at; RLS enabled |

**Relationships:** User →(1:M) Progress, Attempts, Badges, XP Events, Auth Sessions.
**Row Level Security (RLS):** Enabled on all public tables with zero public access policies (protected from PostgREST/Data API while Flask backend superuser retains full access).

---

## 6. Frontend

### Design Tokens (CSS vars in `main.css`)

| Token | Value | Usage |
|-------|-------|-------|
| `--accent` | `#C6FF1A` | Buttons, highlights, stars |
| `--bg` | `#0A0A0A` | Page background (dark mode) |
| `--surface` | `#121512` | Cards, panels |
| `--text` | `#E8E8E8` | Body text |
| `--text-muted` | `#888` | Secondary text |
| Font (heading) | Syne (Google Fonts) | Phase titles, nav |
| Font (body) | Inter (Google Fonts) | Lesson text |
| Font (code) | JetBrains Mono (Google Fonts) | Code blocks, editor |

### Animation Libraries (loaded in `base.html`)

- **anime.js 3.2.1** — XP bar animations, star reveals, card entrance effects
- **motion.dev 10.18.0** — Scroll-triggered animations on lesson steps

### Code Editor (`lesson.js`, `playground.js`, `editor.css`)

- **CodeMirror 5.65.16** — Python syntax highlighting
- Tab → 4 spaces, Ctrl+Enter → run, auto-close brackets/quotes
- Editor must be initialized while visible (call `editor.refresh()` on tab show)
- Line numbers share font + line-height with code area (fix in `editor.css`)

### Pyodide / Code Runner (`code-runner.js`, `pyodide-worker.js`)

- **Primary:** Pyodide v0.26.4 in Web Worker (client-side, no network for run)
- **Fallback:** `POST /api/run` (subprocess, 5-second timeout)
- Infinite loop protection: worker killed after timeout; error shown to user
- `code-runner.js` selects worker vs fallback automatically

---

## 7. Content

### Phase List

| # | Title | File | Lessons | Challenges | Format | Notes |
|---|-------|------|---------|------------|--------|-------|
| 1 | What is Python? | phase_01.json | 4 | 8 | v1 | rewritten (CONTENT_STANDARD) |
| 2 | Print, Comments & Basic Syntax | phase_02.json | 4 | 8 | v1 | rewritten |
| 3 | Variables | phase_03.json | 4 | 8 | v1 | rewritten |
| 4 | Data Types | phase_04.json | 4 | 8 | v1 | rewritten |
| 5 | Type Conversion and input() | phase_05.json | 4 | 8 | v1 | rewritten |
| 6 | Numbers and Operators | phase_06.json | 4 | 8 | v1 | rewritten |
| 7 | Strings | phase_07.json | 7 | 13 | v1 | rewritten (CONTENT_STANDARD) |
| 8 | String Methods and f-strings | phase_08.json | 7 | 13 | v1 | rewritten (CONTENT_STANDARD) |
| 9 | Booleans and Comparisons | phase_09.json | 7 | 13 | v1 | rewritten (CONTENT_STANDARD) |
| 10 | If, elif, else | phase_10.json | 7 | 13 | v1 | rewritten (CONTENT_STANDARD) |
| 11 | For Loops | phase_11.json | 7 | 13 | v1 | rewritten (CONTENT_STANDARD) |
| 12 | While Loops | phase_12.json | 7 | 13 | v1 | rewritten (CONTENT_STANDARD) |
| 13 | Lists | phase_13.json | 7 | 13 | v1 | rewritten (CONTENT_STANDARD) |
| 14 | Tuples & Sets | phase_14.json | 7 | 13 | v1 | rewritten (CONTENT_STANDARD) |
| 15 | Dictionaries | phase_15.json | 7 | 13 | v1 | rewritten (CONTENT_STANDARD) |
| 16 | Functions | phase_16.json | 7 | 13 | v1 | rewritten (CONTENT_STANDARD) |
| 17 | Functions In Depth | phase_17.json | 7 | 13 | v1 | rewritten (CONTENT_STANDARD) |
| 18 | Nested Data Structures | phase_18.json | 7 | 13 | v1 | rewritten (CONTENT_STANDARD) |
| 19 | Comprehensions | phase_19.json | 7 | 13 | v1 | rewritten (CONTENT_STANDARD) |
| 20 | Error Handling | phase_20.json | 7 | 13 | v1 | rewritten (CONTENT_STANDARD) |
| 21 | Files | phase_21.json | 7 | 13 | v1 | rewritten (CONTENT_STANDARD) |
| 22 | Modules | phase_22.json | 7 | 13 | v1 | rewritten (CONTENT_STANDARD) |
| 23 | Classes & Objects | phase_23.json | 7 | 13 | v1 | rewritten (CONTENT_STANDARD) |
| 24 | Inheritance & OOP | phase_24.json | 7 | 13 | v1 | rewritten (CONTENT_STANDARD) |
| 25 | Useful Built-ins | phase_25.json | 7 | 13 | v1 | rewritten (CONTENT_STANDARD) |
| 26 | Debugging Like a Pro | phase_26.json | 7 | 13 | v1 | rewritten (CONTENT_STANDARD) |
| 27 | Recursion & Algorithms | phase_27.json | 7 | 13 | v1 | rewritten (CONTENT_STANDARD) |
| 28 | Decorators & Generators | phase_28.json | 7 | 13 | v1 | rewritten (CONTENT_STANDARD) |
| 29 | Writing Clean Python | phase_29.json | 7 | 13 | v1 | rewritten (CONTENT_STANDARD) |
| 30 | Final Projects | phase_30.json | 7 | 13 | v1 | rewritten (CONTENT_STANDARD) |

### Phase JSON Formats

**Format v1 (phases 1–10):**
```json
{
  "id": 1, "title": "...", "description": "...",
  "lesson": [
    {"heading": "...", "text": "...", "code": "...", "output": "..."}
  ],
  "challenges": [
    {
      "id": 1, "type": "mcq|predict|fill|write|order|find_bug|error_type",
      "difficulty": "easy|medium|hard",
      "subtype": "mini_task|find_bug|order|error_type",
      "question": "...", "options": ["..."],
      "answer": "...",
      "hints": ["small hint", "bigger hint", "answer hint"],
      "explanation": "..."
    }
  ]
}
```

**Format v2 (phases 11–26):**
```json
{
  "id": 11, "title": "...", "description": "...",
  "lessons": [{"title": "...", "body": "<p>HTML...</p>"}],
  "challenges": [
    {"id": "c11_1", "type": "...", ...same fields as v1...}
  ]
}
```

**Key notes:**
- Challenge IDs: integers (v1), strings like `"c11_1"` (v2). JS uses `String(ch.id)` everywhere.
- `lesson.js` detects HTML body with `step.text?.includes('<')` and skips markdown processing.
- Grading: `_grade_answer()` dispatches to type-specific graders (server). Client uses same logic.

---

## 8. Feature Status

| Feature | Status | Notes |
|---------|--------|-------|
| Login / Register / Logout | ✅ Done | Supabase Auth in production (`AUTH_PROVIDER=supabase`); local Werkzeug-based fallback for development/tests |
| Protected profile route | ✅ Done | `/profile` redirects unauthenticated visitors to `/login`; Supabase identity is validated server-side |
| Guest mode | ✅ Done | localStorage + merge on sign-up |
| Phase locking/unlocking | ✅ Done | Previous phase ≥60% unlocks next |
| Lessons (read) | ✅ Done | 30 phases, v1 format (CONTENT_STANDARD) |
| Challenges (all types) | ✅ Done | mcq, predict, fill, write, order, find_bug, error_type |
| Grading (server) | ✅ Done | Fair: trims spaces, allows quotes variants, AST-equiv |
| XP system | ✅ Done | Awarded proportionally to score per attempt |
| Stars (1–3) | ✅ Done | 1★ ≥50%, 2★ ≥80%, 3★ =100% |
| Streak tracking | ✅ Done | Via `last_active` date on `users` |
| Badges | ✅ Done | Per-phase, beginner_complete, perfect_score, streak_3/7, century |
| Leaderboard | ❌ Not started | Mentioned in TECH_STACK; no route or UI |
| Daily challenge | ❌ Not started | — |
| Progress save/restore | ✅ Done | DB for logged-in, localStorage for guest |
| Pyodide code runner | ✅ Done | Web Worker + /api/run fallback |
| Infinite loop protection | ✅ Done | Worker timeout + error display |
| Mobile layout | ✅ Done | CSS responsive; Submit button fix applied |
| Dark/light mode | ✅ Done | CSS vars + toggle in main.js |
| Difficulty/subtype badges | ✅ Done | CSS in lesson.css, rendered in lesson.js |
| 3-level hints | ✅ Done | `hints[]` array + toggleHint() progressive reveal |
| Phase map visual | ✅ Done | SVG/canvas in phase_map.js |
| Code tracer (step-by-step) | ✅ Done | Precomputed trace in JSON, animated line highlight, variables table, call stack |
| Milestone mini-projects | ✅ Done | 5 projects with checklist, starter code, and test runners |
| Lesson helpers | ✅ Done | Copy code, Open in Playground, Bookmark, Continue banner, search box |
| Printable Cheat Sheet | ✅ Done | `/cheatsheet` with Beginner, Core, Intermediate tabs and print styles |
| Encouragement & Review screen | ✅ Done | Anime.js stars pop, XP counter, 3 bullets learned, failure topic reviews |

---

## 9. Known Bugs and TODO

### Bugs (open)
- `hello.txt` left in project root by phase 21 file I/O test — harmless but untidy.

### TODO
- [x] Rewrite phases 19–26 and add phases 26–30 (total 30 phases) to follow `docs/CONTENT_STANDARD.md`
- [ ] Add leaderboard (`/api/leaderboard`, leaderboard page)
- [ ] Add daily challenge feature
- [ ] Delete or `.gitignore` `hello.txt`
- [ ] Add `tools/` directory to `requirements.txt` or Makefile for CI

---

## 10. Decisions and Gotchas

| Topic | Decision / Trap |
|-------|----------------|
| Git | Not installed on dev machine. Use xcopy backups. |
| CodeMirror init | Must be initialized while element is visible. Call `editor.refresh()` on tab activation. |
| Line numbers | Must share the same `font-family`, `font-size`, and `line-height` as the code area (fixed in `editor.css`). |
| Phase format split | Phases 1–30 now all standardized on 7-section `"lesson"` array + 13 challenges with `"hints"`. Duality preserved in parser for backward compatibility. |
| HTML in lessons | `lesson.js` checks `step.text?.includes('<')` to skip `markdownToHtml()`. |
| Challenge ID coercion | Always use `String(ch.id)` in JS — IDs are integers (v1) or strings (v2). |
| Grading fairness | `_grade_predict()` accepts single/double quotes, `0:3` == `:3`, trailing spaces. Never mark correct answer wrong. |
| Pyodide CDN | Loaded from jsDelivr. If offline, falls back to `/api/run`. |
| Leaderboard | Stub exists in TECH_STACK docs but zero implementation. Don't reference it in UI yet. |
| `hello.txt` | Created by phase 21 `open('hello.txt','w')` test execution — not a source file. |
| Test count | 87 tests in `tests/test_app.py`. Run with `python -m pytest tests/test_app.py -q`. |
| DB location | `instance/pythcode.db` (created by Flask on first run). Not in source control. |
| Supabase Auth | Set `AUTH_PROVIDER=supabase`, `SUPABASE_URL`, and `SUPABASE_PUBLISHABLE_KEY` from Supabase Settings → API. Use only the publishable key; never expose a service-role key. `.env.example` is a placeholder-only template. |
| Supabase sessions | Supabase access and refresh tokens are stored in `auth_sessions` on the server. The browser gets only Flask's signed opaque session key. The app validates Supabase identity before protected data access and refreshes an expired access token once. |

---

## 11. Change Log

| Date | What changed | Files changed |
|------|-------------|---------------|
| 2026-11-06 | Prepared project for Render deployment: pinned psycopg2-binary and SQLAlchemy in requirements.txt, verified Procfile and app instance, configured dynamic port/host/debug binding, created docs/DEPLOY_RENDER.md, and unstaged cached artifacts from git | requirements.txt, app.py, .env.example, docs/DEPLOY_RENDER.md, docs/PROJECT_MAP.md |
| 2026-11-06 | Made server listening port configurable via PORT env var in app.py; diagnosed ERR_CONNECTION_REFUSED caused by background process lifecycle and sandbox network isolation | app.py, docs/PROJECT_MAP.md |
| 2026-11-06 | Increased Supabase Auth timeout to 20s and hardened login/register redirect checks against stale sessions | app.py, api/supabase_auth.py, docs/PROJECT_MAP.md |
| 2026-11-06 | Configured Flask-Migrate with baseline migration and upgrade migration (added username, show_on_leaderboard, xp_events, and indexes); enabled RLS on all public tables with zero public policies | app.py, models.py, requirements.txt, migrations/*, docs/PROJECT_MAP.md |
| 2026-11-06 | Implemented git safety fixes: created .gitignore, unstaged .env, added psycopg2-binary and python-dotenv to requirements.txt, and refreshed .env.example placeholders | .gitignore, requirements.txt, .env.example, docs/PROJECT_MAP.md |
| 2026-11-06 | Added protected /dashboard route and template with @login_required; added unit test coverage | app.py, templates/dashboard.html, tests/test_app.py, docs/PROJECT_MAP.md |
| 2026-11-06 | Configured automatic .env loading and NEXT_PUBLIC_* variable aliases in app.py for Supabase integration; updated test fixture and ignored .env in check_map.py | app.py, tools/check_map.py, tests/test_app.py, docs/PROJECT_MAP.md |
| 2026-11-06 | Added learning aids and projects: Code Tracer (step-by-step visual in 8 key phases), 5 Milestone Mini-Projects with guided steps, checklist, tests and badges, Lesson Helpers (Copy code, Open in Playground, Bookmark, Continue banner, search box, Printable Cheat Sheet), and Encouragement Results Screen with anime.js star pop and failure topic reviews | content/phase_03.json, phase_06.json, phase_10.json … phase_27.json, content/mini_projects.json, api/projects.py, api/badges.py, app.py, templates/project.html, templates/cheatsheet.html, static/js/project.js, static/js/lesson.js, static/js/home.js, static/js/phase_map.js, static/css/lesson.css, static/css/main.css, tests/test_app.py, docs/TECH_STACK.md, docs/PROJECT_MAP.md |
| 2026-11-06 | Added Supabase Auth integration, server-side opaque session storage, protected `/profile` and authenticated APIs, configuration template, and Auth session regression coverage | app.py, models.py, api/auth.py, api/supabase_auth.py, api/content.py, api/progress.py, api/projects.py, templates/register.html, tests/test_app.py, .env.example, docs/PROJECT_MAP.md |
| 2026-11-06 | Rewrote phases 19–25 to CONTENT_STANDARD and added phases 26–30 (total 30 phases: Debugging, Algorithms, Decorators/Generators, Clean Python, Final Projects; 7 sections, 13 challenges each with 3-level hints, tested); updated app, UI, tests | content/phase_19.json … phase_30.json, api/content.py, app.py, static/js/lesson.js, templates/home.html, templates/phase_map.html, tests/test_app.py, docs/PROJECT_MAP.md |
| 2026-11-05 | Rewrote phases 13–18 to CONTENT_STANDARD (7 lesson sections, 13 challenges each with 3-level hints, tested) | content/phase_13.json … phase_18.json, docs/PROJECT_MAP.md |
| 2026-11-05 | Rewrote phases 7–12 to CONTENT_STANDARD (7 lesson sections, 13 challenges each with 3-level hints, tested) | content/phase_07.json … phase_12.json, docs/PROJECT_MAP.md |
| 2026-11-05 | Created PROJECT_MAP.md, AGENTS.md, tools/check_map.py (project memory system) | docs/PROJECT_MAP.md, AGENTS.md, tools/check_map.py |
| 2026-11-05 | Added difficulty/subtype badges, 3-level hints to challenge renderer | static/css/lesson.css, static/js/lesson.js |
| 2026-11-05 | Added docs/TECH_STACK.md with new Phase JSON schema (difficulty, subtype, hints, explanation fields) | docs/TECH_STACK.md, files/TECH_STACK.md |
| 2026-11-05 | Created docs/CONTENT_STANDARD.md with 7-section lesson structure rules | docs/CONTENT_STANDARD.md |
| 2026-11-05 | Rewrote phases 1–6 to follow CONTENT_STANDARD | content/phase_01.json … phase_06.json |
| 2026-11-05 | Fixed all console errors, mobile Submit button, grading fairness, code editor line numbers, infinite loop protection | multiple static/ and api/ files |

