#!/usr/bin/env python3
"""
Importiert rohe YouTube-Subtitle-Transkripte und säubert sie:
- Decodiert #U00XX / #LXXXXX Unicode-Escapes
- Entfernt die doppelten Timestamps der YouTube-Auto-Captions
- Konsolidiert zu lesbaren Absätzen mit [MM:SS] Markern alle ~30s
- Benennt zu folge-XX.txt
"""
from __future__ import annotations
import re, os, sys, json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else None
DST = ROOT / 'transcripts'

def decode_filename(name: str) -> str:
    name = re.sub(r'#U([0-9A-Fa-f]{4})', lambda m: chr(int(m.group(1), 16)), name)
    name = re.sub(r'#L([0-9A-Fa-f]{5})', lambda m: chr(int(m.group(1), 16)), name)
    return name

def parse_folge(name: str) -> int | None:
    decoded = decode_filename(name)
    m = re.search(r'#?\s*(\d+)\b', decoded)
    if m:
        return int(m.group(1))
    if 'Folge 34' in decoded:
        return 34
    return None

def extract_title(name: str) -> str:
    decoded = decode_filename(name)
    # Strip "TMDA #NN", "TMDA#NN", "#NN -", leading dashes/dashes-encoded
    title = re.sub(r'^.*?#\s*\d+\s*[-–]?\s*', '', decoded)
    title = re.sub(r'\.txt$', '', title).strip()
    title = re.sub(r'\s+', ' ', title).strip(' -–')
    return title or decoded.replace('.txt','')

def clean_content(raw: str) -> tuple[str, str]:
    """Returns (cleaned_text, last_timestamp)."""
    out_lines = []
    current_ts = None
    buffer = []
    last_ts = '00:00'

    # Lines look like: "MM:SS text" or "MM:SS " (empty)
    line_rx = re.compile(r'^(\d{1,2}:\d{2})\s*(.*)$')
    for line in raw.splitlines():
        m = line_rx.match(line.strip())
        if not m:
            continue
        ts, text = m.group(1), m.group(2).strip()
        if not text:
            continue
        last_ts = ts
        buffer.append(text)
        # Every ~30 seconds, flush a paragraph with timestamp marker
        sec = int(ts.split(':')[0]) * 60 + int(ts.split(':')[1])
        if current_ts is None:
            current_ts = sec
        if sec - current_ts >= 30:
            para = ' '.join(buffer).strip()
            if para:
                out_lines.append(f'[{format_ts(current_ts)}] {para}')
            buffer = []
            current_ts = sec

    if buffer:
        para = ' '.join(buffer).strip()
        if para and current_ts is not None:
            out_lines.append(f'[{format_ts(current_ts)}] {para}')

    return '\n\n'.join(out_lines), last_ts

def format_ts(sec: int) -> str:
    h = sec // 3600
    m = (sec % 3600) // 60
    s = sec % 60
    return f'{h:02d}:{m:02d}:{s:02d}' if h else f'{m:02d}:{s:02d}'

def main():
    if not SRC or not SRC.exists():
        print(f'usage: {sys.argv[0]} <source-dir>')
        print(f'source dir not found: {SRC}')
        sys.exit(1)
    DST.mkdir(exist_ok=True)
    files = sorted([f for f in SRC.iterdir() if f.suffix.lower() == '.txt' and f.stat().st_size > 1000])

    seen_folgen: dict[int, Path] = {}
    for f in files:
        folge = parse_folge(f.name)
        if folge is None:
            print(f'skip (no folge): {f.name}')
            continue
        title = extract_title(f.name)
        is_rewind = 'rewind' in f.name.lower() or 'cg hielscher' in f.name.lower()
        if folge in seen_folgen and not is_rewind:
            print(f'duplicate folge #{folge}, ignoring rewind')
            continue
        if is_rewind:
            print(f'skip rewind: {f.name}')
            continue

        raw = f.read_text(encoding='utf-8', errors='ignore')
        cleaned, last_ts = clean_content(raw)
        # Convert last_ts to HH:MM:SS for laufzeit
        m, s = last_ts.split(':')
        total_sec = int(m) * 60 + int(s)
        laufzeit = f'{total_sec // 3600}:{(total_sec % 3600) // 60:02d}:{total_sec % 60:02d}'

        frontmatter = f'''---
folge: {folge}
titel: {title}
laufzeit: {laufzeit}
quelle: {f.name}
---

'''
        out = DST / f'folge-{folge:02d}.txt'
        out.write_text(frontmatter + cleaned, encoding='utf-8')
        seen_folgen[folge] = out
        print(f'✓ folge-{folge:02d}.txt  ({title[:50]})')

    print(f'\n{len(seen_folgen)} Folgen importiert.')

if __name__ == '__main__':
    main()
