# DESIGN: pythcode

Reference images are in `/reference/`. Look at all of them. Match the style, but do not copy their logo, text or assets. Write original content.

## 1. Mood
Dark, modern, techy, premium. Black background, one bright green accent. Lots of space, big clean headings, glass-like dark cards.

## 2. Color tokens (black and green)
Estimated from the reference. Adjust if the images show something different.

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0A0A0A` | page background |
| `--surface` | `#121512` | cards |
| `--surface-2` | `#1A1F1A` | raised cards, inputs |
| `--border` | `rgba(255,255,255,0.08)` | thin card borders |
| `--accent` | `#C6FF1A` | neon lime green: buttons, highlight card, stars |
| `--accent-dark` | `#9BD600` | hover |
| `--on-accent` | `#0A0A0A` | text on green |
| `--text` | `#F2F2F2` | main text |
| `--text-muted` | `#9AA39A` | small text |
| `--success` / `--error` | `#4ADE80` / `#FF5C5C` | answer feedback |

Light mode: white background, near-black text, same green accent but darker (`#6BA800`) for readable contrast. Define all colors as CSS variables with dark and light values.

## 3. Typography
- Headings: wide, bold geometric display font (use Google Fonts: **Syne** or **Unbounded**). Add a fallback stack.
- Body: **Inter**.
- Code: **JetBrains Mono**.
- Headline trick from the reference: one key word in green, the rest white (e.g. "Learn **Python** step by step").

## 4. Components (from the reference)
- **Cards:** dark, rounded (20 to 24px), thin light border, soft glow on hover.
- **Highlight card:** the middle card of a row is filled solid green with black text. Use it for the current phase, featured step, or active plan.
- **Three-card rows:** numbered `01 02 03` cards (use for "How it works", phase groups).
- **Buttons:** pill shape. Primary = green fill, black text, arrow icon. Secondary = dark with border.
- **Step cards with icons:** round icon badge on top, title, short text, button (use for "Learn, Practice, Pass").
- **Floating mini stat cards:** small dark cards with a number (XP, streak, stars), placed around a curved green line chart on the home page.
- **Star row:** small stars for ratings and phase results.
- **Section headings:** centered, with a muted one-line description under.

## 5. Pages and layout
- **Home:** hero with big headline, short text, green "Start learning" button, floating stat cards. Then "How it works" (3 cards), "What you will learn" (Beginner, Core, Intermediate), progress preview, footer.
- **Phase Map:** grid or path of phase cards. States: locked (dim, lock icon), unlocked (border), current (green highlight), done (stars shown). Progress bar on top.
- **Lesson page:** left or top = lesson steps, right or bottom = code editor + output. On phones stack vertically with tabs (Lesson / Practice / Code).
- **Playground:** full editor, Run button, output panel, "Clear" and "Reset".
- **Profile:** XP, streak, badges wall, phases done.
- **Login/Register, About:** simple centered dark card forms.
- **Certificate:** printable page, black and green, with name and date.

## 6. Responsive
Phone first. Breakpoints about 640, 1024 and 1280 px. Tap targets at least 44px. No horizontal scroll. Tables and code scroll inside their own box.

## 7. Animation (anime.js and motion.dev)
Use both libraries, each for what it does best. Keep it smooth and not too heavy.

**anime.js**
- Hero: staggered fade and slide-up of headline words and cards on load.
- Floating stat cards: slow looping float.
- Line chart on home: draw the green curved line (SVG path draw).
- Stars: pop in one by one after passing a phase.
- XP counter: count up.

**motion.dev**
- Scroll reveal: sections and cards fade in when they enter the screen.
- Hover and press effects on cards and buttons (small lift, scale).
- Page and tab transitions.
- Progress bar fill.

**Rules**
- Respect `prefers-reduced-motion`: turn animations off or make them very small.
- Animate only `transform` and `opacity`.
- Keep each animation under about 600 ms, except looping float.
- Animation must never block clicking or reading.

## 8. Accessibility
Contrast at least 4.5:1 (green on black passes). Visible focus ring in green. Keyboard friendly. Do not use color alone for right and wrong (add icon and text).

## 9. Copy style
Simple English. Short sentences. Friendly, not childish.
