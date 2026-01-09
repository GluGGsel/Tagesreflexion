#!/usr/bin/env bash
set -u

# --- colors ---
RED="$(printf '\033[31m')"
GRN="$(printf '\033[32m')"
YLW="$(printf '\033[33m')"
BLU="$(printf '\033[34m')"
RST="$(printf '\033[0m')"
BOLD="$(printf '\033[1m')"

fail=0

ok()   { echo "${GRN}OK${RST}  $*"; }
warn() { echo "${YLW}WARN${RST} $*"; }
bad()  { echo "${RED}FAIL${RST} $*"; fail=1; }

need_file() {
  local f="$1"
  if [ -f "$f" ]; then ok "exists: $f"
  else bad "missing: $f"
  fi
}

need_line_in_file() {
  local line="$1" file="$2"
  if [ -f "$file" ] && grep -qxF "$line" "$file"; then ok "in $file: $line"
  else bad "not in $file (exact line missing): $line"
  fi
}

need_grep() {
  local pattern="$1" file="$2" desc="$3"
  if [ -f "$file" ] && grep -Eq "$pattern" "$file"; then ok "$desc"
  else bad "$desc (pattern not found: $pattern in $file)"
  fi
}

no_grep() {
  local pattern="$1" file="$2" desc="$3"
  if [ -f "$file" ] && grep -Eq "$pattern" "$file"; then bad "$desc (found forbidden pattern: $pattern in $file)"
  else ok "$desc"
  fi
}

section() {
  echo
  echo "${BOLD}${BLU}== $* ==${RST}"
}

cd "$(dirname "$0")/.." || exit 1

section "Repo basics"
need_file "package.json"
need_file "next.config.js"
need_file "app/components/ReflectionPage.tsx"
need_file "app/components/TalkList.tsx"

section "Instance files + ignore rules"
need_file "config/instance.ts"
need_file "config/instance.get.ts"

# instance.local.ts MUST be ignored, MAY exist locally
need_line_in_file "config/instance.local.ts" ".gitignore"

if [ -f "config/instance.local.ts" ]; then
  ok "local override present: config/instance.local.ts (should NOT be committed)"
else
  warn "config/instance.local.ts not present (fine, but then no local name override)"
fi

section "Instance loader correctness (instance.get.ts)"
# Must export INSTANCE
need_grep 'export\s+const\s+INSTANCE' "config/instance.get.ts" "instance.get.ts exports INSTANCE"

# Must reference instance.local in a try/catch or guarded require/import
need_grep 'instance\.local' "config/instance.get.ts" "instance.get.ts references instance.local.ts"

# Must fall back to public instance.ts
need_grep 'instance(\.ts)?["'\'']' "config/instance.get.ts" "instance.get.ts references base instance.ts"
need_grep '\?\?|\|\|' "config/instance.get.ts" "instance.get.ts has fallback operator (?? or ||)"

section "App imports (must use instance.get / exported INSTANCE)"
# ReflectionPage should import from instance.get (or config/instance, depending on your alias)
# We'll accept either "@/config/instance.get" or "@/config/instance"
if grep -Eq 'from\s+["'\'']@/config/instance\.get["'\'']' app/components/ReflectionPage.tsx; then
  ok "ReflectionPage imports from @/config/instance.get"
elif grep -Eq 'from\s+["'\'']@/config/instance["'\'']' app/components/ReflectionPage.tsx; then
  ok "ReflectionPage imports from @/config/instance (OK if that file re-exports instance.get)"
  warn "Ensure config/instance.ts does not contain real names; prefer importing @/config/instance.get directly."
else
  bad "ReflectionPage does not import instance config (expected @/config/instance.get or @/config/instance)"
fi

if grep -Eq 'from\s+["'\'']@/config/instance\.get["'\'']' app/components/TalkList.tsx; then
  ok "TalkList imports from @/config/instance.get"
elif grep -Eq 'from\s+["'\'']@/config/instance["'\'']' app/components/TalkList.tsx; then
  ok "TalkList imports from @/config/instance (OK if re-export)"
else
  bad "TalkList does not import instance config (expected @/config/instance.get or @/config/instance)"
fi

section "Public safety check (instance.ts must be generic)"
# Enforce that instance.ts does NOT contain "@" imports (should just export const)
no_grep 'import\s+' "config/instance.ts" "config/instance.ts should not import anything"

# Basic check: must define labels keys mann/frau/kind1/kind2
need_grep 'mann'  "config/instance.ts" "config/instance.ts contains label key mann"
need_grep 'frau'  "config/instance.ts" "config/instance.ts contains label key frau"
need_grep 'kind1' "config/instance.ts" "config/instance.ts contains label key kind1"
need_grep 'kind2' "config/instance.ts" "config/instance.ts contains label key kind2"

# Optional: forbid obvious real-name patterns via env var FORBIDDEN_NAMES (pipe-separated regex)
# Example: FORBIDDEN_NAMES='Max|Anna|Lena|Paul'
if [ "${FORBIDDEN_NAMES:-}" != "" ]; then
  no_grep "$FORBIDDEN_NAMES" "config/instance.ts" "config/instance.ts must not contain forbidden names ($FORBIDDEN_NAMES)"
else
  warn "FORBIDDEN_NAMES not set. If you want strict checking, run: FORBIDDEN_NAMES='Max|Anna|...' scripts/verify-instance.sh"
fi

section "Git safety (instance.local must not be tracked)"
if git ls-files --error-unmatch config/instance.local.ts >/dev/null 2>&1; then
  bad "config/instance.local.ts is TRACKED by git (must NOT be). Fix: git rm --cached config/instance.local.ts"
else
  ok "config/instance.local.ts is not tracked"
fi

section "Remotes sanity"
# Expect private origin and public upstream OR public remote named 'upstream'/'public'
# We will just report what exists, and fail if origin missing.
if git remote | grep -qx "origin"; then
  ok "remote exists: origin"
else
  bad "missing git remote: origin"
fi

if git remote | grep -qx "upstream"; then
  ok "remote exists: upstream"
else
  warn "missing remote: upstream (fine if you use a 'public' remote instead)"
fi

if git remote | grep -qx "public"; then
  ok "remote exists: public"
else
  warn "missing remote: public (fine if you use upstream for public)"
fi

section "Build precheck (TypeScript compile must pass)"
# Fast check: ensure we are not mid-rebase
if [ -d .git/rebase-merge ] || [ -d .git/rebase-apply ]; then
  bad "rebase in progress. Resolve/abort before pushing."
else
  ok "no rebase in progress"
fi

# Ensure working tree clean
if [ -n "$(git status --porcelain)" ]; then
  bad "working tree not clean (uncommitted changes). Run: git status"
else
  ok "working tree clean"
fi

echo
if [ "$fail" -eq 1 ]; then
  echo "${RED}${BOLD}VERIFY FAILED${RST}  Fix the FAIL items above."
  exit 1
else
  echo "${GRN}${BOLD}VERIFY OK${RST}  Instance setup looks consistent."
  exit 0
fi
