#!/usr/bin/env bash
#
# setup-cloud-workspace.sh — reconstruct the full Lyndrix multi-repo workspace.
#
# Why this exists
# ---------------
# A Claude-Code-on-the-web session starts from a fresh clone of ONE repo
# (lyndrix-ui). The Lyndrix hardening / React-in-core plan, however, spans the
# whole platform: lyndrix-core plus the plugin repos. This script clones those
# siblings next to lyndrix-ui so a session sees the same workspace layout we
# develop against locally (~/gitlab/lyndrix-dev/<repo>).
#
# How to use it
# -------------
#   Cloud (recommended): in the environment's "Setup script" (Environment
#   settings → Setup script — runs once as root, result is filesystem-cached),
#   paste a single line:
#
#       bash "$(dirname "$0")/scripts/setup-cloud-workspace.sh"   # if run from repo root
#       # …or just clone+run it; see the inline one-liner in README/PR notes.
#
#   Local: running it is a no-op — every sibling already exists, so each repo
#   is skipped. Safe to run anywhere; it is idempotent.
#
# Preconditions (cloud)
#   * Network access set to "Trusted" or higher (so it can reach GitHub).
#   * The session's GitHub credentials grant READ on the sibling repos. They all
#     live under the same org/install as lyndrix-ui, so this is automatic when
#     the GitHub App is installed org-wide.
#
# Configuration (env vars — all optional, sensible defaults below)
#   ORG       GitHub org/owner.                 default: lyndrix-platform
#   BASE_URL  Clone base.                        default: https://github.com/$ORG
#             For SSH: BASE_URL="git@github.com:$ORG"
#   DEPTH     If set (e.g. DEPTH=1), shallow-clone to that depth for speed.
#   WORKSPACE Target parent dir.                 default: parent of this repo.
#
set -euo pipefail

ORG="${ORG:-lyndrix-platform}"
BASE_URL="${BASE_URL:-https://github.com/${ORG}}"

# Resolve the repo root from this script's location, then its parent = workspace.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"        # lyndrix-ui/
WORKSPACE="${WORKSPACE:-$(dirname "${REPO_ROOT}")}"  # parent that holds all repos

# Sibling repos to clone (the seed repo, lyndrix-ui, is already present and omitted).
# NOTE: `lyndrix-dev` is NOT a repo — it is the workspace container directory.
REPOS=(
  lyndrix-core                       # Python FastAPI + NiceGUI backend
  lyndrix-homepage                   # Astro marketing site
  lyndrix-plugin-collection          # plugin registry metadata
  lyndrix-plugin-docker-manager      # React plugin
  lyndrix-plugin-monitoring          # React plugin
  lyndrix-plugin-discord-notifier    # NiceGUI plugin
  lyndrix-plugin-external-services   # NiceGUI plugin
  lyndrix-plugin-iac-orchestrator    # NiceGUI plugin
  lyndrix-plugin-meeting-bingo       # NiceGUI plugin
  lyndrix-plugin-server-manager      # NiceGUI plugin
)

CLONE_ARGS=()
[ -n "${DEPTH:-}" ] && CLONE_ARGS+=(--depth "${DEPTH}")

echo "Lyndrix workspace setup"
echo "  org:       ${ORG}"
echo "  base:      ${BASE_URL}"
echo "  workspace: ${WORKSPACE}"
echo

cloned=0 skipped=0 failed=0
for repo in "${REPOS[@]}"; do
  dest="${WORKSPACE}/${repo}"
  if [ -d "${dest}/.git" ]; then
    echo "  = ${repo} (already present, skipping)"
    skipped=$((skipped + 1))
    continue
  fi
  echo "  + cloning ${repo} …"
  if git clone "${CLONE_ARGS[@]}" "${BASE_URL}/${repo}.git" "${dest}"; then
    cloned=$((cloned + 1))
  else
    echo "  ! FAILED to clone ${repo} — check org name, auth, and network trust." >&2
    failed=$((failed + 1))
  fi
done

echo
echo "Done. cloned=${cloned} skipped=${skipped} failed=${failed}"
# lyndrix-core develops on the 'dev' branch; git clone checks out the remote
# default. If core lands on 'main', switch with:  git -C "${WORKSPACE}/lyndrix-core" checkout dev
[ "${failed}" -eq 0 ] || exit 1
