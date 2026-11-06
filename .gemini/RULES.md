# pythcode — Workspace Rules for Antigravity

> These rules apply to every Antigravity session in this workspace (`c:\Users\Lenovo\pythcode`).
> They mirror `AGENTS.md` in the project root.

## 1 — Read the map first
Always read `docs/PROJECT_MAP.md` before opening any source file.
The map has the file index, routes, DB schema, feature status, bugs, and decisions.
Do **not** scan or re-analyze the whole project.

## 2 — Open only relevant files
Open only the files the map says are needed for the current task.
Search for a specific file/function only if the map doesn't answer it.

## 3 — Update the map after every task
After any change (code, content, design, DB, dependencies):
- Update §3 File Index, §4 Routes, §5 Database, §7 Content, §8 Features, §9 Bugs/TODO
- Add a Change Log line in §11 (date | what changed | files)
A task is **not done** until `docs/PROJECT_MAP.md` is updated.

## 4 — Trust code over map
If the map disagrees with the code, trust the code, fix the map, note the discrepancy.

## 5 — No secrets in the map
Never put passwords, API keys, or tokens in `docs/PROJECT_MAP.md` or any docs file.

## 6 — End-of-task report (3 lines)
```
What changed: <one sentence>
Files changed: <comma-separated list>
PROJECT_MAP.md updated: yes
```

## Mandatory pre-finish check
```bash
python tools/check_map.py
```
Fix any files reported as missing from or phantom in the map before finishing.

