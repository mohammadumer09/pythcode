/**
 * playground.js — Full code playground with CodeMirror + CodeRunner.
 */

const DEFAULT_CODE = `# Welcome to pythcode Playground!
# Write Python here and click Run.

name = "Python"
print(f"Hello from {name}!")

for i in range(1, 6):
    print(f"  {i}. Learning is fun!")
`;

const SNIPPETS = {
  hello: `# Hello World
print("Hello, World!")
print("pythcode is awesome!")
`,
  fib: `# Fibonacci sequence
def fib(n):
    a, b = 0, 1
    for _ in range(n):
        print(a, end=" ")
        a, b = b, a + b
    print()

fib(10)
`,
  list: `# List operations
fruits = ["apple", "banana", "cherry"]
print("Original:", fruits)

fruits.append("mango")
fruits.sort()
print("Sorted:  ", fruits)

print("Count:", len(fruits))
print("First:", fruits[0])
print("Last: ", fruits[-1])
`,
  fstring: `# f-strings
name  = "Alice"
score = 97.5
grade = "A"

print(f"Name:  {name}")
print(f"Score: {score:.1f}%")
print(f"Grade: {grade}")
print(f"{name} scored {score:.0f} — that's an {grade}!")
`,
};

/* ── Init CodeMirror ─────────────────────────────────────── */
const cm = CodeMirror(document.getElementById("cmEditor"), {
  value:             DEFAULT_CODE,
  mode:              "python",
  lineNumbers:       true,
  tabSize:           4,
  indentUnit:        4,
  indentWithTabs:    false,
  autoCloseBrackets: true,
  extraKeys:         {
    Tab: cm => {
      if (cm.somethingSelected()) {
        cm.indentSelection("add");
      } else {
        cm.replaceSelection("    ", "end");
      }
    },
    "Shift-Tab":  cm => cm.indentSelection("subtract"),
    "Ctrl-Enter": () => runCode(),
    "Cmd-Enter":  () => runCode(),
  },
  autofocus: true,
});

cm.on("focus", () => cm.refresh());
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => cm.refresh());
}

/* ── Wire up CodeRunner status ───────────────────────────── */
const badge = document.getElementById("engineBadge");

CodeRunner.onStatusChange = (status) => {
  const labels = {
    loading: '<span class="spinner" style="width:10px;height:10px"></span> Loading Python…',
    pyodide: "⚡ Running in browser",
    server:  "☁️  Using server (offline mode)",
    error:   "⚠ Runner unavailable",
  };
  badge.className = `engine-badge ${status}`;
  badge.innerHTML = labels[status] || status;
};

// Preload Pyodide in background immediately
CodeRunner.preload();

// Check for incoming code from lesson ("Open in Playground" button)
try {
  const incoming = sessionStorage.getItem("pythcode_playground_code");
  if (incoming) {
    cm.setValue(incoming);
    sessionStorage.removeItem("pythcode_playground_code");
  } else {
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get("code");
    if (codeParam) {
      cm.setValue(decodeURIComponent(codeParam));
    }
  }
} catch (e) {}

/* ── Run button ──────────────────────────────────────────── */
const runBtn    = document.getElementById("runBtn");
const outputEl  = document.getElementById("outputBody");

runBtn.addEventListener("click", runCode);

// Ctrl+Enter / Cmd+Enter shortcut
cm.on("keydown", (_, e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    runCode();
  }
});

async function runCode() {
  if (runBtn.classList.contains("running")) return;
  const code = cm.getValue();
  if (!code.trim()) return;

  runBtn.classList.add("running");
  runBtn.textContent = "⏳ Running…";

  outputEl.textContent = "";
  outputEl.className   = "output-body";

  const result = await CodeRunner.run(code);
  showOutput(result);

  runBtn.classList.remove("running");
  runBtn.innerHTML = "▶ Run";
}

function showOutput({ stdout, stderr, error }) {
  if (error) {
    outputEl.textContent = error + (stderr ? "\n" + stderr : "");
    outputEl.className   = "output-body error-out";
  } else if (stderr) {
    outputEl.textContent = stdout + "\n" + stderr;
    outputEl.className   = "output-body error-out";
  } else if (stdout) {
    outputEl.textContent = stdout;
    outputEl.className   = "output-body success";
  } else {
    outputEl.textContent = "(no output)";
    outputEl.className   = "output-body empty";
  }

  // Animate output in
  if (typeof anime !== "undefined") {
    anime({ targets: outputEl, opacity: [0, 1], translateY: [-8, 0], duration: 300, easing: "easeOutExpo" });
  }
}

/* ── Clear / Reset ───────────────────────────────────────── */
document.getElementById("clearBtn").addEventListener("click", () => {
  cm.setValue("");
  cm.focus();
});

document.getElementById("resetBtn").addEventListener("click", () => {
  cm.setValue(DEFAULT_CODE);
  cm.focus();
});

document.getElementById("clearOutputBtn").addEventListener("click", () => {
  outputEl.textContent = "Run your code to see output here.";
  outputEl.className   = "output-body empty";
});

/* ── Snippets ────────────────────────────────────────────── */
function loadSnippet(key) {
  if (SNIPPETS[key]) {
    cm.setValue(SNIPPETS[key]);
    cm.focus();
  }
}

