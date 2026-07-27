#!/usr/bin/env node

/**
 * Generates review scope artifacts from a git diff between two branches.
 * Exists to centralize the diff strategy shared across miniservice and proxy
 * review commands, keeping fragile awk/shell logic out of skill markdown.
 *
 * All artifacts are written flat into ~/.claude-review/ with a session ID prefix
 * so users only need to allow that one path once in their settings. Artifacts
 * are cleaned up at the end of the run — only files belonging to this session
 * are removed, so parallel reviews are safe.
 *
 * Usage: node scripts/gather-review-scope.js <target-branch> <current-branch>
 *
 * Outputs (inside ~/.claude-review/, prefixed with {session-id}_):
 *   {id}_changed_files.txt   — one changed file path per line
 *   {id}_{safe-file-name}.diff — per-file diffs (slashes replaced with _)
 *   {id}_changed_lines.txt   — canonical file:line entries for changed lines
 *
 * Prints two lines to stdout:
 *   Line 1: session directory path (~/.claude-review/)
 *   Line 2: changed file count
 */

const { execSync } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const REVIEW_DIR = path.join(os.homedir(), ".claude-review");

/**
 * Runs a shell command and returns trimmed stdout.
 * Exists to keep exec calls consistent and readable.
 *
 * @param {string} cmd - Shell command to execute
 * @returns {string} Trimmed stdout
 */
function run(cmd) {
  return execSync(cmd, {
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
  }).trim();
}

/**
 * Generates the changed file list via git diff --name-only.
 * Exists to produce {id}_changed_files.txt with one file path per line.
 *
 * @param {string} targetBranch - The MR target branch
 * @param {string} currentBranch - The feature branch
 * @param {string} sessionId - The session ID prefix
 * @returns {string[]} Array of changed file paths
 */
function generateChangedFiles(targetBranch, currentBranch, sessionId) {
  const diffRef = `origin/${targetBranch}...origin/${currentBranch}`;
  const output = run(`git diff ${diffRef} --name-only`);
  const files = output ? output.split("\n").filter(Boolean) : [];
  fs.writeFileSync(
    path.join(REVIEW_DIR, `${sessionId}_changed_files.txt`),
    files.join("\n") + "\n",
    "utf8",
  );
  return files;
}

/**
 * Generates per-file diff files so review agents know exactly which lines changed.
 * Exists to produce {id}_{safe-file-name}.diff for each changed file.
 *
 * @param {string} targetBranch - The MR target branch
 * @param {string} currentBranch - The feature branch
 * @param {string[]} files - Array of changed file paths
 * @param {string} sessionId - The session ID prefix
 */
