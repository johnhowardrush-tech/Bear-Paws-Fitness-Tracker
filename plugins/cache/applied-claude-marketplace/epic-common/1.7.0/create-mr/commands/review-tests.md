---
description: Run unit tests scoped to files changed since main. Reports failures and offers to diagnose and fix them. Run standalone or via /epic-common-create-mr:create-mr.
---

# Create MR — Phase 8: Run Unit Tests

Run unit tests scoped to files changed since main. Report results and offer to fix failures. Can be run standalone or as part of `/epic-common-create-mr:create-mr`.

## Step 1 — Detect Project

Use Glob to check for `package.json`, `*.sln`, `*.csproj`, and `go.mod` in the current directory.

- `package.json` with `"name": "chimera-client"` or `"name": "ui-epic"` → **CHIMERA CLIENT**
- `package.json` present (any other name) → **GENERIC CLIENT** (TypeScript / React)
- `.sln` or `.csproj` present AND "Chimera" in solution/project name OR `src/published/` exists → **CHIMERA SERVER**
- `.sln` or `.csproj` present → **GENERIC SERVER** (C# / .NET)
- `go.mod` present → **GO SERVER**

Get project root:

```bash
git rev-parse --show-toplevel
```

## Step 2 — Identify Changed Files and Locate Tests

```bash
git fetch origin main
git diff origin/main...HEAD --name-only
```

**CLIENT (any)** — collect test files to run:

- Changed test files: any `*.test.ts`, `*.test.tsx`, `*.spec.ts`, or `*.spec.tsx` in the diff
- For each changed source file (non-test), look for a `*.test.ts(x)` or `*.spec.ts(x)` sibling in the same directory
- Collect all identified test file paths into a spec list

**SERVER (any)** — build a class filter:

- For each changed `.cs` source file (non-test), derive `ClassName~FooService` from the filename
- Combine into: `ClassName~Foo|ClassName~Bar`

**GO SERVER** — collect affected packages:

- For each changed `.go` source file (non-test), note its directory (= its package path)
- Collect unique package paths into a list (e.g. `./internal/auth ./pkg/users`)

If no related test files are identified, fall back to the full unit test suite.

## Step 3 — Run Tests

**CHIMERA CLIENT** — scoped (specific spec files found):

```bash
cd <project-root>
npm run test:unit -- --spec "<comma-separated-spec-paths>"
```

**CHIMERA CLIENT** — full suite (no specific specs found):

```bash
cd <project-root>
npm run test:unit
```

**GENERIC CLIENT** — check `package.json` `scripts` for a test command (e.g. `test`, `test:unit`, `test:watch`). Use the most specific scoped variant available. If none found, run:

```bash
cd <project-root>
npm test
```

**CHIMERA SERVER** — scoped (specific class filter built):

```bash
cd <project-root>
dotnet test test/unit/ASI.Chimera.Server.Test.Unit.csproj --filter "<filter-expression>"
```

**CHIMERA SERVER** — full suite (no specific classes found):

```bash
cd <project-root>
dotnet test test/unit/ASI.Chimera.Server.Test.Unit.csproj
```

**GENERIC SERVER** — discover the test project first: use Glob with pattern `**/*.csproj` and filter results to paths containing `test` or `spec` (case-insensitive).

Then run scoped or full suite against the discovered project:

```bash
cd <project-root>
dotnet test <discovered-test-project> --filter "<filter-expression>"
# or full suite:
dotnet test <discovered-test-project>
```

If multiple test projects are found, run all of them.

**GO SERVER** — scoped (specific packages identified):

```bash
cd <project-root>
go test -v -race ./internal/auth/... ./pkg/users/...
```

**GO SERVER** — full suite (no specific packages):

```bash
cd <project-root>
go test -v -race ./...
```

Use the `git rev-parse --show-toplevel` value as `<project-root>`.

## Step 4 — Report Results

**All passing:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ All tests passing (X passed, 0 failed)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Failures present:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ X test(s) failing
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Test name]
Error: <error message>
<relevant stack trace lines>

Investigate and fix failing tests? [y / n]
```

If `y`:

1. Read the failing test file(s) and the source file(s) they test
2. Diagnose whether the failure is in the source code or the test itself
3. Propose a fix: "The test is failing because X. Here's the change:"
4. Apply the fix
5. Re-run only the failing tests to confirm they pass
6. If still failing, show the new output and ask again

If `n`:

- Print: "Failing tests will be noted in the MR description. Proceeding."

## Completion Summary

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Test Phase Complete
Passed: X  |  Failed: Y  |  Skipped: Z
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
