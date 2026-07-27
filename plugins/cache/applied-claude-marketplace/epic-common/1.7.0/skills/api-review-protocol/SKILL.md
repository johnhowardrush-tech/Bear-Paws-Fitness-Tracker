---
description: Shared review agent protocol — scope rules, diff strategy, changed-line validation, and output format
user-invocable: false
---

# Review Agent Protocol

Standard instructions for all review agents. Follow these rules exactly.

All artifact paths below use `REVIEW_DIR` and `SESSION_ID` — provided in the agent prompt. Files are flat in `~/.claude-review/` with a session ID prefix (e.g. `~/.claude-review/a1b2c3d4_changed_files.txt`).

## Scope & Validation

**Scope: Only review files in `CHANGED_FILES`.** You may read full files for context, but ONLY comment on code that was actually changed. Use the per-file diffs and `{REVIEW_DIR}/{SESSION_ID}_changed_lines.txt` as source of truth. Do not flag pre-existing code.

0. **Verify file count** — read `{REVIEW_DIR}/{SESSION_ID}_changed_files.txt` and count the non-empty lines. Confirm it matches the count given in your prompt. If it does not match, STOP and report the mismatch.
1. For each relevant file, read its diff from `{REVIEW_DIR}/{SESSION_ID}_{safe-file-name}.diff` first to see what changed, then read the full file only if you need surrounding context.
2. Report PASS or FAIL for each checklist item with `file:line` evidence.
3. **Changed-line validation is mandatory** — every cited `file:line` must exist in `{REVIEW_DIR}/{SESSION_ID}_changed_lines.txt`. If it is missing, remove the finding.

## Confidence Scoring

Every finding (Critical, Warning, or Suggestion) MUST include a confidence score from 0–100 indicating how certain you are that the issue is real and not a false positive.

**Confidence rubric** (apply this precisely):

| Score  | Meaning                                                                                                   |
| ------ | --------------------------------------------------------------------------------------------------------- |
| 0–25   | Likely false positive — doesn't hold up under scrutiny, or is a pre-existing issue                        |
| 26–50  | Possible issue but may be a nitpick, edge case, or acceptable pattern                                     |
| 51–75  | Likely real — verified against patterns, but could have a valid justification you haven't seen            |
| 76–90  | High confidence — double-checked against checklist and code, clearly deviates from expected pattern       |
| 91–100 | Certain — unambiguous violation with direct evidence (e.g., raw SQL concatenation, missing `[Authorize]`) |

**Rules:**

- Score each finding independently based on evidence strength
- Findings below 70 confidence should be demoted to Suggestions regardless of original severity
- Include the confidence score in brackets after each finding: `[confidence: 85]`

## Output Format

Return results using this structure (substitute your review area name and checklist items):

```
### {Area} Review Results

| Item | Status | Evidence |
|------|--------|----------|
| {checklist item} | PASS/FAIL | file:line |
| ... | ... | ... |

#### Critical Failures
- `[file:line]` Description [confidence: N]
- (list or "None")

#### Warnings
- `[file:line]` Description [confidence: N]
- (list or "None")
```

If your review area has additional sections (e.g., E2E Idempotency, Missing Test Files, Suggestions), append them after Warnings.
