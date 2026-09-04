# CLAUDE.md — dndpaste

> A plain-text build-sharing format for D&D 5e (Pokepaste for characters) and its reference
> parser/checker. Spec-first project; public repo; no rules text ever lands here.

## Read first
`STATE.md` (resume block) → `PLAN.md` (queue) → `DECISIONS.md` (D1–D17, append-only) → `SPEC.md`.

## What it is / is not
- A **format** (`SPEC.md`) + a **zero-dependency TypeScript library**: `parse`, `emit`, later `check`.
- References only (`Name[|SOURCE]`, 5etools source codes). Never features' text, never rules.
- Apps first, humans second: strict grammar, one canonical form. Sparse pastes are valid.
- Not a character sheet, not a rules engine, not a data mirror. Consumers (my-spellbook,
  character-forge) integrate on their side, under their own CLAUDE.md.

## Content boundary (public repo)
Fixtures may **name** WotC entities. No rules text, no KB extracts, no 5etools data files;
`data/` is gitignored except an SRD-derived subset once the checker exists (M2).

## Conventions
Strict TS, ESM source, single-file UMD build for no-build consumers. `npm run verify` =
typecheck + lint + test; run after any code edit. Conventional commits. Decisions via /decision.
Game-neutral core grammar; game specifics live in a profile (`profiles/dnd5e`).

## Context boundary
Own project. Do not import conventions, tokens or code from monster-forge, character-forge or
my-spellbook; talk to them only through the built artefact and the spec.
