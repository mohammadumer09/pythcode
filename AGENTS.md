# AGENTS.md — Rules for All AI Agents Working on pythcode

> Every agent (human or AI) working on this project **must follow these rules**.
> These rules exist to keep the project stable, the map accurate, and future work fast.

---

## Rule 1 — Read the map first

**Always read `docs/PROJECT_MAP.md` before opening any source file.**
The map contains the file index, routes, database schema, feature status, known bugs, and decisions.
Do not scan or re-analyze the whole project — the map has already done that.

## Rule 2 — Open only what the map says you need

Open only the files the map identifies as relevant to your task.
If the map doesn't answer a specific question, search for the exact file or function.
Do not read every file in the project.

## Rule 3 — Update the map after every task

**After every task that changes anything** (code, content, design, database, dependencies):
- Update the File Index if any file was added, removed, or renamed.
- Update Routes & API if any endpoint changed.
- Update the Database section if any model changed.
- Update the Phase Status table if any phase content changed.
- Update the Feature Status table if any feature changed.
- Update the Known Bugs / TODO section.
- **Add a Change Log line** (date | what changed | which files).

A task is **not finished** until `docs/PROJECT_MAP.md` is updated.

## Rule 4 — Trust the code over the map

If the map disagrees with the actual code, **trust the code**.
Fix the map to match reality and mention the discrepancy in your report.

## Rule 5 — No secrets in the map

Never put passwords, API keys, tokens, or secrets in `docs/PROJECT_MAP.md` or any docs file.

## Rule 6 — End-of-task report

End every task with exactly this 3-line report:
```
What changed: <one sentence>
Files changed: <comma-separated list>
PROJECT_MAP.md updated: yes
```

---

## Mandatory pre-finish check

Run this before finishing any task:
```bash
python tools/check_map.py
```
Fix any files it reports as missing from the map or phantom in the map.

---

## Quick reference

| Task | First step |
|------|-----------|
| Any code change | Read §3 (File Index) + relevant section |
| Add a phase | Read §7 (Content) for JSON format |
| Change an API | Read §4 (Routes) + §5 (Database) |
| Fix a bug | Read §9 (Known Bugs) first — it may already be listed |
| Add a feature | Read §8 (Feature Status) to check if it's already started |

