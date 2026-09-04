# dndpaste — format specification

**Version:** 0.1 (draft, 2026-09-04) · **Status:** pre-panel · Decisions: `DECISIONS.md` D1–D19.

A dndpaste is a short plain-text document that replays a character build through its
*meaningful choice points*, by reference only. It never contains rules text. Anything a
class, species or background grants automatically is not written: a Fighter always has Second
Wind, so Second Wind never appears. Only what the player chose appears.

The format has two parts:

- **Core grammar** (§1–§4) — game-neutral: lines, keys, items, level blocks.
- **Profile** (§5) — the key vocabulary and value shapes for one game. `dnd5e` is the first
  and only profile in v0.

Two conformance layers consume it (D11):

- **Parser** — needs no game data. Enforces grammar and profile vocabulary, produces an AST,
  emits canonical text. Never infers.
- **Checker** — needs game data in 5etools format. Reports which choices a build still owes,
  which are placed at an impossible level, and which references do not resolve. Out of scope
  for this document beyond §6.

---

## 0. Design rules (normative)

1. **Nothing is required.** The empty document is a valid paste. `Classes: Warlock` alone is
   a valid paste. Absence is the only way to say "not decided" (D13).
2. **What is present is strict.** One canonical spelling per key, one canonical layout; an
   unknown key is an error, not a note (D1, D14).
3. **No inference.** A choice outside a level block is *unplaced* and stays so. The parser
   never guesses a level, a class, a source or an edition (D4).
4. **References, not text.** Every entity is a name plus an optional source code (D7, D9).
5. **No free text**, except the optional identifier line (D12).
6. **Emitters write canonical form.** `parse(emit(parse(x)))` equals `parse(emit(x))`.

---

## 1. Lexical structure

- Encoding UTF-8. Line endings `\n` (parsers accept `\r\n`). Lines are trimmed of leading and
  trailing whitespace before parsing.
- **Blank lines are insignificant.** They are cosmetic separators; canonical form puts one
  blank line before each level header and nowhere else. *(D18: the blank line is not a
  block separator; a future multi-build separator is the reserved line `---`.)*
- A line that is exactly `---` is **reserved** and is an error in v0 (`E010`).
- Everything is case-insensitive for matching (keys, class names, entity names, source codes).
  Case is preserved in the AST; emitters write keys and level headers in canonical case and
  values as authored.

---

## 2. Line kinds

Each non-blank line is exactly one of:

| Kind | Form | Where allowed |
|---|---|---|
| **Identifier** | any text containing no `:` and not matching a level header | first non-blank line only |
| **Level header** | `L<n> <Class>[\|<SOURCE>]` | anywhere after the identifier; opens a level block |
| **Key line** | `<Key>: <value>` | anywhere |

Anything else is `E001 malformed line`.

### 2.1 Identifier line

Optional. The build's name. It is the only line that is not mechanics. It must be the first
non-blank line; an identifier-shaped line anywhere else is `E001`. It may not contain `:`.

### 2.2 Level header

```
L<n> <Class>[|<SOURCE>]
```

- `n` is the **character level** (1–20 in `dnd5e`), a positive integer, no leading zeros.
- `Class` is a class reference (§3). It names the class this character level is taken in.
- Level headers must be **strictly increasing** within a document (`E004`). Gaps are normal:
  a level with no choices is simply absent.
- A level header opens a **level block** that extends to the next level header or the end
  of the document. Key lines inside it are **placed** at that level.

### 2.3 Key line

```
<Key>: <value>
```

- `Key` is one of the profile's keys (§5.1). Anything else is `E002 unknown key`.
- The separator is the first `:` followed by a space or end of line. Keys never contain `:`;
  values may not contain `:` either (no key needs one).
- An empty value is `E006`.
- The same key may not appear twice in the same **scope** (the header scope or one level
  block) — `E003 duplicate key`. Emitters merge lists before writing.
- A **header-only** key (§5.1) inside a level block is `E005`. All other keys are valid both
  in the header scope (unplaced) and inside a block (placed).