function generatePerFileDiffs(targetBranch, currentBranch, files, sessionId) {
  const diffRef = `origin/${targetBranch}...origin/${currentBranch}`;

  for (const file of files) {
    const safeName = file.replace(/\//g, "_");
    const diff = run(`git diff ${diffRef} -- "${file}"`);
    fs.writeFileSync(
      path.join(REVIEW_DIR, `${sessionId}_${safeName}.diff`),
      diff,
      "utf8",
    );
  }
}

/**
 * Parses a unified diff patch to extract changed line numbers on the NEW side.
 * Exists to replace the fragile inline awk script with maintainable JS.
 *
 * @param {string} patch - Raw unified diff output
 * @returns {string[]} Array of "file:line" entries
 */
function parseChangedLines(patch) {
  const lines = patch.split("\n");
  const changedLines = [];
  let currentFile = null;

  for (const line of lines) {
    if (line.startsWith("+++ b/")) {
      currentFile = line.slice(6);
      continue;
    }

    if (!currentFile || !line.startsWith("@@ ")) {
      continue;
    }

    const match = line.match(/\+(\d+)(?:,(\d+))?/);
    if (!match) {
      continue;
    }

    const start = parseInt(match[1], 10);
    const count = match[2] !== undefined ? parseInt(match[2], 10) : 1;

    if (count === 0) {
      continue;
    }

    for (let i = 0; i < count; i += 1) {
      changedLines.push(`${currentFile}:${start + i}`);
    }
  }

  return changedLines;
}

/**
 * Generates the canonical changed-line manifest from a unified diff.
 * Exists to produce {id}_changed_lines.txt with file:line entries for
 * every changed line on the NEW side of the diff.
 *
 * @param {string} targetBranch - The MR target branch
 * @param {string} currentBranch - The feature branch
 * @param {string} sessionId - The session ID prefix
 */
function generateChangedLineManifest(targetBranch, currentBranch, sessionId) {
  const diffRef = `origin/${targetBranch}...origin/${currentBranch}`;
  const patch = run(`git diff --unified=0 --no-color ${diffRef}`);

  const changedLines = parseChangedLines(patch);
  fs.writeFileSync(
    path.join(REVIEW_DIR, `${sessionId}_changed_lines.txt`),
    changedLines.join("\n") + "\n",
    "utf8",
  );
}

/**
 * Removes all files belonging to this session from ~/.claude-review/.
 * Only deletes files prefixed with the session ID so parallel reviews are safe.
 *
 * @param {string} sessionId - The session ID prefix
 */
function cleanupSession(sessionId) {
  for (const entry of fs.readdirSync(REVIEW_DIR)) {
    if (entry.startsWith(`${sessionId}_`)) {
      fs.rmSync(path.join(REVIEW_DIR, entry), { force: true });
    }
  }
}

/**
 * Counts files in the review directory older than the given number of days.
 * Exists so commands can check before prompting the user about cleanup.
 *
 * @param {number} days - Count files older than this many days
 * @param {string} [dir] - Directory to check (defaults to REVIEW_DIR)
 * @returns {number} Number of old files found
 */
function countOldFiles(days, dir = REVIEW_DIR) {
  if (!fs.existsSync(dir)) return 0;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return fs.readdirSync(dir).filter((entry) => {
    const stat = fs.statSync(path.join(dir, entry));
    return stat.mtimeMs < cutoff;
  }).length;
}

/**
 * Removes all files in the review directory older than the given number of days.
 * Exists to let users periodically clean up accumulated session artifacts.
 *
 * @param {number} days - Delete files older than this many days
 * @param {string} [dir] - Directory to clean up (defaults to REVIEW_DIR)
 */
function cleanupOldFiles(days, dir = REVIEW_DIR) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  for (const entry of fs.readdirSync(dir)) {
    const filePath = path.join(dir, entry);
    const stat = fs.statSync(filePath);
    if (stat.mtimeMs < cutoff) {
      fs.rmSync(filePath, { force: true });
    }
  }
}

/**
 * Main entry point. Orchestrates the full scope-gathering pipeline.
 */
async function main() {
  const args = process.argv.slice(2);

  if (args[0] === "--cleanup" && args[1]) {
    cleanupSession(args[1]);
    return;
  }

  if (args[0] === "--cleanup-old" && args[1]) {
    cleanupOldFiles(parseInt(args[1], 10));
    return;
  }

  if (args[0] === "--has-old" && args[1]) {
    const count = countOldFiles(parseInt(args[1], 10));
    console.log(count);
    return;
  }

  if (args.length < 2) {
    console.error(
      "Usage: node scripts/gather-review-scope.js <target-branch> <current-branch>",
    );
    process.exit(1);
  }

  const [targetBranch, currentBranch] = args;

  const sessionId = crypto.randomUUID().slice(0, 8);

  fs.mkdirSync(REVIEW_DIR, { recursive: true });

  const files = generateChangedFiles(targetBranch, currentBranch, sessionId);
  generatePerFileDiffs(targetBranch, currentBranch, files, sessionId);
  generateChangedLineManifest(targetBranch, currentBranch, sessionId);

  console.log(REVIEW_DIR);
  console.log(files.length);
  console.log(sessionId);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = {
  parseChangedLines,
  generateChangedFiles,
  generatePerFileDiffs,
  generateChangedLineManifest,
  cleanupSession,
  countOldFiles,
  cleanupOldFiles,
  REVIEW_DIR,
};
