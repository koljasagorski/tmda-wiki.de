# Transkripte

Hier landen die Folgen-Transkripte. Sie sind die Grundlage für **alle** Rubriken auf der Wiki-Seite (Startup-Ideen, Kalles Corner, Gerüchte, Glossar etc.).

## Naming-Convention

Ein File pro Folge, zweistellige Folgennummer, Markdown oder Text:

```
folge-01.md
folge-02.md
folge-47.md
```

## Empfohlenes Format

Frontmatter oben, dann das Transkript darunter. Frontmatter ist optional — wenn ihr nur reinen Text habt, kein Stress, das Skript extrahiert was es kriegen kann.

```markdown
---
folge: 47
titel: Talahons im Weltall
datum: 2026-05-19
laufzeit: 1:02:00
gaeste: []
links:
  - spotify: https://open.spotify.com/episode/...
  - youtube: https://www.youtube.com/watch?v=...
---

# Transkript

[00:00] Fynn: Ey Nisse, ich hab da ne Idee ...
[00:42] Nisse: Bro ...

...
```

## Sprecher-Kennzeichnung

Bitte mit `Fynn:` / `Nisse:` / `Kalle:` etc. am Zeilenanfang — das hilft dem Extraktions-Skript, „Kalles Corner" automatisch zu finden.

## Was passiert mit den Transkripten?

1. `scripts/extract.js` parst alle Files in diesem Ordner.
2. Es schreibt strukturierte JSON-Dateien nach `data/` (Startup-Ideen, Punkte, Kalles Corner, Glossar …).
3. Der Worker serviert diese JSON-Dateien an das Frontend.
4. Der AI-Chat nutzt die Transkripte als Kontext.

## Vorlage zum Kopieren

Siehe [`_template.md`](./_template.md).
