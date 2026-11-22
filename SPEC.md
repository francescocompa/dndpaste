# dndpaste — format specification

**Version:** 0.12 (draft, 2026-11-22) · **Status:** signed off at 0.3; 0.4 adds `Items` and the extras policy; 0.5 adds named partial `Scores`, `Classes` runs and the class-per-level reading rule; 0.6 adds the optional `HP` key; 0.7 adds the optional `Producer` stamp; 0.8 has fewer keys: ability picks move into details, `Scores` carries increases, `Feat` takes a slot marker, `Gear` replaces `Equipment` and `Items`, and an empty value is a to-do (§10); 0.9 adds option family keys (`Invocations`, …), a family marker on `Options`, a level cap on `Spells` and `Prepared`, a free-text `Note` key, form details on summons and pact boons, and keeps a line with an error instead of dropping it (§11); 0.10 puts a species' lineage and its spellcasting ability in brackets on the `Species` line, `Species: Elf [Drow; WIS]` (§12); 0.11 writes the base `Scores` line named, `STR 8/DEX 14/…`, and adds an optional method marker, `Scores (point buy): …` (§13); 0.12 makes `Masteries` add up across levels, like `Spells`, with `-Name` to drop one (§14). 0.7 keys are still read, with a warning, for as long as `Paste: 1` (§2.6, D142) · Decisions: `DECISIONS.md` D1–D113, D180–D185, D200–D206, D220–D221, D280–D287, D320, D323, D326, D337, D340–D343.

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
5. **No free text**, except the optional identifier line (D12) and the `Note` key (D200).
6. **Canonical emit is data-free and lossless.** `emit(parse(emit(a))) === emit(a)` for any
   AST `a`. A line with an error is kept as written, never dropped (§4, D202). Anything that needs
   game data to decide (redundancy, defaults) belongs to the checker's *normalise* step, not to
   `emit` (D30).
7. **A choice belongs to the entity that asks it.** Species and background picks are lines in
   that entity's block; a feat's or optional feature's picks are its bracket details; a class
   feature's picks are a `Feature` line in the class's level block (D22, D26). An ability pick is
   the first detail of the line that asks it, never a line of its own (D107).
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
| **Key line** | `<Key>: <value>`, or `<Key>:` with no value yet | anywhere; some keys **open a block** (§2.3) |

Anything else is `E001`, a `#` comment line included: free text goes in `Note` (D200).

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
lines in it are **placed** at that character level and belong to that class. A level with no
header takes its class by the reading rule (§5.4).

### 2.3 Entity blocks

A profile may mark some keys as **block-opening**. A block-opening key line (`Species: Elf`)
opens an **entity block**: the key lines that follow, up to the next block header, are the
picks that entity asks for. Entity blocks must come **before** the first level block and
each block-opening key may open at most one block (`E014`).

In `dnd5e` the block-opening keys are `Species` and `Background` (§5.1).

### 2.4 Key lines and scopes

```
<Key>[ (<marker>)]: <value>
```

- `Key` is one of the profile's keys, or an extension key beginning with `X-` (§2.5). Anything
  else is `E002`. A profile may let a key take a **marker** in parentheses, of one of three kinds:
  an **open** marker, any text kept as written (`dnd5e`: `Feat (Origin)`, `Options (Soul
  Techniques)`), a **level cap** from a fixed set (`dnd5e`: `Spells (3rd)`), §5.1, §5.7, or a
  **method** from a fixed set (`dnd5e`: `Scores (point buy)`, §5.2). A marker on a key that takes
  none, a level cap or a method outside its set, or an empty marker is `E002`. A profile
  may fold a marker into another key (`Options (Invocation)` is `Invocations`, §5.7).
- The separator is the first `:` followed by a space or end of line. Keys never contain `:`;
  a value containing `:` must quote it (§3.1).
- An **empty value** means "not chosen yet" (D112): `W004`. The line parses as the empty form of
  its type (an empty list, no classes, no scores, empty text; `Paste`, `Rules` and `HP`, which
  have no empty form, hold `empty`, §4), consumers treat it as absent, and `emit` keeps it as a
  to-do: `Spells:`.
- The same key may not appear twice in one **scope** (`E003`). A marked key is its own key
  (`Feat` and `Feat (Origin)` may share a scope; `Feat (Origin)` twice may not, markers matched
  case-insensitively). Two spellings that fold into one key are that key twice (`Invocations` and
  `Options (Invocation)`, `E003`). `Scores` may appear once as a base and once as an increase (§5.2);
  its method marker does not make it another key (`Scores (point buy)` is the base line).
- Each key declares in which scopes it may appear (§5.1). A key in a scope it is not allowed in
  is `E005`.

**Scopes.** *Header scope* = key lines before the first block header. *Entity scope* = the
lines of one entity block. *Level scope* = the lines of one level block. A choice key in
header scope is an **unplaced** choice.

### 2.5 Versioning and extensions

- `Paste: <int>` is an optional header-scope key naming the spec's major version. Absent
  means 1. A parser that does not support the stated version reports `E015` and still parses.
- Keys beginning with `X-` are **extension keys**: parsed as item lists, kept in the AST,
  reported as `W001`, written back by `emit` unchanged: the reserved prefix as `X-`, the rest of
  the name as authored (`X-Plan-B` stays `X-Plan-B`, D56). Keys are case-insensitive, so `X-Foo`
  and `x-foo` in one scope are the same key (`E003`). This is the only escape from rule 2. Free text for
  people (a plan, a version B) goes in `Note`, not in an `X-` key.

### 2.6 Renamed keys

A minor version may rename or merge keys. The parser then reads the old key as an **alias** for as
long as the major version (`Paste`) stays the same, 1.0 included (D142): it reports `W005` ("renamed key"), puts the line where its new form goes
in the AST, and `emit` writes the new form. A paste written for the older minor version keeps
working. The aliases of 0.8 are listed in §5.6. How a format change is proposed, released and
retired: `FORMAT-UPDATES.md`.

---

## 3. Values

Every key has a **value type** declared by the profile. The core defines four:

| Type | Grammar | Used by (`dnd5e`) |
|---|---|---|
| `items` | item list (§3.1), `,`-separated | most keys |
| `item` | exactly one item (`E007` if more) | `Species`, `Background`, some keys in a level block |
| `enum` | one token from a fixed set | `Rules` |
| `int` | integer | `Paste` |

A profile may add typed values of its own (`dnd5e` adds `classes`, `scores`, `hp`, `text`, §5.2).
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
| `Name` | The entity's name as printed. Written bare when it contains none of `, ; : [ ]` and does not start with `-` or `"`; otherwise **quoted** with `"…"` (`"Bag of Tricks, Gray"`, `"Channel Divinity: Turn Undead"`). No name in the 5etools corpus contains `"` or `[` `]`; parentheses, apostrophes, `/` and `+` are ordinary characters (`Arrows (20)`, `Blindness/Deafness`, `+1 Longsword`, `Vehicles (Land)`; on a `Species` line a last group is read as a 0.9 variant, §5.8). Parentheses in a **key** are a marker (§2.4); in a **name** they are part of the name. |
| `\|SOURCE` | Optional source code, 5etools convention (`XPHB`, `PHB`, `TCE`, `AAG`, …). Homebrew uses the code its file declares, or `HB` when it has none (D9). It always follows the name, before the details: `Fey Touched|TCE [CHA]`, `Elf|PHB [Wood]` (D286). A source written after the brackets (`Elf [Wood]|PHB`) is `E011`, with a safe fix that puts it after the name. |
| `[group; group]` | **Details**: the sub-choices this item asks for, in the **slot order the profile fixes for that key** (§5.3). Groups are `;`-separated, details inside a group `,`-separated. An empty group keeps its `;` so later groups keep their slot; trailing empty groups are dropped. A detail has no details of its own (no nested brackets, `E011`). |
| `@<n>` | On a detail only (`E013`): the sub-choice is made at character level *n*, for an item gained earlier that asks again later. |
| `x<qty>` | Quantity ≥ 2, `Gear` only (`E009`). |

