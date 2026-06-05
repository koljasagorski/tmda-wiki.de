# Migration-Playbook → Proxmox `node1.sagorski.it`

> **Zweck:** Diese Datei ist ein **eigenständiger Runbook für Claude Code**, um einen Dienst aus
> einem *anderen* Projekt (das aktuell auf **Hetzner Cloud** und/oder **Cloudflare Workers** läuft)
> auf den dedizierten Proxmox-Server `node1.sagorski.it` umzuziehen.
>
> **So benutzt du sie in einem anderen Projekt:**
> 1. Diese Datei ins Ziel-Repo kopieren **oder** in dessen `CLAUDE.md` referenzieren:
>    `Für Deployment/Migration siehe /Users/koljasagorski/Documents/GitHub/node1.sagorski.it/MIGRATE-TO-NODE1.md`
> 2. Claude Code anweisen: „Migriere diesen Dienst nach node1 gemäß MIGRATE-TO-NODE1.md".
> 3. Claude arbeitet die passende Migrations-Sektion ab und hält an den **CHECKPOINTS** an.

---

## 0. Harte Regeln (NICHT überspringen)

1. **WAN nicht anfassen.** Die Host-NIC `enp41s0` (Haupt-IP `65.109.54.113`) und die Default-Route bleiben unverändert. Es gibt **kein `vmbr0`** — das ist Absicht.
2. **Vor jeder Netz-/Firewall-Änderung am Host** zuerst Auto-Revert setzen (`at`-Job, siehe §7) und KVM-Konsole bereithalten. **Normalerweise braucht ein neuer Dienst aber KEINE Host-Netz-Änderung** (Ingress läuft schon über Caddy, siehe §3).
3. **Vor jedem Datei-Edit ein Backup:** `cp datei datei.bak.$(date +%s)`.
4. **Nach jeder Änderung verifizieren.** Schlägt fehl → STOP, Zustand melden, nichts weiter ändern.
5. **An jedem CHECKPOINT anhalten** und auf Freigabe warten (neue VM starten ist ok; Host-Netz/Firewall/Reboot = Freigabe nötig).
6. **Idempotent** arbeiten: erst Ist-Zustand prüfen (VMID/IP frei? Dienst schon da?), dann nur bei Bedarf ändern.
7. **Keine destruktiven Aktionen** am Host (Storage, Netz, andere VMs) ohne explizite Rückfrage.

---

## 1. Server-Fakten

| | |
|---|---|
| Hostname / Haupt-IP | `node1.sagorski.it` / `65.109.54.113` (IPv6 `2a01:4f9:5a:2be4::2`) |
| Hardware | AMD Ryzen 5 3600 (12 Threads), 62 GiB RAM, 2× 477 GB NVMe (mdadm RAID1) |
| OS / Virt | Proxmox VE 9.2.x (Debian 13 Trixie) |
| Host-WAN-NIC | `enp41s0` (Haupt-IP direkt drauf, **kein vmbr0**) |
| Internes Netz | `vmbr1` = `10.10.10.0/24`, Host-Gateway `10.10.10.1` |
| Internet f. VMs | NAT/MASQUERADE `10.10.10.0/24 → enp41s0` (nur IPv4) |
| Storage VM-Disks | `local-lvm` (LVM-thin, ~377 GB) |
| Storage ISOs/Backups | `local` (dir, auf 100 GB Root — klein!) |
| VM-Template | VMID **9000** `tmpl-debian12` (Debian 12 cloud-init) |
| Reverse-Proxy-VM | VMID **101** `proxy` = `10.10.10.2`, Caddy v2.11.x |
| HTTP(S)-Ingress | Host `:80/:443` → **DNAT** → `10.10.10.2` (Caddy) → reverse_proxy zur Dienst-VM |

