#!/usr/bin/env bash
# Auto-Deploy auf node1: holt main, installiert deps nur bei Änderung, restartet
# den Dienst. Wird vom systemd-Timer tmda-deploy.timer (stündlich) aufgerufen.
# .env und node_modules sind gitignored → bleiben bei git reset erhalten.
set -euo pipefail

APP_DIR=/home/admin/tmda-wiki
cd "$APP_DIR"
export PATH="$HOME/.bun/bin:$PATH"

BEFORE=$(git rev-parse HEAD)
git fetch --quiet origin main
git reset --hard --quiet origin/main
AFTER=$(git rev-parse HEAD)

if [ "$BEFORE" = "$AFTER" ]; then
  echo "no changes ($AFTER)"
  exit 0
fi

echo "changes: $BEFORE -> $AFTER"
bun install --production 2>&1 | tail -2
sudo systemctl restart tmda-web
echo "deployed + restarted"
