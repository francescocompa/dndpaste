# Format updates — how the dndpaste format changes

> **DRAFT for Francesco's read (⚑ under D113, 2026-11-16).** Nothing here is decided. It writes
> down what the 0.8 release did, as a plan for the next format change. The open questions are at
> the end.

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

A renamed or merged key stays readable until the next major version (SPEC §2.6):

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
- The CHANGELOG's Migrating list is the one source. A crossing note cites the tag and that list.
  It does not repeat the rules.

## 6. Retire

Aliases go at the next major version:

- One minor release before the major, each `W005` message names the version that removes it.
- The major release turns each removed alias into `E002` (unknown key) and lists it in the
  CHANGELOG.
- Before a consumer upgrades to the major, it passes its stored pastes through the last minor's
  `emit` once. That rewrites them in the new form.

## Open questions

1. Is the retirement 1.0 (the first stable release) or a `Paste: 2` major? D113 says "until 1.0".
   That would make 1.0 a breaking release for 0.x writers.
2. Is the time between alias and retirement counted in releases or in time? An example would be
   "at least two minors" or "at least six months".
3. Do consumers need a notice beyond the crossing notes, such as a GitHub release, or a line on
   the site's guide?
4. Should the site warn on a saved share that still uses old keys, or quietly show its new form?
