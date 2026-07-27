---
name: epic-help
auto_invoke: true
---

# Applied Epic Help Documentation

This skill provides context for using the Epic Help MCP tools to search Applied Epic documentation.

## Available Tools

When the Epic Help MCP server is active, you have access to:

### search_epic_help

Semantic vector search across ~1,000 help topics and 56 video tutorials.

- `query` (required): Natural language search query
- `section` (optional): Filter by section name (e.g., "Accounts", "Configure", "Video Tutorials")
- `limit` (optional): Number of results, 1-10, default 5

### lookup_epic_topic

Retrieve a full document by its source file path. Use the `source_file` value from search results.

### list_epic_sections

List all help documentation sections with topic counts. Useful for understanding what's available.

## Sections Available

| Section           | Description                                               |
| ----------------- | --------------------------------------------------------- |
| Accounts          | Client/prospect account management, contacts, attachments |
| Configure         | System configuration, setup, administration               |
| General Ledger    | Accounting, GL transactions, financial operations         |
| Home              | Home screen, navigation, getting started                  |
| Reports/Marketing | Reporting tools, marketing lists, exports                 |
| Users             | User management, permissions, security                    |
| Video Tutorials   | Step-by-step video transcript walkthroughs                |
| Email             | Email integration and operations                          |
| Procedures        | Standard operating procedures                             |
| Utilities         | System utilities and maintenance tools                    |
| UK - Accounts     | UK-specific: quoting, card management, CPA, sanctions     |
| UK - Configure    | UK-specific: direct debit, quotes rules engine, SMS       |
| UK - Home         | UK-specific: sanctions search report                      |
| UK - Utilities    | UK-specific: GDPR personal information purge              |

## Best Practices

1. **Start broad, then narrow** — Use a general query first, then filter by section if needed
2. **Video tutorials are gold** — When search returns a video tutorial result, the full transcript is auto-expanded. These provide step-by-step guidance with narration text.
3. **Use lookup for full context** — Search returns chunks. Use `lookup_epic_topic` with the `source_file` to get the complete document.
4. **Section filtering** — If you know the area (e.g., "Accounts"), filter to reduce noise.

## When To Use These Tools

- User asks "how do I..." questions about Applied Epic
- User needs to understand Epic business rules, workflows, or UI operations
- User is troubleshooting an Epic feature
- User needs step-by-step instructions for an Epic task
- You need to understand Epic domain concepts while reviewing or writing code

## If Tools Are Unavailable

The Epic Help MCP server is hosted remotely — no local setup is required. If tools are unavailable, check your network connectivity and ensure the MCP server is configured in `.mcp.json`.
