---
name: epic-add-new-program-access
description: Use when adding a new program access or security permission to Epic — spans chimera-client, service-core, modules-security, and Classic AppServer (TFS); keeps all four repos in sync
---

# Add New Program Access

Adds a new program access (security permission) across all four required repositories. `chimera-client/SecureArea.ts` is the source of truth; all other repos must stay in sync.

Repositories touched:

1. **chimera-client** — `src/published/ASI.TAM/Foundation/Security/SecureArea.ts`, `src/published/ASI.TAM/Data/Security/SecurableAreas/SecurableAreas.ts`, and `src/published/translations/{en-US,en-CA,en-GB,fr-CA}.json`
2. **service-core** — `src/Domain/SecurityArea.cs`
3. **modules-security** — four localized JSON files under `src/Application/Users/SecurityPermissions/`
4. **Classic AppServer (Epic, TFS)** — `ASI.TAM/Foundation/Security/Enums.vb`, `ASI.TAM/Data/Security/SecurableAreas/SecurableAreas.vb`, and `ASI.TAM/Data/Security/SecurableAreas/Translations/Translations.{en-CA,en-GB,fr-CA}.resx`

> **Never commit or check in on behalf of the user.** For Classic AppServer (TFS), prompt the user to check out the files before edits.

### Cross-platform requirements

This skill is run on both **Windows** (cmd, PowerShell 5.1, PowerShell 7, Git Bash) and **macOS**. When issuing shell commands:

- Use the **Grep tool** for searching file contents, not raw `grep` / `rg` shell commands (`grep` is not available on stock Windows).
- Use the **Glob tool** for locating files, not `find` or `Get-ChildItem`.
- Use the **Read / Edit / Write tools** for file I/O, not `cat` / `sed` / `awk` / `Get-Content`.
- For `git`, use `git -C {REPO_PATH} <subcommand>` — this is portable and avoids shell-specific `cd` chaining.
- For `npm` scripts, use `npm --prefix {REPO_PATH} run <script>` — works in all supported shells without `&&`, `;`, or `cd` tricks.
- Do **not** chain commands with `&&` (Windows PowerShell 5.1 does not support it) or Unix-only operators.
- Always pass **absolute paths** with **forward slashes** — works in Git, npm, and all relevant tooling on both platforms.

---

## Phase 1 — Gather Repository Paths

Ask the user to provide the absolute path to the root of each of the four repositories:

**"Please provide the absolute paths to the following repository roots (or say 'skip' for any you don't have checked out — I'll emit manual instructions for that repo at the end):**

- **chimera-client** (contains `src/published/ASI.TAM/Foundation/Security/SecureArea.ts`)
- **service-core** (contains `src/Domain/SecurityArea.cs`)
- **modules-security** (contains `src/Application/Users/SecurityPermissions/SecurityPermissions.en-US.json`)
- **Classic AppServer / Epic TFS workspace** (contains `ASI.TAM/Foundation/Security/Enums.vb`)\*\*"

Wait for the user to provide all paths before continuing.

Store paths as `CHIMERA_PATH`, `SERVICE_CORE_PATH`, `MODULES_SECURITY_PATH`, `APPSERVER_PATH`. Mark any skipped.

Present the resolved paths back to the user and ask: **"Does this look right?"** before proceeding.

### Sync to latest

Before gathering details or making edits, ensure each located repo is on the correct branch and up to date so edits are not layered on stale files. **Never** run git commands that pull, fetch, rebase, merge, or otherwise touch the remote on the user's behalf — those can prompt for credentials and modify the user's working tree. Prompt the user to update instead.

For each **git** repo (`CHIMERA_PATH`, `SERVICE_CORE_PATH`, `MODULES_SECURITY_PATH`):

1. Report the current branch to the user:

   ```bash
   git -C {REPO_PATH} rev-parse --abbrev-ref HEAD
   ```

   Ask: **"`{repo-name}` is on branch `{branch}` — is that the correct branch for this change?"** Do not proceed for that repo until the user confirms. If the user says no, ask them to switch branches themselves and confirm when ready — do not check out or switch branches on their behalf.

2. Check the working tree is clean (read-only, safe to run):

   ```bash
   git -C {REPO_PATH} status --porcelain
   ```

   If the working tree is dirty, report the uncommitted changes and ask the user to resolve them before proceeding. Do **not** stash, reset, or discard their work.