### 3.2 References

A reference is `Name[|SOURCE]`. The parser normalises (trim, unquote) and nothing more.
Resolution is the consumer's. Two references are *compatible* when names match
case-insensitively and either source is absent or both match; the parser never dedupes or
matches drops against adds — the checker does, on resolved entities. Subclasses may be
written by their printed name, their short name (`Celestial`, `Celestial Patron`,
`The Celestial`) or their short name before the class name (`Diviner Wizard`, D220); consumers
match any of them. A reference with no `|SOURCE` is a **bare name**; the profile says which
printing it means (`dnd5e`: §5, D221).

---

## 4. AST (normative for conformance tests)

```ts
interface Paste {
  identifier: string | null;
  header: Scope;                  // header-only keys + unplaced choices + X- keys
  entities: EntityBlock[];        // dnd5e: at most one Species, one Background
  levels: LevelBlock[];           // ascending n
  diagnostics: Diagnostic[];      // never thrown
  kept?: KeptLine[];              // lines with an error, as written (D202)
}
type Scope = Map<string, Value>;  // canonical key → value; an open marker as written: "Feat (Origin)";
                                  // a folded family marker as its key: "Invocations"; a cap in lower case: "Spells (3rd)"
interface EntityBlock { key: string; item: Item | null; lines: Scope; }   // null: no value yet
interface LevelBlock  { n: number; class: Ref; lines: Scope; }
type Value =
  | { type: "items"; items: Item[] }
  | { type: "enum";  value: string }
  | { type: "int";   value: number }
  | { type: "empty" }             // no value yet, for a type with no empty form (§2.4)
  | ProfileValue;                 // dnd5e: classes | scores | hp | text (§5.2)
interface Item   { ref: Ref; drop: boolean; details: Detail[][]; qty: number | null; }
interface Detail { ref: Ref; at: number | null; }
interface Ref    { name: string; source: string | null; }
interface Diagnostic { code: string; line: number; message: string; hint?: string; fix?: Fix; }
interface KeptLine { line: number; text: string; scope: "H" | "S" | "B" | number; }  // number: a level block's n
interface Fix     { label: string; safe: boolean; edits: FixEdit[]; }   // §7
interface FixEdit { line: number; text: string | null; insert?: boolean; }
```

Parsing never throws. On an error line the parser records the diagnostic, leaves the line out of
every scope and keeps it as written in `kept`, with the block it stood in (D202). `emit` writes each
kept line, as written, at the end of that block (after the `X-` keys), so `emit` never drops what an
author wrote and the errors read again the same way: `emit` is defined for every AST. Two pastes are equal when their
ASTs are equal with list order ignored on `items` values (order is meaningful only inside
`classes` and `scores`).

The `classes` value keeps its entries as written, so a class written as runs (§5.2) appears
more than once; its totals and the class of every level follow §5.2 and §5.4. A runs paste and
its canonical form (totals plus switch-point headers, §5.5) describe the same build: compare
them after canonical emit. A `scores` value holds a scope's `Scores` lines (D108): `values`, six
slots in `STR…CHA` order, `null` for an ability the base leaves out (all six `null` when the scope
has no base line), `increase`, the increase line's bonuses or `null`, and `method`, the base line's
method marker (`standard-array`, `point-buy` or `custom`), absent when none is written (D323):
`{ type: "scores"; values: (number | null)[]; increase: { amount: number; ability: Ability }[] | null; method?: "standard-array" | "point-buy" | "custom" }`.
A scope's lines in canonical order, one entry per line, are the library's `scopeLines`.

---

## 5. Profile `dnd5e`

