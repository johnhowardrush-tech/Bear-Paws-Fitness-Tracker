---
name: add-feature-flag
description: 'PRIMARY entry point for all feature flag work. Always prefer this skill over the individual sub-skills (configcat-add-feature-flag, app-server-add-feature-flag, chimera-add-feature-flag) — use those only for repo-specific changes or when running as a subagent. Orchestrates the full workflow across ConfigCat, App Server, and Chimera Client in parallel. Triggers on "add feature flag", "new feature flag", "register a flag", "add flag to epic and chimera", or any request to add a feature flag across multiple repos. Accepts optional arguments: a Jira ticket key (e.g. EPIC-140321) and repo paths (configcat=, epic=, chimera=) to skip interactive prompts.'
---

# Add Feature Flag (Orchestrator)

This skill is a **thin orchestrator**. Your role is to orchestrate the feature flag addition workflow by gathering confirmed values and dispatching subagents — the subagents are responsible for all code changes. Unless explicitly asked by the user, you must not modify code yourself; use subagents for all code modifications. This skill does not touch any repo directly.

**⚠️ ORCHESTRATOR RULES — read before doing anything:**

1. **No repo access.** Do NOT read files, check git branches, scan directories, search for patterns, or explore any repo from this skill. All repo work is done exclusively by the subagents.
2. **Steps are strictly sequential.** Complete Step 0 fully (fetch ticket, confirm details) before asking anything in Step 1. Never run Step 1 in parallel with Step 0.
3. **Dispatch immediately.** Once all values are confirmed and paths are known, go straight to Step 4 and dispatch subagents. Do not validate, preview, or explore anything first.

**IMPORTANT: Do NOT use Python at any point in this skill.** Use only the Jira MCP tool and built-in Claude Code tools for orchestration only (no file reads on repos).

## Input Parameters (Optional)

Before doing anything else, check the `## Input` section for arguments. Supported parameters:

| Parameter           | Accepted forms                              | Example (Windows)                    | Example (macOS/Linux)             |
| ------------------- | ------------------------------------------- | ------------------------------------ | --------------------------------- |
| Jira ticket         | First positional arg, or `jira=EPIC-140321` | `EPIC-140321`                        | `EPIC-140321`                     |
| ConfigCat repo path | `configcat=<path>`                          | `configcat="C:\repos\asi-configcat"` | `configcat=~/repos/asi-configcat` |
| Epic repo path      | `epic=<path>`                               | `epic="C:\Epic\FTR\FTR1"`            | `epic=~/Epic/FTR/FTR1`            |
| Chimera repo path   | `chimera=<path>`                            | `chimera="C:\repos\chimera-client"`  | `chimera=~/repos/chimera-client`  |

Example invocations:

```
/add-feature-flag EPIC-140321
/add-feature-flag jira=EPIC-140321 configcat="C:\repos\asi-configcat" epic="C:\Epic\FTR\FTR1" chimera="C:\repos\chimera-client"
/add-feature-flag jira=EPIC-140321 configcat=~/repos/asi-configcat epic=~/Epic/FTR/FTR1 chimera=~/repos/chimera-client
```

Parameters may be supplied as structured `key=value` pairs or as natural language. For natural language, infer the repo mapping from folder names and context:

- A path containing `asi-configcat` or `configcat` → ConfigCat repo
- A path containing `chimera-client` or `chimera` → Chimera Client repo
- A path containing `Epic`, `FTR`, `ASI.SMART`, or `ASI.TAM` → Epic (App Server) repo

Example natural language input that should be fully parsed:

> complete EPIC-140321. The local repos are here: `C:\Git Repos\asi-configcat`, `C:\Git Repos\chimera-client` and `C:\Epic\FTR\FTR1` _(Windows)_
> complete EPIC-140321. The local repos are here: `~/repos/asi-configcat`, `~/repos/chimera-client` and `~/Epic/FTR/FTR1` _(macOS/Linux)_

Parse and store any recognized values.

### Workflow determination (resolve this now, before reading any further)

Count the repo paths that are pre-supplied:

