"""
tools/check_map.py
------------------
Verifies that every project file is mentioned in docs/PROJECT_MAP.md
(or any file under docs/map/).

Exit codes:
  0 — all files accounted for
  1 — missing or phantom files found

Usage:
  python tools/check_map.py
"""

import os
import sys

# ── Configuration ────────────────────────────────────────────────────────────

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

# Directories to skip entirely when walking the project
IGNORE_DIRS = {
    ".git",
    "venv",
    "node_modules",
    "__pycache__",
    ".pytest_cache",
    "instance",
    "reference",   # read-only screenshots, not tracked in map
}

# Individual filenames to skip (temp / generated files)
IGNORE_FILES = {
    "hello.txt",   # created by phase 21 file I/O lesson execution
    "pythcode.db",
    ".env",
}

# File extensions to skip
IGNORE_EXTENSIONS = {".pyc", ".pyo", ".db", ".sqlite", ".sqlite3"}

# Map files to search (relative to project root)
MAP_FILES = ["docs/PROJECT_MAP.md"]
MAP_GLOB_DIR = os.path.join(PROJECT_ROOT, "docs", "map")  # optional split dir


# ── Helpers ──────────────────────────────────────────────────────────────────

def collect_project_files():
    """Walk project root and return a set of relative paths (forward slashes)."""
    result = set()
    for dirpath, dirnames, filenames in os.walk(PROJECT_ROOT):
        # Prune ignored directories in-place
        dirnames[:] = [
            d for d in dirnames
            if d not in IGNORE_DIRS and not d.startswith(".")
        ]
        for fname in filenames:
            if fname in IGNORE_FILES:
                continue
            ext = os.path.splitext(fname)[1].lower()
            if ext in IGNORE_EXTENSIONS:
                continue
            abs_path = os.path.join(dirpath, fname)
            rel = os.path.relpath(abs_path, PROJECT_ROOT).replace("\\", "/")
            result.add(rel)
    return result


def collect_map_text():
    """Read all map files and return combined text."""
    texts = []
    for rel in MAP_FILES:
        path = os.path.join(PROJECT_ROOT, rel)
        if os.path.isfile(path):
            with open(path, encoding="utf-8") as fh:
                texts.append(fh.read())
    # Also read docs/map/*.md if it exists
    if os.path.isdir(MAP_GLOB_DIR):
        for fname in os.listdir(MAP_GLOB_DIR):
            if fname.endswith(".md"):
                path = os.path.join(MAP_GLOB_DIR, fname)
                with open(path, encoding="utf-8") as fh:
                    texts.append(fh.read())
    return "\n".join(texts)


def file_in_map(rel_path, map_text):
    """Return True if rel_path (or its basename) appears anywhere in map_text."""
    # Check full relative path variants
    variants = [
        rel_path,                                    # docs/PROJECT_MAP.md
        rel_path.replace("/", "\\"),                 # docs\PROJECT_MAP.md
        os.path.basename(rel_path),                  # PROJECT_MAP.md
        f"`{rel_path}`",                             # `docs/PROJECT_MAP.md`
        f"`{os.path.basename(rel_path)}`",           # `PROJECT_MAP.md`
    ]
    for v in variants:
        if v in map_text:
            return True
    return False


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    print(f"Project root: {PROJECT_ROOT}")
    print(f"Map files:    {MAP_FILES}")
    print()

    project_files = collect_project_files()
    map_text = collect_map_text()

    if not map_text.strip():
        print("ERROR: Could not read any map file. Check that docs/PROJECT_MAP.md exists.")
        sys.exit(1)

    missing_from_map = []   # exist on disk, not in map
    for rel in sorted(project_files):
        if not file_in_map(rel, map_text):
            missing_from_map.append(rel)

    # ── Report ───────────────────────────────────────────────────────────────
    total = len(project_files)
    print(f"Files found on disk:     {total}")
    print(f"Files missing from map:  {len(missing_from_map)}")
    print()

    if missing_from_map:
        print("── Files NOT mentioned in the map ──────────────────────────")
        for f in missing_from_map:
            print(f"  MISSING  {f}")
        print()
        print("Add these files to docs/PROJECT_MAP.md (§3 File Index).")
        sys.exit(1)
    else:
        print("✓ All project files are mentioned in the map.")
        sys.exit(0)


if __name__ == "__main__":
    main()

