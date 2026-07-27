---
description: Performance-focused review on all files changed since main — memoization, re-renders, algorithms, race conditions, async patterns, and EF Core query efficiency. Run standalone or via /epic-common-create-mr:create-mr.
---

# Create MR — Phase 3: Performance Review

Perform a dedicated performance pass on all files changed since main. Covers memoization, unnecessary re-renders, algorithmic efficiency, race conditions, async patterns, and database query performance.

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

- **CLIENT**: `.ts`, `.tsx`, excluding `*.test.ts(x)`, `node_modules`, generated files
- **SERVER**: `.cs` in `src/`, excluding `*Tests.cs`, `*Migrations*`, generated files
- **GO SERVER**: `.go`, excluding `*_test.go`

If no changed source files: print `✅ No source changes to review.` and stop.

## Step 3 — Read All Changed Files

Read every changed source file in full before forming opinions. If running after `review-code`, reuse already-read content.

## Step 4 — Perform Performance Review

### CLIENT (TypeScript / React)

**Memoization & Re-renders**

- Unstable values used as `useEffect` / `useCallback` / `useMemo` dependencies: `.map()`, `.filter()`, object literals, or array literals created inline in render
- Expensive calculations in render that should be wrapped in `useMemo`
- Functions passed as props without `useCallback`, causing unnecessary child re-renders
- Components that would benefit from `React.memo` — pure components that re-render whenever a parent re-renders despite props not changing

**Algorithmic Efficiency**

- O(n²) patterns: nested loops over the same collection, nested `.find()` / `.filter()` calls that could be replaced with a Map or Set lookup
- Linear searches on collections that are accessed repeatedly — pre-index with a Map

**Sequential Async / Parallelization (high impact)**

- Independent `await` calls made sequentially that could run in parallel with `Promise.all()`. Each sequential await waits for the previous one to finish, which can add seconds to load times:

  ```tsx
  // ❌ Sequential — each waits for the previous
  await fetchA(id);
  await fetchB(id);
  await fetchC(id);

  // ✅ Parallel — all fire at once
  const [a, b, c] = await Promise.all([fetchA(id), fetchB(id), fetchC(id)]);
  ```

  Only parallelize calls that are **independent** (no call uses the result of another). If call B depends on the result of call A, they must remain sequential.

- Sequential combo box filling with a `for` loop and `await` — replace with `Promise.all()` over the array
- `Promise.all()` calls that lack error handling — a single rejection silently fails the whole batch; wrap in try/catch

**Race Conditions**

- Multiple concurrent async calls where a later response could overwrite an earlier one (missing cleanup in `useEffect`, missing `AbortController`)
- Duplicate API calls: the same endpoint fetched in sibling components with no shared state or cache

**Other**

- Missing debounce or throttle on event handlers that trigger expensive operations (search inputs, resize/scroll handlers)

---

### SERVER (C# / .NET)

**Async Patterns**

- `async void` outside of event handlers — these suppress exceptions and can't be awaited
- Blocking async calls: `.Result`, `.Wait()`, `.GetAwaiter().GetResult()` — causes thread-pool starvation under load
- Missing `ConfigureAwait(false)` in library or service code

**Collections & Allocation**

- Multiple enumeration of `IEnumerable` — materialise with `.ToList()` once, then reuse
- Collections or objects allocated inside tight loops that could be pre-allocated outside
- LINQ chains that can be simplified: `.Where().First()` → `.First(predicate)`, `.Where().Count()` → `.Count(predicate)`, `.Where().Any()` → `.Any(predicate)`

**SQL & Database**

- N+1 query patterns: a query executed inside a loop that could be replaced with a single query using a `JOIN`, `IN (...)`, or table-valued parameter
- `SELECT *` where only specific columns are needed — fetching unnecessary data wastes bandwidth and memory
- Queries inside loops that could be batched — multiple inserts or updates that could use bulk operations or table-valued parameters instead
- Missing pagination (`OFFSET`/`FETCH`) on queries that could return unbounded result sets
- Result sets loaded entirely into memory when only the first N rows are needed — add `TOP` or stream results
- The same query executed multiple times within a single request when the result could be reused

---

### GO SERVER

**Goroutines & Concurrency**

- Goroutines spawned in a loop without throttling — unbounded goroutine creation under load; use a worker pool or semaphore pattern
- `sync.Mutex` held across I/O or long operations — minimise the critical section to reduce contention
- Channels used where a `sync.Mutex` would be simpler and faster (channels have overhead; use them for coordination, mutexes for state protection)
- `sync.Map` used where a regular map with a `sync.RWMutex` would perform better for read-heavy workloads

**Memory & Allocation**

- Slices grown incrementally in a loop without pre-allocation — use `make([]T, 0, expectedLen)` when the final size is known
- Large structs passed by value in hot paths — pass pointers to avoid copying
- `fmt.Sprintf` used for simple string concatenation in loops — use `strings.Builder` instead
- Unnecessary heap allocations: small objects that could be stack-allocated but escape due to interface wrapping or pointer passing

**I/O & Networking**

- HTTP response bodies not closed after reading (`defer resp.Body.Close()` missing)
- Reading an entire response body with `io.ReadAll` when streaming would suffice for large payloads
- Missing timeouts on outbound HTTP clients (`http.DefaultClient` has no timeout — always set `Timeout`)
- Database queries executed sequentially that could run concurrently with goroutines + `errgroup`

**SQL & Database**

- N+1 query patterns — query in a loop; replace with a single query using `IN (...)` or batch fetch
- `SELECT *` where only specific columns are needed
- Missing pagination on queries that could return unbounded rows
- Queries not using prepared statements where the same query runs many times

---

## Step 5 — Present Issues and Ask Once Per Tier

Print **all issues** grouped by severity first — do not prompt until the full list is shown.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟠 HIGH (2 issues)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[1] Location : src/core/components/Foo/Foo.tsx:28
    Problem  : items.map(...) as useEffect dependency — new array reference every render
    Impact   : Effect re-runs on every render, causing unnecessary API calls
    Fix      : Wrap in useMemo or move outside the component
    Effort   : 5 min

[2] Location : src/screens/Bar/ScreenLogic.tsx:94
    Problem  : Three independent awaits run sequentially on screen load
    Impact   : ~600ms added to load time unnecessarily
    Fix      : Wrap in Promise.all()
    Effort   : 5 min

🟡 MEDIUM (1 issue)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[3] ...
```

After printing all issues, ask once per severity tier:

```
Fix which HIGH issues? Enter numbers (e.g. 1 2), all, or none:
```

Repeat for each subsequent tier that has issues. Apply all selected fixes for a tier before moving to the next.

- `1 2` → fix only those issues
- `all` → fix every issue in this tier
- `none` → skip this tier entirely

When done:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Performance Review Complete
Fixed: X  |  Skipped: Y  |  Total: Z
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

If no issues found: `✅ No performance issues found.`
