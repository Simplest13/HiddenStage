import os, re

files = [os.path.join(r, f) for r, d, fs in os.walk('hiddenstage-frontend/src') for f in fs if f.endswith('.tsx')]
hardcoded_bg = re.compile(r'background(?:Color)?\s*:\s*[\'\"](#fff\b|#ffffff\b|white\b)', re.I)
hardcoded_text = re.compile(r'(?<![a-zA-Z-])color\s*:\s*[\'\"](#000\b|#111\b|#222\b|#333\b|black\b|#1a1215\b|#6b3e26\b)', re.I)

total_bg = 0
total_txt = 0
for f in files:
    with open(f, 'r', encoding='utf-8') as fp:
        lines = fp.readlines()
    bg_issues = []
    text_issues = []
    for i, line in enumerate(lines, 1):
        if hardcoded_bg.search(line):
            bg_issues.append((i, line.strip()))
        if hardcoded_text.search(line):
            text_issues.append((i, line.strip()))
    if bg_issues or text_issues:
        total_bg += len(bg_issues)
        total_txt += len(text_issues)
        rel = os.path.relpath(f, 'hiddenstage-frontend/src')
        print(f'{rel}: {len(bg_issues)} white bgs, {len(text_issues)} dark texts')
        for lnum, ltext in bg_issues[:3]:
            print(f'   BG L{lnum}: {ltext}')
        for lnum, ltext in text_issues[:3]:
            print(f'   TXT L{lnum}: {ltext}')

print(f'\nTotal: {total_bg} white backgrounds, {total_txt} dark text styles across TSX files.')
