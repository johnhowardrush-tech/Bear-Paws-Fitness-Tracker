---
name: configcat-add-feature-flag
description: Add a new feature flag to the asi-configcat repository only. ONLY use this skill directly if the user explicitly wants ConfigCat-only changes or if you are running as a subagent dispatched by add-feature-flag. If add-feature-flag is available in your skills list, use that instead — it orchestrates this skill alongside App Server and Chimera. Triggers on "add flag to configcat", "new configcat flag", "create configcat flag", or when dispatched as a subagent.
---

# Add Feature Flag to ConfigCat

> **Are flag name, repo path, and skip instructions already provided in your prompt?** If yes — you are a subagent dispatched by `add-feature-flag` and should proceed with this skill immediately.
>
> If no flag details are pre-provided and `add-feature-flag` (or `epic-feature-flag:add-feature-flag`) is in your available-skills list — stop and invoke that orchestrator instead. Only continue here if the user explicitly wants ConfigCat-only changes.

This skill walks through adding a new feature flag to the `asi-configcat` repository. Adding a flag requires creating YAML files across all three tiers and registering the flag's friendly name in `flags.yaml`.

**IMPORTANT: Do NOT use Python at any point in this skill.** Use only Bash commands and built-in Claude Code tools (Read, Glob, Grep, Edit, Write).

## Step 1: Locate the asi-configcat Repository

Check whether the current working directory (or a parent of it) is inside the asi-configcat repository by looking for an `apps/development` directory.

- **If yes**: Tell the user which path you found and **ask them to confirm**.
- **If no**: Ask the user for the path to their local clone (e.g., `C:\Git Repos\asi-configcat` or `~/repos/asi-configcat`).

**NEVER scan or search the filesystem** outside the current directory tree.

All file paths in subsequent steps are relative to this repo root.

## Step 2: Gather Flag Information

Collect the following information interactively:

### 3a. Application name

List the folders inside `apps/development/` to show existing applications as a numbered list, plus an option to create a new one:

```
Select an application:

  1. aan
  2. appliedpay
  3. benefitsoverview
  4. epic  ← default
  5. epic_forms
  ...
  N. Create a new application

Enter a number:
```

If the user picks "Create a new application", ask for the new application name.

### 3b. Configuration area

List the folders inside `apps/development/{app}/flags/` to show existing configuration areas, plus an option to create a new one:

```
Select a configuration area for epic:

  1. AI (3 flags)
  2. account-custom-field (1 flag)
  3. applied-payments (13 flags)
  4. dashboard (3 flags)
  5. sms (8 flags)
  ...
  N. Create a new configuration area

Enter a number:
```

Include the flag count per area. If the user picks "Create a new configuration area", ask for the new area name. The name must use **lowercase with dashes** (e.g., `my-new-area`, `recon-ai`, `applied-payments`). If the user enters something with underscores or spaces, convert it to the dashed format and confirm with them. This becomes the folder name under `flags/`.

If there is only **1 configuration area**, tell the user and auto-select it.

### 3c. Flag name

Ask for the flag identifier. The name must use **lowercase with underscores** (e.g., `recon_ai_gather`, `sms_mms`). If the user enters something with dashes, spaces, or uppercase, convert it to the lowercase underscore format and confirm with them. This becomes the YAML filename.

### 3d. Friendly name

Ask for a human-readable name for the flag (e.g., `Recon AI Gather`, `SMS MMS`). This goes in `flags.yaml`.

### 3e. Default value

Ask for the default value for production and staging tiers. Almost always `false`. Defaults to `false`.

### 3f. Development tier configuration

The development tier defaults to `defaultValue: true` (enabled for everyone in dev). Ask if the user wants to add any rules to restrict who the flag is enabled for:

```
Development tier setup (default: enabled for everyone):

  1. No rules — defaultValue: true, enabled for everyone in dev  ← default
  2. Default false with database rules — enabled for specific databases
  3. Default false with user rules — enabled for specific users
  4. Default false with tenant rules — enabled for specific tenants
  5. Default false with segment rules — enabled for specific named segments
  6. Default false with no rules — disabled for everyone in dev

Enter a number:
```

If the user picks **2** (database rules — common for new flags), ask for the database GUID(s) and optional comments. Allow multiple, one per line:

```
Enter database GUID(s), one per line (e.g., 63b31aa2-20f6-43a8-b752-6dd26facd644 # IEDEFECT-DEV - FTR1):
```

If the user picks **3** (user rules), ask for the user identifier(s) and optional comments. The attribute is `user` and the value format is `{database}_{usercode}`:

```
Enter user identifier(s), one per line (e.g., 63b31aa2-20f6-43a8-b752-6dd26facd644_JSMITH # John Smith on FTR1):
```

If the user picks **4** (tenant rules), ask for the tenant identifier(s) and optional comments:

```
Enter tenant identifier(s), one per line:
```

If the user picks **5** (segment rules), ask the user to list all segment names in a single reply, one per line. At least one segment name is required. Parse each non-empty line as one segment name:

```
Enter segment name(s), one per line (e.g., ntmto_team_user):
```

If the user picks **6** (default false, no rules), no additional input is required — proceed to Step 3.

## Step 3: Check for Duplicates

Before making any changes, check if the flag already exists:

1. Search for the flag name in `apps/flags.yaml`
2. Check if a YAML file already exists at `apps/development/{app}/flags/{config-area}/{flag_name}.yaml`

If found, alert the user and stop.

## Step 4: Create Flag YAML Files

Create the flag YAML file in **all three tiers**. The file path pattern is:

```
apps/{tier}/{app}/flags/{config-area}/{flag_name}.yaml
```

### Production and Staging

These tiers get a minimal file with just the default value:

```yaml
defaultValue: false
```

Create:

- `apps/production/{app}/flags/{config-area}/{flag_name}.yaml`
- `apps/staging/{app}/flags/{config-area}/{flag_name}.yaml`

### Development

The development tier file depends on what the user chose in Step 3f:

**Option 1 — No rules (default true):**

```yaml
defaultValue: true
```

**Option 2 — Database rules:**

```yaml
defaultValue: false
rules:
  - value: true
    rolloutRule:
      attribute: "database"
      comparator: "isOneOf"
      value:
        - "{database_guid}" # {optional_comment}
```

**Option 3 — User rules:**

```yaml
defaultValue: false
rules:
  - value: true
    rolloutRule:
      attribute: "user"
      comparator: "isOneOf"
      value:
        - "{database_usercode}" # {optional_comment}
```

**Option 4 — Tenant rules:**

```yaml
defaultValue: false
rules:
  - value: true
    rolloutRule:
      attribute: "tenant"
      comparator: "isOneOf"
      value:
        - "{tenant_id}" # {optional_comment}
```

**Option 5 — Segment rules:**

Generate one `rules` entry per segment name provided. For example, with three segments:

```yaml
defaultValue: false
rules:
  - value: true
    segmentRule:
      comparator: "isIn"
      segment: "{segment_name_1}"
  - value: true
    segmentRule:
      comparator: "isIn"
      segment: "{segment_name_2}"
  - value: true
    segmentRule:
      comparator: "isIn"
      segment: "{segment_name_3}"
```

If only one segment was entered, emit a single `rules` entry:

```yaml
defaultValue: false
rules:
  - value: true
    segmentRule:
      comparator: "isIn"
      segment: "{segment_name}"
```

**Option 6 — Default false, no rules:**

```yaml
defaultValue: false
```

Create:

- `apps/development/{app}/flags/{config-area}/{flag_name}.yaml`

**Note:** If the configuration area folder doesn't exist yet in any tier, create it. The folder name should match the configuration area exactly (e.g., `recon-ai`, `sms`, `AI`).

## Step 5: Add Entry to flags.yaml

File: `apps/flags.yaml`

This file has a flat list of flags under each product. The structure is:

```yaml
products:
  - key: epic
    name: "Epic"
    flags:
      - key: "flag_name"
        name: "Friendly Name"
      - key: "another_flag"
        name: "Another Flag"
  - key: policyworks
    name: "PolicyWorks"
    flags: ...
```

Find the correct product section by matching the application name to `products[].key`. Then add the new flag entry to the `flags` list:

```yaml
- key: "{flag_name}"
  name: "{friendly_name}"
```

**Placement:** Add the new entry near other flags from the same configuration area if they exist, to keep related flags grouped together. If no related flags exist, add it at the end of the product's flags list.

Read the file first to find the right insertion point. Use the Edit tool to insert the new entry.

## Summary Checklist

After making changes, confirm:

- [ ] Flag YAML created in `apps/development/{app}/flags/{config-area}/{flag_name}.yaml`
- [ ] Flag YAML created in `apps/production/{app}/flags/{config-area}/{flag_name}.yaml`
- [ ] Flag YAML created in `apps/staging/{app}/flags/{config-area}/{flag_name}.yaml`
- [ ] Friendly name entry added to `apps/flags.yaml` under the correct product

## Step 7: Manual Review Reminder

After all changes are made, alert the user:

> **Please review and commit these changes manually.**
> Files created/modified (substitute the actual application name, configuration area, and flag name):
>
> - `apps/development/{app}/flags/{config-area}/{flag_name}.yaml`
> - `apps/production/{app}/flags/{config-area}/{flag_name}.yaml`
> - `apps/staging/{app}/flags/{config-area}/{flag_name}.yaml`
> - `apps/flags.yaml`
>
> Also verify you are on the correct git branch before committing.

Do NOT run any `git` commands at any point in this skill.
