#!/usr/bin/env python3
import re
import sys

def parse_vtt(vtt_file, folge, titel, laufzeit, quelle="YouTube Auto-Untertitel (de-orig)"):
    with open(vtt_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract all word-level tokens with timestamps from <c> tags
    # Pattern: <HH:MM:SS.mmm><c> word</c>
    token_pattern = re.compile(r'<(\d{2}:\d{2}:\d{2}\.\d{3})><c>([^<]*)</c>')

    # Also extract plain text lines (the "base" line before <c> tokens)
    # We'll collect all timestamped tokens
    seen = {}  # timestamp -> accumulated text

    # Process block by block
    blocks = content.split('\n\n')

    segments = []

    for block in blocks:
        lines = block.strip().split('\n')
        if len(lines) < 2:
            continue

        # Check if it's a cue block (has timestamp line)
        time_line = None
        text_lines = []
        for line in lines:
            if '-->' in line:
                time_line = line
            elif line and not line.startswith('WEBVTT') and not line.startswith('Kind:') and not line.startswith('Language:'):
                text_lines.append(line)

        if not time_line:
            continue

        # Parse start time from the timing line
        start_match = re.match(r'(\d{2}:\d{2}:\d{2}\.\d{3})', time_line)
        if not start_match:
            continue

        start_ts = start_match.group(1)

        # Get the "clean" text (first line before <c> tokens, or base text)
        for tl in text_lines:
            clean = re.sub(r'<[^>]+>', '', tl).strip()
            if clean:
                # Convert HH:MM:SS.mmm to seconds
                h, m, s = start_ts.split(':')
                s_float = float(h) * 3600 + float(m) * 60 + float(s)

                if s_float not in seen:
                    seen[s_float] = clean
                break

    # Sort by timestamp
    sorted_entries = sorted(seen.items())

    if not sorted_entries:
        print(f"WARNING: No entries found in {vtt_file}")
        return

    # Deduplicate consecutive identical lines
    deduped = []
    prev_text = None
    for ts, text in sorted_entries:
        if text != prev_text:
            deduped.append((ts, text))
            prev_text = text

    # Group into ~30 second paragraphs
    paragraphs = []
    current_para = []
    para_start = None

    for ts, text in deduped:
        if para_start is None:
            para_start = ts

        current_para.append(text)

        if ts - para_start >= 30:
            # Format timestamp as [MM:SS]
            minutes = int(para_start // 60)
            seconds = int(para_start % 60)
            marker = f"[{minutes:02d}:{seconds:02d}]"
            paragraphs.append((marker, ' '.join(current_para)))
            current_para = []
            para_start = None

    # Add remaining
    if current_para and para_start is not None:
        minutes = int(para_start // 60)
        seconds = int(para_start % 60)
        marker = f"[{minutes:02d}:{seconds:02d}]"
        paragraphs.append((marker, ' '.join(current_para)))

    # Write output
    out_lines = [
        '---',
        f'folge: {folge}',
        f'titel: {titel}',
        f'laufzeit: {laufzeit}',
        f'quelle: {quelle}',
        '---',
        ''
    ]

    for marker, text in paragraphs:
        out_lines.append(f"{marker} {text}")
        out_lines.append('')

    return '\n'.join(out_lines)


if __name__ == '__main__':
    episodes = [
        ('tmda53.de-orig.vtt', 53, 'Nordkorea bombardiert Mond', '1:20:46', 'transcripts/folge-53.txt'),
        ('tmda54.de-orig.vtt', 54, 'War Mama bei Osho in Hannover?', '1:06:46', 'transcripts/folge-54.txt'),
        ('tmda55.de-orig.vtt', 55, 'KKK? Knarren, Kettlebell & Kampfflugzeuge!', '1:08:27', 'transcripts/folge-55.txt'),
    ]

    for vtt_file, folge, titel, laufzeit, out_file in episodes:
        print(f"Processing {vtt_file}...")
        result = parse_vtt(vtt_file, folge, titel, laufzeit)
        if result:
            with open(out_file, 'w', encoding='utf-8') as f:
                f.write(result)
            print(f"  Written to {out_file}")
        else:
            print(f"  FAILED: {vtt_file}")
