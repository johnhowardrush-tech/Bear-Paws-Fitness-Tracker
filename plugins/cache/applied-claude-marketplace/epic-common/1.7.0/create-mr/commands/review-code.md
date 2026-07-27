---
description: Code quality review on all files changed since main — state, architecture, error handling, type safety, accessibility, and code quality. Performance checks are in review-performance. Run standalone or via /epic-common-create-mr:create-mr.
---

# Create MR — Phase 2: Code Review

Perform a code quality review on all files changed since main. Covers state management, architecture, error handling, type safety, accessibility, and code quality. Performance is a separate phase (`review-performance`).

Can be run standalone or as part of `/epic-common-create-mr:create-mr`.

## Step 1 — Detect Project

Use Glob to check for `package.json`, `*.sln`, `*.csproj`, and `go.mod` in the current directory.

- `package.json` with `"name": "chimera-client"` or `"name": "ui-epic"` → **CHIMERA CLIENT**
- `package.json` present (any other name) → **GENERIC CLIENT** (TypeScript / React)
- `.sln` or `.csproj` present AND "Chimera" in solution/project name OR `src/published/` exists → **CHIMERA SERVER**
- `.sln` or `.csproj` present → **GENERIC SERVER** (C# / .NET)
- `go.mod` present → **GO SERVER**
- Neither → ask before proceeding

## Step 2 — Get Changed Files

```bash
git fetch origin main
git diff origin/main...HEAD --name-only
```

Filter to reviewable source files only:

- **CHIMERA CLIENT**: `.ts`, `.tsx`, excluding `*.test.ts(x)`, `node_modules`, `src/transcoded/` (auto-generated — never review)
- **GENERIC CLIENT**: `.ts`, `.tsx`, excluding `*.test.ts(x)`, `node_modules`
- **SERVER (any)**: `.cs` in `src/`, excluding `*Tests.cs`, `*Migrations*`, generated files
- **GO SERVER**: `.go`, excluding `*_test.go`

If no changed source files: print `✅ No source changes to review.` and stop.

## Step 3 — Read All Changed Files

Read every changed source file in full before forming any opinions. Do not review files you haven't read.

## Step 4 — Perform Review

### CLIENT (TypeScript / React)

**State Management**

- Multiple `useState` calls always updated together → candidate for `useReducer` or combined state
- Stale closures capturing outdated state
- State derivable from other state (redundant)
- Local state that belongs in Context or a shared store
- Props drilled through 3+ layers

**React Best Practices**

- `useEffect` missing cleanup for subscriptions, timers, or event listeners
- Dependency array issues: missing deps, unnecessary deps, suppressed lint warnings
- `useEffect` doing work that belongs in an event handler
- `key` prop using array index or non-stable value

**Error Handling**

- Unhandled promise rejections (async without try/catch or `.catch()`)
- Missing null/undefined checks on API responses
- Missing loading or error states for async operations

**TypeScript**

- `any` types or unsafe `as` casts
- Missing return types on exported functions
- Overuse of `?.` masking incorrect types

**Component Architecture**

- Components over 300 lines
- Methods or functions over 20–30 lines — consider extracting into focused helpers
- Methods with more than 3–4 parameters — consider a config object or breaking the method up
- Deep nesting (3+ levels of if/else) — use early returns to flatten
- Components mixing data-fetching and presentation
- Props with 10+ attributes (consider composition or compound component pattern)
- Layer violations: logic from one layer bleeding into another. _(CHIMERA CLIENT: Chimera follows Screen → Business → Data/DataAccess — e.g. a `ScreenLogic.tsx` directly calling a `DataAccess` method instead of going through a Business layer. For GENERIC CLIENT: flag any component that bypasses the expected data/service layer abstraction for the project.)_

**Accessibility**

- Interactive elements missing `aria-label` or `role`
- Images missing `alt` text
- Form inputs missing associated `<label>`
- Keyboard-inaccessible custom interactive elements (missing `onKeyDown`/`tabIndex`)
- Color as the only means of conveying information

**Code Quality**

- Magic numbers or strings that should be named constants
- Dead code: unused imports, commented-out blocks, unreachable branches
- `console.log` statements left in
- Unclear variable or function names
- Hardcoded API keys, tokens, or secrets

---

### SERVER (C# / ASP.NET Core)

**C# Patterns**

- Nullable reference issues: missing null checks, incorrect `!` (null-forgiving) operator
- Catching `Exception` too broadly; swallowing exceptions silently
- String concatenation in loops (use `StringBuilder`)
- `==` on strings where `Equals(StringComparison.OrdinalIgnoreCase)` is appropriate
- Disposable objects not in `using`
- Overly complex LINQ that reads better as a loop

**Architecture & Design**

- Single responsibility violations: classes or methods doing too many things
- Methods over 20–30 lines — consider extracting into focused helpers
- Methods with more than 3–4 parameters — consider a config object
- Deep nesting (3+ levels) — use early returns to flatten
- Direct `new` construction of services that should be injected
- `static` state unsafe for testing or concurrent use
- Hardcoded config that should come from `IOptions<T>` or `IConfiguration`
- Logic in controllers that belongs in a service or handler

**Error Handling**

- Missing validation on endpoint inputs
- Incorrect HTTP status codes (200 on failure, 500 for validation errors)
- Exceptions used for control flow

**Type Safety**

- Unchecked casts that could throw `InvalidCastException`
- Implicit numeric conversions that could lose precision
- `dynamic` usage

**Code Quality**

- Magic numbers or strings that should be named constants
- Dead code: unused `using` directives, unreachable branches, commented-out code
- Overly long methods (>50 lines)
- Unclear naming
- Hardcoded secrets or connection strings

---

### GO SERVER

**Error Handling**

- Errors ignored with `_` — every returned error must be checked or explicitly justified
- Errors wrapped without context: use `fmt.Errorf("doing X: %w", err)` to preserve the chain
- Sentinel errors compared with `==` instead of `errors.Is()` / `errors.As()`
- `panic` used for non-fatal conditions that should return an error instead

**Concurrency**

- Goroutines launched without a way to know when they finish — missing `sync.WaitGroup` or channel signal
- Goroutine leak: goroutine started in a request handler or loop with no cancellation path
- Shared mutable state accessed from multiple goroutines without a mutex or channel
- `sync.Mutex` copied by value (must always be passed by pointer)
- Channel sends/receives without considering the blocking/timeout case

**Context Propagation**

- `context.Context` not threaded through function calls that make I/O or RPC calls
- `context.Background()` used inside a handler instead of the request context
- Context stored in a struct field instead of passed as a function parameter

**Architecture & Design**

- Large interfaces (more than 3–5 methods) — prefer small, composable interfaces
- Concrete types accepted where an interface would allow better testing
- `init()` functions with side effects that make testing difficult
- Package-level mutable state (`var` at package scope that is mutated at runtime)
- Logic in `main` that belongs in a testable function

**Code Quality**

- Exported functions, types, and packages missing doc comments
- Inconsistent naming: unexported should be `camelCase`, exported `PascalCase`; acronyms should be all-caps (`URL`, `HTTP`)
- Magic numbers or strings that should be named constants
- Dead code: unused variables, imports, or unreachable branches (the compiler catches some; review for logic dead-ends)
- Hardcoded secrets, connection strings, or tokens

---

## Step 5 — Present Issues Interactively

Print **all issues** grouped by severity first — do not prompt until the full list is shown.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 CRITICAL (2 issues)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[1] Location : src/path/to/File.tsx:42
    Problem  : <what's wrong>
    Impact   : <why it matters>
    Fix      : <specific change>
    Effort   : < 5 min

[2] Location : src/path/to/Other.tsx:18
    Problem  : <what's wrong>
    Impact   : <why it matters>
    Fix      : <specific change>
    Effort   : 10 min

🟠 HIGH (1 issue)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[3] Location : src/path/to/Another.tsx:5
    ...
```

After printing all issues, ask once per severity tier:

```
Fix which CRITICAL issues? Enter numbers (e.g. 1 2), all, or none:
```

Then repeat for each subsequent tier that has issues. Apply all selected fixes for a tier before moving to the next.

- `1 2` → fix only those issues
- `all` → fix every issue in this tier
- `none` → skip this tier entirely

When done:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Code Review Complete
Fixed: X  |  Skipped: Y  |  Total: Z
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

If no issues found: `✅ No issues found. Code looks clean.`
