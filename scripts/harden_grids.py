#!/usr/bin/env python3
"""Add explicit grid-cols-1 to Tailwind grids that only define responsive columns.

Problem: `grid gap-6 sm:grid-cols-2` (no base grid-cols) creates an IMPLICIT auto
track on mobile. If any descendant has white-space:nowrap (truncate) the track's
min-content inflates beyond the viewport → whole section renders 643px wide on a
390px phone (observed on /workshops/[id]).

Fix: `grid grid-cols-1 ...` = repeat(1, minmax(0,1fr)) — track pinned to container
width, identical stacking, immune to content min-content.

Also upgrades arbitrary lg templates `[1fr_...]` → `[minmax(0,1fr)_...]`.
Only touches files under src/app and src/components (not ui/chart.tsx, toaster).
"""
import re
from pathlib import Path

ROOT = Path("/home/z/my-project/src")
SKIP = {"src/components/ui/chart.tsx", "src/components/ui/toaster.tsx"}

# className="...grid gap-... sm:grid-cols-..."  (no base grid-cols-N)
# We insert "grid-cols-1 " right after the standalone "grid " token.
pattern = re.compile(
    r'(className="([^"]*)\bgrid\s+gap-)'
)

RESPONSIVE = re.compile(r'\b(sm|md|lg|xl|2xl):grid-cols-')
BASE_COLS = re.compile(r'(?<![:\w-])grid-cols-')

changed_files = []
for f in ROOT.rglob("*.tsx"):
    rel = str(f.relative_to(ROOT.parent))
    if rel in SKIP:
        continue
    text = f.read_text(encoding="utf-8")
    orig = text
    out_lines = []
    for line in text.split("\n"):
        # find className="..." spans containing "grid gap-"
        m = re.search(r'className="([^"]*)"', line)
        if m and "grid gap-" in m.group(1):
            cls = m.group(1)
            has_responsive = bool(RESPONSIVE.search(cls))
            has_base = bool(BASE_COLS.search(cls))
            if has_responsive and not has_base:
                new_cls = re.sub(r'\bgrid\s+gap-', 'grid grid-cols-1 gap-', cls, count=1)
                line = line.replace(f'className="{cls}"', f'className="{new_cls}"', 1)
        # arbitrary templates with 1fr column → minmax(0,1fr)
        if "grid-cols-[1fr" in line and "minmax" not in line:
            line = line.replace("grid-cols-[1fr", "grid-cols-[minmax(0,1fr)")
        if "grid-cols-[1fr_320px]" in line:
            line = line.replace("grid-cols-[1fr_320px]", "grid-cols-[minmax(0,1fr)_320px]")
        if "grid-cols-[1fr_2fr]" in line:
            line = line.replace("grid-cols-[1fr_2fr]", "grid-cols-[minmax(0,1fr)_2fr]")
        if "grid-cols-[1fr_380px]" in line:
            line = line.replace("grid-cols-[1fr_380px]", "grid-cols-[minmax(0,1fr)_380px]")
        if "320px_1fr]" in line and "minmax" not in line:
            line = line.replace("320px_1fr]", "320px_minmax(0,1fr)]")
        out_lines.append(line)
    text = "\n".join(out_lines)
    if text != orig:
        f.write_text(text, encoding="utf-8")
        changed_files.append(rel)

print(f"Changed {len(changed_files)} files:")
for c in changed_files:
    print(" -", c)