| Paths provided                         | Workflow        | Action                                                                |
| -------------------------------------- | --------------- | --------------------------------------------------------------------- |
| All three (configcat + epic + chimera) | Full workflow   | **Set workflow = full. Do not show the workflow menu. Proceed.**      |
| Two paths                              | Those two repos | **Set workflow accordingly. Do not show the workflow menu. Proceed.** |
| One path                               | That repo only  | **Set workflow accordingly. Do not show the workflow menu. Proceed.** |
| None                                   | Unknown         | Step 1 will ask.                                                      |

**If workflow is set here, Step 1 is fully resolved. Do NOT display the workflow menu to the user under any circumstances — doing so is incorrect behavior when the workflow is already known.**

### Ticket-type check

If a Jira ticket key was provided **and** there is no other feature flag context in the invocation (no flag name, no `configcat=`/`epic=`/`chimera=` params, no explicit "add feature flag" instruction), fetch the ticket immediately using `mcp__plugin_atlassian_atlassian__getJiraIssue` and scan its summary and description for feature flag indicators: "feature flag", "ConfigCat", "add flag", "register flag", or similar.

- **If feature flag indicators are found** → proceed normally.
- **If no indicators are found** → stop silently. Do not alert the user — this skill does not apply.

### How pre-supplied values affect later steps:

- **Jira ticket provided** → In Step 0, skip the "do you have a Jira ticket?" prompt and go straight to fetching it.
- **Repo path(s) provided** → In Step 2, skip auto-detect and confirmation for those repos — use the provided path directly without asking the user to confirm it.
- **No arguments** → proceed normally; all steps ask interactively.

## Prerequisite: Verify Required Skills Are Installed

Before doing anything else, check that the following skills appear in your available-skills list (visible in the system-reminder at the top of your context). Accept either the prefixed (`epic-feature-flag:`) or unprefixed form:

- `configcat-add-feature-flag` / `epic-feature-flag:configcat-add-feature-flag`
- `app-server-add-feature-flag` / `epic-feature-flag:app-server-add-feature-flag`
- `chimera-add-feature-flag` / `epic-feature-flag:chimera-add-feature-flag`
- `list-feature-flags` / `epic-feature-flag:list-feature-flags`

If any are missing, stop immediately and tell the user:

> **Missing required skills:** {list the absent skill names}
> Please install the `epic-feature-flag` plugin from the Applied Systems marketplace, then restart the session and try again.

Only continue if all required skills are present.

## Step 0: Jira Ticket (Optional)

**Complete this step fully before proceeding to Step 1.** Do not ask the workflow question or touch any repo while this step is in progress.

Ask the user:

> Do you have a Jira ticket for this work? Enter the ticket key (e.g., EPIC-140321), or type **skip** to continue without one.

**If a ticket key was pre-supplied as an input parameter**, skip this prompt and go straight to fetching (step 1 below).

**Otherwise**, ask the user:

> Do you have a Jira ticket for this work? Enter the ticket key (e.g., EPIC-140321), or type **skip** to continue without one.

**If skipped:** proceed directly to Step 1.

**If a ticket key is provided:**

1. Fetch the ticket using the `mcp__plugin_atlassian_atlassian__getJiraIssue` tool with the provided key.

2. Scan the ticket **summary**, **description**, and **acceptance criteria** for:

   | Field        | What to look for                                                                                                           |
   | ------------ | -------------------------------------------------------------------------------------------------------------------------- |
   | Flag name(s) | `snake_case` identifiers in backticks or near "feature flag", "ConfigCat flag", or "flag name". Pattern: `[a-z][a-z0-9_]+` |
   | App name     | Values like `epic`, `smart`, `tam`, or the app portion of a path like `apps/{app}/`                                        |
   | Config area  | Text after the app in a path, or near "config area", "configuration area", or "config-area"                                |
   | Dev segments | Any `snake_case` identifier near "segment", "dev tier", or "development" (e.g. `ntmto_team_user`, `ob_team_tenants`)       |
   | Workflow     | Which repos are mentioned — ConfigCat, Epic/App Server, Chimera. Default to full workflow if not specified                 |

