# PRD: pythcode (Learn Python, Phase by Phase)

## 0. Owner details (fill in before giving to Antigravity)

| Item | Value |
|---|---|
| Website name | **pythcode** |
| Project title for college | `[PROJECT TITLE]` |
| Team / student names | `[NAMES]` |
| College, department, guide name | `[DETAILS]` |
| Report format needed | `[e.g. PDF, PPT, both]` |
| Logo (optional) | `[put file in /reference/logo.png]` |
| Build order | **Build phases 1 to 10 first and make them fully work. Then build phases 11 to 26.** |

## 1. Goal
A website that teaches Python from zero to intermediate, one phase at a time. Learn by reading a short lesson, running code, and solving challenges. It is a learning path, NOT a survival game. No health, enemies or story. Light game feel only: XP, stars, streaks, badges, progress bar.

## 2. Users
- Complete beginners (students) who want simple English and small steps.
- Evaluators at the college who will open the site and try it.

## 3. How a phase works
1. Short lesson (2 to 4 steps, plain English, small examples).
2. Runnable example with a Run button and output.
3. 6 to 10 challenges: multiple choice, predict the output, fill in the blank, write real code.
4. Phase test. Pass score 70%.
5. Stars (1 to 3) and XP. The next phase unlocks only after passing.

Explain every new word in simple language.

## 4. Phases

**Beginner**
1. What is Python? (what it is, uses, how code runs, first `print`)
2. Print, comments and basic syntax
3. Variables
4. Data types (`int`, `float`, `str`, `bool`, `type()`)
5. Type conversion and `input()`
6. Numbers and operators
7. Strings (indexing, slicing, `len`)
8. String methods and f-strings
9. Booleans and comparisons
10. If, elif, else

**Core**
11. For loops and `range()`
12. While loops, `break`, `continue`
13. Lists
14. Tuples and sets
15. Dictionaries
16. Functions
17. Functions in depth (scope, `*args`, `**kwargs`, `lambda`)
18. Nested data and loops

**Intermediate**
19. List and dict comprehensions
20. Error handling
21. Files
22. Modules
23. Classes and objects
24. Inheritance and OOP basics
25. Useful built-ins (`map`, `filter`, `zip`, `enumerate`, `sorted`, `any`, `all`)
26. Final project: calculator, to-do list, quiz, then a graduation certificate

Content files: `content/phase_01.json` to `content/phase_26.json`.

## 5. Pages
Home, Phase Map (lock, unlock, stars), Lesson + Practice, Code Playground, Profile/Progress (XP, streak, badges), Login/Register, About.

## 6. Features
**Must have**
- Phase map with locking, stars and progress bar
- Lesson page with runnable examples
- All 4 challenge types with instant feedback, hints, explanations
- In-browser code editor with Run button and output panel
- XP, daily streak, badges (e.g. "First Print", "Loop Master")
- Login/register and guest mode
- Responsive UI matching DESIGN.md

**Nice to have (only if time allows)**
Leaderboard, lesson search, bookmarks, review-mistakes mode, certificate PDF, simple admin page.

## 7. Build order
No time limit. Focus on quality.

1. Read all docs and every image in `/reference/`. Write a short plan and the design tokens.
2. Project setup: Flask app, database models, "Hello" page.
3. UI shell: layout, navbar, Home, Phase Map, Lesson page.
4. Lesson engine and all 4 challenge types.
5. Content for phases 1 to 10. Make sure they fully work.
6. Login, guest mode, XP, streak, badges.
7. Code editor with Pyodide and the `/api/run` fallback.
8. Content for phases 11 to 26.
9. Polish: mobile layout, dark and light mode, animations, error pages, loading states.
10. Test everything, fix bugs, write the README, prepare deploy files.
11. **When everything is complete, stop and tell the owner to host the website** (see section 11).

## 8. Who does what
**Antigravity does:** all code, files, packages, lesson content, local run, browser testing, tests, README, bug fixes, deploy files.

**Owner does (Antigravity cannot):**
- Save reference screenshots in `/reference/`
- Install Python 3.11+ and approve terminal commands
- Create hosting account (Render or PythonAnywhere) and click Deploy
- Test on a real phone
- Check lesson accuracy
- Provide college details (section 0) and report format
- Handle anything that needs payment or private keys

If Antigravity needs an owner-only item, it must stop and give a short numbered checklist. Otherwise it keeps working.

## 9. Done checklist
- [ ] `pip install -r requirements.txt` then `python app.py` runs with no errors
- [ ] Phases load, lock and unlock correctly, progress survives refresh
- [ ] Every challenge type grades right and wrong answers correctly
- [ ] Code editor runs code and shows errors clearly; an infinite loop does not freeze the page
- [ ] Register, login, logout and guest mode work
- [ ] UI matches DESIGN.md on phone and desktop
- [ ] Works with weak internet (see TECH_STACK.md, code runner fallback)
- [ ] No console errors; pytest tests pass
- [ ] README: setup, run, add a phase, deploy
- [ ] Final summary: what was built, what is missing, how to run

## 10. First actions for Antigravity
1. Confirm you read all four files and looked at `/reference/`.
2. Show a plan under 15 lines, then start building without waiting.
3. Report progress after each step in one or two lines.

## 11. When everything is complete: ask the owner to host
When all phases and the whole checklist in section 9 are done, Antigravity must:
1. Stop building.
2. Write this message to the owner: **"The project is complete. Please host it now."**
3. Give a short numbered hosting guide for Render (and PythonAnywhere as backup): which files to upload or connect to GitHub, the build command (`pip install -r requirements.txt`), the start command (`gunicorn app:app`), and any environment variables (for example `SECRET_KEY`) with example values.
4. Say what the owner must click (create account, connect repo, press Deploy) and what to test after hosting (open the link on a phone, register, finish phase 1, run code).
5. Offer to fix any problem the owner finds after hosting.

Antigravity cannot create the hosting account or press Deploy. The owner does that.