**Scopes.** Key lines before the first level header form the **header scope**. Header-only
keys describe the whole build; every other key in the header scope is an **unplaced** choice.

---

## 3. Values

A value is an **item list**: one or more items separated by `,` (comma, optional spaces).
Some keys take exactly one item (§5.1, column *arity*); a list there is `E007`.

### 3.1 Item

```
[-]<Name>[|<SOURCE>][ (<detail>[; <detail>]...)][ x<qty>]
```

| Part | Meaning |
|---|---|
| `-` prefix | **Drop**: the item leaves the build at this level (a spell swap, an invocation replaced). Only valid inside a level block on list keys (`E008` elsewhere). |
| `Name` | Entity name as printed in its source. May contain spaces, apostrophes, hyphens, digits and `'`. May not contain `,` `;` `(` `)` `|` `:`. |
| `\|SOURCE` | Optional source code, 5etools convention (`XPHB`, `PHB`, `TCE`, `AAG`, …). Homebrew uses the source code declared by its homebrew file, or `HB` when it has none (D9). |
| `(detail; detail)` | Optional **detail groups**: sub-choices belonging to this item, groups separated by `;`, items inside a group separated by `,`. Each detail is itself an item (recursion allowed one level deep: a detail may carry `\|SOURCE` but not further parentheses). |
| `x<qty>` | Optional quantity, integer ≥ 2, `Equipment` only (`E009` elsewhere). |

The parser keeps detail groups as **ordered lists of lists**. Their *meaning* (which group is
the ability, which the spells) is defined per key in §5.2 or, where the profile says
"data order", by the checker against the entity's own choice structure.

### 3.2 References

A reference is `Name[|SOURCE]`. Resolution is the consumer's job; the parser only normalises.
Two references are the same when names match case-insensitively and either source is absent
or both sources match. A consumer resolving a source-less reference against several
candidates must ask, not pick (D4 rule 3 applied to sources).

---

## 4. AST (informative, normative for conformance tests)

```ts
interface Paste {
  identifier: string | null;
  header: Record<CanonicalKey, Item[]>;      // header-only keys + unplaced choices
  levels: Level[];                            // ascending by n
  diagnostics: Diagnostic[];                  // never thrown
}
interface Level { n: number; class: Ref; lines: Record<CanonicalKey, Item[]>; }
interface Item  { ref: Ref; drop: boolean; details: Ref[][]; qty: number | null; }
interface Ref   { name: string; source: string | null; }
interface Diagnostic { code: `E${string}`; line: number; message: string; }
```

Parsing never throws. On an error line the parser records the diagnostic and skips the line;
canonical emission of a document with errors is undefined.

---

## 5. Profile `dnd5e`

Covers the 2014 and 2024 rules; `Rules:` names the default edition for source-less
references (D8). When absent, the AST carries `null` and consumers apply their own default;
the parser never fills it in.

### 5.1 Keys

*Arity:* **1** = exactly one item · **list** = one or more. *Scope:* **H** = header-only ·
**H/L** = header (unplaced) or level block (placed).

