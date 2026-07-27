/**
 * Epic API Catalog MCP Server
 *
 * Provides tools to browse, search, and test Epic API miniservice
 * endpoints from their OpenAPI specs stored in GitLab.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import {
  refreshSpecs,
  loadCatalog,
  searchEndpoints,
  compareCatalogs,
  VALID_BRANCHES,
  type BranchName,
  type Catalog,
  type EndpointInfo,
  type ServiceInfo,
} from "./spec-fetcher.js";

const VALID_HTTP_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
];

const STALE_DAYS_THRESHOLD = Number(
  process.env.EPIC_API_CATALOG_STALE_DAYS || "7",
);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pluginJson = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "..", ".claude-plugin", "plugin.json"),
    "utf-8",
  ),
);
const MCP_VERSION: string = pluginJson.version;

function relativeTime(isoDate: string): string {
  const ms = Date.now() - new Date(isoDate).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "unknown";
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(ms / 3600000);
  const days = Math.floor(ms / 86400000);
  const months = Math.floor(days / 30);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}min ago`;
  if (hours < 24) return `${hours}hr ago`;
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  if (months === 1) return "1 month ago";
  return `${months} months ago`;
}

const catalogs: Map<BranchName, Catalog> = new Map();
let activeBranch: BranchName = "main";

function resolveBranch(argBranch?: string): BranchName {
  if (argBranch) {
    if (!VALID_BRANCHES.includes(argBranch as BranchName)) {
      throw new Error(
        `Invalid branch "${argBranch}". Must be one of: ${VALID_BRANCHES.join(", ")}`,
      );
    }
    return argBranch as BranchName;
  }
  return activeBranch;
}

function ensureCatalog(branch: BranchName): Catalog {
  let cat = catalogs.get(branch);
  if (!cat) {
    const loaded = loadCatalog(branch);
    if (loaded) {
      catalogs.set(branch, loaded);
      cat = loaded;
    }
  }
  if (!cat) {
    throw new Error(
      `No API catalog loaded for branch "${branch}". Run the refresh_specs tool first${branch !== "main" ? ` with branch: "${branch}"` : ""}.`,
    );
  }
  return cat;
}

function statusBar(catalog: Catalog | null): string {
  let specsInfo: string;
  if (!catalog) {
    specsInfo = "No specs loaded";
  } else {
    const ageMs = Date.now() - new Date(catalog.lastUpdated).getTime();
    const ageDays = Math.floor(ageMs / 86400000);
    const isStale = Number.isFinite(ageDays) && ageDays >= STALE_DAYS_THRESHOLD;
    specsInfo = isStale
      ? `⚠️ Specs Updated: ${relativeTime(catalog.lastUpdated)}`
      : `Specs Updated: ${relativeTime(catalog.lastUpdated)}`;
  }

  const inner = `Branch in Focus: ${activeBranch} · ${specsInfo} · API Catalog MCP v${MCP_VERSION}`;
  const padded = `  ${inner}   `;
  const border = "─".repeat(padded.length);
  return `\n\nIMPORTANT: Always include the following status bar exactly as-is in your response to the user.\n┌${border}┐\n ${padded} \n└${border}┘`;
}

function formatEndpointSummary(ep: EndpointInfo): string {
  return `${ep.method} ${ep.path} [${ep.service}] — ${ep.summary || ep.description || ep.operationId || "(no description)"}`;
}

function formatEndpointDetail(ep: EndpointInfo): string {
  const lines: string[] = [
    `## ${ep.method} ${ep.path}`,
    "",
    `**Service:** ${ep.service}`,
    `**Spec file:** ${ep.specFile}`,
    `**Operation ID:** ${ep.operationId || "N/A"}`,
    `**Tags:** ${ep.tags.join(", ") || "none"}`,
    "",
    `### Summary`,
    ep.summary || "(none)",
    "",
    `### Description`,
    ep.description || "(none)",
  ];

  if (ep.parameters.length > 0) {
    lines.push("", "### Parameters", "");
    lines.push("| Name | In | Required | Description |");
    lines.push("|------|-----|----------|-------------|");
    for (const p of ep.parameters) {
      lines.push(
        `| ${p.name} | ${p.in} | ${p.required ? "Yes" : "No"} | ${p.description || "-"} |`,
      );
    }
  }

  if (ep.requestBody) {
    lines.push(
      "",
      "### Request Body",
      "",
      `**Content-Type:** ${ep.requestBody.contentType}`,
      `**Required:** ${ep.requestBody.required ? "Yes" : "No"}`,
    );
    if (ep.requestBody.description) {
      lines.push(`**Description:** ${ep.requestBody.description}`);
    }
    if (ep.requestBody.schema) {
      lines.push(
        "",
        "```json",
        JSON.stringify(ep.requestBody.schema, null, 2),
        "```",
      );
    }
  }

  if (Object.keys(ep.responses).length > 0) {
    lines.push("", "### Responses", "");
    for (const [code, resp] of Object.entries(ep.responses)) {
      lines.push(`**${code}:** ${resp.description}`);
      if (resp.schema) {
        lines.push("```json", JSON.stringify(resp.schema, null, 2), "```");
      }
    }
  }

  return lines.join("\n");
}

function formatServiceOverview(svc: ServiceInfo): string {
  const lines: string[] = [
    `## ${svc.title}`,
    "",
    `**Service name:** ${svc.name}`,
    `**Version:** ${svc.version}`,
    `**Base URL:** ${svc.baseUrl}`,
    `**Spec files:** ${svc.specFiles.join(", ")}`,
    `**Total endpoints:** ${svc.endpointCount}`,
    "",
    `### Description`,
    svc.description || "(none)",
  ];

  if (svc.tags.length > 0) {
    lines.push("", "### Tags", "");
    for (const tag of svc.tags) {
      lines.push(`- **${tag.name}**: ${tag.description || "(no description)"}`);
    }
  }

  return lines.join("\n");
}

function resolveUrl(
  ep: EndpointInfo,
  baseUrl: string,
  pathParams?: Record<string, string>,
  queryParams?: Record<string, string>,
): string {
  let resolvedPath = ep.path;
  if (pathParams) {
    for (const [key, val] of Object.entries(pathParams)) {
      resolvedPath = resolvedPath.replace(`{${key}}`, val);
    }
  }

  let queryString = "";
  if (queryParams && Object.keys(queryParams).length > 0) {
    queryString =
      "?" +
      Object.entries(queryParams)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join("&");
  }

  return `${baseUrl}${resolvedPath}${queryString}`;
}

function resolveBaseUrl(
  baseUrl: string,
  service: string,
): { url: string; error?: string } {
  if (!baseUrl || baseUrl.includes("@API-HOST-NAME@")) {
    return {
      url: "",
      error: `The spec base URL contains a placeholder (${baseUrl}). Please provide a base_url parameter, e.g. "https://api-dev.apigee.appliedcloudservices.com/epic/${service}/v1"`,
    };
  }
  return { url: baseUrl };
}

function buildCurlCommand(
  ep: EndpointInfo,
  fullUrl: string,
  token: string,
  body?: string,
): string {
  const esc = (s: string) => s.replace(/'/g, "'\\''");

  const parts: string[] = [
    "curl",
    `-X ${ep.method}`,
    `'${esc(fullUrl)}'`,
    `-H 'Authorization: Bearer ${esc(token)}'`,
    `-H 'Accept: application/hal+json'`,
  ];

  if (body && ["POST", "PUT", "PATCH"].includes(ep.method)) {
    parts.push(`-H 'Content-Type: application/json'`);
    parts.push(`-d '${esc(body)}'`);
  }

  return parts.join(" \\\n  ");
}

const ALLOWED_URL_PATTERNS = [
  /^https:\/\/api(-\w+)?\.apigee\.appliedcloudservices\.com\//,
  /^https:\/\/[^/]*\.appliedsystems\.com\//,
];

function isAllowedUrl(url: string): boolean {
  return ALLOWED_URL_PATTERNS.some((pattern) => pattern.test(url));
}

async function safeFetch(url: string, options: RequestInit): Promise<Response> {
  if (!isAllowedUrl(url)) {
    throw new Error(
      `URL not allowed: ${url}. Only Applied Systems API domains are permitted.`,
    );
  }
  return globalThis.fetch(url, options);
}

async function executeRequest(
  ep: EndpointInfo,
  fullUrl: string,
  token: string,
  body?: string,
): Promise<{ status: number; headers: Record<string, string>; body: string }> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/hal+json",
  };

  const fetchOptions: RequestInit = {
    method: ep.method,
    headers,
  };

  if (body && ["POST", "PUT", "PATCH"].includes(ep.method)) {
    headers["Content-Type"] = "application/json";
    fetchOptions.body = body;
  }

  const resp = await safeFetch(fullUrl, fetchOptions);
  const respHeaders: Record<string, string> = {};
  resp.headers.forEach((val, key) => {
    respHeaders[key] = val;
  });

  let respBody: string;
  const rawBody = await resp.text();
  try {
    const json = JSON.parse(rawBody);
    respBody = JSON.stringify(json, null, 2);
  } catch {
    respBody = rawBody;
  }

  return { status: resp.status, headers: respHeaders, body: respBody };
}

async function main() {
  const server = new Server(
    {
      name: "epic-api-catalog-mcp",
      version: MCP_VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "refresh_specs",
          description:
            "Fetch/refresh all OpenAPI specs from the 42 Epic API proxy repos on GitLab. Run this first, or after specs have been updated. Takes ~2 minutes.",
          inputSchema: {
            type: "object",
            properties: {
              branch: {
                type: "string",
                enum: ["main", "api-spec-design"],
                description:
                  "Which branch to fetch specs from. Defaults to the active focus branch (initially 'main').",
              },
            },
            required: [],
          },
        },
        {
          name: "list_services",
          description:
            "List all available Epic API miniservices with their descriptions and endpoint counts.",
          inputSchema: {
            type: "object",
            properties: {},
            required: [],
          },
        },
        {
          name: "search_endpoints",
          description:
            "Search across all API endpoints by keyword. Matches against path, summary, description, operation ID, service name, and tags. Use this to find which API can do a specific task.",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description:
                  "Search term (e.g. 'activity', 'create account', 'policy', 'commission')",
              },
              service: {
                type: "string",
                description:
                  "Optional: filter to a specific service name (e.g. 'activity', 'policy')",
              },
              method: {
                type: "string",
                description:
                  "Optional: filter by HTTP method (GET, POST, PUT, PATCH, DELETE)",
              },
              tag: {
                type: "string",
                description: "Optional: filter by tag name",
              },
              branch: {
                type: "string",
                enum: ["main", "api-spec-design"],
                description:
                  "Which branch to search. Defaults to the active focus branch (initially 'main').",
              },
            },
            required: ["query"],
          },
        },
        {
          name: "get_endpoint_details",
          description:
            "Get full details for a specific endpoint including parameters, request body schema, and response schemas. Specify service + path + method to identify the endpoint.",
          inputSchema: {
            type: "object",
            properties: {
              service: {
                type: "string",
                description: "Service name (e.g. 'activity')",
              },
              path: {
                type: "string",
                description:
                  "Endpoint path (e.g. '/codes' or '/codes/{codeId}')",
              },
              method: {
                type: "string",
                description: "HTTP method (GET, POST, PUT, PATCH, DELETE)",
              },
            },
            required: ["service", "path", "method"],
          },
        },
        {
          name: "get_service_overview",
          description:
            "Get a detailed overview of a specific service: description, version, base URL, tags, and all its endpoints.",
          inputSchema: {
            type: "object",
            properties: {
              service: {
                type: "string",
                description: "Service name (e.g. 'activity', 'policy', 'crm')",
              },
            },
            required: ["service"],
          },
        },
        {
          name: "test_endpoint",
          description:
            "Test an API endpoint by making a real HTTP request. Provide a Bearer token for auth. Returns status code, headers, and response body.",
          inputSchema: {
            type: "object",
            properties: {
              service: {
                type: "string",
                description: "Service name (e.g. 'activity')",
              },
              path: {
                type: "string",
                description: "Endpoint path (e.g. '/codes')",
              },
              method: {
                type: "string",
                description: "HTTP method (GET, POST, etc.)",
              },
              token: {
                type: "string",
                description: "Bearer token for authentication",
              },
              base_url: {
                type: "string",
                description:
                  "Base URL override (e.g. 'https://api-dev.apigee.appliedcloudservices.com/epic/activity/v1'). If omitted, uses the base URL from the spec.",
              },
              path_params: {
                type: "object",
                description:
                  'Path parameters as key-value pairs (e.g. {"codeId": "abc-123"})',
                additionalProperties: { type: "string" },
              },
              query_params: {
                type: "object",
                description:
                  'Query parameters as key-value pairs (e.g. {"active_status": "active"})',
                additionalProperties: { type: "string" },
              },
              body: {
                type: "string",
                description: "Request body as JSON string (for POST/PUT/PATCH)",
              },
            },
            required: ["service", "path", "method", "token"],
          },
        },
        {
          name: "generate_curl",
          description:
            "Generate a curl command for an endpoint without executing it. Useful for sharing or running manually.",
          inputSchema: {
            type: "object",
            properties: {
              service: {
                type: "string",
                description: "Service name",
              },
              path: {
                type: "string",
                description: "Endpoint path",
              },
              method: {
                type: "string",
                description: "HTTP method",
              },
              token: {
                type: "string",
                description: "Bearer token",
              },
              base_url: {
                type: "string",
                description: "Base URL override",
              },
              path_params: {
                type: "object",
                description: "Path parameters",
                additionalProperties: { type: "string" },
              },
              query_params: {
                type: "object",
                description: "Query parameters",
                additionalProperties: { type: "string" },
              },
              body: {
                type: "string",
                description: "Request body JSON",
              },
            },
            required: ["service", "path", "method", "token"],
          },
        },
        {
          name: "catalog_status",
          description:
            "Check the current status of the API catalog: when it was last refreshed, how many services and endpoints are indexed.",
          inputSchema: {
            type: "object",
            properties: {
              branch: {
                type: "string",
                enum: ["main", "api-spec-design"],
                description:
                  "Which branch to check status for. Defaults to the active focus branch (initially 'main').",
              },
            },
            required: [],
          },
        },
        {
          name: "set_branch_focus",
          description:
            "Set which branch the catalog tools operate on by default. Affects all tools that don't specify an explicit branch parameter. Initially set to 'main'.",
          inputSchema: {
            type: "object",
            properties: {
              branch: {
                type: "string",
                enum: ["main", "api-spec-design"],
                description: "The branch to set as active focus.",
              },
            },
            required: ["branch"],
          },
        },
        {
          name: "compare_branches",
          description:
            "Compare the API catalog between 'main' and 'api-spec-design' branches. Shows services and endpoints that were added, removed, or modified. Both branches must have been refreshed first.",
          inputSchema: {
            type: "object",
            properties: {
              service: {
                type: "string",
                description:
                  "Optional: filter comparison to a specific service name.",
              },
            },
            required: [],
          },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "refresh_specs": {
          const a = args as { branch?: string };
          const branch = resolveBranch(a.branch);
          const logs: string[] = [];
          const cat = refreshSpecs(branch, (msg) => logs.push(msg));
          catalogs.set(branch, cat);
          return {
            content: [
              {
                type: "text" as const,
                text:
                  [
                    "# Specs Refreshed",
                    "",
                    `**Services:** ${cat.services.length}`,
                    `**Total endpoints:** ${cat.endpoints.length}`,
                    `**Last updated:** ${cat.lastUpdated}`,
                    "",
                    "## Progress Log",
                    ...logs,
                  ].join("\n") + statusBar(cat),
              },
            ],
          };
        }

        case "list_services": {
          const branch = resolveBranch();
          const cat = ensureCatalog(branch);
          const lines = cat.services.map(
            (s) =>
              `- **${s.title}** (\`${s.name}\`) — ${s.endpointCount} endpoints — ${s.description || "(no description)"}`,
          );
          return {
            content: [
              {
                type: "text" as const,
                text:
                  [
                    `# Epic API Services (${cat.services.length})`,
                    `_Last updated: ${cat.lastUpdated}_`,
                    "",
                    ...lines,
                  ].join("\n") + statusBar(cat),
              },
            ],
          };
        }

        case "search_endpoints": {
          const a = args as {
            query: string;
            service?: string;
            method?: string;
            tag?: string;
            branch?: string;
          };
          const branch = resolveBranch(a.branch);
          const cat = ensureCatalog(branch);
          const results = searchEndpoints(
            cat,
            a.query,
            a.service,
            a.method,
            a.tag,
          );

          if (results.length === 0) {
            return {
              content: [
                {
                  type: "text" as const,
                  text:
                    `No endpoints found matching "${a.query}". Try a broader search term or run refresh_specs if the catalog is stale.` +
                    statusBar(cat),
                },
              ],
            };
          }

          const lines = results.map(
            (ep, i) => `${i + 1}. ${formatEndpointSummary(ep)}`,
          );
          return {
            content: [
              {
                type: "text" as const,
                text:
                  [
                    `# Search Results for "${a.query}" (${results.length} matches)`,
                    "",
                    ...lines,
                    "",
                    "_Use get_endpoint_details to see full details for any endpoint._",
                  ].join("\n") + statusBar(cat),
              },
            ],
          };
        }

        case "get_endpoint_details": {
          const branch = resolveBranch();
          const cat = ensureCatalog(branch);
          const a = args as {
            service: string;
            path: string;
            method: string;
          };
          if (!VALID_HTTP_METHODS.includes(a.method.toUpperCase())) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Invalid HTTP method: "${a.method}". Must be one of: ${VALID_HTTP_METHODS.join(", ")}`,
                },
              ],
              isError: true,
            };
          }
          const ep = cat.endpoints.find(
            (e) =>
              e.service === a.service &&
              e.path === a.path &&
              e.method === a.method.toUpperCase(),
          );

          if (!ep) {
            // Try fuzzy match on path
            const fuzzy = cat.endpoints.filter(
              (e) =>
                e.service === a.service &&
                e.path.includes(a.path) &&
                e.method === a.method.toUpperCase(),
            );
            if (fuzzy.length > 0) {
              return {
                content: [
                  {
                    type: "text" as const,
                    text:
                      [
                        `Exact match not found. Did you mean one of these?`,
                        "",
                        ...fuzzy.map((e) => `- ${formatEndpointSummary(e)}`),
                      ].join("\n") + statusBar(cat),
                  },
                ],
              };
            }
            return {
              content: [
                {
                  type: "text" as const,
                  text:
                    `Endpoint not found: ${a.method.toUpperCase()} ${a.path} in service "${a.service}".` +
                    statusBar(cat),
                },
              ],
              isError: true,
            };
          }

          return {
            content: [
              {
                type: "text" as const,
                text: formatEndpointDetail(ep) + statusBar(cat),
              },
            ],
          };
        }

        case "get_service_overview": {
          const branch = resolveBranch();
          const cat = ensureCatalog(branch);
          const a = args as { service: string };
          const svc = cat.services.find((s) => s.name === a.service);

          if (!svc) {
            const fuzzy = cat.services.filter(
              (s) =>
                s.name.includes(a.service) ||
                s.title.toLowerCase().includes(a.service.toLowerCase()),
            );
            if (fuzzy.length > 0) {
              return {
                content: [
                  {
                    type: "text" as const,
                    text:
                      [
                        `Service "${a.service}" not found. Did you mean:`,
                        "",
                        ...fuzzy.map((s) => `- \`${s.name}\` (${s.title})`),
                      ].join("\n") + statusBar(cat),
                  },
                ],
              };
            }
            return {
              content: [
                {
                  type: "text" as const,
                  text:
                    `Service "${a.service}" not found. Use list_services to see available services.` +
                    statusBar(cat),
                },
              ],
              isError: true,
            };
          }

          const endpoints = cat.endpoints.filter(
            (e) => e.service === a.service,
          );
          const endpointList = endpoints.map(
            (e) =>
              `- \`${e.method} ${e.path}\` — ${e.summary || e.operationId || "(no summary)"}`,
          );

          return {
            content: [
              {
                type: "text" as const,
                text:
                  [
                    formatServiceOverview(svc),
                    "",
                    "### Endpoints",
                    "",
                    ...endpointList,
                  ].join("\n") + statusBar(cat),
              },
            ],
          };
        }

        case "test_endpoint": {
          const branch = resolveBranch();
          const cat = ensureCatalog(branch);
          const a = args as {
            service: string;
            path: string;
            method: string;
            token: string;
            base_url?: string;
            path_params?: Record<string, string>;
            query_params?: Record<string, string>;
            body?: string;
          };
          if (!VALID_HTTP_METHODS.includes(a.method.toUpperCase())) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Invalid HTTP method: "${a.method}". Must be one of: ${VALID_HTTP_METHODS.join(", ")}`,
                },
              ],
              isError: true,
            };
          }

          const ep = cat.endpoints.find(
            (e) =>
              e.service === a.service &&
              e.path === a.path &&
              e.method === a.method.toUpperCase(),
          );

          if (!ep) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Endpoint not found: ${a.method.toUpperCase()} ${a.path} in service "${a.service}". Use search_endpoints to find it.`,
                },
              ],
              isError: true,
            };
          }

          const svc = cat.services.find((s) => s.name === a.service);
          const resolved = resolveBaseUrl(
            a.base_url || svc?.baseUrl || "",
            a.service,
          );
          if (resolved.error) {
            return {
              content: [{ type: "text" as const, text: resolved.error }],
              isError: true,
            };
          }

          const fullUrl = resolveUrl(
            ep,
            resolved.url,
            a.path_params,
            a.query_params,
          );
          const result = await executeRequest(ep, fullUrl, a.token, a.body);

          return {
            content: [
              {
                type: "text" as const,
                text:
                  [
                    `# Test Result: ${ep.method} ${ep.path}`,
                    "",
                    `**Status:** ${result.status}`,
                    "",
                    "### Response Headers",
                    "```json",
                    JSON.stringify(result.headers, null, 2),
                    "```",
                    "",
                    "### Response Body",
                    "```json",
                    result.body,
                    "```",
                  ].join("\n") + statusBar(cat),
              },
            ],
          };
        }

        case "generate_curl": {
          const branch = resolveBranch();
          const cat = ensureCatalog(branch);
          const a = args as {
            service: string;
            path: string;
            method: string;
            token: string;
            base_url?: string;
            path_params?: Record<string, string>;
            query_params?: Record<string, string>;
            body?: string;
          };
          if (!VALID_HTTP_METHODS.includes(a.method.toUpperCase())) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Invalid HTTP method: "${a.method}". Must be one of: ${VALID_HTTP_METHODS.join(", ")}`,
                },
              ],
              isError: true,
            };
          }

          const ep = cat.endpoints.find(
            (e) =>
              e.service === a.service &&
              e.path === a.path &&
              e.method === a.method.toUpperCase(),
          );

          if (!ep) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Endpoint not found: ${a.method.toUpperCase()} ${a.path} in service "${a.service}".`,
                },
              ],
              isError: true,
            };
          }

          const svc = cat.services.find((s) => s.name === a.service);
          const resolved = resolveBaseUrl(
            a.base_url || svc?.baseUrl || "",
            a.service,
          );
          if (resolved.error) {
            return {
              content: [{ type: "text" as const, text: resolved.error }],
              isError: true,
            };
          }

          const fullUrl = resolveUrl(
            ep,
            resolved.url,
            a.path_params,
            a.query_params,
          );
          const curl = buildCurlCommand(ep, fullUrl, a.token, a.body);

          return {
            content: [
              {
                type: "text" as const,
                text:
                  [
                    `# Curl Command: ${ep.method} ${ep.path}`,
                    "",
                    "```bash",
                    curl,
                    "```",
                  ].join("\n") + statusBar(cat),
              },
            ],
          };
        }

        case "catalog_status": {
          const a = args as { branch?: string };
          const branch = resolveBranch(a.branch);
          const cat = catalogs.get(branch) ?? loadCatalog(branch);
          if (!cat) {
            return {
              content: [
                {
                  type: "text" as const,
                  text:
                    `No catalog loaded for branch "${branch}". Run refresh_specs${branch !== "main" ? ` with branch: "${branch}"` : ""} to fetch specs from GitLab.` +
                    statusBar(null),
                },
              ],
            };
          }
          return {
            content: [
              {
                type: "text" as const,
                text:
                  [
                    "# API Catalog Status",
                    "",
                    `**Last refreshed:** ${cat.lastUpdated}`,
                    `**Services:** ${cat.services.length}`,
                    `**Total endpoints:** ${cat.endpoints.length}`,
                    "",
                    `Top services by endpoint count:`,
                    ...cat.services
                      .sort((a, b) => b.endpointCount - a.endpointCount)
                      .slice(0, 10)
                      .map(
                        (s) =>
                          `- ${s.title} (\`${s.name}\`): ${s.endpointCount} endpoints`,
                      ),
                  ].join("\n") + statusBar(cat),
              },
            ],
          };
        }

        case "set_branch_focus": {
          const a = args as { branch: string };
          const branch = resolveBranch(a.branch);
          activeBranch = branch;

          const cat = catalogs.get(branch) ?? loadCatalog(branch);
          const statusNote = cat
            ? `Catalog available: ${cat.services.length} services, ${cat.endpoints.length} endpoints (last refreshed ${cat.lastUpdated}).`
            : `No catalog cached for branch "${branch}" yet. Run refresh_specs to fetch specs.`;

          return {
            content: [
              {
                type: "text" as const,
                text:
                  [
                    `# Branch Focus Changed`,
                    "",
                    `**Active branch:** \`${branch}\``,
                    "",
                    statusNote,
                    "",
                    "All subsequent tool calls will use this branch unless they specify a different branch explicitly.",
                  ].join("\n") + statusBar(cat ?? null),
              },
            ],
          };
        }

        case "compare_branches": {
          const a = args as { service?: string };
          const mainCat = ensureCatalog("main");
          const designCat = ensureCatalog("api-spec-design");
          const diff = compareCatalogs(mainCat, designCat);

          const lines: string[] = [
            "# Branch Comparison: main vs. api-spec-design",
            "",
            `**main** last refreshed: ${diff.baseLastUpdated}`,
            `**api-spec-design** last refreshed: ${diff.targetLastUpdated}`,
          ];

          // Filter to service if specified
          const filterSvc = a.service;
          const added = filterSvc
            ? diff.endpoints.added.filter((e) => e.service === filterSvc)
            : diff.endpoints.added;
          const removed = filterSvc
            ? diff.endpoints.removed.filter((e) => e.service === filterSvc)
            : diff.endpoints.removed;
          const modified = filterSvc
            ? diff.endpoints.modified.filter((e) => e.service === filterSvc)
            : diff.endpoints.modified;

          if (filterSvc) {
            lines.push("", `**Filtered to service:** \`${filterSvc}\``);
          }

          // Services section (only when not filtered)
          if (!filterSvc) {
            lines.push("", "## Services");
            if (diff.services.onlyInTarget.length > 0) {
              lines.push("", "### New in api-spec-design");
              for (const s of diff.services.onlyInTarget) {
                lines.push(`- \`${s}\``);
              }
            }
            if (diff.services.onlyInBase.length > 0) {
              lines.push("", "### Only in main (not in api-spec-design)");
              for (const s of diff.services.onlyInBase) {
                lines.push(`- \`${s}\``);
              }
            }
            if (
              diff.services.onlyInTarget.length === 0 &&
              diff.services.onlyInBase.length === 0
            ) {
              lines.push("", "No service-level differences.");
            }
          }

          // Endpoints section
          lines.push("", "## Endpoints");

          if (added.length > 0) {
            lines.push("", `### Added in api-spec-design (${added.length})`);
            for (const ep of added) {
              lines.push(
                `- \`${ep.method} ${ep.path}\` [${ep.service}] — ${ep.summary || "(no summary)"}`,
              );
            }
          }

          if (removed.length > 0) {
            lines.push("", `### Only in main (${removed.length})`);
            for (const ep of removed) {
              lines.push(
                `- \`${ep.method} ${ep.path}\` [${ep.service}] — ${ep.summary || "(no summary)"}`,
              );
            }
          }

          if (modified.length > 0) {
            lines.push("", `### Modified (${modified.length})`);
            for (const d of modified) {
              lines.push(`- \`${d.method} ${d.path}\` [${d.service}]`);
              for (const change of d.changes) {
                lines.push(`  - ${change}`);
              }
            }
          }

          if (
            added.length === 0 &&
            removed.length === 0 &&
            modified.length === 0
          ) {
            lines.push("", "No endpoint-level differences found.");
          }

          // Summary
          lines.push(
            "",
            "## Summary",
            "",
            "| | main | api-spec-design |",
            "|---|---|---|",
            `| Services | ${mainCat.services.length} | ${designCat.services.length} |`,
            `| Endpoints | ${mainCat.endpoints.length} | ${designCat.endpoints.length} |`,
            "",
            `**Added:** ${added.length} | **Removed:** ${removed.length} | **Modified:** ${modified.length}`,
          );

          return {
            content: [
              {
                type: "text" as const,
                text:
                  lines.join("\n") +
                  statusBar(catalogs.get(activeBranch) ?? null),
              },
            ],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Epic API Catalog MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