Covers the 2014 and 2024 rules. `Rules:` names the default edition for source-less references
(D8); absent, the AST carries no default. A **bare name means its newest printing** in the
`Rules` edition, or in either edition when there is no `Rules` (D221). Two exceptions: a setting
book's or an adventure's printing gives way to a core book's printing in the same edition
(`Elf` under 2024 rules is the 2024 Player's Handbook elf), and a published printing comes before
an Unearthed Arcana one. A name that only Unearthed Arcana prints always carries its code.

### 5.1 Keys

*Scopes:* **H** header · **S** Species block · **B** Background block · **L** level block.
*Type* per §3; **items¹** = `items` in H, `item` in L.

| Key | Type | Scopes | Meaning |
|---|---|---|---|
| `Paste` | int | H | spec major version (§2.5) |
| `Producer` | text | H | **producer stamp**, optional (D62): what wrote the paste and its version, `character-forge 2.1`. Free single-line text, kept as written; no format is checked. For tracing odd output only: it never changes what the build means, and absent has no finding |
| `Rules` | enum `2014`/`2024` | H | default edition |
| `Scores` | scores | H, S, B, L | **The `+` decides** (D108). Without `+`, the **base** scores, header only, once, named: `STR 8/DEX 13/CON 14/INT 12/WIS 10/CHA 15`, or the ones known, `DEX 15/CON 13`; also read: six numbers in `STR/DEX/CON/INT/WIS/CHA` order, `8/13/14/12/10/15`, and the comma form, `DEX 15, CON 13`. A base line may name its method: `Scores (point buy): …` (§5.2). With `+`, an **increase**: `+2 CHA`, `+1 INT, +1 CON`; in S/B the species (2014) or background (2024) bonuses, elsewhere any other increase. A level's Ability Score Improvement is a `Feat` line, not an increase (D109). A base outside the header is `E005` (§5.2) |
| `Classes` | classes | H | classes in the order taken, with levels **as played now**; `Fighter 1 / Warlock 5`. An interleaved multiclass may write **runs**: `Fighter 1 / Rogue 3 / Fighter 6 / Rogue 14` (§5.2) |
| `HP` | hp | H, L | **hit-point method**, optional (D59). In H: `Fixed` (the class's fixed value at each level after 1st) or `Rolled`. In L: that level's method, overriding H: `Fixed`, `Rolled`, or the **die result** rolled there (`HP: 7`). Level 1 always takes the die's maximum, so it has no line. Absent: no method stated, never assumed |
| `Species` | item · **opens block** | H | the species. Its **defining pick**, the lineage or ancestry that splits it (Elven Lineage, Gnomish Lineage, Fiendish Legacy, Draconic Ancestry, Giant Ancestry and their like), goes in its brackets, then that lineage's spellcasting ability when it asks one: `Species: Elf [Drow; WIS]`, `Species: Dragonborn [Black]`, `Species: Goliath [Fire]` (D280, D281). A 2014 subrace is the same form: `Species: Elf|PHB [Wood]`, `Species: Human|PHB [Variant]` (D282). Every other species pick (skills, size, an origin feat, a cantrip) is a line in the block. An `Ability: WIS` line in the block, after a `Species` line that names a lineage and no ability, is that ability: it reads with no warning and is written in the brackets (D281). The 0.9 forms read with a warning (§5.8) |
| `Background` | item · **opens block** | H | the background; official: block holds only the picks it asks (2024: a `Scores` increase); custom/homebrew: the block holds everything (`Scores` increase, `Skills`, `Tools`, `Feat`, `Gear`) so the paste is complete without the homebrew file (D21, D26) |
| `Subclass` | items¹ | H, L | the class's subclass. In L, the block where its class gains the subclass, and it belongs to the block's class (D220); in H, unplaced (a flat snapshot, or a subclass still to come) |
| `Skills` | items | H, S, B, L | skill proficiencies **chosen** |
| `Tools` | items | H, S, B, L | tool proficiencies chosen |
| `Languages` | items | H, S, B, L | languages chosen |
| `Expertise` | items | H, L | |
| `Feat` | items | H, S, B, L | any feat: origin feat asked by a species or custom background, ASI-slot feat at a level. A level's ASI is the feat line in both editions: `Feat: Ability Score Improvement [+2 CHA]` (D109). The key takes an optional **slot marker** naming the limited slot the feat fills: `Feat (Fighting Style): Archery`, `Feat (Origin): Alert`, `Feat (Epic Boon): Boon of Fate [CHA]` (D110). Open list: any text, kept by emit; the checker matches it to the 5etools feat categories. A fighting style is `Feat (Fighting Style)` in both editions, 2014 optional feature or 2024 feat. Details per §5.3 |
| `Masteries` | items | H, L | weapon masteries **added** at that level, like `Spells` (D337): a level line lists only the new masteries, `-Name` drops one held (a swap is `Masteries: Flail, -Sap`), and a name the build already holds is ignored. The loadout at a level is the sum (§5.4). In H: the masteries held, unplaced. An `Options` family (D182): `Options (Masteries)` reads as `Masteries` (§5.7) |
| `Invocations` `Metamagic` `Maneuvers` `Infusions` `Arcane Shots` `Runes` `Disciplines` `Pact Boon` | items | H, L | **option family keys** (D180): an `Options` line that also names its family, one key per family, in this order. Same details and rules as `Options` (§5.3). §5.7 |
| `Options` | items | H, L | **any optional feature**, of any family: a family key's options, or one whose family has no key. Takes an optional **family marker**, an open list (D181): `Options (Soul Techniques): …`; a marker that names a family key folds into it (§5.7). 5etools tags each option's family, so a new family needs no new key (D27). Details = the option's own picks |
| `Feature` | items | H, S, B, L | a **named feature with a pick and no dedicated key**: `Feature: Divine Order [Warden]`, `Feature: Spellcasting [INT]`, `Feature: Size [Small]`, `Feature: Draconic Ancestry [Red]` for a Draconic Sorcerer; also an **optional class feature adopted** with no pick (`Feature: Favored Foe|TCE`). A feature the build gets anyway is not written; a build may still name one, bare, in the block where it arrives, to **highlight** it (`L2 Wizard` / `Feature: Portent`, D201). Details = the picks (§5.3). Placed in S/B/L it belongs to that entity; unplaced in H the consumer finds the owner (D28) |
| `Cantrips` | items | H, S, B, L | cantrips chosen |
| `Spells` | items | H, S, B, L | spells the build **adds to its repertoire** at that level: learned, scribed, or picked on level-up by a prepared-on-level-up caster. A caster that prepares from its whole list (2024 Cleric, Druid, Paladin) adds nothing, so it has no `Spells` lines — its default loadout is `Prepared`. Takes an optional **level cap** (D184): `Spells (6th): Mass Suggestion` (§5.7). A spell the build gets without choosing it (a domain's or patron's always-prepared spell, a species spell, Find Familiar from Pact of the Chain) is not written; written where it arrives, it is a **highlight** and fills no slot (D201) |
| `Prepared` | items | H, L | default prepared loadout, **only** for casters whose repertoire exceeds the prepare count (a full-list preparer, a wizard's spellbook). The checker's normalise step removes it where `Spells` already says it (D23). Takes an optional level cap, as `Spells` |
| `Gear` | items | H, B, L | **Placement decides** (D111). In B or the **L1 block**: the **starting pick**, the background's (`A`/`B`) or the class's (`A`/`B`/`C`) option letter, or items; letters exist only there and only under 2024 rules (2014 builds list items). Anywhere else in a level block: **gear gained in play**, placed at the level gained (`Gear: Cloak of Protection, +1 Longsword`). In H: gear carried, unplaced. Gear in play and in H is never a choice the rules owe, so the checker never reports it missing (D33). Details = the item's own picks when 5etools models them as such (most variants are baked into the name: `"Instrument of the Bards, Doss Lute"`). Generic magic variants are not one entity per base item: the checker resolves them from 5etools' magic-variant data plus the base item, by the variant's own name (`Vicious Weapon`, `+2 Armor`) or its naming affix around a base item it applies to (`Flame Tongue Warhammer`, `+1 Longsword`); failing that, a `+N ` prefix is stripped and the base item resolved (D40, D55) |
| `Note` | text | H, S, B, L | **free text for people** (D200): a plan, an alternative, a reminder, `Note: Eldritch Knight planned at L3`. Kept as written, one line per block; a second thought goes on the same line. Means nothing to the build: the checker ignores it. Written last in its block |

Abilities are `STR DEX CON INT WIS CHA`, case-insensitive.

### 5.2 Profile value types

- **`classes`** — `<Ref> <levels>` entries separated by ` / `, in the order taken. `levels` is
  an integer ≥ 0; `0` marks a class not yet taken but planned in a level block. A bare `Ref`
  with no count means "levels unknown" and is legal only when the paste has no level blocks.
  Malformed: `E012`.
  - **Runs** (D49). A class may appear more than once: each entry is a **run** that takes the
    class up to that **class level**, and the entries compute as an ordered list.
    `Fighter 1 / Rogue 3 / Fighter 6 / Rogue 14` is Fighter to 1, then Rogue to 3, then Fighter
    to 6, then Rogue to 14: a 20-level Fighter 6 / Rogue 14. A class's entries must each carry
    a count, strictly increase, never be `0`, and name at most one source; otherwise `E012`.
  - **Totals.** A class's total is its last entry; the played total is the sum of the class
    totals (20 above, not 24). Without repeats the entries are the totals, as before.
- **`scores`** — one `Scores` line is either a base or an increase; the `+` decides (D108).
  - A **base** — scores before species, background and feat increases (D46) — in one of two
    forms: **named**, full or partial: `<ABI> <n>` entries separated by `/` or `,`, in any order,
    each ability at most once, missing abilities simply absent: `STR 8/DEX 15/CON 13/INT 10/WIS 14/CHA 12`,
    `DEX 15/CON 13`, `DEX 15, CON 13` (D106); or six integers separated by `/`, in
    `STR/DEX/CON/INT/WIS/CHA` order: `8/15/13/10/14/12`. Every form reads the same, with no
    diagnostic; the named form with `/` is canonical (§5.5, D320). No placeholders (`?` is `E012`);
    numbers and names do not mix. An ability left out is **unknown**, never assumed 10. Header
    only (`E005` elsewhere).
  - A base line may carry a **method marker** (D323): `Scores (standard array): …`,
    `Scores (point buy): …` or `Scores (custom): …`, matched ignoring case and spacing, written in
    lower case. It says how the paste's author made the base, and is optional: no marker is the
    default, and consumers may read the method from the numbers instead (`scoreKind`, §6). The
    parser does not compare the marker with the numbers: `Scores (standard array): 18/18/18/18/18/18`
    reads with no diagnostic (a hint for consumers, never a check, D66). An empty marked line,
    `Scores (point buy):`, is a to-do with its method (`W004`). Another method, or an empty
    marker, is `E002`; a marker on an increase line is `E012`, with a safe fix that drops it; a
    marked line outside the header is `E005`.
  - An **increase** — one or more `+<n> <ABI>` entries, `,`-separated. Grouping is preserved
    (`+2 CHA` is one entry; `+1 INT, +1 CON` two). A line mixing both forms is `E012`.
- **`text`** — the rest of the line, trimmed, kept as written. By convention `<producer name> <version>`; nothing is validated (D62).
- **`hp`** — `Fixed` or `Rolled`, case-insensitive, written in that case. In a level block also a
  positive integer, no leading zeros: the hit die's result at that level, before the
  Constitution modifier, which implies `Rolled`. An integer in header scope is `E012` (D59).

### 5.3 Detail slot orders

Details are positional. The profile fixes the slot order per key; empty slots keep their `;`.

**One rule for `Feat`, `Feature` and `Options` (D107):** when the thing asks an ability, the
ability is the **first slot**, then its picks in printed order: `Feat: Resilient [CON]`,
`Feature: Spellcasting [INT]`. When it asks none, there is
**no leading slot**: `Feat: Skilled [Arcana, History, Insight]`, `Feature: Divine Order [Warden]`.
A feat whose score increase also sets its casting ability writes the ability once
(`Fey Touched [CHA; …]`). An ability slot is one bare ability name (`STR`…`CHA`); the parser keeps
it as an ordinary detail group and the checker, which knows what asks an ability, reads it. On a
2024 feat whose ability slot also raises that score (a half feat or an epic boon; not an origin or
fighting-style feat), `+1 CHA` is accepted as the same pick: `Grappler [+1 STR]` reads as
`Grappler [STR]` (D206). `[STR]` stays the canonical spelling; `emit` keeps what was written.

- **`Feat`**: `[<ability>; <picks in printed order>...]` — a score bonus choice (`Resilient [CON]`)
  or a casting-ability choice (`Magic Initiate [WIS; Cleric; Guidance, Sacred Flame; Bless]`),
  then the feat's own printed order. A later upgrade of the feat is stamped `@n` on its detail.
  `Ability Score Improvement` (short name `ASI`) holds its increases as one group:
  `[+2 CHA]`, `[+1 INT, +1 CON]` (D109). The `+x` may be left out (D341): one ability alone is +2
  (`[CHA]` is `[+2 CHA]`), and an ability beside another is +1 (`[INT, CON]` and `[+1 INT, CON]` are
  `[+1 INT, +1 CON]`). `emit` keeps what was written.
- **`Options`** and the **family keys** (§5.7): the option's picks in printed order (`Agonizing Blast [True Strike]`). An
  option that grants a feat names the feat as its pick (`Lessons of the First Ones [Alert]`).
  When that feat has picks of its own, a `Feat` line for it in the **same level block**
  carries them, because details do not nest (`E011`, D50):
  `Options: Lessons of the First Ones [Magic Initiate]` with
  `Feat: Magic Initiate [CHA; Wizard; Mind Sliver, Ray of Frost; Chromatic Orb]`. That `Feat`
  line is the option's feat, not an ASI-slot feat.
- **`Feature`**: the ability, if asked, then the feature's picks in printed order
  (`Divine Order [Warden]`, `Spellcasting [INT]`).
- **A chosen form** (D195): an option or spell that calls a creature or a pact weapon whose form the
  player picks names that form as its one detail: `Invocations: Pact of the Chain [Imp]`,
  `Invocations: Pact of the Blade [Glaive]`, `Spells: Find Familiar [Owl]`, `Prepared: Find Steed
  [Warhorse]`, `Spells: Summon Fey [Fuming]`. Optional; any other spell takes no details.
- **`Species`**: `[<lineage>; <ability>]`, the one exception to ability-first (D281): the name part leads.
  The lineage is written short, without the word that repeats the species or the trait (`Elf [Wood]`,
  `Goliath [Fire]`, `Gnome [Rock]`); the checker also reads the data's long name (`Wood Elf`, `Fire Giant`).
  No lineage asked, no brackets; a lineage with no ability asked, one group (`Dragonborn [Black]`).
- **`Subclass`** and **`Background`** items carry **no details**: their picks are
  lines (`Feature`, `Skills`, `Scores`, …) in the relevant block or level. So do every species pick
  but the defining one (D280).

### 5.4 Placement and resolution

- `Classes` states levels as played. A level block whose `n` exceeds the played total (the
  sum of the class totals, §5.2) is a **planned** level; its class must appear in `Classes`
  (with `0` if not yet taken).
- **Class of each level — the reading rule** (D49). Walk the levels from 1:
  - *Played levels, `Classes` written as runs:* the runs give each level's class. A level
    header must agree with them (`E016`).
  - *Played levels, otherwise:* a level header fixes its level's class. An unheadered level
    continues the current class while it has levels left, else takes the first class in
    `Classes` order with levels left. A class's levels left are its total minus the levels it
    has taken minus its headers still to come, so a later header keeps its level:
    `Classes: Fighter 9 / Warlock 3` with headers `L2 Warlock`, `L11 Warlock`, `L12 Warlock`
    reads L3–L10 as Fighter. A header whose class has no levels left is `W003`; it still fixes
    its level.
  - *Planned levels:* a header fixes the class; an unheadered level continues the previous one.
  - A flat paste (no level blocks) therefore reads in `Classes` order, as it always did.
- A placed line belongs to its block's character level and class. `Subclass` at
  `L4 Warlock` is the Warlock subclass chosen at character level 4.
- **Unplaced lines carry no class qualifier** (D28). A consumer assigns an unplaced choice to
  the class that can own it; when several classes can, it may assign it to any of them. The
  parser records it with no class.
- `-Item` in a level block drops an item added earlier; the checker verifies it.
- `HP` in a level block is that level's method only; a level with no `HP` line takes the header's
  method, or none when the header has no `HP` (D59).
- **The loadout at a level** (D337). `Prepared` in a level block is a snapshot: the default
  prepared spells from that level until the next `Prepared` line. `Masteries` adds up: the
  masteries held at a level are the header's line, then each level block's line up to that level
  in order, each name added once, each `-Name` taking one away. A later line that repeats held
  names and leaves one out is the 0.11 snapshot form: it reads as adding (the name left out is
  still held) and warns `W008`. The library's `loadoutAt(paste, level)` gives both, data-free.
- **Defaults are silent** (rule 8): no starting `Gear` means option A under 2024 rules; a
  lineage with a printed default means that default; a species that offers Small or Medium is
  **Medium unless `Feature: Size [Small]` says otherwise** (D39).

### 5.5 Canonical form (data-free)

1. Identifier line, if any.
2. Header scope in this order: `Paste`, `Producer`, `Rules`, `Scores`, `Classes`, `HP`, then unplaced choice
   keys in §5.1 table order (`Gear` last), then `X-` keys alphabetically ignoring case, each
   written as authored after the `X-` prefix (§2.5). A base `Scores` line is written in the
   named form, `STR…CHA` order, `/`-separated, full or partial: `Scores: STR 8/DEX 14/CON 13/INT 12/WIS 10/CHA 15`,
   `Scores: DEX 16/CHA 17` (D320); its method marker, if any, is kept, in lower case,
   `Scores (point buy): …`; an increase line follows the base line and keeps its `,`. `Classes` is written as
   **totals**: one entry per class, in first-appearance order, with its total (runs fold:
   `Fighter 1 / Rogue 3 / Fighter 6 / Rogue 14` → `Fighter 6 / Rogue 14`).
3. Blank line, `Species` block; blank line, `Background` block; each with its lines in §5.1
   order.
4. Each level block, ascending, header `L<n> <Class>`, lines in §5.1 order. A paste with a
   timeline (at least one level block, or `Classes` written as runs) also gets a **level
   header at each class change**: at every level where the class read by §5.4 differs from
   the level before, an empty level block is written if there is no block yet. That is where
   the order of runs goes when they fold, so the fold loses nothing:
   `Classes: Fighter 1 / Rogue 3 / Fighter 6 / Rogue 14` emits as `Classes: Fighter 6 / Rogue 14`
   with headers `L2 Rogue`, `L5 Fighter`, `L10 Rogue`. Headers go at changes only, not at every
   level, and a flat paste stays flat (D49).
5. Keys in canonical case; one space after `:`; items `, `-separated as authored; groups
   `; `-separated; names quoted only when §3.1 requires it; trailing empty groups dropped.
6. In every scope, a key that takes a marker comes first, then its marked lines by marker,
   ignoring case: `Feat`, `Feat (Origin)`; `Options`, `Options (Soul Techniques)`; `Spells`,
   `Spells (2nd)`, `Spells (3rd)`. `Note` comes after `Gear`, last of the profile's keys (D200). An open marker is written as authored (`Feat (fighting style)`
   stays); a level cap in lower case; a folded family marker as its key (`Options (invocation)` →
   `Invocations`). An empty value is written `Key:` with
   no trailing space (D112). A 0.7 `Ability` line that stayed (§5.6) is written last, before the
   `X-` keys. A kept line (§4) follows the `X-` keys, as written.

Anything that needs data — folding a redundant `Prepared`, dropping a default, moving a
species skill written in H into the Species block — is **normalise**, in the checker (D30).

### 5.6 0.7 keys (aliases for as long as `Paste: 1`)

Read with `W005` in their 0.7 scopes (`E005` elsewhere), written in their 0.8 form (D113):

| 0.7 line | 0.8 form |
|---|---|
| `ASI: +2 CHA` in S or B | `Scores: +2 CHA` |
| `ASI: +2 CHA` in H or L | `Feat: Ability Score Improvement [+2 CHA]` (added to the scope's `Feat` line) |
| `Ability: WIS` | in the Species block after a `Species` line that names a lineage and no ability: that ability, in the brackets, with no warning (D281, §5.1). Otherwise the first detail of the scope's one `Feature` item (`Size` aside): `Feature: Spellcasting [WIS]`. With no single owner the parser has no data to choose one, so the line **stays as written** and is emitted as `Ability: WIS` |
| `Fighting Style: Archery` | `Feat (Fighting Style): Archery` |
| `Equipment: …`, `Items: …` | `Gear: …` (both merge into one `Gear` line) |

### 5.7 Option families and level caps (0.9)

**Family keys** (D180). An optional feature may go on its family's key or on `Options`; both mean
the same. The family names the 5etools family the line's options belong to:

| Key | Folds from `Options (…)` | 5etools family |
|---|---|---|
| `Masteries` | `Masteries`, `Mastery` | weapon masteries (weapons, not optional features, D182) |
| `Invocations` | `Invocations`, `Invocation` | `EI` Eldritch Invocations |
| `Metamagic` | `Metamagic`, `Metamagics` | `MM` Metamagic |
| `Maneuvers` | `Maneuvers`, `Maneuver` | `MV` Maneuvers |
| `Infusions` | `Infusions`, `Infusion` | `AI` Artificer Infusions |
| `Arcane Shots` | `Arcane Shots`, `Arcane Shot` | `AS` Arcane Shots |
| `Runes` | `Runes`, `Rune` | `RN` Runes |
| `Disciplines` | `Disciplines`, `Discipline` | `ED` Elemental Disciplines |
| `Pact Boon` | `Pact Boon`, `Pact Boons` | `PB` Pact Boons (2014; a 2024 pact is an invocation) |

**Family marker** (D181). `Options` takes an open marker naming a family. A marker in the table's
middle column, in any case, **folds**: the line is that family key's line, and `emit` writes the
key (`Options (invocation): Agonizing Blast` → `Invocations: Agonizing Blast`). Any other marker
stays as written (`Options (Soul Techniques): …`), so a family from a new book needs no format
change. The fold needs no game data. Class features with a pick stay `Feature` lines
(`Feature: Divine Order [Thaumaturge]`); `Feature` takes no marker (D183).

**Level cap** (D184). `Spells` and `Prepared` take an optional cap: an ordinal `1st` to `9th`,
matched case-insensitively and written in lower case. It names the highest spell level the line
picks from. A capped line is its own key, so it shares a scope with the uncapped one:

```
L11 Warlock
Spells: Counterspell
Spells (6th): Mass Suggestion
```

Anything else in the parentheses (`(3)`, `(cantrip)`, `(10th)`, `(3th)`) or a cap on another key
(`Cantrips (1st)`) is `E002`.

**Reading them.** A consumer that reads options reads `Options`, its marked lines and the family
keys (the library's `keyGroup` gives `Options` for each); one that reads spells reads the capped
lines too (`keyGroup` gives `Spells`, `levelCap` the cap).

---

### 5.8 0.9 lineage forms (0.10)

Read with a warning, written in the bracket form (D282, D283); saved 0.9 pastes keep working:

| 0.9 line | 0.10 form |
|---|---|
| `Feature: Elven Lineage [WIS; Wood]` in the Species block: a feature whose name ends in `Lineage`, `Legacy` or `Ancestry` (`W006`) | `Species: Elf [Wood; WIS]`: the lineage, then the ability, whichever order the feature had them. The parser moves it only when the `Species` line has no brackets yet; otherwise the line stays as written. In a level block or the header, such a feature is a class pick and stays (`Feature: Draconic Ancestry [Red]` for a Draconic Sorcerer) |
| `Species: Elf (Wood)\|PHB`: one trailing parenthesised group, no brackets (`W007`) | `Species: Elf\|PHB [Wood]`. Only the last group moves: `Elf (Kaladesh) (Vahadar)\|PSK` → `Elf (Kaladesh)\|PSK [Vahadar]`; a quoted name with `;` or `,` inside stays |

Both carry a safe fix; Tidy makes it by writing the canonical form. The checker maps `Elf|PHB [Wood]` back to
the data's `Elf (Wood)|PHB` (§6).

---

## 6. Checker (scope note)

**Extras are accepted.** A pick the rules do not owe at that point — a third feat at level 4, a
second fighting style, a bonus invocation, gear gained in play — is reported as **extra** at *info*
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
weapon") are not judged. `finalScores` sums the base `Scores` line with species, background, header and level increases
(`Scores: +…`), `Ability Score Improvement` feat lines (a bare ability counted as in §5.3, D341) and feat increments over played levels (D36): a half feat's picked ability, and a half feat's fixed increase with nothing written (`Durable`, `Keen Mind`; the slot table's `abilityFixed`, D340); an increment past 20 is `misplaced`/warning, and a
background bonus outside the background's three abilities stays the existing info finding. An
ability the named `Scores` form leaves out has an **unknown** final score (`null`): it is never
assumed 10, and increases on it are not cap-checked (D46).

`scoreKind` reads a base from its numbers alone, with no game data (D326): `standard-array` when
the known numbers are the standard array's (`15, 14, 13, 12, 10, 8`, each once), else `point-buy`
when each is 8–15 and their point-buy cost is within 27, else `custom`; with the points left of 27,
or none when the numbers are not point-buy legal. The narrower kind wins (the standard array also
costs 27). It is a hint, never a finding: a paste's method marker (§5.2) is what its author says,
and the library does not report a marker the numbers break.

`HP` is never owed: a paste without it has no finding (D59). A level-1 `HP` line is
`misplaced`/warning (level 1 takes the die's maximum); a die result above the hit die of that
level's class (§5.4) is `misplaced`/warning; a level `HP: Fixed` or `HP: Rolled` that repeats the
header's method is `redundant`/info, and `normalise` removes it. A level line that differs from the
header, a roll included, is an override and stays.

Any feat is legal at an ASI level, Origin feats included: the 2024 Ability Score Improvement
feature grants "another feat of your choice for which you qualify" (D54). A General feat from
a species or background stays `misplaced`. A `Feat` line claimed by an option that grants a
feat (§5.3) is neither an ASI-slot feat nor an extra; a granting option with no feat named or
written is `missing`/info, and a feat of the wrong category `misplaced` (D50).

**0.8 additions.** An empty value reads as absent (D112). A level's `Feat: Ability Score
Improvement [+2 CHA]` (or `ASI`) fills the level's ASI slot in both editions and is never
`unresolved`; increases that are not +2 to one ability or +1 to two are `unresolved`/info, none at
all `missing`/info (D109). A slot marker is matched to the 5etools feat categories by name or code
(`Fighting Style` also takes the Paladin and Ranger replacement categories): no match with a near
name is `unresolved`/warning with the nearest name ("did you mean"), no match at all is
`unresolved`/info and accepted; a resolved feat outside the marker's category is
`misplaced`/warning (D110). A feat fills a fighting-style slot when its marker says so or, unmarked,
when the data says it is a fighting-style feat; a 2014 fighting style resolves as an optional
feature. An option letter in `Gear` outside the background and L1 is `misplaced`/info (D111). A
species that asks a casting ability with no ability slot written is `missing`/info (D107). The
category names come from the 5etools mirror's `js/parser.js` through the extract; a table
without them falls back to the same list built into the checker.

**0.9 additions** (D185). Family lines, marked `Options` lines and capped spell lines count into the
same slots as `Options` and `Spells`. Each line is also checked against itself. An option on a
family line that resolves to another family is `misplaced`/warning. An open marker is matched to
the table's family names and codes (`Options (Eldritch Invocations)`, `Options (EI)`): a near
miss is `unresolved`/warning with the nearest name ("did you mean"), no match at all is
`unresolved`/info and accepted. A spell above its line's cap is `misplaced`/warning. The cap is
never judged against what the class can cast.

**After the wide user test** (D192, D193, D195, D201, D204–D206, D220, D221).

- *Owed picks say where to add them.* A `missing` pick reads "Cleric: 1 of 3 Cantrips written; add 2 at
  L1 Cleric" (no level blocks: "add 2 to the Cantrips line"), and the finding's `at` names the key and
  level block to add it to, `null` for the header. A written `Subclass` counts as picked even when it
  resolves to nothing.
- *Granted spells and features are highlights* (D201). A spell the build gets without choosing it (a
  subclass's always-prepared list, a species spell, a fixed spell of a feat or an option it took) is
  never counted, never `misplaced` and never "more than the rules grant". A bare `Feature` the data
  knows no pick for is silent wherever it is written. `Prepared` is a loadout and fills no slot, in a
  level block or the header.
- *Source codes* (D205). A code that no entity of the slot table carries is not resolved; the ref is
  accepted with one `unresolved`/info finding saying what the code is: homebrew (`HB`), an Unearthed
  Arcana code from the library's list (`UA_SOURCES`), or not a known book code. A known book that the
  table lacks (the SRD subset knows every book code the full table cites, `meta.sources`) resolves as
  before.
- *Ability slots* (D206). `[+1 CHA]` on a 2024 half feat or epic boon reads as `[CHA]`; on any other
  feat it is `unresolved`/info ("write [CHA]").
- *Gear* (D195). A name written twice on one `Gear` line is `redundant`/info ("write Shortsword x2");
  `normalise` writes the quantity.
- *Options* (D195). `normalise` moves a plain `Options` line onto its family key when every pick on it
  resolves to that family (`Options: Pact of the Chain` → `Invocations: Pact of the Chain`).
- *Subclass placement* (D220). A `Subclass` line in a level block where its class does not gain the
  subclass is `misplaced`/warning: "Wizard gets its subclass at class level 3, not 1; move it to L3
  Wizard", or "Evoker is a Wizard subclass; move it to L6 Wizard" in another class's block. The
  finding's `at` names the block (`{ key: "Subclass", level: 3 }`); a class that has not reached
  its subclass level yet gets "move it to the header until then" (`level: null`). A header
  `Subclass` has no placement finding, and one ahead of its class level is a plan, not an extra.
- *Bare names* (D221). A bare name resolves to its newest printing as §5 says; "matches several
  sources" remains only for printings with the same date, or a slot table with no release dates
  (`meta.sourceDates`, `meta.settingSources`), which falls back to the core books. A bare name
  that resolves only to Unearthed Arcana content is `unresolved`/warning: "write it as
  Mystic|UATheMysticClass". With the data the extract reads, only a few entities are playtest
  material (the Mystic class and its subclasses); other playtest codes are not in the table and
  stay accepted at info (D205).
- *Codes* (D204). Each finding carries the code of its kind:

| Code | Kind |
|---|---|
| C001 | missing |
| C002 | misplaced |
| C003 | unresolved |
| C004 | redundant |
| C005 | unplaced |
| C006 | extra |

**0.10 additions** (D280–D283, D287). The `Species` line's first group is the lineage. The checker reads it
against the species' lineage options: the data's versions, or the supplement's for a prose-only trait (D35).
When the resolved printing doesn't offer it, a bare name takes the one printing that does (`Elf [Lorwyn]` is
the Lorwyn elf), and otherwise `Base (Lineage)` names the data's 2014 subrace (`Elf|PHB [Wood]` is
`Elf (Wood)|PHB`). A missing lineage is a warning that names the bracket form (`Elf [Drow | High | Wood]`); a
missing spellcasting ability is info; a lineage or ability outside the options is info; a lineage on a species
that has none, or an ability no lineage asks, is an accepted extra. A lineage written before the name
(`Wood Elf`, `Black Dragonborn`, `Hill Dwarf`) reads as the bracket form, with an info, when the whole name is
no species and the rest is one that offers that lineage (D287); `normalise` writes it, and the library's
`tidy` does when the caller brings the species data (`TidyOptions.species`, the checker's `speciesLineage`).

---

## 7. Diagnostics

| Code | Meaning |
|---|---|
| E001 | malformed line; identifier not first |
| E002 | unknown key; a marker on a key that takes none, an empty marker, a level cap outside `1st`–`9th`, or a `Scores` method other than `standard array`, `point buy`, `custom` (§2.4, §5.2, §5.7) |
| E003 | duplicate key in one scope |
| E004 | level header not strictly increasing, or out of profile range |
| E005 | key not allowed in this scope |
| E006 | *retired in 0.8*: an empty value is `W004` (D112) |
| E007 | list given to an `item`-typed key |
| E008 | drop prefix outside a level scope or on a non-`items` key |
| E009 | quantity on a key other than `Gear` |
| E010 | reserved line `---` |
| E011 | malformed item: unbalanced brackets or quotes, nested brackets, empty name, a source after the brackets (D286) |
| E012 | value does not match the key's type (`classes`, `scores`, `asi`, `enum`, `int`), including runs that do not strictly increase and a method marker on a `Scores` increase (§5.2) |
| E013 | `@<n>` outside a detail |
| E014 | entity block after a level block, or a second block for the same key |
| E015 | unsupported `Paste` version |
| E016 | a level header contradicts the `Classes` runs at a played level (§5.4) |
| W001 | extension key (`X-`) kept but not understood |
| W002 | hint: a bare name on `Feat`/`Options`/a family key/`Feature`/`Subclass` ends in a parenthesised group — details go in `[brackets]` (`Resilient (CON)` → `Resilient [CON]`) |
| W003 | a level header's class has no levels left in `Classes` at a played level (totals form, §5.4); the header still fixes its level |
| W004 | no value yet: the key is "not chosen yet", parsed as empty, kept by emit (D112) |
| W005 | renamed key: a 0.7 key read as its 0.8 form (§2.6, §5.6) |
| W006 | a 0.9 defining-pick `Feature` line in the Species block, moved onto the `Species` line (§5.8, D283) |
| W007 | a 0.9 species name with its variant in parentheses (`Elf (Wood)`), read as `Elf [Wood]` (§5.8, D282) |
| W008 | a level's `Masteries` line repeats masteries already held and leaves one out (the 0.11 snapshot form): the one left out is still held. Its fix, not safe, writes the new names and the drop: `Masteries: Flail, -Sap` (§5.4, D337, D342) |

**Hints and fixes** (D192, D203). Every error and most warnings carry a `hint`: how to fix it, in a few
words ("Move above Species", "Did you mean Classes?", "Join with commas", "Use / between classes"). When
the parser can write the fix, `fix` holds it as text edits on the paste as written; the library's
`applyFix(text, fix)` makes them. A fix marked `safe` changes no choice: it moves a header key out of a
block, joins a key's duplicate lines, puts `/` between classes written with commas, or adds the space
after a colon. A guess (a did-you-mean, a comment turned into a `Note`) is not safe. The library's
`tidy(text)` makes every safe fix of every error, writes a 0.11 snapshot `Masteries` line that only adds as
an additive one (§14), then writes the canonical form; a line it cannot fix stays as written (D202). A
`W008` line stays as written, so its warning stays until the author answers it (D342).

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
Feat: Resilient [CON]
Feat (Fighting Style): Archery
Options: Riposte, Trip Attack, Precision Attack, Agonizing Blast [Eldritch Blast], Repelling Blast [Eldritch Blast]
Cantrips: Eldritch Blast, Mind Sliver
Spells: Hex, Armor of Agathys, Misty Step
```

### 8.3 Full timeline

`fixtures/shigen.dndpaste`, `fixtures/vice.dndpaste` — the two reference builds (D17).

### 8.4 Species block, custom background, feat sub-picks, class feature pick

```
Rules: 2024
Scores: STR 10/DEX 14/CON 13/INT 8/WIS 16/CHA 12
Classes: Druid 4

Species: Elf [Wood; WIS]
Skills: Perception

Background: Custom
Scores: +2 WIS, +1 DEX
Skills: Insight, Stealth
Tools: Herbalism Kit
Feat: Magic Initiate [WIS; Druid; Guidance, Shillelagh; Goodberry]

L1 Druid
Skills: Nature, Survival
Feature: Primal Order [Warden]
Cantrips: Produce Flame, Thorn Whip
Prepared: Cure Wounds, Entangle, Faerie Fire, Healing Word
Gear: A

L3 Druid
Subclass: Circle of the Moon

L4 Druid
Feat: Ability Score Improvement [+2 WIS]
```

### 8.5 Names that need quoting

```
Feature: "Channel Divinity: Harness Divine Power" [Harness Divine Power]
Gear: "Bag of Tricks, Gray", Arrows (20) x2
```

### 8.6 Partial scores, runs, a feat from an invocation, a slot marker, a to-do

```
Rules: 2024
Scores: DEX 16/CHA 17
Classes: Sorcerer 1 / Warlock 2 / Sorcerer 5 / Bard 6

Species: Human|XPHB
Feat (Origin): Alert

L3 Warlock
Feat: Magic Initiate [CHA; Wizard; Mind Sliver, Ray of Frost; Chromatic Orb]
Options: Agonizing Blast [Eldritch Blast], Lessons of the First Ones [Magic Initiate]
Cantrips: Eldritch Blast

L10 Bard
Subclass: College of Valor
Spells:
```

`Spells:` is a to-do (W004): the Bard's level-10 spells are not chosen yet.

Canonical form: `Classes: Sorcerer 5 / Warlock 2 / Bard 6`, with empty `L2 Warlock`,
`L4 Sorcerer` and `L8 Bard` blocks added at the class changes that have no block yet.

---

### 8.7 A 0.7 paste and its 0.8 form

```
Species: Elf
Ability: WIS
Feature: Elven Lineage [Wood]

Background: Custom
ASI: +2 WIS, +1 DEX

L1 Fighter
Fighting Style: Archery
Equipment: A
Items: Rope x2

L4 Fighter
ASI: +2 STR
```

reads with one `W005` per renamed line and a `W006` for the lineage line (§5.8), and emits as

```
Species: Elf [Wood; WIS]

Background: Custom
Scores: +2 WIS, +1 DEX

L1 Fighter
Feat (Fighting Style): Archery
Gear: A, Rope x2

L4 Fighter
Feat: Ability Score Improvement [+2 STR]
```

---

### 8.8 Family keys and a level cap (0.9)

```
Rules: 2024
Classes: Warlock 11

L2 Warlock
Invocations: Agonizing Blast [Eldritch Blast], Pact of the Tome [Guidance, Light, Thaumaturgy; Bless, Detect Magic]

L11 Warlock
Spells: Counterspell
Spells (6th): Mass Suggestion
```

`Options (Invocation): Agonizing Blast [Eldritch Blast]` reads as the same `Invocations` line.
`fixtures/mc-planned-20-families.dndpaste` is `mc-planned-20` in 0.9 form, and
`fixtures/noncanonical/` keeps its long form.

---

### 8.9 A note, a highlight and a chosen form (0.9)

```
Rules: 2024
Classes: Warlock 5
Note: Pact of the Blade at L5 in version B

L2 Warlock
Invocations: Pact of the Chain [Imp], Agonizing Blast [Eldritch Blast]

L3 Warlock
Subclass: Fiend Patron
Feature: Dark One's Blessing
Spells: Burning Hands
```

`Pact of the Chain [Imp]` names the familiar's form. `Feature: Dark One's Blessing` and
`Spells: Burning Hands` highlight what the patron gives at level 3: the patron always prepares Burning
Hands, so the line fills no Spells slot. A test reads this build from here.

---

## 9. Reserved for later versions

- `---` multi-build separator (variants, parties) — D6, D18.
- `Game:` header selecting a profile other than `dnd5e` — O1.
- `Paste: 2` when a breaking change ever forces one (§2.5).

---

## 10. Changes from 0.7

0.8 (D106–D113) changes the key set. A 0.7 paste still reads, with a `W005` per renamed line
(§2.6, §5.6), and `emit` writes it in 0.8 form; character-forge and other 0.7 writers keep working.

- **Ability picks move into details** (D107). The `Ability` key goes. Every ability pick is the
  first detail of the `Feat`, `Feature` or `Options` that asks it; no ability asked, no leading
  slot. A feat asking none drops 0.7's empty leading slot: `Skilled [Arcana, History, Insight]`
  (the checker still reads `[; …]`).
- **`Scores` carries increases** (D108); `ASI` goes. The `+` decides: `Scores: 8/13/14/12/10/15`
  is the base, `Scores: +2 CHA` an increase, in any scope.
- **A level's ASI is a feat line** (D109): `Feat: Ability Score Improvement [+2 CHA]`, both
  editions; the checker accepts `ASI` as its short name.
- **`Feat` takes a slot marker** (D110): `Feat (Fighting Style): Archery`. `Fighting Style` goes.
- **`Gear` replaces `Equipment` and `Items`** (D111); placement decides starting pick or gear in play.
- **Named scores take `/`** too (D106): `STR 8/DEX 13/CON 14`.
- **An empty value is a to-do** (D112): `W004`, kept by emit. `E006` is retired.
- AST: `scores` values carry `increase`; the `asi` value type is gone; `empty` is new;
  `EntityBlock.item` may be `null`; a marked feat line is the scope key `Feat (<marker>)`.

---

## 11. Changes from 0.8

0.9 (D180–D185, D200–D206) adds keys and markers and renames nothing: every 0.8 paste reads and emits as
before, with no new warning (§2.6). The additions are minor-version.

- **Option family keys** (D180): `Invocations`, `Metamagic`, `Maneuvers`, `Infusions`,
  `Arcane Shots`, `Runes`, `Disciplines`, `Pact Boon`, between `Masteries` and `Options` in the
  canonical order. `Options` stays valid for any family (amends D27).
- **`Options` takes a family marker** (D181): `Options (Soul Techniques)`, an open list. A family
  key's name, singular or plural, folds into the key. `Masteries` is a family too (D182).
- **`Spells` and `Prepared` take a level cap** (D184): `Spells (3rd)`, `1st` to `9th`.
- Class-feature picks stay `Feature` lines (D183).
- Checker: each line against its own family and cap (D185).
- AST: new scope keys (`Invocations`, `Options (<marker>)`, `Spells (3rd)`). The library adds
  `resolveKey`, `keyGroup`, `levelCap`, `familyOf`, and `KeyDef.marker` and `KeyDef.family`.
- **`Note`** (D200): free text for people, any block, last in its block. A `#` line stays `E001`, with a
  fix that turns it into a `Note`.
- **Highlights** (D201): a feature or spell the build gets anyway may be named where it arrives.
- **A chosen form in brackets** (D195): `Pact of the Chain [Imp]`, `Find Steed [Warhorse]`.
- **`[+1 CHA]`** reads as `[CHA]` on a 2024 half feat (D206).
- **No silent loss** (D202): a line with an error is kept as written in `Paste.kept` and `emit` writes it
  back in its block.
- **Hints and fixes** (D192, D203): `Diagnostic.hint` and `Diagnostic.fix`; the library adds `applyFix`,
  `tidy`, `foldOptions`, `familyKey` and `abilityOf`.
- Checker: owed picks say where to add them, granted spells and bare features are silent, source codes
  outside the data are infos, repeated Gear names, finding codes (§6, D204, D205).

---

## 12. Changes from 0.9

0.10 (D280–D287) moves one pick and renames no key. A 0.9 paste still reads: its lineage `Feature` line and an
`Elf (Wood)` species name read with a warning (`W006`, `W007`) and `emit` writes the 0.10 form (§5.8).

- **The defining pick goes on the `Species` line** (D280): `Species: Elf [Drow]`, `Dragonborn [Black]`,
  `Goliath [Fire]`. Its `Feature` line goes. Amends D26 for that one pick.
- **Then its spellcasting ability** (D281): `Species: Elf [Drow; WIS]`. An `Ability: WIS` line in the Species
  block also reads, with no warning, and is written in the brackets.
- **2014 subraces use the same form** (D282): `Species: Elf|PHB [Wood]`; `Elf (Wood)|PHB` reads with `W007`.
- **The source goes after the name**, before the brackets, on every item, as before (D286); `Elf [Wood]|PHB`
  is `E011` with a safe fix.
- Checker: lineage and ability slots on the `Species` line, `Elf [Wood]` mapped to the data's `Elf (Wood)`,
  `Wood Elf` read as `Elf [Wood]` (§6, D287). Supplement: `lineageAbility`.
- Library: `W006`, `W007`; `speciesPicks`, `speciesLineage`, `shortLineage` (`dndpaste/check`);
  `TidyOptions.species`.

## 13. Changes from 0.10

0.11 (D320, D323, D326) changes one canonical form and adds one optional marker; it renames no key and needs no
alias. Every 0.10 paste reads as before, with no new diagnostic, and means the same; `emit` and Tidy write the new
form.

- **The base `Scores` line is written named, with `/`** (D320; amends §5.5 rule 2): `Scores: 8/14/13/12/10/15` and
  `Scores: STR 8, DEX 14, CON 13, INT 12, WIS 10, CHA 15` are written `Scores: STR 8/DEX 14/CON 13/INT 12/WIS 10/CHA 15`;
  a partial base `Scores: DEX 16, CHA 17` is written `Scores: DEX 16/CHA 17`. Reading is unchanged (§5.2). The
  increase line keeps its commas, `Scores: +2 WIS, +1 DEX`. Kind: a canonical-form change (`FORMAT-UPDATES.md` §1).
- **An optional method marker on the base line** (D323): `Scores (standard array): …`, `Scores (point buy): …`,
  `Scores (custom): …`, kept in lower case. Not written by default. Kind: an addition.
- Library: the `scores` value's optional `method` (§4); `scoreKind` with the constants `STANDARD_ARRAY`,
  `POINT_BUY_COST`, `POINT_BUY_BUDGET`, data-free, also exported from `dndpaste/check` (D326, §6); `lineOfValue`
  and `methodWords`.

## 14. Changes from 0.11

0.12 (D337, D340–D343) changes what a level's `Masteries` line means; it renames no key and needs no alias. A 0.11
paste whose later `Masteries` lines only add reads the same, with no new diagnostic. One that drops a mastery by
leaving it out now keeps it, with `W008`. Tidy writes the snapshot lines that only add as additive ones.

- **`Masteries` adds up, like `Spells`** (D337; amends §5.1 and §5.4). A level line lists only the masteries new at
  that level, and `-Name` drops one. Kind: a meaning change inside `Paste: 1`, read the same wherever the 0.11 line
  only added (`FORMAT-UPDATES.md` §1).

  ```
  0.11 (snapshot)                               0.12 (additive)
  L1 Fighter                                    L1 Fighter
  Masteries: Longsword, Sap, Handaxe            Masteries: Longsword, Sap, Handaxe
  L4 Fighter                                    L4 Fighter
  Masteries: Longsword, Sap, Handaxe, Lance     Masteries: Lance
  L10 Fighter                                   L10 Fighter
  Masteries: Longsword, Handaxe, Lance, Flail   Masteries: Flail, -Sap
  ```

  Read as 0.12, the left column's L10 line keeps Sap and warns `W008`; its fix writes the right column's line. Tidy
  rewrites the L4 line and leaves the L10 line as written (D342). `Prepared` stays a snapshot.
- **An ASI and a half feat count with no `+x`** (D341, D340; amends §5.3). `Feat: Ability Score Improvement [CHA]` is
  `[+2 CHA]`; `[INT, CON]` is `[+1 INT, +1 CON]`. A half feat with a fixed increase (`Feat: Durable`) raises its score
  with nothing written. Kind: an addition; every 0.11 line means the same.
- Library: `W008`; `masteryWalk`, `foldMasteries` (called by `tidy` and the checker's `normalise`) and `loadoutAt`,
  data-free, `loadoutAt` also exported from `dndpaste/check` (D343); the slot table's feat field `abilityFixed`
  (regenerate `data/slots.json`, D340); `finalScores` counts both feat forms.
