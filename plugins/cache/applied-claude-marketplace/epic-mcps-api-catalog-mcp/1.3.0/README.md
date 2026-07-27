# Epic API Catalog MCP Server

An MCP (Model Context Protocol) server that lets Claude browse, search, and live-test all Epic API endpoints by pulling OpenAPI specs from GitLab.

## How It Works

The server fetches OpenAPI specs from all proxy repos under `appliedsystems/products/epic/api-gateway/proxies` on GitLab using the `glab` CLI. It parses them into a searchable catalog and exposes 8 tools via MCP that Claude can use directly.

## Tools

| Tool                   | Description                                                                              |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| `refresh_specs`        | Fetch all OpenAPI specs from GitLab (~42 repos). Supports optional `branch` param.       |
| `list_services`        | List all services with endpoint counts                                                   |
| `search_endpoints`     | Keyword search across all endpoints. Supports optional `branch` param.                   |
| `get_endpoint_details` | Full details for a specific endpoint (parameters, request body schema, response schemas) |
| `get_service_overview` | Overview of a service including all its endpoints                                        |
| `test_endpoint`        | Make a live HTTP request with bearer token auth                                          |
| `generate_curl`        | Generate a curl command without executing it                                             |
| `catalog_status`       | Check when the catalog was last refreshed. Supports optional `branch` param.             |
| `set_branch_focus`     | Switch which branch all tools operate on by default (`main` or `api-spec-design`)        |
| `compare_branches`     | Compare endpoints between `main` and `api-spec-design` — added, removed, modified        |

## Branch Selection

The server supports fetching specs from two branches:

- `main` (default) — production specs
- `api-spec-design` — specs in design/development that haven't landed on main yet

Every tool output includes a branch indicator so you always know which branch you're looking at.

### Setting branch focus

Use `set_branch_focus` to change which branch all tools operate on:

**Prompt:** "Set branch focus to api-spec-design"

### Refreshing a specific branch

**Prompt:** "Refresh specs from the api-spec-design branch"

### Comparing branches

**Prompt:** "Compare the API catalogs between main and api-spec-design"

This shows endpoints added, removed, or modified between the two branches. You can also filter to a specific service:

**Prompt:** "Compare branches for the activity service"

### Cache files

Each branch has its own cache file:

- `cache/catalog-main.json`
- `cache/catalog-api-spec-design.json`

## Usage Examples

### Search for endpoints

**Prompt:** "Is there an attachment listing API available?"

Claude invokes `search_endpoints` with query `"attachment"` and returns:

```
# Search Results for "attachment" (16 matches)

1. POST /attachments [attachment] — Submit a new attachment
2. GET /attachments/{attachmentId} [attachment] — GET Attachment by Attachment ID
3. GET /attachments/folders [attachment] — GET Attachment folders
4. GET /attachments [attachment] — Get Attachments
...
```

### Get endpoint details

**Prompt:** "Explain the API contract for GET /attachments"

Claude invokes `get_endpoint_details` with service `"attachment"`, path `"/attachments"`, method `"GET"` and returns the full contract including parameters, request/response schemas, and status codes.

### Test an endpoint

**Prompt:** "Test GET /attachments with this token: bearer eyJ0..."

Claude invokes `test_endpoint` with the service, path, method, and token, then returns:

```
# Test Result: GET /attachments

**Status:** 200

### Response Body
{
  "total": 16116,
  "_embedded": {
    "attachments": [
      {
        "id": "1e4fd94f-...",
        "description": "ACORD 1.pdf",
        "active": true,
        ...
      }
    ]
  }
}
```

### List all services

**Prompt:** "What Epic API services are available?"

Claude invokes `list_services` and returns a table of all indexed services with endpoint counts.

### Generate a curl command

**Prompt:** "Generate a curl for GET /attachments with my token"

Claude invokes `generate_curl` and returns a ready-to-run curl command without executing it.

### Compare branches

**Prompt:** "Compare what's changed between main and api-spec-design"

Claude invokes `compare_branches` and returns a diff showing new, removed, and modified endpoints between the two branches.

## Project Structure

```
api-catalog-mcp/
├── src/
│   ├── index.ts          # MCP server — registers tools, formats output, handles requests
│   └── spec-fetcher.ts   # Data layer — fetches specs from GitLab, parses OpenAPI, caches catalog
├── dist/
│   └── index.js          # Bundled output (esbuild, ESM) — committed so plugin install works out of the box
├── cache/
│   ├── catalog-main.json            # Cached catalog from main branch (gitignored)
│   └── catalog-api-spec-design.json # Cached catalog from api-spec-design branch (gitignored)
├── package.json
├── tsconfig.json
└── .gitignore
```

### `src/index.ts`

The MCP server entry point. Sets up a `StdioServerTransport`, registers all 8 tools, and handles incoming requests. Includes helper functions for:

- Formatting endpoint details as markdown (parameters table, request body, response schemas)
- Building curl commands
- Executing live HTTP requests with bearer token auth

### `src/spec-fetcher.ts`

The data layer that handles:

- **Fetching** — Lists proxy repos from GitLab, downloads YAML/JSON spec files from each repo's `specs/` directory
- **Parsing** — Extracts endpoints, parameters, request bodies, responses, tags, and service metadata from OpenAPI specs
- **Caching** — Writes parsed catalog to `cache/catalog.json` for fast subsequent loads
- **Searching** — Keyword search across path, summary, description, operationId, service name, and tags

## Prerequisites

- `glab` CLI authenticated with GitLab (`glab auth status` to check, `glab auth login` if needed)

## Setup

```bash
claude plugin install epic-mcps-api-catalog-mcp
```

Restart Claude Code after installing. The plugin ships a pre-built `dist/index.js`, so no build step is needed.

On first use, ask Claude to load the catalog:

> "Use the refresh_specs tool to fetch all OpenAPI specs from GitLab"

This pulls specs from ~42 proxy repos and caches them locally. Subsequent loads are instant.

For the full guided setup, use the `/epic-mcps-api-catalog-mcp:setup` command.

## Development

To rebuild after source changes:

```bash
npm install
npm run build
```

## Dependencies

- `@modelcontextprotocol/sdk` — MCP server framework
- `js-yaml` — YAML parsing for OpenAPI specs
- `zod` — Schema validation
- `esbuild` — Bundler
- `typescript` — Type checking