### Zugang (SSH)
```bash
# Vom Laptop -> Proxmox-Host (key-only, root):
ssh -i ~/.ssh/lead_proxmox root@65.109.54.113
#   (Alternativ-Key: ~/.ssh/id_ed25519)

# Vom Host -> interne VM (admin, Proxmox-Root-Key liegt in den VM-authorized_keys):
ssh -i /root/.ssh/id_rsa admin@10.10.10.<X>

# Vom Laptop direkt auf eine interne VM (Sprung über den Host):
ssh -i ~/.ssh/lead_proxmox -J root@65.109.54.113 admin@10.10.10.<X>

# Proxmox Web-UI (8006 ist von außen geblockt -> SSH-Tunnel):
ssh -i ~/.ssh/lead_proxmox -L 8006:localhost:8006 -N root@65.109.54.113
#   dann https://localhost:8006  (Realm: Linux PAM, User root)
```
> Hetzner-Robot-Firewall lässt nur 22/80/443 durch. **Keine neuen Ports öffnen** — alles Web läuft über 80/443 + Caddy.

---

## 2. Service- & IP-Register (beim Anlegen pflegen!)

Claude **muss** vor dem Klonen prüfen, welche VMID/IP frei ist (`qm list`, `ssh ... ip neigh`), und diese Tabelle nach dem Anlegen aktualisieren.

| VMID | Name | interne IP | Tags | Domain(s) | Port | Zweck |
|------|------|-----------|------|-----------|------|-------|
| 9000 | tmpl-debian12 | – | – | – | – | Template (nicht starten) |
| 101  | proxy | 10.10.10.2 | `role-proxy` | (alle, via Caddy) | 80/443 | Reverse Proxy (Caddy) |
| 160  | tmda-web | 10.10.10.70 | `proj-tmda,role-web,env-prod` | tmda-wiki.de | 3000 | TMDA-Wiki (Bun, migriert von CF Workers; Chat via Groq) |
| _110+_ | _`acme-web` …_ | _10.10.10.20+_ | _`proj-acme,role-web,env-prod`_ | | | _neue Dienste hier eintragen_ |

**Konventionen:** Dienst-VMs ab **VMID 110**, interne IPs ab **10.10.10.20**. DB-VMs separat (z.B. 10.10.10.30+).

### 2.1 Namens- & Tagging-Konvention (pro Projekt EINHEITLICH — Pflicht)

Ziel: **Zusammengehörige VMs eines Projekts sofort erkennen** — im Web-UI (farbige Tags, Gruppierung)
und auf der CLI (`qm list`, `pct list`, `docker ps`).

**1) VM-Name = `<projekt>-<rolle>[-<env>]`** (lowercase, kebab-case). Alle VMs eines Projekts teilen
denselben **`<projekt>-`-Präfix**:
```
acme-web        acme-api        acme-db        acme-redis      acme-worker
foo-web         foo-db          foo-minio
```
Rollen-Vokabular (einheitlich verwenden): `web · api · worker · db · cache · redis · minio · search · cron`.
Ausnahmen behalten ihren Namen: `proxy` (Caddy), `tmpl-*` (Templates).

**2) VMID-Block pro Projekt** (10er-Block, hält IDs beieinander):
`acme` = 110–119 · `foo` = 120–129 · usw. Gleiches optional für IP-Sub-Range:
`acme` = 10.10.10.20–29 · `foo` = 10.10.10.30–39.

**3) Proxmox-Tags** an JEDER VM setzen (PVE-Tag-Feature) — mindestens Projekt, Rolle, Env:
```bash
qm set <VMID> --tags proj-<projekt>,role-<rolle>,env-<prod|staging>
# Beispiel:
qm set 110 --tags proj-acme,role-web,env-prod
```
> Tipp (einmalig, mit Kolja): im Web-UI *Datacenter → Options → Tag Style* feste **Farben pro
> `proj-*`-Tag** vergeben und *Tree → Sort/Group by Tag* aktivieren → ein Projekt = eine Farbe/Gruppe.

