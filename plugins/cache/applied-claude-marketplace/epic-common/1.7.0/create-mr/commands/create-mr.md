---
description: Run the full pre-MR pipeline (context, code review, performance, coverage, security, simplify, prettier, tests, MR creation). Each phase prompts before running — answer 'all' to run everything without further prompts.
---

# Create MR — Full Pipeline

9-phase pipeline that prepares and ships your branch as a GitLab MR. Phase 1 runs automatically. Every subsequent phase prompts before running unless you answer `all`.

---

## Phase 1 — Context Gathering (automatic)

Runs automatically — no prompt.

```bash
git fetch origin main
git branch --show-current
git diff origin/main...HEAD --name-only
git diff origin/main...HEAD --stat
git rev-parse --show-toplevel
```

Use Glob to check for `package.json`, `*.sln`, `*.csproj`, and `go.mod` in the project root.

**Detect project:**

- `package.json` with `"name": "chimera-client"` or `"name": "ui-epic"` → **CHIMERA CLIENT** (TypeScript / React — project-specific rules apply)
- `package.json` present (any other name) → **GENERIC CLIENT** (TypeScript / React — generic rules apply)
- `.sln` or `.csproj` present AND solution/project name contains "Chimera" OR `src/published/` directory exists → **CHIMERA SERVER** (C# / .NET — project-specific rules apply)
- `.sln` or `.csproj` present → **GENERIC SERVER** (C# / .NET — generic rules apply)
- `go.mod` present → **GO SERVER**
- Neither → ask the user: "Is this (a) TypeScript/React, (b) C#/.NET, (c) Go, or (d) other?" then treat as the appropriate GENERIC type

Print summary:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase 1 / 9 — Context Gathered  (11%)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Project  : <CHIMERA CLIENT | GENERIC CLIENT | CHIMERA SERVER | GENERIC SERVER | GO SERVER>
Branch   : <branch-name>
Changes  : X files (+Y insertions, -Z deletions)
Files    :
  • src/path/to/ChangedFile.ts  [modified]
  • src/path/to/NewFile.tsx     [added]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Carry the detected project type and project root through all subsequent phases — do not re-detect.

---

## Phase Gating

Before every phase from Phase 2 onward, print the progress line then prompt (unless `run_all` is active):

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase N / 9 — [Phase Name]  (XX%)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Run this phase? [y / n / all]
```

Progress percentages per phase: 1→11%, 2→22%, 3→33%, 4→44%, 5→56%, 6→67%, 7→78%, 8→89%, 9→100%

- `y` → run this phase, prompt again before the next
- `n` → skip this phase, move to the next
- `all` → run this phase and all remaining phases without prompting

Once `all` is answered, set `run_all = true` and skip all subsequent prompts.

**Exception:** If the detected project is CHIMERA CLIENT or GENERIC CLIENT, auto-skip Phase 5 (Security) and print `⏭ Security Review skipped (client project)`.

---

## Phase 2 — Code Review

Read and follow `commands/review-code.md` from this plugin.

Pass through the already-detected project type — skip its detection step.

---

## Phase 3 — Performance Review

Read and follow `commands/review-performance.md` from this plugin.

Pass through the already-detected project type — skip its detection step. Reuse files already read in Phase 2; do not re-read them.

---

## Phase 4 — Code Coverage Check

Read and follow `commands/review-check-coverage.md` from this plugin.

Pass through the already-detected project type — skip its detection step.

---

## Phase 5 — Security Review (SERVER only)

Read and follow `commands/review-security.md` from this plugin.

Pass through the already-detected project type — skip its detection step. Reuse files already read in earlier phases; do not re-read them.

---

## Phase 6 — Simplify

Invoke the `simplify` skill using the Skill tool with args:

> `my branch changes only. Propose changes before applying`

---

## Phase 7 — Prettier (automatic) (CLIENT projects only)

No interaction — runs and reports.

Get changed files eligible for formatting:

```bash
git diff origin/main...HEAD --name-only --diff-filter=d
```

Filter to: `.js`, `.jsx`, `.ts`, `.tsx`, `.json`, `.css`, `.scss`

Check Prettier is installed: use Glob with pattern `node_modules/prettier/package.json`.

If not found: print `⏭ Prettier not installed — skipping.` and proceed.

If found:

```bash
cd <project-root> && npx --no prettier --write <filtered-file-list>
```

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Prettier — Formatted X file(s)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Phase 8 — Unit Tests

Read and follow `commands/review-tests.md` from this plugin.

Pass through the already-detected project type and project root — skip their detection steps.

---

## Phase 9 — Create GitLab MR

Generate a structured MR description from the branch diff and create the MR on GitLab via MCP.

### Step 1 — Gather Branch Information

```bash
git fetch origin main
git branch --show-current
git log origin/main..HEAD --oneline --no-merges
git log origin/main..HEAD --pretty=format:"%h - %s%n%b" --no-merges
git diff origin/main...HEAD --stat
git diff origin/main...HEAD --name-status
```

### Step 2 — Categorize Changes

Group all changed files into relevant categories. Only include categories with actual content:

- **Features**: New functionality added
- **Fixes**: Bug fixes and corrections
- **Refactors**: Code restructuring without behavior change
- **Tests**: Test additions or modifications
- **Config / Docs**: Configuration, build, or documentation changes

### Step 3 — Compose MR Title

Concise, under 70 characters, imperative mood:

```
<type>: <short description>
```

Types: `feat`, `fix`, `refactor`, `test`, `chore`, `docs`

### Step 4 — Compose MR Description

Build in GitLab-compatible markdown. **Omit any section that has no content** — do not include empty headers or placeholder text.

```markdown
## 📋 Summary

[2–4 sentences covering what this MR accomplishes and why — focus on business value and intent, not just what files changed.]

---

## ✨ Key Changes

<!-- Only include subsections below that have actual content -->

### 🚀 Features

- [Feature]: description

### 🐛 Fixes

- [Fix]: what was broken and how it's fixed

### ♻️ Refactors

- [Refactor]: what was improved and why

### 🧪 Tests

- [Test changes summary]

### ⚙️ Config / Docs

- [Config or doc changes]

---

## 📁 Files Changed

<!-- Group by directory or module. For large MRs (20+ files), use sub-groupings. -->

<details>
<summary>📂 [Directory/Module] (X files)</summary>

| File           | Change   | Description       |
| -------------- | -------- | ----------------- |
| `path/to/file` | Modified | Brief description |

</details>

---

## 🧪 Testing

### How to Test

1. [Step-by-step instructions for verifying this MR]
2. [Specific scenarios to check]

### Test Results

- Unit tests: ✅ X passing

---

<!-- Omit the Breaking Changes section entirely if there are none -->

## ⚠️ Breaking Changes

[Breaking changes with migration steps]

---

## ✅ Pre-MR Checklist

- [ ] Self-review completed
- [ ] Unit tests passing
- [ ] No console.logs or debug code
- [ ] No hardcoded secrets or credentials
```

### Step 5 — Ask Whether to Create the MR

```
Create MR on GitLab now? [y / n]
```

**If `y` — Create via MCP:**

Use `mcp__plugin_gitlab-mcp_gitlab__create_mr` with:

- `title`: composed MR title
- `description`: composed markdown description
- `source_branch`: current branch name
- `target_branch`: `main`

Print on success:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 MR Created Successfully
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
URL: <mr_url>
```

Then offer pipeline monitoring:

```
Monitor pipeline and auto-fix failures? [y / n]
```

If `y`:

- Use `mcp__plugin_gitlab-mcp_gitlab__get_mr_pipelines` to get the pipeline ID
- Poll every 60 seconds; report `Pipeline running... (Xm elapsed)`
- On **success**: `✅ Pipeline passed. MR is ready to review.`
- On **failure**:
  - Fetch the failing job log with `mcp__plugin_gitlab-mcp_gitlab__get_job_log`
  - Diagnose the failure
  - Ask: "The pipeline is failing because X. Apply this fix and push? [y / n]"
  - If `y`: apply fix, `git commit -m "fix: <short description>"`, push, resume polling
  - If `n`: print failure summary and stop

If `n`: print the MR URL and exit.

**If `n` — Print for copy/paste:**

Print the composed title and description as plain markdown so the user can create the MR manually.

---

## Final Summary

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Pipeline Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[1] Context          — <branch>, X files changed
[2] Code Review      — Fixed: X | Skipped: Y
[3] Performance      — Fixed: X | Skipped: Y
[4] Coverage         — Generated: X | Gaps: Y
[5] Security         — Fixed: X | Skipped: Y  (or ⏭ skipped — client)
[6] Simplify         — Complete
[7] Prettier         — Formatted: X file(s)
[8] Unit Tests       — Passed: X | Failed: Y
[9] MR               — <mr_url | printed for copy/paste>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
