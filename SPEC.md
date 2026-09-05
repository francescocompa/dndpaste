# dndpaste — format specification

**Version:** 0.4 (draft, 2026-09-04) · **Status:** signed off at 0.3; 0.4 adds `Items` and the extras policy · Decisions: `DECISIONS.md` D1–D44.

A dndpaste is a short plain-text document that replays a character build through its
*meaningful choice points*, by reference only. It never contains rules text. Anything a
class, species or background grants automatically is not written: a Fighter always has Second
Wind, so Second Wind never appears. Only what the player chose appears.

The format has two parts:

- **Core grammar** (§1–§4) — game-neutral: lines, blocks, keys, items, typed values.
- **Profile** (§5) — the key vocabulary and value shapes for one game. `dnd5e` is the first
  and only profile in v0.

Two conformance layers consume it (D11, D30):

- **Parser + canonical emitter** — need no game data. Enforce grammar and profile vocabulary,
  produce an AST, write canonical text. Never infer, never drop.
- **Checker** — needs game data in 5etools format plus a small hand-kept supplement for
  prose-only choices. Reports what a build still owes, what is misplaced, what does not
  resolve, what is redundant. Out of scope here beyond §6.

---

## 0. Design rules (normative)

1. **Nothing is required.** The empty document is a valid paste. `Classes: Warlock` alone is
   a valid paste.
2. **What is present is strict.** One canonical spelling per key, one canonical layout; an
   unknown key is an error, not a note (D1, D14).
3. **No inference by the parser.** A choice outside a level block is *unplaced* and stays so.
   The parser never guesses a level, a class, a source or an edition (D4). Resolution of an
   unplaced choice to a class is the **consumer's** job (§5.4, D28).
4. **References, not text.** Every entity is a name plus an optional source code (D7, D9).
5. **No free text**, except the optional identifier line (D12).
6. **Canonical emit is data-free and lossless.** `emit(parse(emit(a))) === emit(a)` for any
   AST `a` without diagnostics. Anything that needs game data to decide (redundancy,
   defaults) belongs to the checker's *normalise* step, not to `emit` (D30).
7. **A choice belongs to the entity that asks it.** Species and background picks are lines in
   that entity's block; a feat's or optional feature's picks are its bracket details; a class
   feature's picks are a `Feature` line in the class's level block (D22, D26).
8. **Absence means "default if one exists, else undecided".** When the rules present one
   option as the default, an absent choice means the default; only default-less choices are
   undecided when absent (D24, amending D13). The AST does not distinguish the two cases;
   the checker does.
9. **No redundancy.** A fact is written once. The checker's normalise step removes what the
   data proves redundant (D23); `emit` never does.

---

## 1. Lexical structure

- UTF-8. Line endings `\n` (parsers accept `\r\n`). Lines are trimmed before parsing.
- **Blank lines are insignificant** (D18). Canonical form puts one blank line before each block
  header and nowhere else.
- A line that is exactly `---` is **reserved** (future multi-build separator) and is `E010`.
- Matching is **case-insensitive** everywhere (keys, class names, entity names, source codes,
  quoted or not). Case is preserved in the AST; canonical emit writes keys and block headers
  in canonical case and values as authored. Equality of two pastes is defined on the AST
  (§4), never on text.

---

## 2. Lines, blocks, scopes

Each non-blank line is exactly one of:

| Kind | Form | Where |
|---|---|---|
| **Identifier** | text containing no `:` and not matching a block header | first non-blank line only |
| **Level header** | `L<n> <Ref>` | after the identifier and after any entity blocks |
| **Key line** | `<Key>: <value>` | anywhere; some keys **open a block** (§2.3) |

Anything else is `E001`.

### 2.1 Identifier line

Optional. The build's name. It may not contain `:`. An identifier-shaped line anywhere but
first is `E001`.

### 2.2 Level header and level blocks

```
L<n> <Ref>
```

`n` is a positive integer in the profile's range (`dnd5e`: 1–20), no leading zeros. `Ref` is
a reference (§3.2) to the class this level is taken in. Level headers must be **strictly
increasing** (`E004`); gaps are normal — a level with no choices is simply absent. A level
header opens a **level block** that runs to the next block header or end of document. Key
lines in it are **placed** at that character level and belong to that class.

### 2.3 Entity blocks

A profile may mark some keys as **block-opening**. A block-opening key line (`Species: Elf`)
opens an **entity block**: the key lines that follow, up to the next block header, are the
picks that entity asks for. Entity blocks must come **before** the first level block and
each block-opening key may open at most one block (`E014`).