**4) Docker INNERHALB einer VM** (falls genutzt): Compose-**Projektname = `<projekt>`** setzen
(`name: <projekt>` in der compose.yaml oder `-p <projekt>`), Container-/Service-Namen `<projekt>-<service>`,
zusätzlich Labels `project=<projekt>`. So gruppiert `docker ps` automatisch zusammengehörige Container.

> **Register-Pflicht:** Neue VMs mit Name **und Tags** in die Tabelle oben eintragen.

---

## 3. Standard-Rezept: neuen Dienst auf node1 landen

Das ist der **Kern** — die meisten Migrationen enden hier. Kein Host-Netz-Eingriff nötig.

### 3.1 Dienst-VM aus Template klonen (auf dem Host)
```bash
# Konvention (§2.1): Name=<projekt>-<rolle>, VMID im Projekt-Block, Tags setzen
PROJ=acme; ROLE=web; ENV=prod
VMID=110; NAME=$PROJ-$ROLE; IP=10.10.10.20
qm clone 9000 $VMID --name $NAME --full
qm set  $VMID --ipconfig0 ip=$IP/24,gw=10.10.10.1 --onboot 1
qm set  $VMID --tags proj-$PROJ,role-$ROLE,env-$ENV         # einheitliches Tagging (Pflicht)
# optional mehr Ressourcen: --memory 4096 --cores 4
# optional größere Disk: qm disk resize $VMID scsi0 +20G
qm start $VMID
# warten bis erreichbar:
until ping -c1 -W2 $IP >/dev/null 2>&1; do sleep 3; done
ssh -i /root/.ssh/id_rsa -o StrictHostKeyChecking=accept-new admin@$IP 'cloud-init status --wait; echo VM-ready'
```
Die VM hat: User `admin` (passwordless sudo), beide SSH-Keys + Host-Root-Key, DNS `1.1.1.1`, Internet via NAT.

### 3.2 Dienst in der VM installieren
SSH in die VM (`admin@$IP`), Laufzeitumgebung + App installieren. Als Daemon via **systemd** einrichten (nicht im Vordergrund), Dienst soll auf `0.0.0.0:<PORT>` (oder `10.10.10.X:<PORT>`) lauschen. Daten/Secrets via `.env` oder systemd `EnvironmentFile` (Datei `chmod 600`, **nie ins Repo committen**).

**`qemu-guest-agent`:** Das Template 9000 installiert ihn **automatisch beim ersten Boot** (Cloud-Init-Vendor-Snippet `local:snippets/qga-vendor.yaml`). Nach dem Start vom Host prüfen: `qm agent <VMID> ping` (sollte antworten → Proxmox sieht die VM-IP, sauberes Shutdown, **konsistente Backups** via fs-freeze). Falls eine VM mal NICHT aus dem Template stammt, manuell nachinstallieren:
```bash
sudo apt-get update -qq && sudo apt-get install -y -qq qemu-guest-agent && sudo systemctl enable --now qemu-guest-agent
```

### 3.3 In Caddy veröffentlichen (TLS automatisch)
Auf der Proxy-VM (`admin@10.10.10.2`) einen Block in `/etc/caddy/Caddyfile` ergänzen — **erst Backup**:
```bash
sudo cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.bak.$(date +%s)
# Block hinzufügen (globale ACME-Mail + (secure_headers)-Snippet sind oben in der Caddyfile schon definiert):
#   dienst.sagorski.it {
#       import secure_headers
#       reverse_proxy 10.10.10.20:3000
#   }
sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
sudo systemctl reload caddy
```
> Caddy zieht automatisch ein **Let's-Encrypt-Zertifikat** (ACME HTTP-01 über das schon vorhandene DNAT :80). **Voraussetzung:** Der A-Record der Domain zeigt auf `65.109.54.113` **und** ist (falls über Cloudflare) auf **„DNS only" (graue Wolke)** gestellt — sonst siehe §5.4 (Cloudflare-Proxy / DNS-01).

