# pythcode Content Standard

This document defines the quality and pedagogical rules for every phase in **pythcode**. Every lesson and challenge set must adhere strictly to these standards to ensure a deep, crystal-clear, and beginner-friendly learning experience.

---

## 1. Writing Principles

1. **Simple, Accessible English**: Write directly to the learner. Avoid jargon and pretentious vocabulary.
2. **Define on First Appearance**: Any technical term (e.g. *variable*, *interpreter*, *syntax*, *argument*, *string*, *expression*, *literal*, *scope*, *immutable*) must be defined simply in plain language the very first time it is introduced.
3. **High Signal, Zero Filler**: Teach only what is essential for a beginner-to-intermediate Python programmer. Omit historical trivia, esoteric edge cases, and distracting tangents.
4. **Originality**: All lesson explanations, code examples, challenges, and mini tasks must be 100% original.
5. **Verified Python Code**: Every code snippet and challenge test must be syntactically valid, modern Python (3.10+), and verified by execution.

---

## 2. Phase Lesson Structure

Every phase contains **7 mandatory sections**, delivered in this exact order:

### Section 1: Why This Matters
* **Length**: 2 to 3 clear sentences.
* **Focus**: Explains why this topic exists and provides a tangible real-world application (e.g. tracking items in an online shopping cart, calculating sensor averages, routing server requests).

### Section 2: Core Idea
* **Length**: 1 to 2 short explanatory paragraphs.
* **Component**: A focused, minimal code snippet and its exact printed output.
* **Focus**: Gives the learner the fundamental rule or mental model without overwhelming details.

### Section 3: How Python Runs It
* **Focus**: Takes the core idea and breaks down execution step by step, line by line.
* **Memory & State**: Explicitly describes what happens in computer memory (e.g. *"Python evaluates the right side first, creates the integer 42 in memory, and binds the name score to it"*).
* **Control Flow**: Explains how the Python interpreter moves through the lines from top to bottom.

### Section 4: More Examples
* **Count**: 3 to 5 realistic examples.
* **Progression**: Sequenced from easy/basic to progressively harder or combining multiple techniques.
* **Output**: Every example includes code and its exact printed output.

### Section 5: Common Mistakes
* **Count**: 3 to 5 real mistakes beginners make.
* **Format for each mistake**:
  1. The wrong code snippet.
  2. The exact error name and message Python raises (e.g. `SyntaxError: unterminated string literal`, `NameError: name 'x' is not defined`, `TypeError: can only concatenate str (not "int") to str`).
  3. The explanation of why it happened and the concrete fix.

### Section 6: Best Practice
* **Count**: 2 to 3 actionable, professional tips.
* **Focus**: Pythonic idioms, PEP 8 conventions (such as `snake_case` variable names, 4-space indentation, clear naming over cryptic abbreviations), and readability advice.

### Section 7: Quick Summary
* **Count**: Exactly 5 bullet points.
* **Focus**: The 5 most critical takeaways the learner must remember before attempting the challenges.

---

## 3. Challenge Specifications

Every phase must include **12 to 15 challenges** distributed across three progressive difficulty tiers:

* **Tier 1: Easy** (Questions 1–4 or 1–5): Foundational comprehension, syntax recognition, basic prediction.
* **Tier 2: Medium** (Questions 5–9 or 6–10): Combining concepts, diagnosing common mistakes, filling critical missing logic.
* **Tier 3: Hard** (Questions 10–14 or 11–15): Non-trivial code writing, debugging multi-step logic, edge-case evaluation, and the **Practical Mini Task**.

### Required Challenge Types Mix
1. **Multiple Choice (`mcq`)**: Conceptual understanding and distinction between similar behaviors.
2. **Predict the Output (`predict`)**: Tracing code manually and determining the exact printed text.
3. **Fill in the Blank (`fill`)**: Completing missing keywords, operators, or function names.
4. **Write Code (`code`)**: Writing working Python from scratch against automated test specifications.
5. **Find the Bug (`find_bug` / `code`)**: Identifying syntax or logical errors in starter code and fixing them.
6. **Put Lines in Order (`order` / `mcq`)**: Arranging scrambled lines of logic into the correct execution sequence.
7. **What Error Does This Give? (`error` / `mcq`)**: Identifying the exact exception type (`SyntaxError`, `TypeError`, `ValueError`, `ZeroDivisionError`, `NameError`, etc.) raised by invalid code.

### 3-Level Hints for Code Challenges
Every code challenge must provide a progressive 3-level hint:
* **Level 1 (Small Hint)**: Points in the right direction without giving syntax away (e.g. *"Think about which function turns text into an integer"*).
* **Level 2 (Bigger Hint)**: Suggests the specific method or pattern to use (e.g. *"Use `int(user_text)` and remember to store the result in a variable"*).
* **Level 3 (Solution / Code Hint)**: Shows the concrete implementation or exact solution code.

### Clear Explanations
* Every challenge must include an `explanation` field explaining why the correct answer is right and why the common incorrect options/approaches fail.

### Practical Mini Task
* The final challenge in every phase must be a **practical mini task** (e.g. building a receipt calculator, temperature converter, username validator, simple score tracker) that brings together everything learned in that phase.

---

## 4. Phase JSON Schema Specification

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
      "hint": "Small hint...",
      "explanation": "..."
    },
    {
      "id": "c1_12",
      "type": "code",
      "subtype": "mini_task",
      "difficulty": "hard",
      "question": "Practical Mini Task: ...",
      "starter": "# Write your code here\n",
      "check": "output_contains",
      "answer": "Expected output text",
      "hints": [
        "Level 1: Small hint...",
        "Level 2: Bigger hint...",
        "Level 3: Answer code..."
      ],
      "explanation": "..."
    }
  ]
}
```

