---
description: Shared review command orchestration — git diff strategy, changed-line manifest generation, and agent prompt template
user-invocable: false
---

# Review Orchestration

Shared orchestration logic for the review command. The command references this skill instead of embedding the diff strategy and prompt template inline.

## Step 0 — Gather Scope

1. If the review command passed a target branch via `$ARGUMENTS`, use it as `TARGET_BRANCH` and skip to step 3. Otherwise, ask the user: **"What branch is this MR targeting?"** (default: `main`). Do NOT run `git branch` commands or suggest branch names — only offer `main` as the default.
2. Remind the user: **"Ensure your branch is up to date (`git fetch origin` and rebasing on `{TARGET_BRANCH}` is recommended). Continue?"**
3. Detect the current branch name:
   ```bash
   CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
   ```
4. Run the scope-gathering script. It creates a unique session directory and generates all review artifacts inside it:

   ```bash
   node ${CLAUDE_SKILL_DIR}/scripts/gather-review-scope.js ${TARGET_BRANCH} ${CURRENT_BRANCH}
   ```

   The script prints three lines to stdout:
   - **Line 1**: review directory path (`~/.claude-review/`)
   - **Line 2**: changed file count
   - **Line 3**: session ID (e.g. `a1b2c3d4`)

   Inside `~/.claude-review/`, prefixed with the session ID:
   - `{id}_changed_files.txt` — one changed file path per line
   - `{id}_{safe-file-name}.diff` — per-file diffs (slashes replaced with `_`)
   - `{id}_changed_lines.txt` — canonical `file:line` entries for changed lines on the NEW side

5. Set `REVIEW_DIR` = first line, `SESSION_ID` = third line. Read `{REVIEW_DIR}/{SESSION_ID}_changed_files.txt` to get the full file list. Use the second line as the exact file count — do NOT count files yourself.

   After the review is complete, clean up session artifacts by running:

   ```bash
   node ${CLAUDE_SKILL_DIR}/scripts/gather-review-scope.js --cleanup {SESSION_ID}
   ```

6. Ask the user:
   - **"Reviewing changes against `origin/{TARGET_BRANCH}` ({N} files changed). Proceed with reviewing these files?"**
     where `{N}` is the exact number from the script output.
7. If the user adjusts scope or provides a different base, re-run the script and repeat.

Set `CHANGED_FILES` = contents of `{REVIEW_DIR}/{SESSION_ID}_changed_files.txt`.

## Agent Prompt Template

Use this template when launching each review agent:

```
Review the following changes.

REVIEW_DIR: {REVIEW_DIR}
SESSION_ID: {SESSION_ID}

CHANGED_FILES ({N} files):
{paste file list}

PER-FILE DIFFS: {REVIEW_DIR}/{SESSION_ID}_{safe-file-name}.diff
Each file has a corresponding .diff file (slashes replaced with underscores).
Example: src/Foo/Bar.cs → {REVIEW_DIR}/{SESSION_ID}_src_Foo_Bar.cs.diff

CHANGED LINE MANIFEST: {REVIEW_DIR}/{SESSION_ID}_changed_lines.txt
Contains canonical `file:line` entries for changed lines on the NEW side of the diff.

IMPORTANT: Only review files in the CHANGED_FILES list above. You may read full files for context, but ONLY comment on code that was actually changed. Use the per-file diffs and changed_lines.txt as source of truth. Every finding must reference `file:line` from {REVIEW_DIR}/{SESSION_ID}_changed_lines.txt. If a line is not in that file, it is OUT OF SCOPE and must not be reported.

Before starting your review, verify the file count by reading {REVIEW_DIR}/{SESSION_ID}_changed_files.txt and counting the non-empty lines.
This must equal {N}. If it does not, STOP and report the mismatch.

Follow the instructions in your agent definition. For each relevant file, read its diff first to see what changed, then read the full file if you need surrounding context. Produce your output report.

Before returning findings, validate every cited `file:line` against {REVIEW_DIR}/{SESSION_ID}_changed_lines.txt. Remove any finding that is not mapped to a changed line.
```

Where `{N}` is the exact count, `{REVIEW_DIR}` is the review directory, and `{SESSION_ID}` is the session ID, all from Step 0.