### 3.4 DNS setzen (manuell, durch Kolja)
`A <dienst>.sagorski.it → 65.109.54.113`. Prüfen: `dig +short <dienst>.sagorski.it` = `65.109.54.113`.

### 3.5 Verifizieren
```bash
curl -I https://<dienst>.sagorski.it           # 200/301 + gültiges TLS
curl -sI https://<dienst>.sagorski.it | grep -i server   # Server: Caddy
```
**CHECKPOINT:** Ergebnis melden, Service-Register (§2) aktualisieren.

---

## ⭐ Datenmigration: ALLES übertragen (Querschnitt — Pflicht vor Cutover & Löschung)

> **Grundsatz:** Eine Migration ist **erst dann fertig**, wenn **jeder persistente Zustand**
> übertragen **und verifiziert** ist. **Niemals** eine Quelle abschalten/löschen (§9), solange
> irgendwelche Daten nur dort liegen. Stateless wirkende Dienste haben oft trotzdem Daten
> (Uploads, Sessions, Caches mit Inhalt, Secrets) — **explizit prüfen**.

### Was alles mit muss (Checkliste — pro Dienst durchgehen)
- [ ] **Relationale DBs:** PostgreSQL, MySQL/MariaDB (Schema **+ Daten** + Sequences/Rollen/Grants).
- [ ] **Embedded/NoSQL:** SQLite-Dateien, MongoDB, CouchDB …
- [ ] **Key-Value / Cache mit Datenwert:** Redis/Valkey, **Cloudflare KV** (≠ wegwerfbar, wenn als Datenspeicher genutzt).
- [ ] **Objekt-/Blob-Storage:** **R2 / S3**, hochgeladene Dateien, `/uploads`, Medien, Avatare.
- [ ] **Message Queues / Streams:** unverarbeitete Jobs (Cloudflare Queues, BullMQ, NATS …).
- [ ] **Suchindizes:** Elasticsearch/Meilisearch/Typesense — meist neu aufbaubar, aber **bewusst** entscheiden.
- [ ] **Secrets / Env / Zertifikate / Lizenzdateien.**
- [ ] **Cron-/Scheduler-Zustand**, App-Configs, statische Assets.
- [ ] **Aufbewahrungspflichtige Logs/Audit-Daten** (falls relevant).

### Methoden (Beispiele)
| Quelle | Export → Import |
|---|---|
| PostgreSQL | `pg_dump -Fc db` → `pg_restore -d db` (near-zero-downtime: logical replication) |
| MySQL/MariaDB | `mysqldump --single-transaction --routines --triggers db` → `mysql db < dump.sql` |
| SQLite | im Stillstand Datei kopieren, oder `sqlite3 src ".backup dst"` |
| MongoDB | `mongodump` → `mongorestore` |
| Redis/Valkey | RDB/AOF kopieren, oder `redis-cli --rdb dump.rdb` |
| Dateien/Volumes | `rsync -avz -e 'ssh -J root@65.109.54.113' src/ admin@10.10.10.X:/dst/` |
| R2 / S3 | `rclone sync` bzw. MinIO `mc mirror` (Endpoint danach in der App umbiegen) |
| Cloudflare D1 | `wrangler d1 export <db> --output dump.sql` → in Ziel-DB einspielen |
| Cloudflare KV | `wrangler kv key list` + bulk `get`/`put` → Redis/SQLite |

### Strategie für minimale Downtime
1. **Initial-Sync** der Daten zur Ziel-VM (im laufenden Betrieb).
2. Quelle in **Read-only/Wartungsmodus** schalten.
3. **Delta-Sync** (nur Änderungen seit Initial-Sync).
4. **Cutover** (DNS/Caddy auf node1), dann verifizieren.

