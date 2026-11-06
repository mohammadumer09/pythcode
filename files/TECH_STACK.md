# TECH STACK: pythcode

## 1. Overview
| Layer | Choice | Why |
|---|---|---|
| Backend | **Python 3.11+, Flask** | Required: backend must be Python |
| Database | **SQLite** with Flask-SQLAlchemy | No setup, easy to submit |
| Auth | Flask sessions + werkzeug password hashing | Simple and safe |
| Frontend | Plain **HTML + CSS + vanilla JS**, Tailwind via CDN optional | No build step |
| Animation | **anime.js** and **motion.dev** (see DESIGN.md) | Smooth UI |
| Code editor | CodeMirror 6 or Monaco via CDN | Syntax highlighting |
| Code runner | **Pyodide** in browser, with server fallback | See section 3 |
| Content | One JSON file per phase | Easy to edit |
| Tests | pytest | Basic checks |
| Deploy | Render or PythonAnywhere (gunicorn + Procfile) | Free tiers |

## 2. Libraries from CDN
Only these hosts are used. **Pin every URL to an exact version** (never `latest`) and pick versions that are at least two weeks old.

- anime.js: via jsDelivr
- motion (motion.dev, vanilla JS): via jsDelivr
- Pyodide: via jsDelivr
- Google Fonts: Syne or Unbounded, Inter, JetBrains Mono

Keep Python dependencies few: Flask, Flask-SQLAlchemy, gunicorn, pytest.

## 3. Running learner code (important)
**Primary: Pyodide in the browser.** Safe, nothing runs on the server. Run it in a **Web Worker** so an infinite loop can be stopped (terminate the worker after 5 seconds and show "Your code took too long").

**Fallback: `POST /api/run`.** Needed because Pyodide must download from the internet on first load, and the college demo room may have weak Wi-Fi. The fallback must work on its own:
- Run in a subprocess with a **5 second timeout**
- Limit output size (for example 10 KB) and memory
- No network, no file or system access, restricted imports
- Never use bare `exec()` or `eval()` on user input in the server process
- Rate limit per user or IP

The editor should try Pyodide first. If it fails to load within about 10 seconds, switch to `/api/run` automatically and show a small notice.

## 4. Project structure
```
pythcode/
  app.py                  # Flask app factory + page routes
  models.py               # User, Progress, Attempt, Badge
  api/                    # auth.py, progress.py, content.py, run.py
  content/                # phase_01.json ... phase_26.json
  static/                 # css, js, img, fonts
  templates/              # html pages
  reference/              # UI screenshots (read-only)
  tests/                  # pytest
  requirements.txt
  Procfile
  README.md
  docs/                   # PRD.md, DESIGN.md, TECH_STACK.md
```

## 5. Phase JSON format (Updated to Content Standard)
```json
{
  "id": 1,
  "title": "What is Python?",
  "level": "beginner",
  "estimated_minutes": 15,
  "pass_score": 70,
  "lesson": [
    {
      "heading": "1. Why This Matters",
      "text": "...",
      "code": "...",
      "output": "..."
    },
    {
      "heading": "2. Core Idea",
      "text": "...",
      "code": "...",
      "output": "..."
    },
    {
      "heading": "3. How Python Runs It",
      "text": "...",
      "code": "...",
      "output": "..."
    },
    {
      "heading": "4. More Examples",
      "text": "...",
      "code": "...",
      "output": "..."
    },
    {
      "heading": "5. Common Mistakes",
      "text": "...",
      "code": "...",
      "output": "..."
    },
    {
      "heading": "6. Best Practices",
      "text": "...",
      "code": "...",
      "output": "..."
    },
    {
      "heading": "7. Quick Summary",
      "text": "...",
      "code": "...",
      "output": "..."
    }
  ],
  "challenges": [
    {
      "id": "c1_1",
      "type": "mcq",
      "subtype": "regular",
      "difficulty": "easy",
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "answer": "A",
      "hint": "Single hint or level-1 hint",
      "explanation": "..."
    },
    {
      "id": "c1_12",
      "type": "code",
      "subtype": "mini_task",
      "difficulty": "hard",
      "question": "Practical Mini Task: ...",
      "starter": "# Starter code\n",
      "check": "output_contains",
      "answer": "expected output substring",
      "hints": [
        "Level 1: Small nudge",
        "Level 2: Specific function or pattern",
        "Level 3: Full solution code"
      ],
      "explanation": "..."
    }
  ]
}
```

## 6. Database tables
- `users`: id, name, email, password_hash, xp, streak, last_active
- `progress`: user_id, phase_id, best_score, stars, completed_at
- `attempts`: user_id, phase_id, score, created_at
- `badges`: user_id, badge_key, earned_at

Guest mode keeps progress in the browser (localStorage) and can be merged into an account after sign-up.

## 7. API
```
POST /api/register   POST /api/login   POST /api/logout   GET /api/me
GET  /api/phases                 -> list with lock status and stars
GET  /api/phases/<id>            -> lesson + challenges (no answers for code tests)
POST /api/phases/<id>/submit     -> grade, save score, award XP, unlock next
GET  /api/progress               -> XP, streak, badges
POST /api/run                    -> fallback code runner
GET  /api/leaderboard            -> optional
```
Grade answers on the **server**. Do not trust the browser for scores.

## 8. Security
- Hash passwords. Never store plain text.
- Validate all input. Protect against XSS (escape output) and CSRF.
- Secrets in environment variables, not in code.
- Secure session cookie settings.

## 9. Code rules
Clear, commented, beginner-readable code. Small functions. No dead code. Original lesson text only.

## 10. Testing
- pytest: register/login, phase unlock, grading for each challenge type, `/api/run` timeout.
- Manual: phone and desktop, dark and light, slow network (Pyodide fallback), reduced motion.

## 11. Deploy
Provide `requirements.txt`, `Procfile` (`web: gunicorn app:app`), and README deploy steps for Render and PythonAnywhere. The owner creates the account and clicks Deploy.
