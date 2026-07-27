# Epic Help MCP Server

Enterprise plugin that connects Claude Code to the Epic Help MCP server — providing semantic search across ~1,000 Applied Epic help topics and video tutorials.

## Features

- **Semantic Search** - Search across Epic help documentation with natural language
- **Full Documentation** - Retrieve complete help topics by source path
- **Section Browsing** - List all help sections with topic counts
- **Video Tutorials** - Search step-by-step video transcript walkthroughs

## Setup

No manual setup required. Installing this plugin automatically configures the Epic Help MCP server via `.mcp.json`.

## Available Tools

### `search_epic_help`

Semantic vector search across ~1,000 help topics and 56 video tutorials.

**Parameters:**

- `query` (required): Natural language search query (e.g., `"how to add a policy"`)
- `section` (optional): Filter by section name (e.g., `"Accounts"`, `"Configure"`, `"Video Tutorials"`)
- `limit` (optional): Number of results, 1-10, default 5

### `lookup_epic_topic`

Retrieve a full document by its source file path. Use the `source_file` value from search results.

**Parameters:**

- `source_file` (required): Source file path from search results

### `list_epic_sections`

List all help documentation sections with topic counts. Useful for understanding what's available before filtering searches.

## Example Prompts

```
How do I add a certificate of insurance in Epic?
```

```
Search Epic help for policy renewal workflow
```

```
What sections are available in the Epic help documentation?
```

```
Show me how to configure direct bill commission schedules
```
