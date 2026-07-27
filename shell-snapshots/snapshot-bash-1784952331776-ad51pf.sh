# Snapshot file
# Unset all aliases to avoid conflicts with functions
unalias -a 2>/dev/null || true
shopt -s expand_aliases
# Check for rg availability
if ! (unalias rg 2>/dev/null; command -v rg) >/dev/null 2>&1; then
  function rg {
  local _cc_bin="${CLAUDE_CODE_EXECPATH:-}"
  [[ -x $_cc_bin ]] || _cc_bin=/c/Users/John.Rush/.local/bin/claude.exe
  if [[ ! -x $_cc_bin ]]; then command rg ${1+"$@"}; return; fi
  if [[ -n ${ZSH_VERSION:-} ]]; then
    ARGV0=rg "$_cc_bin" ${1+"$@"}
  elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "win32" ]]; then
    ARGV0=rg "$_cc_bin" ${1+"$@"}
  else
    (exec -a rg "$_cc_bin" ${1+"$@"})
  fi
}
fi
# Shadow pkill to refuse patterns matching the CLI process
unalias pkill 2>/dev/null || true
function pkill {
  if [ -n "${CLAUDE_PID:-}" ] && [ -r "/proc/${CLAUDE_PID}/comm" ]; then
    local _cc_skip="" _cc_a
    local -a _cc_probe=()
    for _cc_a in ${1+"$@"}; do
      if [ -n "$_cc_skip" ]; then _cc_skip=""; continue; fi
      case "$_cc_a" in
        --signal) _cc_skip=1 ;;
        --signal=*|-e|--echo) ;;
        -[0-9]*) ;;
        -[PUGOF]?*) _cc_probe+=("$_cc_a") ;;
        -[ABCDEFGHIJKLMNOPQRSTUVWXYZ][ABCDEFGHIJKLMNOPQRSTUVWXYZ0-9]*) ;;
        *) _cc_probe+=("$_cc_a") ;;
      esac
    done
    if command pgrep ${_cc_probe[@]+"${_cc_probe[@]}"} 2>/dev/null | command grep -qx "${CLAUDE_PID}"; then
      printf 'pkill: refusing to run — this pattern matches the Claude CLI process (PID %s). Narrow the pattern, or target your own children with `pkill -P $$ ...`.\n' "${CLAUDE_PID}" >&2
      return 1
    fi
  fi
  command pkill ${1+"$@"}
}
export PATH='/c/Users/John.Rush/bin:/mingw64/bin:/usr/local/bin:/usr/bin:/bin:/mingw64/bin:/usr/bin:/c/Users/John.Rush/bin:/c/Windows/system32:/c/Windows:/c/Windows/System32/Wbem:/c/Windows/System32/WindowsPowerShell/v1.0:/c/Windows/System32/OpenSSH:/c/Program Files/dotnet:/c/Program Files/PowerToys/DSCModules:/c/Program Files/Cloudflare/Cloudflare WARP:/cmd:/c/Program Files/nodejs:/c/Users/John.Rush/AppData/Local/Microsoft/WindowsApps:/c/Users/John.Rush/AppData/Local/GitHubDesktop/bin:/c/Users/John.Rush/AppData/Local/Programs/Git/cmd:/c/Users/John.Rush/.local/bin:/c/Users/John.Rush/AppData/Local/Programs/Microsoft VS Code/bin:/c/Users/John.Rush/AppData/Roaming/npm:/c/Users/John.Rush/AppData/Local/Programs/glab:/c/Program Files/nodejs:/mingw64/bin:/c/Users/John.Rush/AppData/Local/Programs/Git/mingw64/bin:/usr/bin/vendor_perl:/usr/bin/core_perl:/c/Users/John.Rush/.claude/plugins/cache/applied-claude-marketplace/ads-mcp/2.2.0/bin:/c/Users/John.Rush/.claude/plugins/cache/applied-claude-marketplace/epic-common/1.7.0/bin:/c/Users/John.Rush/.claude/plugins/cache/applied-claude-marketplace/epic-feature-flag/1.2.0/bin:/c/Users/John.Rush/.claude/plugins/cache/applied-claude-marketplace/epic-help-mcp/2.1.0/bin:/c/Users/John.Rush/.claude/plugins/cache/applied-claude-marketplace/epic-mcps-api-catalog-mcp/1.3.0/bin'
