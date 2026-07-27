# Applied Design System (ADS) MCP

Enterprise plugin that connects Claude Code to the ADS MCP server — bringing component docs, usage examples, and Storybook previews directly into your Claude conversations.

## Features

- **Component Discovery** - Browse all available ADS components
- **Semantic Search** - Search across ADS documentation with natural language
- **Usage Examples** - Get real story examples showing how components are configured and rendered
- **Full Documentation** - Access complete component docs including guidelines and best practices
- **Source File Lookup** - Find all doc and source files associated with a component
- **Storybook Previews** - Get direct links to live Storybook pages for any component
- **Icon Lookup** - Find the correct icon name before using any icon

## Setup

No manual setup required. Installing this plugin automatically configures the ADS MCP server via `.mcp.json`.

## Connecting to the deployed server

The ADS MCP server is protected by Okta OAuth (Authorization Code + PKCE). The plugin pre-configures port `33418` for the OAuth callback — Okta requires an exact redirect URI match, so Claude Code must use one of the following pre-registered ports:

- `33418` ← default (pre-configured by this plugin)
- `33419`
- `33420`
- `41947`
- `41948`

On your first tool invocation, Claude Code opens a browser tab for Okta login. Subsequent calls reuse the bearer token until it expires.

### Overriding the callback port

If port `33418` is already bound on your machine, run this **once** to override globally across all your projects:

```bash
claude mcp add-json ads \
  '{"type":"http","url":"https://devex-mcp.devops.development.gcp-test.appliedcloudinternal.com/mcp-ads/mcp","oauth":{"callbackPort":33419}}' \
  --scope user
```

Replace `33419` with any other port from the pre-registered list above. Claude Code matches server overrides by endpoint URL, so the user-scoped entry takes precedence over the plugin-bundled config automatically.

## Available Tools

### `list_ads_components`

List all components available in the Applied Design System.

Use this as your starting point when you're not sure what components exist.

### `search_ads_docs`

Semantic search across ADS documentation.

**Parameters:**

- `query` (required): Natural language search query (e.g., `"how do I filter a DataGrid?"`)

### `lookup_ads_topic`

Get full documentation for a specific ADS topic or component.

**Parameters:**

- `topic` (required): Component name or topic to look up (e.g., `"Button"`, `"DataGrid"`)

### `get_component_usage`

Get real story examples showing how a component is configured and rendered.

**Parameters:**

- `component` (required): Component name (e.g., `"Button"`, `"Modal"`)

### `get_component_source_files`

List all documentation and source files associated with a component. Use this to discover all available doc pages before deep-diving with `lookup_ads_topic`.

**Parameters:**

- `component` (required): Component name

### `get_story_preview_url`

Get a direct link to the live Storybook page for a component.

**Parameters:**

- `component` (required): Component name
- `story` (optional): Specific story name within the component

### `list_ads_icons`

Find the correct icon name before using any icon in your implementation.

**Parameters:**

- `query` (optional): Filter icons by keyword

## Example Prompts

```
What ADS components are available for building a data table?
```

```
Show me examples of using the Button component with different variants
```

```
Search ADS docs for how to handle form validation
```

```
What icons are available related to navigation?
```

```
Give me a Storybook link for the DataGrid component
```

```
Build me a filter panel using ADS components
```