In `dnd5e` the block-opening keys are `Species` and `Background` (§5.1).

### 2.4 Key lines and scopes

```
<Key>: <value>
```

- `Key` is one of the profile's keys, or an extension key beginning with `X-` (§2.5). Anything
  else is `E002`.
- The separator is the first `:` followed by a space or end of line. Keys never contain `:`;
  a value containing `:` must quote it (§3.1).
- An empty value is `E006`.
- The same key may not appear twice in one **scope** (`E003`).
- Each key declares in which scopes it may appear (§5.1). A key in a scope it is not allowed in
  is `E005`.

**Scopes.** *Header scope* = key lines before the first block header. *Entity scope* = the
lines of one entity block. *Level scope* = the lines of one level block. A choice key in
header scope is an **unplaced** choice.

### 2.5 Versioning and extensions

- `Paste: <int>` is an optional header-scope key naming the spec's major version. Absent
  means 1. A parser that does not support the stated version reports `E015` and still parses.
- Keys beginning with `X-` are **extension keys**: parsed as item lists, kept in the AST,
  reported as `W001`, written back by `emit` unchanged. This is the only escape from rule 2.

---

## 3. Values

Every key has a **value type** declared by the profile. The core defines four:

| Type | Grammar | Used by (`dnd5e`) |
|---|---|---|
| `items` | item list (§3.1), `,`-separated | most keys |
| `item` | exactly one item (`E007` if more) | `Species`, `Background`, `Ability`, some keys in a level block |
| `enum` | one token from a fixed set | `Rules` |
| `int` | integer | `Paste` |

A profile may add typed values of its own (`dnd5e` adds `classes`, `scores`, `asi`, §5.2).
A value that does not match its type is `E012`.

### 3.1 Item

```
[-]<Name>[|<SOURCE>][ [<group>[; <group>]...]][ x<qty>]
<group>  := <detail>[, <detail>]...
<detail> := <Name>[|<SOURCE>][ @<n>]
```

| Part | Meaning |
|---|---|
| `-` | **Drop**: the item leaves the build at this level (a spell swap, a replaced optional feature). Valid only in a level scope on an `items` key (`E008`). |
| `Name` | The entity's name as printed. Written bare when it contains none of `, ; : [ ]` and does not start with `-` or `"`; otherwise **quoted** with `"…"` (`"Bag of Tricks, Gray"`, `"Channel Divinity: Turn Undead"`). No name in the 5etools corpus contains `"` or `[` `]`; parentheses, apostrophes, `/` and `+` are ordinary characters (`Arrows (20)`, `Blindness/Deafness`, `+1 Longsword`). |
| `\|SOURCE` | Optional source code, 5etools convention (`XPHB`, `PHB`, `TCE`, `AAG`, …). Homebrew uses the code its file declares, or `HB` when it has none (D9). |
| `[group; group]` | **Details**: the sub-choices this item asks for, in the **slot order the profile fixes for that key** (§5.3). Groups are `;`-separated, details inside a group `,`-separated. An empty group keeps its `;` so later groups keep their slot; trailing empty groups are dropped. A detail has no details of its own (no nested brackets, `E011`). |
| `@<n>` | On a detail only (`E013`): the sub-choice is made at character level *n*, for an item gained earlier that asks again later. |
| `x<qty>` | Quantity ≥ 2, `Equipment` and `Items` only (`E009`). |

### 3.2 References

A reference is `Name[|SOURCE]`. The parser normalises (trim, unquote) and nothing more.
Resolution is the consumer's. Two references are *compatible* when names match
case-insensitively and either source is absent or both match; the parser never dedupes or
matches drops against adds — the checker does, on resolved entities. Subclasses may be
written by their printed name or their short name (`Celestial`, `Celestial Patron`,
`The Celestial`); consumers match either.

---

## 4. AST (normative for conformance tests)

```ts
interface Paste {
  identifier: string | null;
  header: Scope;                  // header-only keys + unplaced choices + X- keys
  entities: EntityBlock[];        // dnd5e: at most one Species, one Background
  levels: LevelBlock[];           // ascending n
  diagnostics: Diagnostic[];      // never thrown
}
type Scope = Map<string, Value>;  // canonical key → value
interface EntityBlock { key: string; item: Item; lines: Scope; }
interface LevelBlock  { n: number; class: Ref; lines: Scope; }
type Value =
  | { type: "items"; items: Item[] }
  | { type: "enum";  value: string }
  | { type: "int";   value: number }
  | ProfileValue;                 // dnd5e: classes | scores | asi (§5.2)
interface Item   { ref: Ref; drop: boolean; details: Detail[][]; qty: number | null; }
interface Detail { ref: Ref; at: number | null; }
interface Ref    { name: string; source: string | null; }
interface Diagnostic { code: string; line: number; message: string; }
```

