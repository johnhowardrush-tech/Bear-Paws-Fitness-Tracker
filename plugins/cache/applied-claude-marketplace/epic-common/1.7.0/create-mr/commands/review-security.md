---
description: Security audit on all files changed since main. Covers injection, auth, input validation, sensitive data, and XSS for chimera-client and chimera-server. Run standalone or via /epic-common-create-mr:create-mr.
---

# Create MR — Phase 5: Security Audit

Perform a focused security audit on all files changed since main. Can be run standalone or as part of `/epic-common-create-mr:create-mr`.

## Step 1 — Detect Project

Use Glob to check for `package.json`, `*.sln`, `*.csproj`, and `go.mod` in the current directory.

- `package.json` with `"name": "chimera-client"` or `"name": "ui-epic"` → **CHIMERA CLIENT**
- `package.json` present (any other name) → **GENERIC CLIENT** (TypeScript / React)
- `.sln` or `.csproj` present AND "Chimera" in solution/project name OR `src/published/` exists → **CHIMERA SERVER**
- `.sln` or `.csproj` present → **GENERIC SERVER** (C# / .NET)
- `go.mod` present → **GO SERVER**

## Step 2 — Get Changed Files

```bash
git fetch origin main
git diff origin/main...HEAD --name-only
```

Filter to source files only:

- **CLIENT**: `.ts`, `.tsx`, excluding `*.test.ts(x)`, `node_modules`, generated files
- **SERVER**: `.cs` in `src/`, excluding `*Tests.cs`, `*Migrations*`, generated files
- **GO SERVER**: `.go`, excluding `*_test.go`

If no changed source files: `✅ No source changes to audit.` and stop.

## Step 3 — Read All Changed Files

Read every changed file in full before making any security findings.

## Step 4 — Perform Security Audit

### SERVER — Full Backend Security Audit

> **CHIMERA SERVER only — Custom Security Layers**
>
> Chimera implements four custom security layers beyond standard `[Authorize]`. Any new endpoint that accesses sensitive data should be checked against all relevant layers:
>
> 1. **Program Access** (`StructureAndCCASecurity.cs`) — controls what actions a user can perform (view/update/delete). New endpoints that mutate data should verify the user has the appropriate program access.
> 2. **Structure Security** (`StructureAndCCASecurity.cs`) — controls access to data based on organisational hierarchy (Agency, Branch, Department, Profit Center). Endpoints returning or modifying entity/policy data should apply structure filtering.
> 3. **CCA — Confidential Client Access** (`ClientRepository.cs`) — required for any endpoint that accesses client-related data. Missing CCA checks on client data endpoints is a security violation.
> 4. **Bank Account Security** (`BankAccountSecurity.cs`) — required for any endpoint touching accounting tables.
>
> Flag any new `DataAccess` endpoint that queries client, policy, entity, or accounting data without calling the appropriate security helper.
>
> _Skip this section entirely for GENERIC SERVER projects._

**Injection Vulnerabilities**

- SQL built with string interpolation or concatenation (`$"SELECT ... {userInput}"`) instead of parameterized queries
- Command injection: `Process.Start()` or shell execution using user-controlled values
- LDAP, XPath, or XML injection patterns

**Authentication & Authorization**

- New endpoints missing `[Authorize]` when the route handles sensitive data
- Authorization logic implemented manually inside handler bodies instead of via middleware/policies
- JWT or session tokens logged or returned in error responses
- Overly permissive CORS (`AllowAnyOrigin` + `AllowCredentials`)

**Input Validation**

- Controller actions or endpoint handlers accepting raw user input without FluentValidation or data annotations
- Missing length bounds on string inputs that reach the database
- File uploads without MIME type or size checks

**Sensitive Data Exposure**

- Hardcoded passwords, API keys, connection strings, or tokens in source code
- Sensitive fields (passwords, SSNs, PII) returned in API responses unnecessarily
- Exception details or stack traces exposed to the client
- PII or tokens written to logs

**Cryptography**

- Weak algorithms: MD5, SHA1 for passwords (use bcrypt/Argon2), DES, RC4
- Predictable `Random` used where `RandomNumberGenerator` is required
- Self-rolled encryption instead of standard libraries

**Configuration**

- `appsettings.json` files containing real credentials in source control
- `IConfiguration` values trusted directly as credentials without validation

---

### GO SERVER — Security Audit

**Injection**

- SQL built with `fmt.Sprintf` or string concatenation instead of parameterized queries (`db.Query("... WHERE id = ?", id)`)
- `exec.Command` or `exec.CommandContext` called with user-supplied values — command injection risk; validate and allowlist inputs
- Template injection: `html/template` used correctly sanitizes output, but `text/template` does not — never use `text/template` to render user-controlled HTML

**Authentication & Authorization**

- HTTP handlers missing authentication middleware where the route handles sensitive data
- Authorization checks embedded in handler bodies instead of middleware — makes them easy to accidentally bypass
- JWT secrets hardcoded or loaded from a non-secret source
- Missing rate limiting on authentication or sensitive endpoints

**Input Validation**

- Missing validation on incoming JSON fields — use struct tags with a validation library (e.g. `go-playground/validator`) for request bodies
- Integer overflow when converting user input: `int(userValue)` from untrusted source without bounds check
- File path inputs not cleaned with `filepath.Clean` and checked against an allowed prefix before use (path traversal)

**Sensitive Data**

- Hardcoded secrets, API keys, tokens, or passwords in source code
- Secrets loaded from environment variables but logged at startup
- Sensitive fields included in error responses or JSON output (use struct tag `json:"-"` to exclude)
- TLS disabled or `InsecureSkipVerify: true` in `tls.Config`

**Cryptography**

- `math/rand` used for security-sensitive random values — use `crypto/rand`
- MD5 or SHA1 used for password hashing — use `bcrypt` or `argon2`
- Self-rolled cryptographic logic instead of standard library primitives

---

### CLIENT — Frontend Security Audit

**XSS**

- `dangerouslySetInnerHTML` used without sanitizing via DOMPurify first
- `.innerHTML` set directly from user input or API-derived content
- User content in template literals used in a DOM context

**Sensitive Data**

- API keys, tokens, or credentials hardcoded in source files
- Sensitive values stored in `localStorage` (prefer `sessionStorage` or in-memory)

**Third-party Content**

- External scripts or iframes loaded from user-controlled URLs
- `eval()`, `new Function()`, or `setTimeout(string)` patterns

**Authentication**

- Auth tokens passed in URL query parameters (visible in server logs and browser history)
- Missing CSRF token handling on state-mutating requests

---

## Step 5 — Present Issues and Ask Once Per Tier

Print **all findings** grouped by severity first — do not prompt until the full list is shown.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 CRITICAL (2 issues)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[1] Location : src/Repositories/UserRepository.cs:87
    Problem  : Query built with string interpolation using user-supplied value
    Impact   : Attacker can manipulate the SQL query to read or destroy data
    Fix      : Use parameterized query or Dapper parameter object
    Effort   : 15 min

[2] Location : src/DataAccess/Clients/ClientData.cs:44
    Problem  : Client data returned without authorization check
    Impact   : Any authenticated user can read protected records
    Fix      : Apply the appropriate authorization check before returning data
    Effort   : 10 min
```

After printing all findings, ask once per severity tier:

```
Fix which CRITICAL issues? Enter numbers (e.g. 1 2), all, or none:
```

Repeat for each subsequent tier that has issues. Apply all selected fixes for a tier before moving to the next.

- `1 2` → fix only those issues
- `all` → fix every issue in this tier
- `none` → skip this tier entirely

If no issues found:

```
✅ No security issues found in changed files.
```

## Completion Summary

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Security Audit Complete
Fixed: X  |  Skipped: Y  |  Total: Z
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
