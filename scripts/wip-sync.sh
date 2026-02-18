#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  scripts/wip-sync.sh -m "your message" [options]

Options:
  -m, --message <msg>   Commit message (required)
  -b, --branch <name>   Branch to push (default: current branch)
  -r, --remote <name>   Remote to push to (default: origin)
  -a, --all             Stage all tracked + untracked files (git add -A)
  -n, --no-push         Commit only, do not push
  -h, --help            Show this help

Examples:
  scripts/wip-sync.sh -m "wip: recovery flow"
  scripts/wip-sync.sh -m "wip: AC2 fix" -a
  scripts/wip-sync.sh -m "wip: startup gate" -b wip/darko -r origin
EOF
}

MESSAGE=""
BRANCH=""
REMOTE="origin"
DO_ADD_ALL=0
NO_PUSH=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    -m|--message)
      MESSAGE="${2:-}"
      shift 2
      ;;
    -b|--branch)
      BRANCH="${2:-}"
      shift 2
      ;;
    -r|--remote)
      REMOTE="${2:-}"
      shift 2
      ;;
    -a|--all)
      DO_ADD_ALL=1
      shift
      ;;
    -n|--no-push)
      NO_PUSH=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$MESSAGE" ]]; then
  echo "Commit message is required." >&2
  usage
  exit 1
fi

git rev-parse --is-inside-work-tree >/dev/null

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$CURRENT_BRANCH" == "HEAD" ]]; then
  echo "Detached HEAD. Please checkout a branch first." >&2
  exit 1
fi

if [[ -z "$BRANCH" ]]; then
  BRANCH="$CURRENT_BRANCH"
fi

if [[ "$DO_ADD_ALL" -eq 1 ]]; then
  git add -A
fi

if git diff --cached --quiet && git diff --quiet; then
  echo "No changes to commit."
  exit 0
fi

if git diff --cached --quiet; then
  echo "No staged changes. Stage files first, or use --all." >&2
  exit 1
fi

git commit -m "$MESSAGE"

if [[ "$NO_PUSH" -eq 1 ]]; then
  echo "Committed locally on $CURRENT_BRANCH. Push skipped (--no-push)."
  exit 0
fi

if ! git remote get-url "$REMOTE" >/dev/null 2>&1; then
  echo "Remote '$REMOTE' not found." >&2
  exit 1
fi

if [[ "$BRANCH" == "$CURRENT_BRANCH" ]]; then
  git push "$REMOTE" "$CURRENT_BRANCH"
else
  git push "$REMOTE" "$CURRENT_BRANCH:$BRANCH"
fi

echo "Synced: $CURRENT_BRANCH -> $REMOTE/$BRANCH"