| Key | Arity | Scope | Value | Notes |
|---|---|---|---|---|
| `Rules` | 1 | H | `2014` \| `2024` | default edition for source-less refs |
| `Level` | 1 | H | integer 1–20 | *current* character level; blocks above it are planned |
| `Species` | 1 | H | ref (+ details) | details = lineage / size / other species-level picks, **data order** (§5.2) |
| `Background` | 1 | H | ref (+ details) | details fixed order (§5.2) |
| `Scores` | 1 | H | `S/D/C/I/W/C` | six integers, `/`-separated, **base** scores before any bonus |
| `Classes` | list | H | `Class[\|SRC] <levels>` items separated by ` / ` | order = order taken; total may exceed `Level` (planned) |
| `Subclass` | 1 | H/L | ref | belongs to the block's class; unplaced when in header |
| `Skills` | list | H/L | refs | proficiencies chosen (not granted) |
| `Tools` | list | H/L | refs | chosen tool proficiencies |
| `Languages` | list | H/L | refs | chosen languages |
| `Expertise` | list | H/L | refs (skills/tools) | |
| `Fighting Style` | 1 | H/L | ref | |
| `Masteries` | list | H/L | weapon refs | default weapon-mastery loadout as of that level |
| `Invocations` | list | H/L | refs (+ details) | details = the invocation's own picks (e.g. the cantrip Agonizing Blast targets) |
| `Metamagic` | list | H/L | refs | |
| `ASI` | list | H/L | `+<n> <ABI>` items | e.g. `+2 CHA` or `+1 INT, +1 CON` |
| `Feat` | 1 | H/L | ref (+ details) | any feat slot: ASI-slot feat, origin feat from a species or custom background; details **data order** |
| `Cantrips` | list | H/L | spell refs | chosen cantrips (class or feature) |
| `Spells` | list | H/L | spell refs | spells the build **adds to its repertoire** at that level: learned, scribed, or picked on level-up by a prepared-on-level-up caster |
| `Prepared` | list | H/L | spell refs | **default prepared loadout** when the repertoire exceeds the prepare count |
| `Equipment` | list | H/L | option letter `A`/`B`/`C`, or item refs with `x<qty>` | a letter selects that starting-equipment option of the scope's grantor (background in header, class in its first block) |
| `Option` | list | H/L | `<Feature> (<picks>)` items | **generic escape hatch** for any other feature that asks for a pick (§5.3) |

Abilities are written `STR DEX CON INT WIS CHA` (case-insensitive).

### 5.2 Fixed detail orders

- `Background`: `(<ability bonuses>; <skills>; <tools>; <feat>)`. Official backgrounds carry
  only the first group (2024) or none (2014). A custom 2024 background carries all four:
  `Background: Custom (+2 INT, +1 CON; Arcana, History; Calligrapher's Supplies; Magic Initiate (Wizard))`.
  Ability bonuses use the `ASI` item shape.
- `Species`: **data order** — groups follow the species' own choice structure (lineage first
  when it has one). `Species: Elf (High Elf; Prestidigitation)`.
- `Feat`: **data order** — groups follow the feat's own choice structure. `Feat: Magic Initiate (Cleric; Guidance, Sacred Flame; Bless; WIS)`; `Feat: Resilient (CON)`.
- `Invocations` item details: the invocation's own picks. `Agonizing Blast (True Strike)`.
- `Classes` item: `Fighter 1`, `Warlock|PHB 5`. The level count is required; `Fighter` alone
  (no count) is allowed only when the paste has no level blocks and means "levels unknown".

### 5.3 `Option` — the escape hatch

Many features ask for a pick without being a feat, spell or optional feature: a Cleric's
Divine Order, a 2014 Pact Boon, an Autognome's Specialized Design, a Dragonborn's ancestry, a
Ranger's Favored Enemy. New books add more every year and 5etools often encodes them as prose
options, not structured data. Rather than a key per feature, the profile has one:

```
Option: <Feature name>[|SRC] (<pick>[, <pick>][; <group>]...)
```

`Feature name` is the feature as printed (its 5etools `classFeature`/trait name); the details
are the picks. Placed in a block, the feature belongs to that block's class at that level;
unplaced, it belongs to whatever grants it. `Option` is a list key: several features may be
answered on one line.

Rule of thumb for authors and emitters: **use the dedicated key when one exists** (`Fighting
Style`, not `Option: Fighting Style (Archery)`); a parser accepts both, a linter (checker)
reports the redundancy. Canonical emit rewrites an `Option` whose feature has a dedicated key
into that key.

### 5.4 Placement semantics

- A placed line belongs to the **character level** of its block and to the **class** named in
  the header. Species and background choices are naturally unplaced or placed at `L1`.
