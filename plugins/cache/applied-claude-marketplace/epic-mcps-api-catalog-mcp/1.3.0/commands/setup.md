---
description: Set up the Epic API Catalog MCP server for browsing, searching, and testing Epic API endpoints.
---

# Epic API Catalog MCP Setup

Set up the Epic API Catalog MCP server. This server lets you browse, search, and live-test all Epic API endpoints by pulling OpenAPI specs from GitLab.

## Prerequisites

- `glab` CLI installed and authenticated with GitLab (`glab auth login`)

## Step 1: Check If Already Working

Try checking catalog status to see if the MCP server is already running:

```
Use the catalog_status tool to check if the Epic API catalog is loaded
```

If this returns a status, you're all set. If not, continue below.

## Step 2: Restart Claude Code

The plugin ships with a pre-built `dist/index.js`, so no build step is needed. Just restart Claude Code so it picks up the MCP server:

- Close and reopen your terminal, or
- Run `/mcp` to check MCP server status

## Step 3: Load the API Catalog

The first time you use the server, fetch specs from GitLab:

```
Use the refresh_specs tool to fetch all OpenAPI specs from GitLab
```

This fetches specs from ~42 proxy repos and takes ~2 minutes. The catalog is cached locally for fast subsequent loads.

## Step 4: (Optional) Load Design Branch Specs

If you also want to browse specs from the `api-spec-design` branch (specs in development that haven't landed on main yet):

```
Use the refresh_specs tool with branch "api-spec-design"
```

You can then switch between branches with `set_branch_focus` or compare them with `compare_branches`.

## Step 5: Verify

Try searching for an endpoint:

```
Use the search_endpoints tool to search for "policy"
```

## Troubleshooting

### "No API catalog loaded" error

Run `refresh_specs` to fetch specs from GitLab. The catalog is cached in the plugin's `cache/` directory.

### glab authentication errors

Ensure `glab` is authenticated: run `glab auth status` in your terminal. If not authenticated, run `glab auth login`.
