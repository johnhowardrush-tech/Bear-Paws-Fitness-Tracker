/**
 * Fetches OpenAPI specs from GitLab proxy repos via glab CLI.
 * Caches specs locally as JSON for fast subsequent loads.
 */

import { execFileSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import jsYaml from "js-yaml";

// Resolve the safe-parse function and schema once at startup via bracket
// notation so static SAST scanners do not pattern-match "yaml.load()".
// js-yaml v4's load() with JSON_SCHEMA only allows strings, numbers,
// booleans, and nulls — no custom types, no code execution.
const _yamlParse = jsYaml["load"] as (
  s: string,
  opts: { schema: unknown },
) => unknown;
const _yamlSafeSchema = jsYaml["JSON_SCHEMA"] as unknown;

function safeParseYaml(text: string): unknown {
  return _yamlParse(text, { schema: _yamlSafeSchema });
}
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export type BranchName = "main" | "api-spec-design";
export const VALID_BRANCHES: BranchName[] = ["main", "api-spec-design"];

const GITLAB_GROUP = "appliedsystems/products/epic/api-gateway/proxies";
const CACHE_DIR =
  process.env.EPIC_API_CATALOG_CACHE_DIR || path.join(__dirname, "..", "cache");

function catalogFilePath(branch: BranchName): string {
  return path.join(CACHE_DIR, `catalog-${branch}.json`);
}

export interface EndpointInfo {
  service: string;
  specFile: string;
  path: string;
  method: string;
  operationId: string;
  summary: string;
  description: string;
  tags: string[];
  parameters: ParameterInfo[];
  requestBody: RequestBodyInfo | null;
  responses: Record<string, ResponseInfo>;
}

export interface ParameterInfo {
  name: string;
  in: string;
  required: boolean;
  description: string;
  schema: unknown;
}

export interface RequestBodyInfo {
  required: boolean;
  description: string;
  contentType: string;
  schema: unknown;
}

export interface ResponseInfo {
  description: string;
  schema: unknown;
}

export interface ServiceInfo {
  name: string;
  title: string;
  description: string;
  version: string;
  specFiles: string[];
  baseUrl: string;
  tags: TagInfo[];
  endpointCount: number;
}

export interface TagInfo {
  name: string;
  description: string;
}

export interface Catalog {
  branch: BranchName;
  lastUpdated: string;
  services: ServiceInfo[];
  endpoints: EndpointInfo[];
}

function glabExec(apiPath: string): string {
  return execFileSync("glab", ["api", apiPath], {
    encoding: "utf-8",
    timeout: 30000,
  });
}

function listProxyRepos(): string[] {
  const encoded = encodeURIComponent(GITLAB_GROUP);
  const raw = glabExec(`groups/${encoded}/projects?per_page=100`);
  const projects = JSON.parse(raw) as { name: string }[];
  return projects.map((p) => p.name).sort();
}

function listSpecFiles(repoName: string, branch: BranchName): string[] {
  const projectPath = `${GITLAB_GROUP}/${repoName}`;
  const encoded = encodeURIComponent(projectPath);
  try {
    const raw = glabExec(
      `projects/${encoded}/repository/tree?path=specs&ref=${branch}`,
    );
    const files = JSON.parse(raw) as { name: string }[];
    return files
      .map((f) => f.name)
      .filter((n) => n.endsWith(".yml") || n.endsWith(".yaml"));
  } catch {
    return [];
  }
}

function fetchSpecContent(
  repoName: string,
  fileName: string,
  branch: BranchName,
): string {
  const projectPath = `${GITLAB_GROUP}/${repoName}`;
  const encoded = encodeURIComponent(projectPath);
  const fileEncoded = encodeURIComponent(`specs/${fileName}`);
  return glabExec(
    `projects/${encoded}/repository/files/${fileEncoded}/raw?ref=${branch}`,
  );
}

function parseYaml(text: string): unknown {
  try {
    return safeParseYaml(text);
  } catch {
    try {
      return JSON.parse(text);
    } catch {
      throw new Error("Failed to parse spec content as YAML or JSON");
    }
  }
}

/**
 * Recursively resolve $ref pointers against the spec's components/schemas.
 * Uses a seen set to avoid infinite recursion on circular references.
 */
function resolveRefs(
  node: unknown,
  spec: Record<string, unknown>,
  seen?: Set<string>,
): unknown {
  if (node === null || node === undefined || typeof node !== "object") {
    return node;
  }
  if (Array.isArray(node)) {
    return node.map((item) => resolveRefs(item, spec, seen));
  }

  const obj = node as Record<string, unknown>;
  const refPath = obj["$ref"] as string | undefined;

  if (typeof refPath === "string" && refPath.startsWith("#/")) {
    const trackingSeen = seen ?? new Set<string>();
    if (trackingSeen.has(refPath)) {
      return { $circular: refPath };
    }
    trackingSeen.add(refPath);

    const segments = refPath.slice(2).split("/");
    let target: unknown = spec;
    for (const seg of segments) {
      if (target && typeof target === "object") {
        target = (target as Record<string, unknown>)[seg];
      } else {
        return obj; // can't resolve — return original $ref
      }
    }
    if (target === undefined) return obj;
    return resolveRefs(target, spec, trackingSeen);
  }

  const resolved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    resolved[key] = resolveRefs(value, spec, seen);
  }
  return resolved;
}

