#!/usr/bin/env bash
# Auto-Deploy auf node1 (Pull-Modell): holt den aktuellen Stand von GitHub-main,
# installiert deps nur wenn sich package.json/Lockfile geändert haben, und
# restartet den Dienst nur bei tatsächlichen Änderungen.
#
# Aufgerufen vom systemd-Timer tmda-deploy.timer (siehe deploy/). Team-Flow:
# alle arbeiten über GitHub-PRs — was in main gemerged wird, ist nach einem
# Timer-Intervall automatisch auf node1 live. Kein inbound, keine Secrets.
#
# .env und node_modules sind gitignored → bleiben bei `git reset --hard` erhalten.
set -euo pipefail

APP_DIR=/home/admin/tmda-wiki
LOG=/home/admin/tmda-deploy.log
export PATH="$HOME/.bun/bin:$PATH"

# Nur eine Deploy-Instanz gleichzeitig — verhindert, dass ein langsamer Lauf
# (bun install) sich mit dem nächsten Timer-Tick überschneidet.
exec 9>/tmp/tmda-deploy.lock
flock -n 9 || { echo "$(date -Is) skip: deploy läuft bereits"; exit 0; }

cd "$APP_DIR"

BEFORE=$(git rev-parse HEAD)
git fetch --quiet --prune origin main
git reset --hard --quiet origin/main
AFTER=$(git rev-parse HEAD)

if [ "$BEFORE" = "$AFTER" ]; then
  exit 0   # nichts Neues — still und leise raus (kein Log-Spam pro Tick)
fi

echo "$(date -Is) changes: $BEFORE -> $AFTER" | tee -a "$LOG"

# Deps nur neu installieren, wenn sich package.json oder ein Lockfile geändert hat.
if ! git diff --quiet "$BEFORE" "$AFTER" -- package.json package-lock.json bun.lockb 2>/dev/null; then
  echo "$(date -Is) deps geändert → bun install" | tee -a "$LOG"
  bun install --production 2>&1 | tail -2 | tee -a "$LOG"
fi

sudo systemctl restart tmda-web
echo "$(date -Is) deployed + restarted @ $AFTER" | tee -a "$LOG"
