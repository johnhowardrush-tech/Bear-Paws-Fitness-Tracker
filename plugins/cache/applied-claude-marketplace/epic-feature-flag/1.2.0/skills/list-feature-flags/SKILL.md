---
name: list-feature-flags
description: Browse and select existing ConfigCat feature flags from the asi-configcat repo (remote via GitLab API or local clone). Use this skill when the user wants to see what feature flags exist, browse available flags, search for a specific flag, pick a flag to implement, or check if a flag already exists. Also use when the app-server-add-feature-flag skill needs to know which flags are available to implement.
---

# List Feature Flags

This skill reads feature flags from the `asi-configcat` repository and walks the user through a drill-down selection: tier -> application -> configuration area -> flag -> details.

**IMPORTANT: Do NOT use Python at any point in this skill.** Not all users have Python installed. Use only Bash commands (curl, grep, sed, awk, etc.), the WebFetch tool, and built-in Claude Code tools (Read, Glob, Grep) for all operations including JSON parsing and YAML reading. For parsing JSON responses from the GitLab API, use `jq` or `grep`/`sed` in Bash — never Python.

## Step 1: Determine Data Source (Remote or Local)

The skill supports two modes: **remote** (default, preferred) and **local** (fallback).

### Remote Mode (Default)

Use the GitLab Repository API to browse the repo without needing a local clone.

- **Project URL**: `https://gitlab.com/appliedsystems/infrastructure/asi-configcat`
- **Encoded project path** (for API calls): `appliedsystems%2Finfrastructure%2Fasi-configcat`
- **Base branch**: `main`

API endpoints (use via WebFetch with appropriate GitLab auth headers):

- **List directories/files**: `https://gitlab.com/api/v4/projects/appliedsystems%2Finfrastructure%2Fasi-configcat/repository/tree?ref=main&path={path}`
- **Read a file**: `https://gitlab.com/api/v4/projects/appliedsystems%2Finfrastructure%2Fasi-configcat/repository/files/{url_encoded_file_path}/raw?ref=main`

When URL-encoding file paths for the files API, encode the full path (e.g., `apps/development/epic/flags/sms/sms_mms.yaml` becomes `apps%2Fdevelopment%2Fepic%2Fflags%2Fsms%2Fsms_mms.yaml`).

**Authentication**: Include a `PRIVATE-TOKEN` header with the value from the `GITLAB_TOKEN` environment variable. To check if it is set, run `bash -c 'if [ -n "$GITLAB_TOKEN" ]; then echo "set"; else echo "not set"; fi'` — **NEVER echo, print, or log the token value itself**. Use `$GITLAB_TOKEN` directly in curl/WebFetch headers without exposing it. If it's not set or the API returns 401/403, fall back to local mode and tell the user why.

**Pagination**: Add `&per_page=100` to tree API calls to avoid missing entries. The default is 20.

**Getting flag counts (Step 3)**: In remote mode, to show the flag count per configuration area, make parallel WebFetch calls for each area's tree listing. This adds one round of API calls but gives the user the same information as local mode.

### Local Mode (Fallback)

If remote access fails, fall back to finding a local clone:

1. Check if the current working directory contains an `apps/` folder with tier subfolders (i.e., you're already inside the repo).
2. Check if a sibling or nearby directory named `asi-configcat` exists (e.g., if the working directory is `/path/to/repos/some-project`, check `/path/to/repos/asi-configcat`).
3. Check common parent directories up to 3 levels above the current working directory for an `asi-configcat` folder.

If found, use it and tell the user which path was detected. If not found, ask the user for the path to their local clone.

### Data Path

The flags live under: `apps/{tier}/` where `{tier}` is the selected tier (e.g., `development`, `production`, `staging`).

## Step 2: Select a Tier

List the folders inside `apps/` as a numbered list. These are the available tiers. Default to `development` if the user just presses enter or doesn't specify.

- **Remote**: `GET .../repository/tree?ref=main&path=apps&per_page=100` — filter results to entries where `type` is `"tree"`.
- **Local**: List directories inside `{repo-root}/apps/`.

Present them like this:

```
Select a tier (default: development):

  1. development  ← default
  2. production
  3. staging

Enter a number:
```

If the user presses Enter without picking, use `development`. Store the selected tier as `{tier}` for all subsequent steps.

## Step 3: Select an Application

List the folders inside `apps/{tier}/` as a numbered list. These are the available applications (e.g., `epic`, `appliedpay`, `benefitsoverview`, etc.).

- **Remote**: `GET .../repository/tree?ref=main&path=apps/{tier}` — filter results to entries where `type` is `"tree"`.
- **Local**: List directories inside `{repo-root}/apps/{tier}/`.

Present them like this:

```
Select an application:

  1. aan
  2. appliedpay
  3. benefitsoverview
  4. epic
  5. epic_forms
  ...

Enter a number:
```

Wait for the user to pick one before continuing.

## Step 4: Select a Configuration Area

List the folders inside `apps/{tier}/{selected-app}/flags/` as a numbered list. These are the configuration areas for that application.

- **Remote**: `GET .../repository/tree?ref=main&path=apps/{tier}/{selected-app}/flags` — filter to `type: "tree"`.
- **Local**: List directories inside `{repo-root}/apps/{tier}/{selected-app}/flags/`.

Present them like this:

```
Configuration areas for epic:

  1. AI (3 flags)
  2. account-custom-field (1 flag)
  3. applied-payments (13 flags)
  4. dashboard (3 flags)
  5. sms (8 flags)
  ...

Enter a number:
```

Include the flag count for each configuration area so the user knows how many flags are inside.

If there is only **1 configuration area**, tell the user and automatically select it (skip to Step 5) without prompting.

Otherwise, wait for the user to pick one before continuing.

## Step 5: Select a Flag

List the `.yaml` files inside the selected configuration area folder as a numbered list. The flag name is the filename without the `.yaml` extension.

- **Remote**: `GET .../repository/tree?ref=main&path=apps/{tier}/{selected-app}/flags/{selected-area}` — filter to entries where `name` ends with `.yaml`.
- **Local**: List `.yaml` files inside `{repo-root}/apps/{tier}/{selected-app}/flags/{selected-area}/`.

Present them like this:

```
Flags in sms:

  1. sms_10dlc_purchase_restriction_uk
  2. sms_configure_register
  3. sms_configure_register_uk
  4. sms_confirm_account_routing
  5. sms_mms
  6. sms_move
  7. sms_routing
  8. sms_traffic_validation

Enter a number (or 'all' to show details for all flags):
```

If there is only **1 flag** in the configuration area, tell the user and automatically show its details (skip to Step 6) without prompting for selection.

Otherwise, wait for the user to pick one before continuing.

## Step 6: Show Flag Details

Read the selected flag's YAML file and present its details.

- **Remote**: `GET .../repository/files/apps%2F{tier}%2F{app}%2Fflags%2F{area}%2F{flag}.yaml/raw?ref=main`
- **Local**: Read `{repo-root}/apps/{tier}/{app}/flags/{area}/{flag}.yaml`.

```
Flag: sms_mms
Configuration area: sms
Default value: true
Rules: none
```

If rules exist, show them:

```
Flag: ai_autofill
Configuration area: AI
Default value: false
Rules:
  - value: true, locales: [us, ca]
```

Do NOT fetch the friendly name from `apps/flags.yaml` — that file is very large and slows down the workflow significantly. Skip the friendly name entirely.

## Step 7: Next Action

After showing the flag details, offer the user options:

```
What would you like to do?
  1. Select another flag from this configuration area
  2. Go back to configuration areas
  3. Go back to applications
  4. Go back to tiers
  5. Use this flag with app-server-add-feature-flag
  6. Done
```

If the user chooses option 5, present the flag info formatted for the app-server-add-feature-flag skill:

- **Application name**: The application selected in Step 2 (e.g., `epic`, `appliedpay`)
- **Flag name**: The YAML filename (e.g., `sms_mms`)
- **Configuration area**: The parent folder name (e.g., `sms`)
- **UPPER_CASE constant name**: The flag name converted to uppercase (e.g., `SMS_MMS`)
- **Default value**: From the YAML content
- **Rules**: Any conditional rules from the YAML

The application name, flag name, and configuration area are exactly what the app-server-add-feature-flag skill needs to proceed.