3. Prompt the user to update their branch themselves:

   **"Please make sure `{repo-name}` is up to date with the latest on `{branch}` (e.g. `git pull` in your terminal), then confirm when ready. I won't pull, fetch, rebase, or merge on your behalf — those commands may prompt for credentials and I want you in control of remote operations."**

   Wait for confirmation before continuing. Do not run `git pull`, `git fetch`, `git rebase`, `git merge`, or any other command that contacts the remote.

For the **Classic AppServer (TFS)** repo, prompt the user:

**"Please get the latest on the `FTR1` branch for the Classic AppServer workspace (TFS), then confirm when done. I can't do this for you — use Visual Studio / Team Explorer / `tf.exe get` in your TFS workspace."**

Wait for confirmation before continuing.

---

## Phase 2 — Gather Permission Details

Ask the user for the following — **present each item exactly as written below, do not paraphrase or shorten**:

1. **Code** — e.g. `General_General_EditLookupCode`. Must match across chimera-client, service-core, modules-security, and the classic enum name.
2. **Area** — e.g. `General`
3. **Sub-Area** — e.g. `General`
4. **Display Name** — e.g. `Edit Lookup Code`
5. **Country** (optional, only applicable for modules-security repository code changes) — `CA`, `US`, or blank. Only set if country-specific or different names per country are needed. See the Country Property Notes section for additional details.
6. **Classic enum integer value** — the next available integer value in `Enums.vb`. Ask the user to inspect `Enums.vb` and provide it; do not guess.
7. **Translations** — the localized display strings for the new permission, one value per locale. These come from the **Jira ticket**, usually as an attached Excel file with English + French (and sometimes en-CA / en-GB) values per key. Gathering them now lets every locale file be populated in Phase 4. Ask the user:

   **"Please paste the translation rows from the Jira ticket's Excel attachment (one line per locale per key, e.g. `EDIT_LOOKUP_CODE | en-US | Edit Lookup Code`). If the ticket has no attachment yet, paste the English/French values available and I'll flag any missing locales. If you don't have them yet, say 'skip' and I'll prompt again during implementation (Phase 4)."**

Store as `CODE`, `AREA`, `SUB_AREA`, `NAME`, `COUNTRY`, `ENUM_VALUE`, `TRANSLATIONS`.

### Collision check

Before any edits, search each located repo for `CODE` using the **Grep tool** (not a raw `grep` shell command — `grep` is not available on stock Windows). Search each of these paths:

- `{CHIMERA_PATH}/src/published/ASI.TAM/Foundation/Security/SecureArea.ts`
- `{SERVICE_CORE_PATH}/src/Domain/SecurityArea.cs`
- `{MODULES_SECURITY_PATH}/src/Application/Users/SecurityPermissions/` (all four locale JSONs)
- `{APPSERVER_PATH}/ASI.TAM/Foundation/Security/Enums.vb`

