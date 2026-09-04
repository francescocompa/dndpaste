# Stress-test brief (read fully before writing a paste)

You are writing dndpaste documents to stress-test the format, parser and checker of this repo.

## Read first
1. `SPEC.md` — the whole thing, especially §2 (lines/blocks/scopes), §3.1 (item syntax: brackets for
   details, quotes for names containing `, ; : [ ]`), §5.1 (the key table with scopes), §5.3 (detail slot
   orders), §5.4 (placement), §8 (examples).
2. `fixtures/*.dndpaste` — four conforming pastes. Copy their shape.
3. Entity names must be real 5etools names. Look them up in `data/slots.json` (JSON, keys are
   `Name|SOURCE`; tables: classes, subclasses, species, backgrounds, feats, optionalFeatures, spells,
   items). Use `grep -o '"<Name>[^"]*|[A-Z0-9]*"' data/slots.json` or `node -e` to search. When a
   thing does not exist in 5etools (homebrew, third-party), write it with `|HB`.

## Hard rules
- One paste per file: `stress/pastes/<slug>.dndpaste` (lowercase, hyphens). Reduced variants:
  `<slug>.reduced.dndpaste` (keep the same identifier line + `-lite` suffix).
- Write exactly what the spec allows. Do NOT invent keys. If you need something the spec cannot
  express, write the paste as close as you can AND record the gap in your notes file (that is the
  point of the exercise).
- Level headers are CHARACTER levels (`L5 Warlock` = character level 5, taken in Warlock).
- `Classes:` lists levels as played now; blocks above the total are planned levels.
- Never include rules text, flavour or comments. Names only.
- Do not run the parser or tests yourself; do not edit anything outside `stress/pastes/` and
  `stress/notes/`.

## Notes file: `stress/notes/<your-agent-name>.md`
For each paste: one line "intent" (what it exercises), then any of:
- **GAP** — something the build needed that the spec cannot say (quote the line you wanted to write).
- **AMBIGUOUS** — a spec rule you had to guess about (cite the section).
- **DATA** — a 5etools name/edition question (e.g. same name in two sources, which did you pick and why).
- **SMELL** — anything that felt wrong or redundant while writing.
Be terse. This file is the deliverable as much as the pastes.