3. Present what you found and ask the user to confirm or correct:

   > Based on **{TICKET_KEY}** — _{ticket summary}_
   >
   > I extracted:
   >
   > - **Flag(s):** `flag_name_1`, `flag_name_2` _(or "not found")_
   > - **App:** `epic` _(or "not found")_
   > - **Config area:** `policy-autofill` _(or "not found")_
   > - **Dev segments:** `ntmto_team_user`, `ob_team_tenants` _(or "none found")_
   > - **Workflow:** Full — ConfigCat + App Server + Chimera Client
   >
   > Does this look right? Reply **yes** to confirm, or correct any values.

4. Wait for the user to confirm or correct. Update any values based on their response.

5. **Multiple flags:** If more than one flag name was found (e.g., `policy_autofill` and `marketing_autofill`), tell the user you will add each flag one at a time using the same app, config area, segments, and workflow. Run Steps 1–5 once per flag. On the second and subsequent iterations, skip asking for repo paths, workflow, app, config area, and segments — reuse the already-confirmed values.

6. **Determine workflow, then route directly to the correct next step:**

   Derive the workflow from what repo paths were pre-supplied:
   - All three paths provided → full workflow (ConfigCat + App Server + Chimera Client)
   - Two paths provided → workflow = those two repos
   - One path provided → workflow = that repo only
   - No paths provided → workflow unknown, must ask in Step 1

   **Routing — go to exactly one of these, do not pass through the others:**

   | Condition                                         | Next step                                          |
   | ------------------------------------------------- | -------------------------------------------------- |
   | All paths pre-supplied                            | **→ Go to Step 3**                                 |
   | Some paths pre-supplied                           | **→ Go to Step 2** (only ask for the missing ones) |
   | No paths pre-supplied, workflow known from ticket | **→ Go to Step 2**                                 |
   | No paths and no workflow info                     | **→ Go to Step 1**                                 |

   Fill all known placeholders (`{FLAG_NAME}`, `{app_name}`, `{config_area}`, `{segment_names}`) into subagent prompts at Step 4.

## Step 1: Determine What Needs to Be Done

**Only reach this step if workflow is still unknown after input parsing — i.e., no repo paths were pre-supplied.**

Ask the user which repos to update and whether ConfigCat already has the flag. Options are: all three (ConfigCat + App Server + Chimera Client), any two-repo combination, or any single repo. Also ask whether ConfigCat already has the flag if they are only updating App Server and/or Chimera Client.

Default to the full workflow (all three repos, flag is new) if the user does not specify.

## Step 2: Gather Repo Locations (All Upfront)

**Do NOT start any sub-skill or subagent work until all needed paths are confirmed.**

**Only reach this step if one or more repo paths were not pre-supplied.** If all needed paths were provided as input parameters, skip this step entirely and proceed to Step 3.

For any missing paths, use the auto-detect-and-confirm pattern: check the current directory tree first; if found, tell the user and ask them to confirm; if not found, ask the user for the path.

**NEVER scan or search the filesystem** outside the current directory tree for any repo.

### ConfigCat (if selected in Step 1)

If a `configcat=` path was pre-supplied, use it directly — no detection or confirmation needed.

Otherwise, check whether the current working directory (or a parent) contains an `apps/development` directory.

- **If yes**: Tell the user which path you found and **ask them to confirm**.
- **If no**: Ask the user for the path (e.g., `C:\Git Repos\asi-configcat` or `~/repos/asi-configcat`).

### App Server (if selected in Step 1)

If an `epic=` path was pre-supplied, use it directly — no detection or confirmation needed.

Otherwise, check whether the current working directory (or a parent) contains `ASI.SMART` and `ASI.TAM` directories.

- **If yes**: Tell the user which path you found and **ask them to confirm**.
- **If no**: Ask the user for the path (e.g., `C:\Epic\FTR\FTR1` or `~/Epic/FTR/FTR1`).

### Chimera Client (if selected in Step 1)

