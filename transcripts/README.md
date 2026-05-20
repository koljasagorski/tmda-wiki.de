# Transkripte

Eine Datei pro Folge, Format `folge-XX.txt`. Grundlage für **alle** Rubriken im Wiki.

## Format

```
---
folge: 47
titel: Talahons im Weltall
laufzeit: 1:02:34
quelle: TMDA #47 Talahons im Weltall.txt
---

[00:00] [Erster Block ~30 Sekunden Inhalt...]

[00:32] [Nächster Block...]

[01:01] [...]
```

- **Frontmatter**: `folge`, `titel`, `laufzeit` sind die wichtigen Felder.
- **Body**: Absätze mit `[MM:SS]` Markern alle ~30s. Sprecher-Labels (Fynn:/Nisse:/Kalle:) sind nicht zwingend nötig, helfen aber.

## Workflow für neue Folgen

1. YouTube-Untertitel als TXT exportieren oder per Whisper transkribieren.
2. Datei nach `transcripts/folge-XX.txt` legen.
3. Wenn das Format „roh" ist (YouTube-Auto-Captions mit doppelten Timestamps): durch das Cleanup-Skript schicken:
   ```bash
   python3 scripts/import-raw.py /pfad/zum/raw-ordner
   ```
4. AI-Extraktion (Claude/GPT/o.ä.) ausführen → schreibt `/tmp/tmda-extracts/folge-XX.json` pro Folge.
5. `npm run aggregate` → baut die Rubriken-JSONs neu.
6. `npm run deploy` → live auf Cloudflare.

Format der Extraktion-JSON: siehe `scripts/aggregate.js` (es liest folgende Felder pro Episode: `folge`, `titel`, `laufzeit`, `themen`, `kurzbeschreibung`, `startup_idee`, `kalles_corner`, `gerucht_der_woche`, `fun_facts`, `erfindungen`, `orte`, `gaeste_erwaehnte`, `zitate`, `glossar`).