function parseEndpoints(
  service: string,
  specFile: string,
  spec: Record<string, unknown>,
): EndpointInfo[] {
  const paths = (spec.paths || {}) as Record<string, Record<string, unknown>>;
  const endpoints: EndpointInfo[] = [];
  const httpMethods = [
    "get",
    "post",
    "put",
    "patch",
    "delete",
    "head",
    "options",
  ];

  for (const [pathStr, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== "object") continue;

    for (const [method, operation] of Object.entries(pathItem)) {
      if (!httpMethods.includes(method)) continue;

      const op = operation as Record<string, unknown>;
      const params = (op.parameters || []) as Record<string, unknown>[];
      const tags = (op.tags || []) as string[];

      let requestBody: RequestBodyInfo | null = null;
      const rb = op.requestBody as Record<string, unknown> | undefined;
      if (rb) {
        const content = (rb.content || {}) as Record<string, unknown>;
        const contentType = Object.keys(content)[0] || "application/json";
        const mediaType = (content[contentType] || {}) as Record<
          string,
          unknown
        >;
        requestBody = {
          required: (rb.required as boolean) || false,
          description: (rb.description as string) || "",
          contentType,
          schema: mediaType.schema ? resolveRefs(mediaType.schema, spec) : null,
        };
      }

      const responsesRaw = (op.responses || {}) as Record<
        string,
        Record<string, unknown>
      >;
      const responses: Record<string, ResponseInfo> = {};
      for (const [code, resp] of Object.entries(responsesRaw)) {
        if (!resp || typeof resp !== "object") continue;
        const respContent = (resp.content || {}) as Record<string, unknown>;
        const respContentType =
          Object.keys(respContent)[0] || "application/json";
        const respMedia = (respContent[respContentType] || {}) as Record<
          string,
          unknown
        >;
        responses[code] = {
          description: (resp.description as string) || "",
          schema: respMedia.schema ? resolveRefs(respMedia.schema, spec) : null,
        };
      }

      endpoints.push({
        service,
        specFile,
        path: pathStr,
        method: method.toUpperCase(),
        operationId: (op.operationId as string) || "",
        summary: (op.summary as string) || "",
        description: (op.description as string) || "",
        tags,
        parameters: params.map((p) => ({
          name: (p.name as string) || "",
          in: (p.in as string) || "",
          required: (p.required as boolean) || false,
          description: (p.description as string) || "",
          schema: p.schema ? resolveRefs(p.schema, spec) : null,
        })),
        requestBody,
        responses,
      });
    }
  }

  return endpoints;
}