**`ENUM_VALUE` uniqueness check — run against all three enum-containing files**, not just `Enums.vb`. Each repo maintains its own copy of the enum, and they can drift out of sync (a value reserved in `Enums.vb`'s "Next Available" pointer is not always the next free value in service-core or chimera-client). Use the Grep tool with pattern `= {ENUM_VALUE}\b` (literal word boundary, so `1790` does not match `17900`) on **each** of:

- `{APPSERVER_PATH}/ASI.TAM/Foundation/Security/Enums.vb`
- `{SERVICE_CORE_PATH}/src/Domain/SecurityArea.cs`
- `{CHIMERA_PATH}/src/published/ASI.TAM/Foundation/Security/SecureArea.ts`

If `ENUM_VALUE` matches an existing entry in **any** of these files (other than the new code being added), stop and report the collision — do not proceed. Tell the user to inspect all three of the following files to determine the next available enum value (the highest used value + 1 across all three, so the chosen value is free in every repo):

- `{CHIMERA_PATH}/src/published/ASI.TAM/Foundation/Security/SecureArea.ts`
- `{SERVICE_CORE_PATH}/src/Domain/SecurityArea.cs`
- `{APPSERVER_PATH}/ASI.TAM/Foundation/Security/Enums.vb`

The user must either pick a different `ENUM_VALUE` (verified free in all three files) or resolve the drift before edits begin.

If any `CODE` match is found in the earlier `CODE` collision check, also stop and report — do not proceed.

---

## Phase 3 — Plan

Present a plan listing, for each located repo:

- The exact file(s) to edit
- Where the new entry will be inserted (section / adjacent entries)
- The exact text to be added

For any skipped repos, list the manual steps the user will need to perform.

Ask for approval before making any edits.

---

## Phase 4 — Implementation

### 4a. chimera-client — `SecureArea.ts` and `SecurableAreas.ts`

Both files must be updated — missing either will cause the permission to behave inconsistently.

1. Read `{CHIMERA_PATH}/src/published/ASI.TAM/Foundation/Security/SecureArea.ts` and add the new entry following existing pattern, indentation, and grouping conventions.
2. Read `{CHIMERA_PATH}/src/published/ASI.TAM/Data/Security/SecurableAreas/SecurableAreas.ts` and add the corresponding entry so the permission appears correctly in security listings. Also check the sibling files in that directory (`Area.ts`, `SubArea.ts`, `Permission.ts`) — if the new permission introduces a new `AREA` or `SUB_AREA` not already present, those files must be updated too. Use the Grep tool on each to confirm the existing `AREA` / `SUB_AREA` values before adding new ones.

### 4a.i. chimera-client — Translations

Translation text for new permissions comes from the **Jira ticket**, usually as an attached Excel file with English + French (and sometimes en-CA / en-GB) values per key.

**If `TRANSLATIONS` was already gathered in Phase 2, reuse it — do not re-prompt.** Only if it was skipped or is incomplete, prompt the user now before proceeding:

**"Please paste the translation rows from the Jira ticket's Excel attachment (one line per locale per key, e.g. `EDIT_LOOKUP_CODE | en-US | Edit Lookup Code`). If the ticket has no attachment, paste the English/French values you have and I'll flag any missing locales."**

Wait until translations are available (from Phase 2 or this prompt) before editing any locale file.

Translation files (all four must be updated):

- `{CHIMERA_PATH}/src/published/translations/en-US.json`
- `{CHIMERA_PATH}/src/published/translations/en-CA.json`
- `{CHIMERA_PATH}/src/published/translations/en-GB.json`
- `{CHIMERA_PATH}/src/published/translations/fr-CA.json`

Conventions (derived from existing entries — always scan the live files to confirm the current style):

- Files are **alphabetically sorted by key**. A pre-commit / CI check enforces sort order via `npm run sort:translations`.
- Two key styles co-exist:
  - **Uppercased prefix keys** — the English string converted to `UPPER_SNAKE_CASE` and truncated to the first **20 characters** (e.g. `"Edit Lookup Code"` → `EDIT_LOOKUP_CODE`, `"Add Security Groups"` → `ADD_SECURITY_GROUPS`). When the 20-char prefix collides with an existing key, append `_<HEX_HASH>` (a SHA-256 hex of the full English string is used elsewhere in the file).
  - **Full sentence-case keys** — the English string used verbatim as the key (e.g. `"Lookup Code": "Lookup Code"`).
- Match the style used by neighbouring permission-related strings in the file. If unsure, use the uppercased-prefix style for new labels.

Steps:

1. For each key supplied by the user, check for collisions against the 20-char prefix using the **Grep tool** on `{CHIMERA_PATH}/src/published/translations/en-US.json` with pattern `^\s*"{PREFIX}`. If a collision exists, append `_<hex hash>` following the existing pattern in the file.

2. Append the new key near the end of **all four** locale files — do not search for an alphabetical insertion point. Use the user-provided value per locale. If a locale value was not provided, use the English value as a placeholder and flag it in the final summary for the user to review.

3. After appending, run the sort script using `npm`'s `--prefix` flag — it will reorder all keys correctly:

   ```
   npm --prefix {CHIMERA_PATH} run sort:translations
   ```

   Review the diff to confirm only the intended keys were added.

4. Do **not** translate legal/regulatory wording. If the permission label contains legal text, use the exact English value in all locales and note it to the user.

### 4b. service-core — `SecurityArea.cs`

Read `{SERVICE_CORE_PATH}/src/Domain/SecurityArea.cs` and add the new entry following the existing pattern.

### 4c. modules-security — localized JSON files

Update all four:

- `SecurityPermissions.en-CA.json`
- `SecurityPermissions.en-GB.json`
- `SecurityPermissions.en-US.json`
- `SecurityPermissions.fr-CA.json`

Entry format:

```json
{
  "code": "{CODE}",
  "area": "{AREA}",
  "subArea": "{SUB_AREA}",
  "name": "{NAME}"
}
```

- `name` should be the **localized** display name per file. Ask the user for the fr-CA translation; if none provided, use the English `NAME` as a placeholder and flag it.
- Include `"country": "{COUNTRY}"` only if `COUNTRY` was provided.
- For per-country names, add multiple entries — see Country Property notes.

Also remind the user:

**"modules-security references a specific version of service-core. Please bump that reference to a version containing your `SecurityArea.cs` change (preferably the latest). I will not modify version files on your behalf."**

### 4d. Classic AppServer — TFS files

Before editing, prompt:

**"The Classic AppServer files live in TFS. Please check out the following files for edit in your TFS workspace, then confirm when ready:**

- `ASI.TAM/Foundation/Security/Enums.vb`
- `ASI.TAM/Data/Security/SecurableAreas/SecurableAreas.vb`
- `ASI.TAM/Data/Security/SecurableAreas/Translations/Translations.en-CA.resx`
- `ASI.TAM/Data/Security/SecurableAreas/Translations/Translations.en-GB.resx`
- `ASI.TAM/Data/Security/SecurableAreas/Translations/Translations.fr-CA.resx`**"**

Wait for the user to confirm. Then:

1. Add the enum to `{APPSERVER_PATH}/ASI.TAM/Foundation/Security/Enums.vb` with `ENUM_VALUE`. Follow the existing pattern and sort position. Then locate the **"Next Available"** comment in the file (e.g. `' Next Available: 1791`) and update it to `ENUM_VALUE + 1` so the pointer stays accurate for the next developer.
2. Add the entry to `{APPSERVER_PATH}/ASI.TAM/Data/Security/SecurableAreas/SecurableAreas.vb` so it appears correctly in generated reports. **Always prompt the user to do this manually — do not run the Edit or Write tool against `SecurableAreas.vb`** (see below).

#### Preserve encoding and line endings

These `.vb` files live in **TFS** (not git) and are consumed by Visual Studio / the Classic AppServer build. They use **CRLF** line endings, and the encoding varies per file — some are pure ASCII, but **`SecurableAreas.vb` is Windows-1252** (it contains bytes like `0x92` curly apostrophe and `0x96` en-dash that are not valid UTF-8). Any stray encoding flip will show up as a whole-file change, fail TFS check-in policies, or break the build.

##### `SecurableAreas.vb` — always manual paste (skip encoding detection)

`SecurableAreas.vb` is known to be Windows-1252, so **skip the encoding-detection step for this file** and go straight to the manual-paste flow. The Edit tool reads files as UTF-8 and would replace every Windows-1252 high-byte with `U+FFFD` (`EF BF BD`) on write, silently corrupting unrelated lines across the entire file.

Prompt the user:

Before writing this prompt, use the Grep tool on `{APPSERVER_PATH}/ASI.TAM/Data/Security/SecurableAreas/SecurableAreas.vb` with pattern `{AREA}.*{SUB_AREA}` to find the last existing permission entry in the same area/sub-area group. Use that match as the insertion anchor in the prompt below. If no match is found, Grep for the last permission entry in the file to use as the anchor instead.

> **"`SecurableAreas.vb` contains Windows-1252 bytes that my editing tool may corrupt. Please paste the following lines manually in Visual Studio **after the `{LAST_MATCHING_ENTRY}` permission** (found in the same area/sub-area group), at the same indentation, then save (Visual Studio preserves Windows-1252):**
>
> ```
> <the exact lines, copy-pasted ready to insert>
> ```
>
> **Confirm when done."**

Wait for confirmation, then continue. Do **not** attempt to verify the new lines in `SecurableAreas.vb` with Read+Edit afterward — limit verification to Grep, which is byte-safe.

##### `Enums.vb` — detect encoding before editing

`Enums.vb` is typically ASCII, but verify before editing. From Git Bash / WSL / macOS:

```
grep -cP '[\x80-\xff]' {APPSERVER_PATH}/ASI.TAM/Foundation/Security/Enums.vb
```

- **If the count is `0`** → file is pure ASCII. Safe to use the **Edit tool** (see rules below).
- **If the count is `> 0`** → fall back to the same manual-paste flow used for `SecurableAreas.vb`.

##### Rules for Edit on ASCII `.vb` files

For `Enums.vb` when the encoding check returned `0`:

- Always use the **Edit tool** (not Write). Edit performs a targeted byte replacement and leaves CRLF EOLs intact. Never use Write — even rewriting "the same" content can normalize CRLF → LF.
- Do **not** use PowerShell `Set-Content` / `Out-File` on these files. Windows PowerShell 5.1 defaults to UTF-16 LE with BOM and will corrupt them.
- Do not run formatters, linters, or "save with cleanup" actions that touch the whole file.
- When constructing the `old_string` / `new_string` for Edit, copy the exact whitespace and line endings shown in the Read output — do not retype lines from memory or paste from elsewhere, as that can introduce LF endings into a CRLF file.

##### Post-edit verification

After editing `Enums.vb`, ask the user to confirm the pending TFS changes are scoped to just the new entries before checking in — e.g. via **View → Pending Changes → Compare with Workspace Version** in Visual Studio, or `tf diff` in a Developer Command Prompt.

If the comparison shows the entire file changed or every line marked as modified, stop — encoding or EOLs were flipped. Re-run the encoding-detection grep on the post-edit file:

```
grep -c $'\xef\xbf\xbd' {APPSERVER_PATH}/ASI.TAM/Foundation/Security/Enums.vb
```

A non-zero count of `U+FFFD` means the file was Windows-1252 and got corrupted. Ask the user to `tf undo` the file and follow the manual-paste flow instead of retrying with Edit.

Warn the user:

**"⚠️ Changing Security Enums means this feature must be gated to the AppServer release so that security reports stay accurate. Confirm gating is in place before shipping."**

### 4d.i. Classic AppServer — Translations

Translation text comes from the same Jira ticket source as chimera-client. Reuse `TRANSLATIONS` gathered in Phase 2 (or in Phase 4a.i if it was skipped earlier). Only if translations are still missing, prompt the user as in 4a.i and wait.

Translation files (under `{APPSERVER_PATH}/ASI.TAM/Data/Security/SecurableAreas/Translations/`):

- `Translations.en-CA.resx`
- `Translations.en-GB.resx`
- `Translations.fr-CA.resx`

> **Note:** there is no `en-US` resx — `en-US` is the default and lives in the main resource file / source strings. There is also no sort script for these files; insertion order is preserved as-is.

#### Encoding check (required before editing)

These `.resx` files are **UTF-8 with BOM** and must remain so. Before editing, verify each file is valid UTF-8 by reading a section containing French accented characters (e.g. `Translations.fr-CA.resx` around the `General` entry). If accents render correctly (`é`, `à`, `ç`), the Edit tool is safe to use. If you see `U+FFFD` (`�`) replacement characters, **stop** — fall back to the manual-paste flow used for `SecurableAreas.vb` and ask the user to add the entries in Visual Studio.

Do **not** use the Write tool, PowerShell `Set-Content` / `Out-File`, or any formatter on these files — they will strip or alter the BOM and may flip line endings, producing whole-file diffs that fail TFS check-in policies.

#### Key convention

Existing entries use the **full English string verbatim as the `name` attribute** — e.g. `<data name="Edit Lookup Code" xml:space="preserve">`. This differs from chimera-client's UPPER_SNAKE_CASE prefix style. **Match the existing file convention** — use the full English string as the key.

Use the **Grep tool** with pattern `name="{NAME}"` against each `.resx` to confirm the key does not already exist before adding.

#### Entry format

```xml
  <data name="{NAME}" xml:space="preserve">
    <value>{LOCALIZED_VALUE}</value>
  </data>
```

#### Per-locale rules

- **`fr-CA`** — always add an entry with the French translation. If no French value was provided, flag it and use the English value as a placeholder for the user to review.
- **`en-CA` / `en-GB`** — only add an entry **if the locale value differs from the English `NAME` provided in Phase 2** (e.g. `NAME = "License"` and en-GB requires "Licence"). The `NAME` value is the effective `en-US` baseline — there is no `en-US.resx` because `en-US` is the default embedded in the resource source strings. If the locale value is identical to `NAME`, **do not** add an entry. Inspect adjacent entries in each file to see what kinds of overrides are typical.

#### Insertion point

Always **append** new `<data>` entries at the end of the file, immediately before the closing `</root>` tag. Do not search for a related-entry insertion point. Use the **Edit tool** with the closing `</root>` tag as the anchor, copying surrounding context exactly from a Read of the file so CRLF line endings are preserved.

#### Post-edit verification

After editing, ask the user to confirm via **View → Pending Changes → Compare with Workspace Version** that only the new `<data>` blocks are highlighted. If the entire file shows as changed, EOLs or BOM were flipped — ask the user to `tf undo` and retry, or paste the entries manually in Visual Studio.

---

## Phase 5 — Verification (subagent)

Dispatch a subagent using the `Agent` tool (`subagent_type: "Explore"` works well here). Pass the resolved repo paths plus `CODE`, `AREA`, `SUB_AREA`, `NAME`, `COUNTRY`, and `ENUM_VALUE`.

The subagent must verify:

1. `CODE` is present in **all** of:
   - `{CHIMERA_PATH}/src/published/ASI.TAM/Foundation/Security/SecureArea.ts`
   - `{CHIMERA_PATH}/src/published/ASI.TAM/Data/Security/SecurableAreas/SecurableAreas.ts`
   - `{SERVICE_CORE_PATH}/src/Domain/SecurityArea.cs`
   - all four `{MODULES_SECURITY_PATH}/src/Application/Users/SecurityPermissions/SecurityPermissions.*.json`
   - `{APPSERVER_PATH}/ASI.TAM/Foundation/Security/Enums.vb`
   - `{APPSERVER_PATH}/ASI.TAM/Data/Security/SecurableAreas/SecurableAreas.vb`
2. The JSON entries in modules-security have matching `code`, `area`, `subArea` across all four locale files.
3. `ENUM_VALUE` is unique in **each** of these files — no other enum member uses that integer in any of them:
   - `{APPSERVER_PATH}/ASI.TAM/Foundation/Security/Enums.vb`
   - `{SERVICE_CORE_PATH}/src/Domain/SecurityArea.cs`
   - `{CHIMERA_PATH}/src/published/ASI.TAM/Foundation/Security/SecureArea.ts`

   Use Grep pattern `= {ENUM_VALUE}\b` per file. The match count should be exactly **1** in each (the new entry). Zero = the new member is missing or was added with the wrong integer in that file; report which file and stop. Two or more = collision; report the conflicting line(s) and stop.

4. Translations are present:
   - chimera-client: the new key exists in all four `{CHIMERA_PATH}/src/published/translations/*.json` files.
   - Classic AppServer: a `<data name="{NAME}">` entry exists in `{APPSERVER_PATH}/ASI.TAM/Data/Security/SecurableAreas/Translations/Translations.fr-CA.resx`. Entries in `Translations.en-CA.resx` / `Translations.en-GB.resx` are only required when the value differs from default English — flag absence as "expected unless override needed", not as failure.
5. Any repo skipped in Phase 1 is flagged as "unverified".

The subagent should return a structured report:

- ✅ / ❌ per repo with the matching line number or reason for failure
- Final summary of mismatches

If any mismatch is found, present it and stop — do not claim success.

---

## Phase 6 — Summary

Present a final summary:

- **Files modified** (with paths)
- **Repos skipped** and the manual steps for each (exact entries to add, in the format above)
- **Reminders:**
  - Review the changes in each repo before committing — confirm only the intended entries changed.
  - Commit and push each repo yourself — this skill never commits.
  - Bump the service-core reference in modules-security to at least the version that contains your changes to service-core (preferably update to latest version).
  - For TFS: review pending changes before check-in via your TFS workflow.
  - Gate AppServer enum changes to the AppServer release.
- **Post-deploy api verification** — once deployed, verify the API with an Epic user (not admin) that has the permission enabled:

  ```
  GET https://api-dev.apigee.appliedcloudservices.com/internal/epic/user/v2/users/me/permissions?area={AREA}&subArea={SUB_AREA}
  ```

  Use a Bearer Token for a user with the permission. The new entry should appear in the `permissions` array.

---

## Country Property Notes

`country` is not for translations — localization is handled via the locale files. It has values `CA` or `US` and is used for CSIO-related flows. Non-Canadian users are currently treated as `US`.

- **Do not** set `country` unless the permission is only available to that country, or different per-country display names are needed for the same code.
- For per-country names, add two entries with the same `code` but different `name` and `country`:

```json
{
  "code": "Procedures_Interface_IVANS",
  "area": "Procedures",
  "subArea": "Month-End",
  "name": "IVANS",
  "country": "US"
},
{
  "code": "Procedures_Interface_IVANS",
  "area": "Procedures",
  "subArea": "Month-End",
  "name": "CSIOnet",
  "country": "CA"
}
```

---

## Reference

- Confluence: [Adding New Program Access](https://appliedsystems.atlassian.net/wiki/spaces/EPIC/pages/6283395947/Adding+New+Program+Access)