If a `chimera=` path was pre-supplied, use it directly — no detection or confirmation needed.

Otherwise, check whether the current working directory (or a parent) contains `src/core/builtins/SMART/Sys/Providers/featureFlag.ts`.

- **If yes**: Tell the user which path you found and **ask them to confirm**.
- **If no**: Ask the user for the path (e.g., `C:\Git Repos\chimera-client` or `~/repos/chimera-client`).

## Step 3: Create ConfigCat Flag OR Select Existing Flag

### If ConfigCat is selected (options 1–4 from Step 1)

The flag doesn't exist yet. Check whether all ConfigCat details are already confirmed:

**"All details known"** = flag name + app name + config area + dev tier rule type and its inputs (e.g. segment names, or explicit "no rules") are all confirmed.

#### If all ConfigCat details ARE known → go directly to Step 4

**⚠️ Do NOT invoke `Skill("configcat-add-feature-flag")` here.** ConfigCat will be dispatched as an `Agent` subagent in Step 4 alongside App Server and Chimera. Invoking it via the Skill tool at this point would run it interactively in the current session and block parallel execution — that defeats the entire purpose of this orchestrator.

#### If any ConfigCat detail is missing → interactive Skill invocation

The sub-skill runs in the same session, so before invoking it, output all confirmed values clearly in the conversation so they are visible when the sub-skill runs its early steps:

> The asi-configcat repo is at `{configcat_path}` — already confirmed.
> _(Output any other known values here, e.g.:)_
> Flag name: `{flag_name}` · App: `{app_name}` · Config area: `{config_area}` · Dev segments: `{segment_names}` — confirmed.

Then invoke:

```
Skill("epic-feature-flag:configcat-add-feature-flag")
```

(Use `Skill("configcat-add-feature-flag")` if that is the form listed in your available-skills.)

**Note:** The Skill tool does not forward arguments to the sub-skill. When the sub-skill reaches its Step 1 (locate repo), it will run in this session's conversation context and should see the path you just output. If it still asks for the path, provide the already-confirmed `{configcat_path}`.

The user interacts with that skill directly. Once it completes, the application name, flag name, and configuration area carry forward to Steps 4 and 5.

### If ConfigCat is NOT selected (options 5–7 from Step 1)

The flag already exists in ConfigCat. Ask the user how they want to specify it:

```
How would you like to specify the flag?

  1. Browse existing ConfigCat flags (recommended)
  2. Enter flag details manually

Enter a number:
```

**Option 1**: Invoke the **list-feature-flags** skill to browse and select. Captures application name, flag name, and configuration area.

**Option 2**: Ask for application name, flag name, and configuration area manually — one at a time.

## Step 4: Dispatch Subagents

Dispatch subagents based on which repos are selected and whether ConfigCat details were fully known in Step 3.

**Model:** Always use `model: "sonnet"` when dispatching any `Agent` subagent in this step.

**Isolation:** Do NOT include the `isolation` parameter in any Agent call. The correct call shape is:

```
Agent({ description: "...", prompt: "...", model: "sonnet" })
```

Adding `isolation: "worktree"` will fail when the working directory is not a git repository. Leave it out entirely.

**⚠️ You MUST use the `Agent` tool — not the `Skill` tool — for all sub-skill dispatch in this step.** Using `Skill()` runs the sub-skill in the current session sequentially. Using `Agent()` creates an isolated subagent that runs in parallel. Never call `Skill("configcat-add-feature-flag")`, `Skill("app-server-add-feature-flag")`, or `Skill("chimera-add-feature-flag")` from this step.

**⚠️ Dispatch immediately.** As soon as you have confirmed values and repo paths, call the `Agent` tool. Do not read any files, check any branches, preview any repo structure, or do any exploratory work before dispatching. The subagents handle all of that themselves.

### Path A — All details known (ConfigCat dispatched as subagent)

Use this path when ConfigCat is selected AND all its details were confirmed before Step 3. Dispatch all selected repos as parallel `Agent` subagents in a single call (up to three at once).