- `Subclass` placed at `L4 Warlock` means "the Warlock subclass, chosen at character level 4".
- `-Item` in a block: the item is dropped at that level; it must have been added earlier
  (a checker finding, not a parse error).
- `Prepared` and `Masteries` placed in a block describe the default loadout *from that level*
  until the next such line.

### 5.5 Canonical form

1. Identifier line, if any.
2. Header keys in this order: `Rules`, `Level`, `Species`, `Background`, `Scores`, `Classes`,
   then unplaced choice keys in §5.1 table order.
3. One blank line, then each level block: header `L<n> <Class>`, then its keys in §5.1 order.
4. Keys in canonical case; one space after `:`; items separated by `, `; groups by `; `.
5. `Option` items whose feature has a dedicated key are rewritten to it.

---

## 6. Checker (scope note, not normative in v0)

Given the AST and a slot table derived from 5etools-format data, the checker reports:

- **Missing** — a choice slot the build owes at or below `Level` with no line (e.g. Fighter 1
  with no `Fighting Style`).
- **Unplaced** — a header-scope choice that could belong to more than one level.
- **Misplaced** — a placed choice at a level where its slot does not exist (a `Subclass` at
  `L2 Fighter`).
- **Unresolved** — a reference that matches nothing in the loaded data, or several things.
- **Redundant** — an `Option` with a dedicated key; a granted (automatic) item written as a
  choice.

It never edits the paste and never resolves an unplaced choice by itself. Prose-encoded
options (Divine Order) can be checked for presence only when the slot table marks them, which
is why `Option` stays generic.

---

## 7. Error codes

| Code | Meaning |
|---|---|
| E001 | malformed line (not identifier, level header or key line; identifier not first) |
| E002 | unknown key |
| E003 | duplicate key in one scope |
| E004 | level header not strictly increasing, or out of range |
| E005 | header-only key inside a level block |
| E006 | empty value |
| E007 | list given to an arity-1 key |
| E008 | drop prefix outside a level block or on a non-list key |
| E009 | quantity on a key other than `Equipment` |
| E010 | reserved line `---` |
| E011 | malformed item (unbalanced parentheses, nested detail groups, empty name) |
| E012 | malformed `Scores` / `ASI` / `Classes` value shape |

---

## 8. Examples

### 8.1 Sparse

```
Classes: Warlock
```

```
Classes: Warlock 5
Subclass: Celestial
```

### 8.2 Flat snapshot (all unplaced)

```
Shigen
Rules: 2024
Species: Human
Background: Archer Priest|HB
Scores: 8/13/14/12/10/15
Classes: Fighter 1 / Warlock 5
Subclass: Celestial
Fighting Style: Archery
Masteries: Longbow, Rapier, Warhammer
Invocations: Agonizing Blast (True Strike), Repelling Blast (True Strike), Pact of the Blade, Ascendant Step, Eldritch Smite
Feat: Potent Dragonmark|EFA (CHA)
Cantrips: Blade Ward, True Strike, Prestidigitation
```

### 8.3 Full timeline

See `fixtures/shigen.dndpaste` and `fixtures/vice.dndpaste` — the two reference builds
this spec was checked against (D17).

### 8.4 Custom background and a feat with sub-choices

```
Rules: 2024
Species: Elf (Wood Elf)
Background: Custom (+2 WIS, +1 DEX; Perception, Stealth; Herbalism Kit; Magic Initiate (Druid; Guidance, Shillelagh; Goodberry; WIS))
Classes: Druid 4

L1 Druid
Option: Primal Order (Warden)
Skills: Nature, Survival
Cantrips: Produce Flame, Thorn Whip
Prepared: Cure Wounds, Entangle, Faerie Fire, Healing Word

L2 Druid
Subclass: Circle of the Moon

L4 Druid
ASI: +2 WIS
```

---

## 9. Reserved for later versions

- `---` multi-build separator (variants, parties) — D6, D18.
- `Game:` header selecting a profile other than `dnd5e` — O1.
- A `Paste:` format-version header, only if a breaking change ever forces one.