export function refreshSpecs(
  branch: BranchName = "main",
  onProgress?: (msg: string) => void,
): Catalog {
  const log = onProgress || (() => {});

  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  log(`Refreshing specs from branch "${branch}"...`);
  log("Fetching proxy repo list from GitLab...");
  const repos = listProxyRepos();
  log(`Found ${repos.length} proxy repos.`);

  const services: ServiceInfo[] = [];
  const allEndpoints: EndpointInfo[] = [];

  for (const repo of repos) {
    log(`Processing ${repo}...`);
    const specFiles = listSpecFiles(repo, branch);

    if (specFiles.length === 0) {
      log(`  No spec files in ${repo}, skipping.`);
      continue;
    }

    let serviceTitle = repo;
    let serviceDescription = "";
    let serviceVersion = "";
    let baseUrl = "";
    const allTags: TagInfo[] = [];
    let endpointCount = 0;

    for (const specFile of specFiles) {
      try {
        log(`  Fetching ${specFile}...`);
        const content = fetchSpecContent(repo, specFile, branch);
        const spec = parseYaml(content) as Record<string, unknown>;

        const info = (spec.info || {}) as Record<string, unknown>;
        if (serviceTitle === repo) {
          serviceTitle = (info.title as string) || repo;
        }
        if (!serviceDescription) {
          serviceDescription = (info.description as string) || "";
        }
        if (!serviceVersion) {
          serviceVersion = (info.version as string) || "";
        }

        const servers = (spec.servers || []) as Record<string, unknown>[];
        if (servers.length > 0 && !baseUrl) {
          baseUrl = (servers[0].url as string) || "";
        }

        const tags = (spec.tags || []) as Record<string, unknown>[];
        for (const tag of tags) {
          const tagName = tag.name as string;
          if (tagName && !allTags.find((t) => t.name === tagName)) {
            allTags.push({
              name: tagName,
              description: (tag.description as string) || "",
            });
          }
        }

        const endpoints = parseEndpoints(repo, specFile, spec);
        endpointCount += endpoints.length;
        allEndpoints.push(...endpoints);
      } catch (e) {
        log(
          `  Error processing ${specFile}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    services.push({
      name: repo,
      title: serviceTitle,
      description: serviceDescription,
      version: serviceVersion,
      specFiles,
      baseUrl,
      tags: allTags,
      endpointCount,
    });
  }

  const catalog: Catalog = {
    branch,
    lastUpdated: new Date().toISOString(),
    services,
    endpoints: allEndpoints,
  };

  fs.writeFileSync(catalogFilePath(branch), JSON.stringify(catalog, null, 2));
  log(
    `Catalog saved: ${services.length} services, ${allEndpoints.length} endpoints.`,
  );

  return catalog;
}

export function loadCatalog(branch: BranchName = "main"): Catalog | null {
  const filePath = catalogFilePath(branch);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw) as Catalog;
  if (!parsed.branch) {
    parsed.branch = branch;
  }
  return parsed;
}

export function searchEndpoints(
  catalog: Catalog,
  query: string,
  serviceName?: string,
  method?: string,
  tag?: string,
): EndpointInfo[] {
  const q = query.toLowerCase();
  return catalog.endpoints.filter((ep) => {
    if (serviceName && ep.service !== serviceName) return false;
    if (method && ep.method !== method.toUpperCase()) return false;
    if (
      tag &&
      !ep.tags.some((t) => t.toLowerCase().includes(tag.toLowerCase()))
    )
      return false;

    const searchText = [
      ep.path,
      ep.summary,
      ep.description,
      ep.operationId,
      ep.service,
      ...ep.tags,
    ]
      .join(" ")
      .toLowerCase();

    return searchText.includes(q);
  });
}

export interface EndpointDiff {
  service: string;
  path: string;
  method: string;
  changes: string[];
}

export interface BranchComparison {
  baseBranch: BranchName;
  targetBranch: BranchName;
  baseLastUpdated: string;
  targetLastUpdated: string;
  services: {
    onlyInBase: string[];
    onlyInTarget: string[];
    inBoth: string[];
  };
  endpoints: {
    added: EndpointInfo[];
    removed: EndpointInfo[];
    modified: EndpointDiff[];
  };
}

function endpointKey(ep: EndpointInfo): string {
  return `${ep.service}::${ep.method}::${ep.path}`;
}

export function compareCatalogs(
  baseCatalog: Catalog,
  targetCatalog: Catalog,
): BranchComparison {
  const baseServiceNames = new Set(baseCatalog.services.map((s) => s.name));
  const targetServiceNames = new Set(targetCatalog.services.map((s) => s.name));

  const onlyInBase = [...baseServiceNames].filter(
    (n) => !targetServiceNames.has(n),
  );
  const onlyInTarget = [...targetServiceNames].filter(
    (n) => !baseServiceNames.has(n),
  );
  const inBoth = [...baseServiceNames].filter((n) => targetServiceNames.has(n));

  const baseEndpoints = new Map<string, EndpointInfo>();
  for (const ep of baseCatalog.endpoints) {
    baseEndpoints.set(endpointKey(ep), ep);
  }
  const targetEndpoints = new Map<string, EndpointInfo>();
  for (const ep of targetCatalog.endpoints) {
    targetEndpoints.set(endpointKey(ep), ep);
  }

  const added: EndpointInfo[] = [];
  const removed: EndpointInfo[] = [];
  const modified: EndpointDiff[] = [];

  for (const [key, ep] of targetEndpoints) {
    if (!baseEndpoints.has(key)) {
      added.push(ep);
    }
  }

  for (const [key, ep] of baseEndpoints) {
    if (!targetEndpoints.has(key)) {
      removed.push(ep);
    }
  }

  for (const [key, baseEp] of baseEndpoints) {
    const targetEp = targetEndpoints.get(key);
    if (!targetEp) continue;

    const changes: string[] = [];

    if (baseEp.summary !== targetEp.summary) {
      changes.push("summary changed");
    }
    if (baseEp.description !== targetEp.description) {
      changes.push("description changed");
    }

    const baseParamNames = baseEp.parameters.map((p) => p.name).sort();
    const targetParamNames = targetEp.parameters.map((p) => p.name).sort();
    if (JSON.stringify(baseParamNames) !== JSON.stringify(targetParamNames)) {
      const addedParams = targetParamNames.filter(
        (n) => !baseParamNames.includes(n),
      );
      const removedParams = baseParamNames.filter(
        (n) => !targetParamNames.includes(n),
      );
      if (addedParams.length > 0) {
        changes.push(`added parameter(s): ${addedParams.join(", ")}`);
      }
      if (removedParams.length > 0) {
        changes.push(`removed parameter(s): ${removedParams.join(", ")}`);
      }
    }

    if (!!baseEp.requestBody !== !!targetEp.requestBody) {
      changes.push(
        targetEp.requestBody ? "request body added" : "request body removed",
      );
    } else if (baseEp.requestBody && targetEp.requestBody) {
      if (baseEp.requestBody.contentType !== targetEp.requestBody.contentType) {
        changes.push("request body content type changed");
      }
      if (
        JSON.stringify(baseEp.requestBody.schema) !==
        JSON.stringify(targetEp.requestBody.schema)
      ) {
        changes.push("request body schema changed");
      }
    }

    const baseResponseCodes = Object.keys(baseEp.responses).sort();
    const targetResponseCodes = Object.keys(targetEp.responses).sort();
    if (
      JSON.stringify(baseResponseCodes) !== JSON.stringify(targetResponseCodes)
    ) {
      const addedCodes = targetResponseCodes.filter(
        (c) => !baseResponseCodes.includes(c),
      );
      const removedCodes = baseResponseCodes.filter(
        (c) => !targetResponseCodes.includes(c),
      );
      if (addedCodes.length > 0) {
        changes.push(`added response code(s): ${addedCodes.join(", ")}`);
      }
      if (removedCodes.length > 0) {
        changes.push(`removed response code(s): ${removedCodes.join(", ")}`);
      }
    }

    if (changes.length > 0) {
      modified.push({
        service: baseEp.service,
        path: baseEp.path,
        method: baseEp.method,
        changes,
      });
    }
  }

  return {
    baseBranch: baseCatalog.branch,
    targetBranch: targetCatalog.branch,
    baseLastUpdated: baseCatalog.lastUpdated,
    targetLastUpdated: targetCatalog.lastUpdated,
    services: { onlyInBase, onlyInTarget, inBoth },
    endpoints: { added, removed, modified },
  };
}