**Subagent prompt — ConfigCat** (use when ConfigCat is selected and all details are known):

> Use the `configcat-add-feature-flag` skill (or `epic-feature-flag:configcat-add-feature-flag`) to create the following flag in the asi-configcat repo:
>
> - Flag name: `{flag_name}`
> - Application: `{app_name}`
> - Configuration area: `{config_area}`
> - Dev tier rule: segment rules for segments: `{segment_names}` _(or "no rules" / "user rules" / "tenant rules" as applicable)_
> - asi-configcat repo path: `{configcat_path}` — **skip Step 1 (locate repo), the path is already confirmed**
>
> All flag details are provided above — **skip Step 2 (Gather Flag Information)**.

### Path B — ConfigCat was handled interactively in Step 3

Use this path when ConfigCat was invoked via the Skill tool in Step 3 (or ConfigCat was not selected). Dispatch only the remaining selected repos as parallel `Agent` subagents.

---

Dispatch only the repos that apply. If only one repo remains, dispatch a single subagent (no parallelism needed).

**Subagent prompt — App Server** (use when App Server is selected):

> Use the `app-server-add-feature-flag` skill (or `epic-feature-flag:app-server-add-feature-flag`) to add the following flag to the Epic codebase:
>
> - Flag name: `{FLAG_NAME}` (UPPER_CASE constant)
> - Application: `{app_name}`
> - Configuration area: `{config_area}`
> - Epic repo path: `{epic_path}` — **skip Step 1 (locate repo), the path is already confirmed**
>
> The flag already exists in ConfigCat — **skip Step 2 (ConfigCat reminder)**.
>
> All flag details are provided above — **skip Step 3 (Gather Information)**.
>
> This is running as a subagent — **skip Step 8 (Offer to Build)**.

**Subagent prompt — Chimera Client** (use when Chimera Client is selected):

> Use the `chimera-add-feature-flag` skill (or `epic-feature-flag:chimera-add-feature-flag`) to add the following flag to the chimera-client codebase:
>
> - Flag name: `{FLAG_NAME}` (UPPER_CASE constant)
> - Application: `{app_name}`
> - Configuration area: `{config_area}`
> - Chimera-client repo path: `{chimera_path}` — **skip Step 1 (locate repo), the path is already confirmed**
>
> The flag already exists in ConfigCat — **skip Step 2 (ConfigCat reminder)**.
>
> All flag details are provided above — **skip Step 3 (Gather Information)**.
>
> This is running as a subagent — **skip Step 7 (Offer to Build)**.

Wait for all dispatched subagents to complete before showing the final summary.

## Step 5: Final Summary

After all selected repos are updated (and all flags are processed if multiple were added), show a final summary. If multiple flags were added, list each one:

```
Feature flag(s) added:

  FLAG_NAME_1:
    ✓ ConfigCat — YAML files created in all 3 tiers, flags.yaml updated
    ✓ App Server — FeatureFlag.vb + Endpoint.vb updated, build passed
    ✓ Chimera Client — featureFlag.ts + FeatureFlag.ts updated, build passed

  FLAG_NAME_2:
    ✓ ConfigCat — YAML files created in all 3 tiers, flags.yaml updated
    ✓ App Server — FeatureFlag.vb + Endpoint.vb updated, build passed
    ✓ Chimera Client — featureFlag.ts + FeatureFlag.ts updated, build passed

  (or ✗ / skipped for any that failed or were not selected)
```

Then alert the user:

> **Review and commit your changes manually.**
> Changes have been made in the following repos — please review them for accuracy before committing:
>
> - `{configcat_path}` — YAML files and flags.yaml _(if ConfigCat was selected)_
> - `{epic_path}` — FeatureFlag.vb, Endpoint.vb _(if App Server was selected)_
> - `{chimera_path}` — featureFlag.ts, FeatureFlag.ts _(if Chimera Client was selected)_
>
> Also verify you are on the correct git branch in each repo before committing.

Do NOT run `git commit`, `git add`, or `git push` — leave all changes for the user to review and commit manually.