### Verifikation (Pflicht, bevor §9 greift)
- [ ] **Row-Counts** je Tabelle Quelle ↔ Ziel vergleichen (`SELECT count(*)`).
- [ ] **Objekt-Anzahl + Gesamtgröße** je Bucket vergleichen.
- [ ] **Stichproben/Checksums** kritischer Datensätze.
- [ ] **App-Funktionstest** gegen die migrierten Daten (Login, Lesen, Schreiben).
- [ ] Abweichung → **STOP**, nicht weiter Richtung Cutover/Löschung.

---

## 4. Migration von **Hetzner Cloud** → node1

Eine Hetzner-Cloud-Instanz ist meist ein Linux-Server (oft mit Docker/Compose oder einer App). Umzug = als Proxmox-VM nachbauen, Daten rüberziehen, DNS umbiegen.

### Checkliste
- [ ] **Inventar der Quelle:** Welche Dienste/Ports? Docker-Compose? DB? Persistente Volumes? Cron? Env/Secrets? TLS bisher (Cloud-LB / certbot / Cloudflare)?
- [ ] **Ziel-VM** nach §3.1 anlegen (Ressourcen an der Quelle orientieren).
- [ ] **Laufzeit installieren:**
  - Docker-basiert → in der VM `apt install docker.io docker-compose-plugin`, `docker-compose.yml` + `.env` übernehmen.
  - Native App → Runtime (Node/Python/…) + systemd-Unit.
- [ ] **Daten vollständig migrieren** → Abschnitt „⭐ Datenmigration" (DBs, Volumes, Objektspeicher, Caches, Uploads, Secrets — inkl. Verifikation). DB-Dump (`pg_dump`/`mysqldump`) + Dateien (`rsync -avz -e 'ssh -J root@65.109.54.113'`).
- [ ] **Smoke-Test intern** in der VM (`curl localhost:<port>`).
- [ ] **Caddy-Block** + **DNS A-Record** umstellen (§3.3/§3.4). Cutover mit niedrigem TTL planen.
- [ ] **Floating IP / Cloud-LB** entfällt → durch Caddy ersetzt.
- [ ] **CHECKPOINT** vor DNS-Cutover und vor dem Abschalten der Cloud-Instanz.
- [ ] Quelle erst nach erfolgreicher Verifikation + (idealerweise) erstem Backup abschalten.
- [ ] **Nach Beobachtungsfenster: alte Cloud-Instanz + Ressourcen löschen → siehe §9.**

---

## 5. Migration von **Cloudflare Workers** → node1

Workers sind Edge-Serverless (V8-Isolates). Es gibt kein 1:1 — man hostet das **Äquivalent** als langlaufenden Dienst auf einer VM hinter Caddy. Aufwand hängt stark von genutzten Bindings ab.

### 5.1 Quelle analysieren (zuerst!)
- [ ] `wrangler.toml`/`wrangler.jsonc` lesen: **Bindings** (KV, D1, R2, Durable Objects, Queues, Vectorize, AI), **Cron Triggers**, **Routes/Custom Domains**, **Secrets/Vars**, **compatibility_flags**.
- [ ] Framework? **Hono / itty-router** portieren leicht; reiner `fetch`-Handler ebenso. **Durable Objects / WebSockets-Coordination** = aufwändig (Statefulness neu denken).

### 5.2 Laufzeit auf der VM wählen
- **Node.js** oder **Bun** als HTTP-Server (empfohlen, wenn die App Hono nutzt — läuft ohne Umbau auf Node/Bun). Als systemd-Dienst auf `:<PORT>`.
- Alternativ **`workerd`** (Cloudflares Open-Source-Runtime) auf der VM, wenn man möglichst nah am Worker-Verhalten bleiben will.
- Hinter **Caddy** wie in §3.3.

