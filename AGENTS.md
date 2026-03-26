# 🤖 AGENTS.md — Development Guidelines for Codex

This repository uses AI-assisted development (Codex).  
Follow these rules strictly to ensure safe, consistent, and efficient changes.

---

## 🚫 Script Usage Policy (CRITICAL)

### ❌ запрещено (forbidden)

Do NOT use scripts to modify source code:

- Python (`python3 - <<`)
- Shell commands (`sed`, `awk`, `cat << EOF`)
- Any automated text replacement scripts

### ✅ allowed

Scripts are ONLY allowed for:

- Database migrations
- Build processes
- Running tests
- Dev/operational tasks

> If a task is about editing code → EDIT FILES DIRECTLY.

---

## ✏️ File Editing Rules

- Always modify files directly (in-place editing)
- Never rewrite entire files unless explicitly requested
- Keep diffs minimal and precise
- Preserve:
  - formatting
  - indentation
  - existing structure

---

## 🧠 Decision Rule

Before performing any action, evaluate:

> “Can this be done by directly editing the file?”

- YES → Edit the file
- NO → Then (and only then) consider commands/scripts

---

## ⚙️ Frontend (Angular)

- Follow Angular style guide
- Keep components modular:
  - `.ts`, `.html`, `.scss` separated
- Avoid breaking template bindings
- Do not rename variables without updating all references
- Maintain consistency with existing patterns

---

## 🧱 Backend (.NET / C#)

- Follow existing architecture (Controllers, Services, Persistence)
- Do not introduce breaking changes in public contracts
- Respect naming conventions:
  - PascalCase for classes
  - camelCase for variables
- Keep methods small and focused

---

## 🔄 Database & Migrations

- Scripts ARE allowed here
- Prefer:
  - idempotent migrations
  - clear naming
- Never modify database state outside migration context

---

## 🧪 Testing & Validation

- Run tests when modifying logic
- Do not introduce breaking changes silently
- Ensure compatibility with existing flows

---

## 🚀 Performance & Safety

- Avoid unnecessary changes
- Do not introduce heavy dependencies without justification
- Prefer simple and maintainable solutions

---

## 🧩 Commit Guidelines

- Keep commits small and focused
- Use clear messages:
  - `fix:`
  - `feat:`
  - `chore:`
- Avoid mixing unrelated changes

---

## ⚠️ Anti-Pattern Warning

If you are about to do something like:

- generate a Python script to edit a file ❌
- use `cat << EOF` to overwrite a file ❌
- run shell commands to replace text ❌

👉 STOP.

Edit the file directly instead.

---

## ✅ Golden Rule

> Direct file editing is ALWAYS preferred over scripting.

---

## 📌 Summary

- No scripts for code edits
- Scripts only for runtime/migrations
- Minimal, precise changes
- Respect project structure
- Think like a developer, not a terminal

---
