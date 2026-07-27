// src/collector.ts
import { userInfo, hostname, platform } from "node:os";
import { basename } from "node:path";

// src/config.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
var PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT ?? "";
var CONFIG_FILE = join(PLUGIN_ROOT, "telemetry.config.json");
function readConfig() {
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
  } catch {
    return {};
  }
}
function isTelemetryEnabled() {
  return readConfig().telemetry_enabled !== false;
}
function getDatadogApiKey() {
  return readConfig().dd_api_key ?? null;
}

// src/anonymize.ts
import { createHash } from "node:crypto";
function hashIdentifier(value) {
  return createHash("sha256").update(value.toLowerCase().trim()).digest("hex").substring(0, 16);
}

// src/datadog.ts
var DD_LOGS_ENDPOINT = "https://http-intake.logs.datadoghq.com/api/v2/logs";
var TIMEOUT_MS = 1e4;
function resolveMessageLabel(event) {
  if (typeof event.tool_name === "string") return event.tool_name;
  if (typeof event.source === "string") return event.source;
  if (typeof event.reason === "string") return event.reason;
  return "event";
}
function buildLogEntry(event) {
  const tags = [
    "env:production",
    "service:claude-market-insights",
    `event_type:${event.event_type}`
  ];
  if (event.tool_category) {
    tags.push(`tool_category:${event.tool_category}`);
  }
  return {
    ddsource: "claude-market",
    ddtags: tags.join(","),
    hostname: event.machine_hash ?? "unknown",
    service: "claude-market-insights",
    message: `${event.event_type}: ${resolveMessageLabel(event)}`,
    data: event
  };
}
async function sendToDatadog(events) {
  if (events.length === 0) return true;
  const apiKey = getDatadogApiKey();
  if (!apiKey) return false;
  const body = JSON.stringify(events.map(buildLogEntry));
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const response = await fetch(DD_LOGS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "DD-API-KEY": apiKey
      },
      body,
      signal: controller.signal
    });
    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}

// src/plugin-map.ts
function classifyTool(toolName) {
  if (toolName === "Skill") return "skill";
  return "builtin";
}

// src/events/tool-use.ts
function buildToolUseEvent(stdin) {
  const toolName = stdin.tool_name ?? "unknown";
  return {
    event_type: "tool_use",
    tool_name: toolName,
    tool_category: classifyTool(toolName),
    success: true
  };
}

// src/events/tool-failure.ts
function categorizeError(error) {
  if (typeof error !== "string") return "other";
  const lower = error.toLowerCase();
  if (lower.includes("timeout") || lower.includes("timed out")) return "timeout";
  if (lower.includes("permission") || lower.includes("denied")) return "permission";
  if (lower.includes("crash") || lower.includes("fatal")) return "crash";
  return "other";
}
function buildToolFailureEvent(stdin) {
  const toolName = stdin.tool_name ?? "unknown";
  return {
    event_type: "tool_failure",
    tool_name: toolName,
    tool_category: classifyTool(toolName),
    success: false,
    error_category: categorizeError(stdin.error),
    is_interrupt: stdin.is_interrupt ?? false
  };
}

// src/collector.ts
var EVENT_ROUTER = {
  // Phase 1: command usage tracking
  PostToolUse: buildToolUseEvent,
  PostToolUseFailure: buildToolFailureEvent
  // Phase 2: session and agent lifecycle (uncomment + add hooks to template)
  // SessionStart: buildSessionStartEvent,
  // SessionEnd: buildSessionEndEvent,
  // SubagentStart: buildAgentStartEvent,
  // SubagentStop: buildAgentStopEvent,
  // Stop: buildTurnCompleteEvent,
};
function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => data += chunk);
    process.stdin.on("end", () => resolve(data));
    setTimeout(() => resolve(data), 2e3);
  });
}
function resolveHostPlugin() {
  const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT ?? "";
  return basename(pluginRoot) || "unknown";
}
function resolveProject(cwd) {
  if (!cwd) return "unknown";
  return basename(cwd);
}
async function main() {
  if (!isTelemetryEnabled()) return;
  const raw = await readStdin();
  if (!raw.trim()) return;
  const stdin = JSON.parse(raw);
  const hookEventName = stdin.hook_event_name;
  const builder = EVENT_ROUTER[hookEventName];
  if (!builder) return;
  const eventFields = builder(stdin);
  const event = {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    user_hash: hashIdentifier(userInfo().username),
    machine_hash: hashIdentifier(hostname()),
    session_id_hash: hashIdentifier(stdin.session_id ?? ""),
    host_plugin: resolveHostPlugin(),
    cwd_project: resolveProject(stdin.cwd),
    platform: platform(),
    ...eventFields
  };
  await sendToDatadog([event]);
}
main().catch(() => process.exit(0));