### 5.3 Bindings → selbst-gehostete Äquivalente
| Cloudflare | Ersatz auf node1 | Hinweis |
|---|---|---|
| **KV** | Redis / Valkey, oder SQLite | Key-Value; Redis auf eigener VM |
| **D1** (SQLite) | SQLite-Datei in der VM, oder PostgreSQL-VM | API-Layer anpassen |
| **R2** (S3) | **MinIO** (S3-kompatibel) auf eigener VM | S3-SDK-Endpoint umbiegen |
| **Durable Objects** | stateful Node-Prozess + Persistenz / Postgres-Advisory-Locks | architektonisch am teuersten |
| **Queues** | Redis+BullMQ / NATS | |
| **Cron Triggers** | **systemd-Timer** (oder cron) in der VM | `OnCalendar=` |
| **Secrets / Vars** | `.env` / systemd `EnvironmentFile` / cloud-init | nie ins Repo committen |
| **Vectorize / Workers AI** | self-hosted (pgvector, Ollama) oder extern lassen | je nach Bedarf |
| **Cache API** | Caddy-Cache / Redis | |

> **Empfehlung:** Datendienste (DB, Redis, MinIO) als **eigene VMs** (VMID/IP nach §2), App-VM separat. Saubere Isolation, einzeln backup-/skalierbar.

