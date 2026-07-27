---
name: chimera-add-feature-flag
description: Add a new feature flag to the Chimera Client codebase only. ONLY use this skill directly if the user explicitly wants Chimera-only changes or if you are running as a subagent dispatched by add-feature-flag. If add-feature-flag is available in your skills list, use that instead — it orchestrates this skill alongside ConfigCat and App Server. Triggers on "add flag to chimera", "update featureFlag.ts", "update FeatureFlag.ts", or when dispatched as a subagent.
---

# Add Feature Flag (Chimera Client)

> **Are flag name, repo path, and skip instructions already provided in your prompt?** If yes — you are a subagent dispatched by `add-feature-flag` and should proceed with this skill immediately.
>
> If no flag details are pre-provided and `add-feature-flag` (or `epic-feature-flag:add-feature-flag`) is in your available-skills list — stop and invoke that orchestrator instead. Only continue here if the user explicitly wants Chimera-only changes.

This skill walks through adding a new feature flag to the chimera-client codebase. There are two TypeScript files that need updates and a prerequisite step in ConfigCat.

**IMPORTANT: Do NOT use Python at any point in this skill.** Use only Bash commands, the WebFetch tool, and built-in Claude Code tools (Read, Glob, Grep, Edit).

## Step 1: Locate the Chimera Client Codebase

Check whether the current working directory (or a parent of it) is inside a chimera-client repository by looking for `src/core/builtins/SMART/Sys/Providers/featureFlag.ts`.

- **If yes**: Tell the user which path you found and **ask them to confirm**.
- **If no**: Ask the user for the path to their chimera-client repo (e.g., `C:\Git Repos\chimera-client` or `~/repos/chimera-client`).

**NEVER scan or search the filesystem** for chimera-client repos outside the current working directory tree. Developers may have multiple branches checked out. Always ask if you are not already inside one.

All file paths in subsequent steps are relative to this repo root.

## Step 2: ConfigCat Reminder

**Skip this step if the flag was selected using the list-feature-flags skill** — that skill reads directly from the ConfigCat repo, so the flag is already confirmed to exist.

Otherwise, alert the user:

> **Important:** Make sure this feature flag has been added to ConfigCat first. If the flag doesn't exist in ConfigCat, it won't work as intended at runtime even though the code will compile. If you haven't done this yet, do it now before proceeding.

Wait for the user to confirm before continuing.

## Step 3: Gather Information

Ask the user for three pieces of information:

1. **Application name** — The ConfigCat application (e.g., `epic`). Defaults to `epic` if the user doesn't specify.
2. **Flag name** — The name of the feature flag (e.g., `MY_NEW_FLAG`). This will be used as the constant name in the FeatureFlag object and as the flag identifier in URLs.
3. **Configuration area** — The ConfigCat configuration area (e.g., `sms`, `dashboard`, `AI`, `book-builder`). This determines which subclass the endpoint method goes into, and appears in the URL as the `configuration` query parameter.

If the user isn't sure which flag to add or wants to browse existing flags, use the **list-feature-flags** skill to let them select from the available ConfigCat flags. That skill provides the application name, flag name, and configuration area automatically.

Once you have all three, proceed to the next step.

## Step 4: Check for Duplicates

Before making any changes, check if the flag already exists in either file:

1. Search `src/core/builtins/SMART/Sys/Providers/featureFlag.ts` for the flag name.
2. Search `src/published/ASI.TAM/Foundation/Services/Endpoints/FeatureFlag.ts` for the flag name in lowercase in a URL string.

If the flag is found in either file, alert the user:

> **This flag already exists.** `{FLAG_NAME}` was found in {file(s)}. It does not need to be added again.

Show the user where it was found (the matching lines) and stop. Do not proceed with edits.

## Step 5: Add the Flag Entry in featureFlag.ts

File: `src/core/builtins/SMART/Sys/Providers/featureFlag.ts`

Add a new entry to the `FeatureFlag` object (the `export const FeatureFlag = { ... }` block). New flags should use the `Flag` constructor pattern:

```typescript
  {FLAG_NAME}: new Flag('{configuration_area}', '{flag_name_lowercase}'),
```

Where:

