import re

with open('hiddenstage-frontend/src/index.css', 'r', encoding='utf-8') as f:
    content = f.read()

root_match = re.search(r':root\s*\{([^}]+)\}', content, re.DOTALL)
dark_match = re.search(r'\[data-theme=["\']dark["\']\]\s*\{([^}]+)\}', content, re.DOTALL)

root_vars = set(re.findall(r'(--[a-zA-Z0-9_-]+)\s*:', root_match.group(1)))
dark_vars = set(re.findall(r'(--[a-zA-Z0-9_-]+)\s*:', dark_match.group(1)))

print("Variables in :root but missing in [data-theme='dark']:")
for v in sorted(root_vars - dark_vars):
    if any(k in v for k in ['color', 'shadow']):
        print(" ", v)