Parsing never throws. On an error line the parser records the diagnostic and skips the line.
`emit` is defined only for an AST without `E*` diagnostics. Two pastes are equal when their
ASTs are equal with list order ignored on `items` values (order is meaningful only inside
`classes` and `scores`).

---

## 5. Profile `dnd5e`

Covers the 2014 and 2024 rules. `Rules:` names the default edition for source-less references
(D8); absent, the AST carries no default and consumers apply their own.

### 5.1 Keys

*Scopes:* **H** header · **S** Species block · **B** Background block · **L** level block.
*Type* per §3; **items¹** = `items` in H, `item` in L.

| Key | Type | Scopes | Meaning |
|---|---|---|---|
| `Paste` | int | H | spec major version (§2.5) |
| `Rules` | enum `2014`/`2024` | H | default edition |
| `Scores` | scores | H | six **base** scores `STR/DEX/CON/INT/WIS/CHA`, e.g. `8/13/14/12/10/15` |
| `Classes` | classes | H | classes in the order taken, with levels **as played now**; `Fighter 1 / Warlock 5` |
| `Species` | item · **opens block** | H | the species; its picks are the block's lines. 2024 lineages are a `Feature` line in the block; 2014 subraces are part of the name, the 5etools way: `Species: Elf (Wood)|PHB`, `Species: Human (Variant)|PHB` |
| `Background` | item · **opens block** | H | the background; official: block holds only the picks it asks (2024: `ASI`); custom/homebrew: the block holds everything (`ASI`, `Skills`, `Tools`, `Feat`, `Equipment`) so the paste is complete without the homebrew file (D21, D26) |
| `Subclass` | items¹ | H, L | the class's subclass; in L it belongs to the block's class |
| `ASI` | asi | H, S, B, L | ability bonuses: `+2 CHA` or `+1 INT, +1 CON`. In S/B: the species (2014) or background (2024) bonuses. In L: the ASI taken at that level |
| `Ability` | item | S, B, L | a **casting-ability pick** (INT/WIS/CHA) asked by a species trait or feature. A feat's casting ability goes in the feat's details (§5.3) |
| `Skills` | items | H, S, B, L | skill proficiencies **chosen** |
| `Tools` | items | H, S, B, L | tool proficiencies chosen |
| `Languages` | items | H, S, B, L | languages chosen |
| `Expertise` | items | H, L | |
| `Feat` | items | H, S, B, L | any feat: origin feat asked by a species or custom background, ASI-slot feat at a level. Details per §5.3 |
| `Fighting Style` | items | H, L | 2014 optional feature or 2024 feat, same key either way. A list even in a level block, so an extra style granted by the DM is writable (D34) |
| `Masteries` | items | H, L | weapon-mastery loadout from that level on (a snapshot: masteries swap on long rests) |
| `Options` | items | H, L | **every optional feature** regardless of family: invocations, metamagic, manoeuvres, infusions, arcane shots, runes, elemental disciplines, 2014 pact boons, … 5etools tags each one's family, so the format never needs a new key for a new family (D27). Details = the option's own picks |
| `Feature` | items | H, S, B, L | a **named feature with a pick and no dedicated key**: `Feature: Divine Order [Warden]`, `Feature: Elven Lineage [High]`, `Feature: Draconic Ancestry [Red]`, `Feature: Size [Small]`; also an **optional class feature adopted** with no pick (`Feature: Favored Foe|TCE`). Details = the picks (§5.3). Placed in S/B/L it belongs to that entity; unplaced in H the consumer finds the owner (D28) |
| `Cantrips` | items | H, S, B, L | cantrips chosen |
| `Spells` | items | H, S, B, L | spells the build **adds to its repertoire** at that level: learned, scribed, or picked on level-up by a prepared-on-level-up caster. A caster that prepares from its whole list (2024 Cleric, Druid, Paladin) adds nothing, so it has no `Spells` lines — its default loadout is `Prepared` |
| `Prepared` | items | H, L | default prepared loadout, **only** for casters whose repertoire exceeds the prepare count (a full-list preparer, a wizard's spellbook). The checker's normalise step removes it where `Spells` already says it (D23) |
| `Equipment` | items | H, B, L | **starting gear**: in B the background's option letter (`A`/`B`) or items; in the **first level block** the class's option letter (`A`/`B`/`C`) or items; in H unplaced items. Letters exist only under 2024 rules; 2014 builds list items |
| `Items` | items | H, L | **magic items and other gear acquired in play**, placed at the level gained (`Items: Cloak of Protection, +1 Longsword`). Details = the item's own picks when 5etools models them as such (most variants are baked into the name: `"Instrument of the Bards, Doss Lute"`). Generic magic variants are not 5etools entities: a `+N ` prefix is stripped and the base item resolved (`+1 Longsword` → `Longsword`, D40); named variants (`Flame Tongue Greatsword`) resolve only if a data source lists them. Never a choice the rules owe, so the checker never reports it missing (D33) |

Abilities are `STR DEX CON INT WIS CHA`, case-insensitive.

### 5.2 Profile value types

- **`classes`** — `<Ref> <levels>` entries separated by ` / `. `levels` is an integer ≥ 0;
  `0` marks a class not yet taken but planned in a level block. A bare `Ref` with no count
  means "levels unknown" and is legal only when the paste has no level blocks. Malformed:
  `E012`.
- **`scores`** — six integers separated by `/`, in `STR/DEX/CON/INT/WIS/CHA` order.
- **`asi`** — one or more `+<n> <ABI>` entries, `,`-separated. Grouping is preserved
  (`+2 CHA` is one entry; `+1 INT, +1 CON` two).

### 5.3 Detail slot orders

Details are positional. The profile fixes the slot order per key; empty slots keep their `;`.

- **`Feat`**: `[<ability>; <picks in printed order>...]`. The first slot is the feat's ability
  pick when it has one — a score bonus choice (`Resilient [CON]`) or a casting-ability choice
  (`Magic Initiate [WIS; Cleric; Guidance, Sacred Flame; Bless]`); empty when the feat asks
  none (`Skilled [; Arcana, History, Insight]`). Later slots follow the feat's own printed
  order. A later upgrade of the feat is stamped `@n` on its detail.
- **`Options`**: the option's picks in printed order (`Agonizing Blast [True Strike]`).
- **`Feature`**: the feature's picks in printed order (`Divine Order [Warden]`).
- **`Subclass`**, **`Species`**, **`Background`** items carry **no details**: their picks are
  lines (`Feature`, `Skills`, `Ability`, …) in the relevant block or level.

### 5.4 Placement and resolution

- `Classes` states levels as played. A level block whose `n` exceeds the sum of `Classes` is
  a **planned** level; its class must appear in `Classes` (with `0` if not yet taken).
- A placed line belongs to its block's character level and class. `Subclass` at
  `L4 Warlock` is the Warlock subclass chosen at character level 4.
- **Unplaced lines carry no class qualifier** (D28). A consumer assigns an unplaced choice to
  the class that can own it; when several classes can, it may assign it to any of them. The
  parser records it with no class.
- `-Item` in a level block drops an item added earlier; the checker verifies it.
- `Prepared` and `Masteries` in a level block describe the default loadout from that level
  until the next such line.
- **Defaults are silent** (rule 8): `Equipment` absent means option A under 2024 rules; a
  lineage with a printed default means that default; a species that offers Small or Medium is
  **Medium unless `Feature: Size [Small]` says otherwise** (D39).

### 5.5 Canonical form (data-free)

1. Identifier line, if any.
2. Header scope in this order: `Paste`, `Rules`, `Scores`, `Classes`, then unplaced choice
   keys in §5.1 table order (`Items` last), then `X-` keys alphabetically.
3. Blank line, `Species` block; blank line, `Background` block; each with its lines in §5.1
   order.
4. Each level block, ascending, header `L<n> <Class>`, lines in §5.1 order.
5. Keys in canonical case; one space after `:`; items `, `-separated as authored; groups
   `; `-separated; names quoted only when §3.1 requires it; trailing empty groups dropped.

Anything that needs data — folding a redundant `Prepared`, dropping a default, moving a
species skill written in H into the Species block — is **normalise**, in the checker (D30).

---

## 6. Checker (scope note)

**Extras are accepted.** A pick the rules do not owe at that point — a third feat at level 4, a
second fighting style, a bonus invocation, an `Items` line — is reported as **extra** at *info*
severity and otherwise treated as part of the build: a DM boon is a legitimate build fact, and the
paste's job is to replay the build, not to adjudicate it (D34). Only grammar problems are errors;
every checker finding is a warning or an info.

Given the AST, a slot table derived from 5etools-format data (`choose`, `featProgression`,
`optionalfeatureProgression`, `additionalSpells`, `_versions`, equipment `defaultData`) **plus
a hand-kept supplement for prose-only slots** (Divine Order, Draconic Ancestry, Mystic
Arcanum, 2014 equipment picks, invocation sub-picks such as Agonizing Blast's cantrip), the
checker reports: **missing** (a default-less slot owed at or below the played level with no
line), **misplaced** (a slot that does not exist at that level or class — including a resolved
`Cantrips`/`Spells`/`Prepared` pick that is not on the block's class list, a chosen subclass's
granted/expanded list, or granted by a feat picked anywhere in the build), **unresolved** (no
match, or several), **redundant** (a granted item written as a choice; `Prepared` for a
pick-on-level-up caster; a written default), **unplaced** (a header choice more than one class
could own), **extra** (a pick with no slot, accepted — see above). It never edits the paste; `normalise` is a separate, explicit step that returns a
new AST.

A `Classes` entry at level 0 with no level block for that class is reported `unplaced`/info
("declares nothing") but stays legal and untouched by `normalise` (D42). A ref that fails to
resolve outright falls back, when 4+ characters, to the one entity of the same kind whose name
contains it case-insensitively — reusing `unresolved` at info ("resolved as …", noting an edition
mismatch); two or more such matches stay unresolved as before (D43).

On a `Rules: 2014` paste the L1 class block and the background owe one named item per
starting-equipment choice group (`missing`/info); groups with a generic option ("any simple
weapon") are not judged. `finalScores` sums the `Scores` line with species, background, `ASI`
and feat increments over played levels (D36); an increment past 20 is `misplaced`/warning, and a
background bonus outside the background's three abilities stays the existing info finding.

---

## 7. Diagnostics

| Code | Meaning |
|---|---|
| E001 | malformed line; identifier not first |
| E002 | unknown key |
| E003 | duplicate key in one scope |
| E004 | level header not strictly increasing, or out of profile range |
| E005 | key not allowed in this scope |
| E006 | empty value |
| E007 | list given to an `item`-typed key |
| E008 | drop prefix outside a level scope or on a non-`items` key |
| E009 | quantity on a key other than `Equipment` or `Items` |
| E010 | reserved line `---` |
| E011 | malformed item: unbalanced brackets or quotes, nested brackets, empty name |
| E012 | value does not match the key's type (`classes`, `scores`, `asi`, `enum`, `int`) |
| E013 | `@<n>` outside a detail |
| E014 | entity block after a level block, or a second block for the same key |
| E015 | unsupported `Paste` version |
| W001 | extension key (`X-`) kept but not understood |
| W002 | hint: a bare name on `Feat`/`Options`/`Feature`/`Subclass`/`Fighting Style` ends in a parenthesised group — details go in `[brackets]` (`Resilient (CON)` → `Resilient [CON]`) |

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

### 8.2 Flat snapshot (unplaced), multiclass

```
Rules: 2024
Classes: Fighter 3 / Warlock 3
Subclass: Battle Master, Celestial
Fighting Style: Archery
Options: Riposte, Trip Attack, Precision Attack, Agonizing Blast [Eldritch Blast], Repelling Blast [Eldritch Blast]
Feat: Resilient [CON]
Cantrips: Eldritch Blast, Mind Sliver
Spells: Hex, Armor of Agathys, Misty Step
```

### 8.3 Full timeline

`fixtures/shigen.dndpaste`, `fixtures/vice.dndpaste` — the two reference builds (D17).

### 8.4 Species block, custom background, feat sub-picks, class feature pick

```
Rules: 2024
Scores: 10/14/13/8/16/12
Classes: Druid 4

Species: Elf
Feature: Elven Lineage [Wood]
Skills: Perception
Ability: WIS

Background: Custom
ASI: +2 WIS, +1 DEX
Skills: Insight, Stealth
Tools: Herbalism Kit
Feat: Magic Initiate [WIS; Druid; Guidance, Shillelagh; Goodberry]

L1 Druid
Feature: Primal Order [Warden]
Skills: Nature, Survival
Cantrips: Produce Flame, Thorn Whip
Prepared: Cure Wounds, Entangle, Faerie Fire, Healing Word

L3 Druid
Subclass: Circle of the Moon

L4 Druid
ASI: +2 WIS
```

### 8.5 Names that need quoting

```
Equipment: "Bag of Tricks, Gray", Arrows (20) x2
Feature: "Channel Divinity: Harness Divine Power" [Harness Divine Power]
```

---

## 9. Reserved for later versions

- `---` multi-build separator (variants, parties) — D6, D18.
- `Game:` header selecting a profile other than `dnd5e` — O1.
- `Paste: 2` when a breaking change ever forces one (§2.5).