### 5.4 Domain & TLS bei Cloudflare-DNS
Wenn die Domain weiter in Cloudflare verwaltet wird:
- **Einfachster Weg:** A-Record auf `65.109.54.113`, **Proxy aus („DNS only", graue Wolke)** → Caddy macht normales Let's Encrypt (§3.3).
- **Mit Cloudflare-Proxy (orange):** ACME HTTP-01 wird abgefangen → entweder **Caddy mit Cloudflare-DNS-Plugin (DNS-01)** bauen (braucht CF-API-Token) **oder** **Cloudflare Origin-CA-Zertifikat** in Caddy hinterlegen. In dem Fall mit Kolja klären.

### 5.5 Checkliste
- [ ] Quelle analysiert (§5.1), Migrationsplan + Datendienst-VMs festgelegt → **CHECKPOINT**.
- [ ] Datendienst-VMs (DB/Redis/MinIO) nach §3.1 anlegen + einrichten.
- [ ] Worker-Code auf Node/Bun/workerd portiert, Bindings auf §5.3-Ersatz umgestellt.
- [ ] App-VM + systemd-Dienst + Secrets.
- [ ] **Daten vollständig migrieren** → Abschnitt „⭐ Datenmigration": KV/D1/R2 exportieren (`wrangler kv key list`, `wrangler d1 export`, `rclone` für R2) **und** importieren — inkl. Verifikation (Row-Counts/Objektzahl).
- [ ] Cron Triggers → systemd-Timer.
- [ ] Caddy-Block + DNS/TLS (§5.4) → verifizieren (§3.5).
- [ ] **CHECKPOINT** vor Cutover; Worker erst nach Verifikation deaktivieren.
- [ ] **Nach Beobachtungsfenster: Worker + Bindings-Ressourcen löschen → siehe §9.**

---

## 6. Backups (vor jedem Produktiv-Cutover empfohlen)

Aktuell sind **noch keine Backup-Jobs** eingerichtet (Phase 6 offen). Vor dem Abschalten einer Quelle mindestens ein manuelles Backup der neuen VM ziehen:
```bash
vzdump <VMID> --storage local --mode snapshot --compress zstd
```
> `local` liegt auf der 100-GB-Root — nur für wenige/kleine Backups. Für echten Schutz **Hetzner Storage Box** als Backup-Storage einbinden (mit Kolja klären).

---

## 7. Vorlage: Auto-Revert vor Host-Netz-/Firewall-Änderungen

Nur falls doch mal eine Host-Netz-Änderung nötig ist (Regelfall: **nicht** nötig). KVM-Konsole bereithalten.
```bash
cd /etc/network
cp interfaces interfaces.bak.$(date +%s)
LAST_GOOD=$(ls -t interfaces.bak.* | head -1)
echo "cp /etc/network/$LAST_GOOD /etc/network/interfaces && ifreload -a" | at now + 10 minutes
atq                     # Job-ID merken
# ... Änderung anwenden, in NEUER SSH-Session verifizieren ...
# wenn ok: Job canceln:
for j in $(atq | awk '{print $1}'); do atrm $j; done
```
> Hinweis: `ifreload -a` auf einer bereits aktiven Bridge kann die MASQUERADE-Regel duplizieren → danach `iptables -t nat -S POSTROUTING | grep -c MASQUERADE` prüfen, ggf. ein Duplikat per `-D` entfernen (bei Reboot wieder sauber).

---

## 8. Anti-Patterns (NICHT tun)
- ❌ Neue Ports in der Hetzner-Firewall öffnen / Dienst direkt auf der Haupt-IP exponieren → **immer** über Caddy (80/443).
- ❌ `enp41s0`/Default-Route/`/etc/network/interfaces`-WAN-Block ändern.
- ❌ VM-Disks auf `local` (Root) statt `local-lvm` ablegen.
- ❌ Dienste als root im Vordergrund laufen lassen → systemd + unprivilegierter User.
- ❌ Secrets ins Repo committen.
- ❌ Quelle abschalten vor Verifikation + Backup.
- ❌ Quelle löschen, ohne Datenexport/Backup und ohne explizite Freigabe (§9).
- ❌ VMs generisch/uneinheitlich benennen (`app1`, `test`, `vm2`) oder **ohne Projekt-Tags** anlegen → Konvention §2.1 (`<projekt>-<rolle>` + `proj-/role-/env-`-Tags).

---

## 9. Quelle abbauen / löschen (Decommissioning)

**Grundsatz:** Nach einer **erfolgreichen** Migration werden die alten Server/Instanzen/Ressourcen
**abgebaut und gelöscht** — sie kosten sonst Geld und sind Sicherheits-/Verwirrungs-Ballast.
Löschen ist **irreversibel und destruktiv** → fällt unter Harte Regel 7: **nur mit expliziter
Freigabe von Kolja, an einem CHECKPOINT.**

### 9.0 Freigabe-Gates (ALLE müssen erfüllt sein, bevor gelöscht wird)
- [ ] Neuer Dienst auf node1 **verifiziert** (§3.5): erreichbar, TLS gültig, funktional getestet.
- [ ] **ALLE Daten vollständig migriert UND verifiziert** (Abschnitt „⭐ Datenmigration": DBs, Objektspeicher, KV/Cache, Queues, Uploads, Secrets — Row-Counts/Objektzahl geprüft). Keine Daten leben mehr nur auf der Quelle.
- [ ] **DNS vollständig umgezogen**, alte IP wird nicht mehr aufgelöst; Propagation abgewartet.
- [ ] **Finaler Datenexport/Backup** der Quelle gesichert **und** ein Backup der neuen VM existiert (§6).
- [ ] **Beobachtungsfenster** verstrichen (Empfehlung: **24–72 h** stabiler Betrieb).
- [ ] **Explizite Freigabe** von Kolja eingeholt (CHECKPOINT) — pro Quelle.

> Empfohlene Reihenfolge: **erst stoppen/deaktivieren** (reversibel) → Beobachtungsfenster →
> **dann endgültig löschen**. So bleibt ein schneller Rollback möglich.

### 9.1 Hetzner Cloud abbauen
Reihenfolge (zuerst stoppen, dann nach Freigabe löschen). Alles wird bis zur Löschung **berechnet**.
```bash
hcloud server poweroff <name>         # 1) stoppen (Beobachtungsfenster)
# --- nach Freigabe + Backup: ---
hcloud server delete   <name>         # 2) Server löschen
hcloud volume   delete <vol>          #    angehängte Volumes
hcloud floating-ip delete <fip>       #    Floating IPs
hcloud load-balancer delete <lb>      #    Load Balancer
hcloud firewall delete <fw>           #    nicht mehr genutzte Firewalls
# Snapshots/Images prüfen: hcloud image list --type snapshot
```
- [ ] Alte **DNS-Records** auf die Cloud-IP entfernen.
- [ ] **Reverse-DNS/PTR**, Backups-Pläne, Monitoring-Targets der Quelle aufräumen.

### 9.2 Cloudflare Workers abbauen
**Achtung:** Löschen von KV/D1/R2 ist **endgültiger Datenverlust** — nur nach bestätigtem Import + Backup.
```bash
# 1) Worker deaktivieren/entfernen
wrangler delete <worker-name>                 # entfernt Worker + Routes
# Custom Domains / Routes im CF-Dashboard prüfen und entfernen
# 2) nach Freigabe + bestätigtem Datenexport: Bindings-Ressourcen löschen
wrangler kv namespace delete --namespace-id <id>
wrangler d1 delete <db-name>
wrangler r2 bucket delete <bucket>
wrangler queues delete <queue>
# Durable Objects: via Migration entfernen; Secrets/Vars löschen
```
- [ ] **Cron Triggers** entfernt (sind in node1 als systemd-Timer ersetzt).
- [ ] **Secrets** in Cloudflare gelöscht.
- [ ] DNS-Records, die auf den Worker zeigten, entfernt/umgestellt.

### 9.3 Abschluss
- [ ] **Service-Register (§2)** und ggf. Projekt-`CLAUDE.md` aktualisieren (Quelle ist weg, Ziel ist node1).
- [ ] **CHECKPOINT:** Bestätigen, was gelöscht wurde, und dass keine verwaisten kostenpflichtigen Ressourcen übrig sind.

---

## 10. Ops-Konventionen (beim Anlegen jedes Dienstes beachten)

- **Backups:** Der nächtliche Job läuft mit `all 1` → **neue VMs werden automatisch** auf die Storage Box (`storagebox`) gesichert. Nach dem Anlegen prüfen, dass die VM im Job erscheint: `vzdump <VMID> --storage storagebox` einmal manuell (Smoke-Test) **vor** einem Produktiv-Cutover. Keine Dauer-Backups auf `local` (kleine 100-GB-Root; nur off-site).
- **Konsistente Backups:** nur mit `qemu-guest-agent` in der VM (siehe §3.2) — sonst nur crash-konsistent.
- **Ressourcen-Budget:** Host hat **62 GiB RAM / 12 Threads**. Summe der VM-RAMs **nicht** über ~50 GiB (Reserve für Host/ZFS/Cache). Vor dem Hochsetzen von `--memory/--cores` `free -h` und Lastsumme prüfen — **nicht blind übercommitten**.
- **Inter-VM-Isolation (Least Privilege):** Alle VMs hängen am selben `vmbr1` und können sich gegenseitig erreichen. Für sensible Backends (DB, Redis) die **Proxmox-Firewall pro VM** aktivieren und nur den App-Zugriff erlauben — z.B. DB-VM: INPUT default DROP, nur `tcp/5432` von der App-IP. (Datacenter-Firewall global lassen, pro VM scharf schalten; immer Auto-Revert/Konsole bereit.)
- **Secrets:** in der VM als `.env`/systemd-`EnvironmentFile` (`chmod 600`), **nie** ins Repo, **nie** in Klartext in Caddyfile/Configs. Storage-Box-/CIFS-Passwörter gehören in `/etc/pve/priv/...` (wird vom git-Config-Backup ausgeschlossen).
- **Health/Monitoring:** Pro Dienst möglichst einen `GET /health`-Endpoint; optional in Caddy ein `respond /healthz 200`. (Zentrales Monitoring ist noch nicht eingerichtet.)
- **Rollback (bei Migration):** DNS-TTL vor dem Cutover niedrig setzen; Quelle nach Cutover nur **stoppen** (nicht löschen) bis das Beobachtungsfenster (§9.0) durch ist → schneller Rückweg durch DNS-Zurückstellen. Endgültiges Löschen erst nach §9.
- **Caddy-Globals:** ACME-E-Mail + `(secure_headers)`-Snippet stehen bereits oben in der Caddyfile; neue Dienste mit `import secure_headers` einbinden.