- `{FLAG_NAME}` is the constant name in UPPER_CASE (e.g., `SMS_MMS`, `AI_AUTOFILL`)
- `{configuration_area}` is the configuration area string (e.g., `sms`, `AI`, `book-builder`)
- `{flag_name_lowercase}` is the flag name in lowercase (e.g., `sms_mms`, `ai_autofill`)

Add the entry at the end of the object, just before the closing `};` — but after the last existing entry. Make sure to add a comma after the previous last entry if it doesn't already have one.

**For multiline Flag constructors** (when the line would be too long), follow this pattern:

```typescript
  {FLAG_NAME}: new Flag(
    '{configuration_area}',
    '{flag_name_lowercase}'
  ),
```

## Step 6: Add the Endpoint in FeatureFlag.ts

File: `src/published/ASI.TAM/Foundation/Services/Endpoints/FeatureFlag.ts`

Look inside the `FeatureFlag` class. Each configuration area maps to a static nested class.

### If the configuration area already has a subclass

Find the existing subclass that matches the configuration area. Add a new static getter method inside it:

```typescript
    static get{Flag_Name}(oUserContext: IUserContext): string {
      return `v1/flags/{flag_name_lowercase}?application={application_name}&configuration={configuration_area}${FeatureFlag.GetAttributes(
        oUserContext
      )}`;
    }
```

Where:

- `get{Flag_Name}` is the method name — use the flag name, matching the naming style of existing methods in that subclass (e.g., `getSMS_MMS`, `getREVENUE_STATUS`, `getDashboard_Access`)
- `{flag_name_lowercase}` is the flag name in lowercase for the URL
- `{application_name}` is the application (usually `epic`)
- `{configuration_area}` is the configuration area

### If the configuration area does NOT have a subclass yet

Create a new static nested class inside the `FeatureFlag` class (before the closing `}`). Use PascalCase for the class name, following the naming style of existing subclasses:

```typescript
  static {ConfigAreaPascalCase} = class extends dotNetBaseClass {
    static get{Flag_Name}(oUserContext: IUserContext): string {
      return `v1/flags/{flag_name_lowercase}?application={application_name}&configuration={configuration_area}${FeatureFlag.GetAttributes(
        oUserContext
      )}`;
    }
  };
```

### Matching configuration areas to existing subclasses

The mapping between configuration area and subclass is not always 1:1. Some configuration areas group multiple flags into a single subclass (e.g., `RevenueStatus` has both `REVENUE_STATUS` and `REVENUE_STATUS_DATE_CONFIGURATION`). Others use a separate subclass per flag (e.g., SMS flags each have their own class: `SMS_MMS`, `SMS_MOVE`, `SMS_ROUTING`, etc.).

Always read the current file to determine which pattern the configuration area follows. Search for the configuration value in the URL strings (e.g., `configuration=sms`) to find matching subclasses. Then follow the established convention:

- If the config area uses **one class per flag** (like SMS), create a new subclass for the new flag.
- If the config area uses **a shared class** (like RevenueStatus), add the method to the existing class.

## Summary Checklist

After making changes, confirm:

- [ ] ConfigCat flag exists (user confirmed or selected via list-feature-flags)
- [ ] Flag does not already exist in the codebase (verified)
- [ ] `Flag` entry added in `featureFlag.ts` (SMART Providers)
- [ ] Endpoint getter added in `FeatureFlag.ts` (TAM Endpoints) inside the correct subclass (or new subclass created)

## Manual Review Reminder

After all changes are verified in the checklist above, alert the user:

> **Please review and commit these changes manually.**
> Files modified:
>
> - `src/core/builtins/SMART/Sys/Providers/featureFlag.ts`
> - `src/published/ASI.TAM/Foundation/Services/Endpoints/FeatureFlag.ts`
>
> Also verify you are on the correct git branch before committing.

Do NOT run `git commit`, `git add`, or `git push` — leave all changes for the user to review and commit manually.

## Step 7: Offer to Build

After all changes are made, ask the user if they want to build the project to verify the changes compile:

> Would you like me to build the chimera-client project to verify the changes compile?

If the user says yes, run the TypeScript compiler from the repo root:

```bash
cd "{chimera-client-root}" && npx tsc --noEmit
```

If the build fails, show the error output and offer to help diagnose the issue. Common causes include missing commas, incorrect import references, or TypeScript type errors.
