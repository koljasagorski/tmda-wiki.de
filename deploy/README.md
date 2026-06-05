# Deploy: node1 (Pull-Modell)

node1 zieht den aktuellen Stand selbst von **GitHub `main`** und deployt automatisch.
Team-Flow: alle arbeiten über PRs auf GitHub. Was in `main` gemerged wird, ist nach
spätestens einem Timer-Intervall (**2 Min**) live. Kein inbound-Port, keine Secrets,
kein CI-Runner nötig.

```
GitHub main ──(git fetch/reset, alle 2 Min)──▶ node1:/home/admin/tmda-wiki
                                                  └─ scripts/node1-deploy.sh
                                                       └─ systemctl restart tmda-web
```

## Dateien
- `scripts/node1-deploy.sh` — fetch + `reset --hard origin/main`, deps nur bei Lockfile-Änderung, restart nur bei Änderung. Mit `flock` (kein Überlappen) und Log nach `~/tmda-deploy.log`.
- `deploy/tmda-deploy.service` — oneshot, ruft das Script als User `admin`.
- `deploy/tmda-deploy.timer` — alle 2 Min.

`.env` und `node_modules` sind gitignored und überleben `git reset --hard`.

## Einmalig auf node1 installieren / aktualisieren

SSH in die App-VM (siehe `MIGRATE-TO-NODE1.md`), dann:

```bash
cd /home/admin/tmda-wiki
git fetch origin main && git reset --hard origin/main   # neueste Deploy-Dateien holen
chmod +x scripts/node1-deploy.sh

# Units aus dem Repo übernehmen (Single Source of Truth)
sudo cp deploy/tmda-deploy.service /etc/systemd/system/tmda-deploy.service
sudo cp deploy/tmda-deploy.timer   /etc/systemd/system/tmda-deploy.timer
sudo systemctl daemon-reload
sudo systemctl enable --now tmda-deploy.timer

# sudo-Restart ohne Passwort erlauben (falls noch nicht eingerichtet):
echo 'admin ALL=(root) NOPASSWD: /bin/systemctl restart tmda-web' | sudo tee /etc/sudoers.d/tmda-deploy
sudo chmod 440 /etc/sudoers.d/tmda-deploy
```

## Prüfen, ob node1 aktuell ist

```bash
systemctl list-timers tmda-deploy.timer       # nächster/letzter Lauf
journalctl -u tmda-deploy.service -n 20        # letzte Deploys
tail -n 20 ~/tmda-deploy.log                    # Deploy-Historie
git -C /home/admin/tmda-wiki rev-parse HEAD     # aktiver Commit auf node1
```

Vergleiche den letzten Wert mit `git rev-parse origin/main` lokal / auf GitHub —
gleich = node1 ist aktuell.

## Sofort deployen (ohne auf den Timer zu warten)

```bash
sudo systemctl start tmda-deploy.service        # oder direkt:
/home/admin/tmda-wiki/scripts/node1-deploy.sh
```

## Optional: Instant-Deploy bei Push (statt 2-Min-Polling)
Wenn es wirklich sofort sein muss, ginge ein GitHub-Actions-Workflow `on: push: [main]`,
der per SSH (ProxyJump über `65.109.54.113`) `node1-deploy.sh` triggert. Braucht aber
einen Deploy-SSH-Key als GitHub-Secret und SSH-Erreichbarkeit der VM. Für ein Hobby-Wiki
ist das 2-Min-Polling einfacher und sicherer — daher hier der Default.
