# epic-feature-flag

Plugin for managing feature flags across the ConfigCat, Epic (App Server), and Chimera Client codebases.

## Skills

### `add-feature-flag` — Full workflow orchestrator

The primary entry point for all feature flag work. Accepts optional upfront arguments to skip interactive prompts, then dispatches the ConfigCat, App Server, and Chimera Client sub-skills in parallel as subagents.

**Upfront-args invocation (minimal interaction):**

Windows:

```
/epic-feature-flag:add-feature-flag EPIC-140321 configcat="C:\Git Repos\asi-configcat" epic="C:\Epic\FTR\FTR1" chimera="C:\Git Repos\chimera-client"
```

macOS/Linux:

```
/epic-feature-flag:add-feature-flag EPIC-140321 configcat=~/repos/asi-configcat epic=~/Epic/FTR/FTR1 chimera=~/repos/chimera-client
```

**Interactive invocation:**

```
/epic-feature-flag:add-feature-flag
```

When invoked with a Jira ticket key, the skill fetches the ticket and extracts the flag name, app, config area, and dev segments automatically. When repo paths are supplied, it skips the locate-and-confirm prompts and dispatches subagents immediately.

Supports adding multiple flags from a single ticket in one run.

### `configcat-add-feature-flag` — ConfigCat sub-skill

Adds a feature flag to the `asi-configcat` repository: creates YAML files in all three tiers (development, production, staging) and registers the friendly name in `apps/flags.yaml`. Supports no-rules, database, user, tenant, and segment dev-tier rule types.

Use directly only for ConfigCat-only changes; otherwise use the orchestrator.

### `app-server-add-feature-flag` — Epic (App Server) sub-skill

Adds a feature flag to the Epic codebase (`ASI.SMART` and `ASI.TAM`): adds the `TypedString` constant to `FeatureFlag.vb` and the endpoint property to `Endpoint.vb`. Handles TFS checkout and optionally builds the affected projects.

Use directly only for Epic-only changes; otherwise use the orchestrator.

### `chimera-add-feature-flag` — Chimera Client sub-skill

Adds a feature flag to the `chimera-client` codebase: adds the `Flag` entry to `featureFlag.ts` and the endpoint getter to `FeatureFlag.ts`. Optionally runs `npx tsc --noEmit` to verify the changes compile.

Use directly only for Chimera-only changes; otherwise use the orchestrator.

### `list-feature-flags` — Browse ConfigCat flags

Browses and selects existing feature flags from the `asi-configcat` repository. Supports remote mode (GitLab API — no local clone needed) and local mode (fallback). Useful for checking whether a flag already exists or for picking a flag to implement.

```
/epic-feature-flag:list-feature-flags
```

## Prerequisites

- **`epic-feature-flag` plugin installed** — all sub-skills must be present in your available-skills list for the orchestrator to dispatch them
- **Atlassian MCP** — required for Jira ticket extraction in the orchestrator
- **Repo paths** — the orchestrator will auto-detect or ask for paths to `asi-configcat`, the Epic repo, and `chimera-client`
- **TFS CLI** (`tf`) — required for Epic (App Server) file checkout; the skill guides you through the exact commands
