---
description: Check test coverage for all files changed since main. Offers to generate missing tests using Cypress (client) or xUnit+NSubstitute (server). Run standalone or via /epic-common-create-mr:create-mr.
---

# Create MR — Phase 4: Test Coverage Check

Identify changed source files that lack sufficient test coverage and offer to generate tests. Can be run standalone or as part of `/epic-common-create-mr:create-mr`.

## Step 1 — Detect Project

Use Glob to check for `package.json`, `*.sln`, `*.csproj`, and `go.mod` in the current directory.

- `package.json` with `"name": "chimera-client"` or `"name": "ui-epic"` → **CHIMERA CLIENT**
- `package.json` present (any other name) → **GENERIC CLIENT** (TypeScript / React)
- `.sln` or `.csproj` present AND "Chimera" in solution/project name OR `src/published/` exists → **CHIMERA SERVER**
- `.sln` or `.csproj` present → **GENERIC SERVER** (C# / .NET)
- `go.mod` present → **GO SERVER**

## Step 2 — Get Changed Source Files

```bash
git fetch origin main
git diff origin/main...HEAD --name-only
```

Filter to non-test source files:

- **CLIENT**: `.ts`, `.tsx`, excluding `*.test.ts(x)`, `node_modules`, generated files
- **SERVER**: `.cs` in `src/`, excluding `*Tests.cs`, `*Migrations*`, generated files

If no changed source files, print `✅ No source changes to check.` and stop.

## Step 3 — Find Matching Test Files

**CHIMERA CLIENT**: Unit tests live at `src/published/ASI.TAM/Screens/**/*ScreenLogic.test.tsx`. Screens come in two patterns:

- **Single-file screen**: `ScreenLogic.tsx` — look for `ScreenLogic.test.tsx` in the same directory.
- **Split-file screen (HMR)**: `ScreenLogic.ts` + `Component.tsx` — both files share one test file named `ScreenLogic.test.tsx` in the same directory. If either file changed, look for `ScreenLogic.test.tsx`.

Files outside the `Screens/` hierarchy (e.g. shared utilities) may have a sibling `*.test.ts(x)` in the same directory instead. Also exclude `src/transcoded/` entirely — auto-generated code is never tested directly.

For `ui-epic`: look for a sibling `*.test.ts(x)` in the same directory as the changed file.

**GENERIC CLIENT**: For each changed source file, look for a sibling `*.test.ts(x)` or `*.spec.ts(x)` in the same directory. If none found, search for a `__tests__/` subdirectory containing a matching test file.

**CHIMERA SERVER**: For `src/published/core/Services/FooService.cs` → look for `test/unit/core/Services/FooServiceTests.cs`. Mirror the `src/` path under `test/unit/` and append `Tests` to the class name.

**GENERIC SERVER**: For each changed `.cs` file, look for a corresponding `*Tests.cs` or `*Test.cs` file. Search `test/`, `tests/`, or `*.Tests/` directories mirroring the source path. If the project structure is unclear, Glob for `**/*Tests.csproj` to find the test project root first.

**GO SERVER**: Tests live alongside source files. For `foo/bar.go` → look for `foo/bar_test.go` in the same directory. Go also supports `_test` package-suffix files for black-box testing — look for both `package foo` and `package foo_test` variants.

Use Glob to check existence. Don't assume — verify.

## Step 4 — Assess Coverage

For files **with** a test counterpart — read both the source and test files. Check:

- Are new public methods/functions covered by at least one test?
- Are new branches (if/else, switch cases, ternaries) represented?
- Are edge cases (null inputs, empty collections, error paths) tested?

For files **without** a test counterpart — flag as completely uncovered.

## Step 5 — Report All Findings First

Print the full coverage summary — every file, every gap — before asking anything:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Coverage Check
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Covered   : src/path/to/FileA.tsx (tests exist, new code covered)
⚠️  Partial   : src/path/to/FileB.tsx (test exists, 2 new paths uncovered)
❌ No tests  : src/path/to/FileC.tsx (no test file found)
```

Number each file that has gaps and list exactly what's missing:

```
[1] src/path/to/FileB.tsx — missing coverage:
    • handleError() — no test for the error branch
    • parseResponse() — null input case not tested

[2] src/path/to/FileC.tsx — no test file:
    • FetchSessionKeys — both success and missing-record paths
    • InsertSession — throws when input is 0
```

## Step 6 — Ask Once

After printing all findings, ask a single question:

```
Generate tests for which? Enter numbers (e.g. 1 2), all, or none:
```

- `1 2` → generate only the selected files
- `all` → generate for every file with gaps
- `none` → skip test generation entirely

Generate all selected files before moving on. Do not prompt again per file.

**CHIMERA CLIENT** — Write a `*.test.tsx` using Cypress component test syntax:

- `/// <reference types="@cypress/grep" />` at the top
- `{ tags: ['unit'] }` on the describe block
- Import from the source file directly
- `describe`, `it`, `expect` structure
- Cover all identified gaps

**GENERIC CLIENT** — Check `package.json` for the test framework (Jest, Vitest, etc.) and write a `*.test.ts(x)` or `*.spec.ts(x)` using that framework's conventions. Default to Jest if unclear (`describe`, `it`, `expect`).

**CHIMERA SERVER** — Write a `*Tests.cs` using xUnit + FluentAssertions + NSubstitute:

- Class name: `{SourceClassName}Tests`
- `[Fact]` per individual test
- Arrange / Act / Assert structure with comments
- `NSubstitute` for interface mocking
- Cover all identified gaps

**GENERIC SERVER** — Write a `*Tests.cs`. Check the existing test project for the framework in use (xUnit, NUnit, MSTest) and follow its conventions. Default to xUnit with Arrange / Act / Assert if no existing tests found.

**GO SERVER** — Write a `*_test.go` file in the same package as the source. Use the standard `testing` package:

- `func TestFooBar(t *testing.T)` naming convention
- Table-driven tests (`[]struct{ ... }`) for multiple input cases
- `t.Errorf` / `t.Fatalf` for assertions (or the `testify/assert` package if already used in the project)
- For HTTP handlers, use `net/http/httptest`

If all files are covered:

```
✅ All changed files have test coverage.
```

## Completion Summary

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Coverage Check Complete
Generated: X new test files  |  Gaps remaining: Y
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
