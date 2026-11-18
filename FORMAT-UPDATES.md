# Format updates — how the dndpaste format changes

> **Decided (D142–D145, 2026-11-17).** Written from what the 0.8 release did, as the plan for every later format change.

The format is the contract between apps. A change to it reaches every app that reads or writes
pastes, and every paste already saved. This page says how a change goes from an idea to a release,
and how an old form is retired.

## 1. Kinds of change

| Kind | Example | Version (D57) | Old pastes |
|---|---|---|---|
| **Addition** | a new optional key (`HP`, `Producer`) or value form (`/` in named scores) | minor | mean the same |
| **Rename or merge** | `Equipment` + `Items` → `Gear` | minor | read through an alias, with `W005` |
| **Break** | an old key changes meaning, or an alias is removed | major (`Paste: 2`) | need a rewrite |
| **Fix** | a parser or checker bug, new game data | patch | mean the same |

A change that only the checker sees (a new finding, a new data field) is not a format change. It
follows the library's version rules alone.

## 2. Propose

1. A change starts as a note: a review pin, a consumer's request, a stress-test finding.
2. Francesco decides it, and the decision goes in `DECISIONS.md` with its raw note. The entry names
   the keys, a before and an after line, the kind of change from §1, and what each consumer has
   to do.
3. Changes are batched. One minor release carries a set of decisions (0.8 carried D106–D113), so
   consumers migrate once.

## 3. Alias

A renamed or merged key stays readable for as long as `Paste: 1`, 1.0 included (SPEC §2.6, D142).
A paste written today keeps reading:

- The parser reads the old key with `W005` and puts the line where its new form goes.
- `emit` writes the new form, so a stored paste upgrades the first time it goes through emit.
- When the parser cannot convert a line without game data, the line stays as written, with the
  warning (0.8's `Ability` line with no single owner).
- An old key name never gets a new meaning while its alias is live.
- At least one fixture keeps the old form (`fixtures/v0.7/`), and a test checks that it
  converts to its new-form sibling.

## 4. Release

Per D57: one `chore(release)` commit that sets `package.json`, the dated CHANGELOG heading and the
SPEC version. The CHANGELOG section has a **Migrating** list with every old line next to its new
form. Francesco makes and pushes the annotated tag.

## 5. Announce

Each consumer moves in its own repository, under its own decisions (a D64 crossing):

- **character-forge** and **my-spellbook** copy the tagged build. A reader gets the aliases
  free. A writer switches to the new keys when it is ready: until then its old keys still read.
- **The share site** bumps `RENDER_VERSION`, so saved shares re-render with the new library.
- **Everyone else** (D145): each tag gets a GitHub release carrying the CHANGELOG's Migrating list,
  and `/guide` has a "Format changes" line that links the releases.
- The CHANGELOG's Migrating list is the one source. A crossing note cites the tag and that list.
  It does not repeat the rules.

## 6. Retire

Within `Paste: 1`, aliases never go (D142). 1.0 declares the format stable and breaks nothing.
Retirement can only be opened by a `Paste: 2`, and then only for an alias that has lived at least two
minor releases **and** at least six months, whichever is later (D143). If that happens:

- One minor release before the major, each `W005` message names the version that removes it.
- The major release turns each removed alias into `E002` (unknown key) and lists it in the
  CHANGELOG.
- Before a consumer upgrades to the major, it passes its stored pastes through the last minor's
  `emit` once. That rewrites them in the new form.

## Open questions

1. ~~Is the retirement 1.0 or a `Paste: 2` major?~~ Neither by default: never within `Paste: 1` → D142.
2. ~~Releases or time?~~ Both, whichever is later: two minors and six months → D143.
3. ~~A notice beyond crossing notes?~~ A GitHub release per tag with the Migrating list, and a
   "Format changes" line on `/guide` → D145.
4. ~~Warn on old keys on the site?~~ Quiet on the view, `W005` in the edit form, Tidy rewrites → D144.
