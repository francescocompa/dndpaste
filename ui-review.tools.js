/* global uiReview, dispatchEvent, document, localStorage, location, URLSearchParams, DataTransfer, File, DragEvent, InputEvent, sessionStorage, addEventListener, history, Event, PointerEvent */
// /ui-review dev tools for the share site (site/). Loaded only under `wrangler dev` with UI_REVIEW in site/.dev.vars
// (site/src/devreview.ts). The site's own look stays in site/; this file only drives it.

const DISPLAY_KEY = 'dndpaste.display'
const display = () => {
  try { return { theme: 'auto', kind: true, abilities: true, ...JSON.parse(localStorage.getItem(DISPLAY_KEY) || '{}') } } catch { return { theme: 'auto', kind: true, abilities: true } }
}
// Writes the site's own setting and applies it the way site.js does at load (data-theme, .ck, .ca): no reload.
const setDisplay = (k, v) => {
  const d = { ...display(), [k]: v }
  try { localStorage.setItem(DISPLAY_KEY, JSON.stringify(d)) } catch { /* storage blocked */ }
  const r = document.documentElement
  if (d.theme === 'auto') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', d.theme)
  r.classList.toggle('ck', !!d.kind); r.classList.toggle('ca', !!d.abilities)
}

// Fault switches: a `uir-fault` cookie the dev Worker reads (devreview.ts withFaults).
const faults = () => new Set(((/(?:^|;\s*)uir-fault=([a-z,]*)/.exec(document.cookie) || [])[1] || '').split(',').filter(Boolean))
const setFault = (name, on) => {
  const f = faults(); if (on) f.add(name); else f.delete(name)
  document.cookie = `uir-fault=${[...f].join(',')}; path=/; SameSite=Strict${f.size ? '' : '; max-age=0'}`
}

// Put text in the paste editor the way typing does (the form listens to input).
const editor = () => document.querySelector('form.pform textarea.src')
const typeIn = (text, inputType = 'insertFromPaste') => {
  const ta = editor(); if (!ta) return
  ta.focus(); ta.value = text; ta.setSelectionRange(text.length, text.length)
  ta.dispatchEvent(new InputEvent('input', { bubbles: true, inputType }))
}
// Setups whose state exists only at page load (D97 saved panel, D102 draft bar): change storage, then reload once.
// The overlay re-runs the open item's setup after the load, so each one first checks whether its state is there.
const reloadOnce = (name) => {
  const k = `uir-once:${name}`, t = Number(sessionStorage.getItem(k) || 0)
  if (Date.now() - t < 15000) return false
  sessionStorage.setItem(k, String(Date.now())); location.reload(); return true
}
const shareId = () => location.pathname.split('/')[1]
const readJson = (k) => { try { return JSON.parse(localStorage.getItem(k) || '{}') } catch { return {} } }
const putDraft = (slot, d) => { const all = readJson('dndpaste.drafts'); if (d) all[slot] = d; else delete all[slot]; localStorage.setItem('dndpaste.drafts', JSON.stringify(all)) }
// Fills the "Start a build" rows the way picking in the selects does (each change redraws the builder).
const starter = (rows, edition = '2024') => {
  const sb = document.querySelector('.sb'); if (!sb) return
  sb.querySelector(`[data-ed="${edition}"]`)?.click()
  while (sb.querySelectorAll('.sbrow').length > 1) sb.querySelector('.sbdel')?.click()
  rows.forEach(([cls, lv], i) => {
    if (i) sb.querySelector('.sbadd')?.click()
    for (const [f, v] of [['cls', cls], ['lv', String(lv)]]) {
      const sel = sb.querySelector(`.sbrow[data-i="${i}"] select[data-f="${f}"]`)
      if (sel) { sel.value = v; sel.dispatchEvent(new Event('change', { bubbles: true })) }
    }
  })
}
// T3.9 (D129–D133): a filled multiclass build with short, met, over, swapped and empty counted lines.
const GHOST_TEXT = 'Rules: 2024\nScores: 8/14/14/15/12/10\nClasses: Fighter 1 / Wizard 3\n\nSpecies: Elf|XPHB\n\nBackground: Sage|XPHB\n\n' +
  'L1 Fighter|XPHB\nSkills: Athletics, Perception\nMasteries: Longsword, Shortbow\nFeat (Fighting Style): Defense\n\n' +
  'L2 Wizard|XPHB\nCantrips: Light, Mage Hand, Prestidigitation, Fire Bolt\nSpells: Shield, Sleep, Magic Missile, Detect Magic, Mage Armor, Find Familiar\nPrepared: Shield, Sleep\n\n' +
  'L3 Wizard|XPHB\nSpells: -Sleep, Grease, Fog Cloud\nExpertise:\n\nL4 Wizard|XPHB\nSubclass:\nSpells:\n'
// D151 (D154–D159): put a build in the editor with the cursor at its end, typed the way a keystroke is, so the name
// list opens (it loads /assets/names.js on focus, then shows what fits). The list closes when the editor loses focus.
const acSetup = async (x, name, text) => {
  await x.waitFor('form.pform textarea.src')
  if (document.querySelector('.dbar:not([hidden])')) { putDraft('new', null); if (reloadOnce(name)) return }
  typeIn(text, 'insertText')
  await x.sleep(500)
}
// Editor polish (D170–D176): add text at the cursor's end as one keystroke, so the form sees each step.
const typeMore = (more) => {
  const ta = editor(); if (!ta) return
  ta.focus(); ta.value += more; ta.setSelectionRange(ta.value.length, ta.value.length)
  ta.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))
}
// Two steps: the line reads (`Guidance`), then the open comma, so the chip has a count to keep (D175).
const commaSetup = async (x, name) => {
  await acSetup(x, name, 'Vice\nRules: 2024\nClasses: Cleric 1\n\nL1 Cleric\nCantrips: Guidance')
  typeMore(', ')
  await x.sleep(400)
}
const ERROR_TEXT ='Vice\nSpecies: Tiefling|MPMM\nBackground: Charlatan\n\nL1 Warlock\nSpels: Eldritch Blast\n'

// A preset laid out in the editor, from an empty form (any draft bar cleared first). Skips when it is already there.
const laidPreset = async (x, name, rows, edition = '2024') => {
  await x.waitFor('form.pform textarea.src')
  if (document.querySelector('.dbar:not([hidden])')) { putDraft('new', null); if (reloadOnce(name)) return }
  const head = `Rules: ${edition}\nScores:\nClasses: ${rows.map(([c, l]) => `${c}|${edition === '2024' ? 'XPHB' : 'PHB'} ${l}`).join(' / ')}\n`
  if (editor().value.startsWith(head)) return
  if (editor().value) typeIn('')
  await x.waitFor('.sb .sbrow')
  starter(rows, edition)
  document.querySelector('.sb .sbmake')?.click()
  await x.sleep(300)
}

uiReview.config({
  schema: 1,
  groups: [
    { id: 'display', label: 'Settings (the site’s own menu)', open: true, controls: [
      { id: 'theme', label: 'Theme', kind: 'select', options: ['auto', 'light', 'dark'], default: 'auto', get: () => display().theme, set: (v) => setDisplay('theme', v) },
      { id: 'kind', label: 'Colour by kind', kind: 'toggle', default: true, get: () => display().kind, set: (v) => setDisplay('kind', v) },
      { id: 'abilities', label: 'Colour abilities', kind: 'toggle', default: true, get: () => display().abilities, set: (v) => setDisplay('abilities', v) },
    ] },
    { id: 'faults', label: 'Faults (dev Worker only)', open: false, controls: [
      { id: 'kv', label: 'KV writes fail (503)', kind: 'toggle', default: false, get: () => faults().has('kv'), set: (v) => setFault('kv', v) },
      { id: 'cap', label: 'Daily cap reached', kind: 'toggle', default: false, get: () => faults().has('cap'), set: (v) => setFault('cap', v) },
      { id: 'xsite', label: 'POSTs look cross-site (403)', kind: 'toggle', default: false, get: () => faults().has('xsite'), set: (v) => setFault('xsite', v) },
      { id: 'build', label: 'A newer build is deployed', kind: 'toggle', default: false, get: () => faults().has('build'), set: (v) => setFault('build', v) },
      { id: 'check', label: 'Check for an update now', kind: 'action', dodge: false, run: () => dispatchEvent(new Event('dndpaste:check-update')) },
    ] },
    { id: 'form', label: 'Paste form', open: false, controls: [
      { id: 'err', label: 'Type a build with an error', kind: 'action', dodge: false, run: () => typeIn(ERROR_TEXT) },
      { id: 'clear', label: 'Clear the editor', kind: 'action', dodge: false, run: () => typeIn('') },
      { id: 'start-multi', label: 'Start a build: Fighter 1 / Warlock 4', kind: 'action', dodge: false, run: () => starter([['Fighter', 1], ['Warlock', 4]]) },
      { id: 'start-solo', label: 'Start a build: Wizard 20 (2014)', kind: 'action', dodge: false, run: () => starter([['Wizard', 20]], '2014') },
      { id: 'ghost-multi', label: 'Ghost counts: Fighter 1 / Wizard 3 (2024)', kind: 'action', dodge: false, run: () => typeIn(GHOST_TEXT) },
      { id: 'start-bard5', label: 'Start a build: Bard 5 (2024)', kind: 'action', dodge: false, run: () => starter([['Bard', 5]]) },
    ] },
  ],
  presets: [
    { id: 'light', label: 'Light', pinned: true, values: { 'display.theme': 'light' } },
    { id: 'dark', label: 'Dark', pinned: true, values: { 'display.theme': 'dark' } },
  ],
  setups: {
    'open-copy-menu': async (x) => { await x.waitFor('.caret'); await x.click('.caret'); await x.sleep(150) },
    'open-display': async (x) => { await x.waitFor('.top .dbtn'); await x.click('.top .dbtn'); await x.sleep(150) },
    // D119: the Share image panel, opened from the Copy link menu (review round 2); ready when its canvas is in the preview.
    'open-share-menu': async (x) => {
      if (document.querySelector('.shp:not([hidden]) .prev canvas')) return
      await x.waitFor('.caret'); await x.click('.caret'); await x.waitFor('#copym [data-share]'); await x.click('#copym [data-share]')
      await x.waitFor('.shp .prev canvas', 8000)
    },
    // D138: the update toast. Turns the `build` fault on (GET /version answers another commit) and checks at once.
    'update-toast': async (x) => {
      if (document.querySelector('.utoast')) return
      setFault('build', true); dispatchEvent(new Event('dndpaste:check-update'))
      await x.waitFor('.utoast', 4000)
    },
    'open-report': async (x) => { await x.waitFor('details.report summary'); await x.click('details.report summary'); await x.sleep(150) },
    'fold-all': async (x) => { await x.waitFor('[data-fold=close]'); await x.click('[data-fold=close]'); await x.sleep(100) },
    'form-error': async (x) => { await x.waitFor('form.pform textarea.src'); typeIn(ERROR_TEXT); await x.sleep(1800) },
    'form-bare': async (x) => { await x.waitFor('form.pform textarea.src'); typeIn('Vice\n'); await x.sleep(300) },
    'form-half-key': async (x) => { await x.waitFor('form.pform textarea.src'); typeIn(ERROR_TEXT.replace('Spels: Eldritch Blast\n', 'Spe'), 'insertText'); await x.sleep(200) },
    'form-link': async (x) => { await x.waitFor('form.pform textarea.src'); typeIn(`${location.origin}/${new URLSearchParams(location.search).get('review-link') || ''}`); await x.sleep(600) },
    // D97: the one-time panel after a save. Needs this browser to keep the share's key.
    'saved-panel': async (x) => {
      await x.waitFor('.acts')
      if (document.querySelector('div.saved')) return
      const k = readJson('dndpaste.keys')[shareId()]
      if (!k) { x.toast('This browser keeps no key for this build'); return }
      history.replaceState(null, '', `${location.pathname}#new=${k}`)
      reloadOnce('saved-panel')
    },
    // D102: a draft left on a new form two hours ago.
    'draft-new': async (x) => {
      await x.waitFor('form.pform textarea.src')
      if (document.querySelector('.dbar:not([hidden])')) return
      // The form clears an unchanged draft on pagehide; this listener runs after it.
      addEventListener('pagehide', () => putDraft('new', { title: 'Shigen', author: '', paste: 'Shigen\nSpecies: Human|XPHB\n\nL1 Monk\n', rev: null, saved: new Date(Date.now() - 2 * 3600e3).toISOString() }))
      reloadOnce('draft-new')
    },
    // D102: a draft made on revision 1 of a share now at revision 2.
    'draft-edit': async (x) => {
      await x.waitFor('form.pform textarea.src')
      if (document.querySelector('.dbar:not([hidden])')) return
      const id = shareId(), paste = editor().value.replace(/\nL3[\s\S]*$/, '\nL2 Druid\nFeature: Wild Shape\n')
      addEventListener('pagehide', () => putDraft(`edit:${id}`, { title: 'Briar, Moon druid', author: 'Francesco', paste, rev: 1, saved: new Date(Date.now() - 26 * 3600e3).toISOString() }))
      reloadOnce('draft-edit')
    },
    // D121: "Start a build" needs a new form with an empty editor and no draft bar.
    'form-empty': async (x) => {
      await x.waitFor('form.pform textarea.src')
      if (document.querySelector('.dbar:not([hidden])')) { putDraft('new', null); if (reloadOnce('form-empty')) return }
      if (editor().value) typeIn('')
      await x.sleep(200)
    },
    // 9fe4df1: an edit link whose key the server refuses (route carries a well-formed wrong #k=).
    'wrong-key': async (x) => {
      await x.waitFor('form.pform textarea.src')
      if (document.querySelector('.ferr:not([hidden]):not(.nokey)')) return
      await x.sleep(300)
      document.querySelector('form.pform .tb button[type=submit]').click()
      await x.waitFor('.ferr:not([hidden]):not(.nokey)', 4000)
    },
    // T3.8 (D121–D124): "Start a build" with two rows, Fighter 1 then Warlock 4, not laid out yet.
    'starter-multi': async (x) => {
      await x.waitFor('form.pform textarea.src')
      if (document.querySelector('.dbar:not([hidden])')) { putDraft('new', null); if (reloadOnce('starter-multi')) return }
      if (editor().value) typeIn('')
      await x.waitFor('.sb .sbrow')
      starter([['Fighter', 1], ['Warlock', 4]])
      await x.sleep(150)
    },
    // T3.8 round 2 (D127): Fighter 2, then an Other class named Blood Hunter|TDCC for 3.
    'starter-other': async (x) => {
      await x.waitFor('form.pform textarea.src')
      if (document.querySelector('.dbar:not([hidden])')) { putDraft('new', null); if (reloadOnce('starter-other')) return }
      if (editor().value) typeIn('')
      await x.waitFor('.sb .sbrow')
      starter([['Fighter', 2], ['other', 3]])
      const inp = document.querySelector('.sb .sbname')
      if (inp) { inp.value = 'Blood Hunter|TDCC'; inp.dispatchEvent(new InputEvent('input', { bubbles: true })) }
      await x.sleep(150)
    },
    // T3.8: the same rows laid out in the editor.
    'starter-laid': async (x) => {
      await x.waitFor('form.pform textarea.src')
      if (document.querySelector('.dbar:not([hidden])')) { putDraft('new', null); if (reloadOnce('starter-laid')) return }
      if (editor().value.startsWith('Rules: 2024\nScores:\nClasses: Fighter|XPHB 1 / Warlock|XPHB 4')) return
      if (editor().value) typeIn('')
      await x.waitFor('.sb .sbrow')
      starter([['Fighter', 1], ['Warlock', 4]])
      document.querySelector('.sb .sbmake')?.click()
      await x.sleep(300)
    },
    // T3.9 (D129–D133): the ghost counts on a filled multiclass build.
    'ghost-multi': async (x) => {
      await x.waitFor('form.pform textarea.src')
      if (document.querySelector('.dbar:not([hidden])')) { putDraft('new', null); if (reloadOnce('ghost-multi')) return }
      if (editor().value !== GHOST_TEXT) typeIn(GHOST_TEXT)
      await x.sleep(300)
    },
    // T3.9: a laid-out preset, every counted line empty: Bard 6, 2024.
    'ghost-preset': async (x) => {
      await x.waitFor('form.pform textarea.src')
      if (document.querySelector('.dbar:not([hidden])')) { putDraft('new', null); if (reloadOnce('ghost-preset')) return }
      if (editor().value.startsWith('Rules: 2024\nScores:\nClasses: Bard|XPHB 6')) return
      if (editor().value) typeIn('')
      await x.waitFor('.sb .sbrow')
      starter([['Bard', 6]])
      document.querySelector('.sb .sbmake')?.click()
      await x.sleep(300)
    },
    // D149: a laid-out Bard 5 (2024) preset: 19 empty lines, listed under To choose, Problems empty.
    'tochoose-preset': async (x) => laidPreset(x, 'tochoose-preset', [['Bard', 5]]),
    // D129 amended: a laid-out Rogue 3 (2024) preset, where Masteries now shows 0/2.
    'masteries-rogue': async (x) => laidPreset(x, 'masteries-rogue', [['Rogue', 3]]),
    // T3.6: the Keys popover on the Feat (…) chip, as a mouse hover shows it.
    'keys-popover': async (x) => {
      await x.waitFor('form.pform textarea.src')
      if (editor().value) typeIn('')
      await x.sleep(200)
      const chip = [...document.querySelectorAll('.aside .hc')].find((b) => b.dataset.key === 'Feat (…)')
      chip?.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' }))
    },
    // T3.6: 0.8 lines in the editor: an increase, named scores with a slash, a slot marker, an empty value, a 0.7 key.
    'form-08': async (x) => {
      await x.waitFor('form.pform textarea.src')
      typeIn('Vesk\nRules: 2024\nScores: STR 15/CON 13\nScores: +1 DEX\nClasses: Fighter 1 / Warlock 4\n\nL1 Fighter\nFeat (Fighting Style): Defense\nEquipment: Chain Mail\n\nL5 Warlock\nFeat: Ability Score Improvement [+2 CHA]\nSpells:\n')
      await x.sleep(1800)
    },
    // D151: the name list on a Wizard's Spells line, desktop under the cursor, phone in the dock.
    'ac-spells': (x) => acSetup(x, 'ac-spells', 'Rules: 2024\nClasses: Wizard 5\n\nL5 Wizard\nSpells: Fireball, mi'),
    // D157: the cursor's line is the editor's last one, so the list opens above it.
    'ac-bottom': (x) => acSetup(x, 'ac-bottom', GHOST_TEXT.replace(/Spells:\n$/, 'Spells: fireb')),
    // D155: a 2014-only spell in a 2024 build: the row shows the |PHB the pick writes.
    'ac-source': (x) => acSetup(x, 'ac-source', 'Rules: 2024\nClasses: Paladin 5\n\nL5 Paladin\nSpells: Bless, bran'),
    // D156: inside [ ], the slot the table knows: Magic Initiate's cantrips of the class picked before.
    'ac-subpick': (x) => acSetup(x, 'ac-subpick', 'Rules: 2024\nBackground: Acolyte\nFeat (Origin): Magic Initiate [WIS; Cleric; gu'),
    // D156: inside [ ] where the table doesn't know the slot: abilities, skills and spells.
    'ac-general': (x) => acSetup(x, 'ac-general', 'Rules: 2024\nClasses: Cleric 1\n\nL1 Cleric\nFeature: Divine Order [th'),
    // D164: 18 skills, so the list opens at 1 letter.
    'ac-one': (x) => acSetup(x, 'ac-one', 'Rules: 2024\nClasses: Rogue 1\n\nL1 Rogue\nSkills: a'),
    // D163: `[` typed after Magic Initiate: its `]` and the slot hint (a beforeinput, as a keyboard sends it).
    'ac-bracket': async (x) => {
      await acSetup(x, 'ac-bracket', 'Rules: 2024\nBackground: Acolyte\nFeat (Origin): Magic Initiate ')
      editor().dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: '[' }))
      await x.sleep(600)
      // The panel's focus may close the list: an input event (no change) opens it again, as a keystroke would.
      editor().focus(); editor().dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))
    },
    // D163 round 2: Thaumaturge picked from the list: `; ` and the cleric cantrips follow.
    'ac-thaum': async (x) => {
      await acSetup(x, 'ac-thaum', 'Rules: 2024\nClasses: Cleric 1\n\nL1 Cleric\nFeature: Divine Order ')
      editor().dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: '[' }))
      await x.sleep(600)
      editor().focus(); editor().dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))
      await x.sleep(200)
      ;[...document.querySelectorAll('#ac-names .ao')].find((o) => o.textContent.startsWith('Thaumaturge'))?.click()
      await x.sleep(300)
    },
    // D163: a class feature's choice inside [ ].
    'ac-feature': async (x) => {
      await acSetup(x, 'ac-feature', 'Rules: 2024\nClasses: Cleric 1\n\nL1 Cleric\nFeature: Divine Order ')
      editor().dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: '[' }))
      await x.sleep(600)
      // The panel's focus may close the list: an input event (no change) opens it again, as a keystroke would.
      editor().focus(); editor().dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))
    },
    // D170: a key typed at a line's start in the header.
    'ed-key': (x) => acSetup(x, 'ed-key', 'Vice\nRules: 2024\nClasses: Cleric 1\nB'),
    // D171: the key taken from the list; its value list opens at once.
    'ed-key-chain': async (x) => {
      await acSetup(x, 'ed-key-chain', 'Vice\nRules: 2024\nClasses: Cleric 1\nB')
      document.querySelector('#ac-names .ao')?.click()
      await x.sleep(400)
    },
    // D172 trial: a Spells line before any letter.
    'ed-every': (x) => acSetup(x, 'ed-every', 'Vice\nRules: 2024\nClasses: Wizard 5\n\nL5 Wizard\nSpells: '),
    // D174, D175, D176: `Guidance, ` on a Cleric's Cantrips line.
    'ed-comma': (x) => commaSetup(x, 'ed-comma'),
    // D173 (review): the header's Settings menu open, Suggestions in it.
    'settings-open': async (x) => {
      await x.waitFor('.top .dbtn')
      const m = document.querySelector('#dmenu')
      if (!m || m.hidden) document.querySelector('.top .dbtn')?.click()
      await x.sleep(200)
    },
    // Wire 0.9 (D177, D178, D186): a Warlock's family keys, the arcanum's shared count, 2024 pacts, a capped line.
    'w9-hints': (x) => acSetup(x, 'w9-hints', 'Vice\nRules: 2024\nClasses: Warlock 2\n\nL1 Warlock\nCantrips: Eldritch Blast\n\nL2 Warlock\n'),
    'w9-arcanum': (x) => acSetup(x, 'w9-arcanum', 'Vice\nRules: 2024\nClasses: Warlock 11\n\nL11 Warlock\nSpells: Counterspell\nSpells (6th): '),
    'w9-pactboon': (x) => acSetup(x, 'w9-pactboon', 'Vice\nRules: 2024\nClasses: Warlock 3\n\nL3 Warlock\nPact Boon: '),
    'w9-pactinv': (x) => acSetup(x, 'w9-pactinv', 'Vice\nRules: 2024\nClasses: Warlock 3\n\nL3 Warlock\nInvocations: Pact'),
    // D190: a 2024 Cleric's preset, and a Spells line in a Cleric block.
    'w9-preset': (x) => laidPreset(x, 'w9-preset', [['Cleric', 3]]),
    'w9-clericspells': (x) => acSetup(x, 'w9-clericspells', 'Vice\nRules: 2024\nClasses: Cleric 1\n\nL1 Cleric\nCantrips: Guidance\nSpells: Bless\nPrepared: Bless\n'),
    'w9-cap': (x) => acSetup(x, 'w9-cap', 'Vice\nRules: 2024\nClasses: Warlock 11\n\nL11 Warlock\nSpells (3rd): fire'),
    // Wide user test fixes (D196, D210–D219): the editor's one-click fixes and over-chip reasons.
    'ut-move': (x) => acSetup(x, 'ut-move', 'Vice\nRules: 2024\nClasses: Wizard 5\n\nSpecies: Elf\nSkills: Insight\nFeature: Elven Lineage [INT; High Elf]\nSpells: Shield\nSubclass: Diviner\n\nL1 Wizard\nSkills: Arcana, History\nGear: A\nCantrips: Light, Mage Hand, Fire Bolt\nSpells: Sleep, Magic Missile, Detect Magic, Mage Armor, Find Familiar, Alarm\n\nL3 Wizard\nSpells: Blur, Web\n'),
    'ut-level': (x) => acSetup(x, 'ut-level', 'Vice\nRules: 2024\nClasses: Fighter 8\n\nL1 Fighter\n\nL3 Fighter\n'),
    'ut-species': (x) => acSetup(x, 'ut-species', 'Vice\nRules: 2024\nClasses: Warlock 1\n\nSpecies: Elf\n\nL1 Warlock\nSkills: Arcana, Deception\nGear: A\nInvocations: Agonizing Blast\nCantrips: Eldritch Blast, Minor Illusion\nSpells: Hex, Charm Person\n'),
    'ut-rename': (x) => acSetup(x, 'ut-rename', 'Vice\nPaste: 1\nRules: 2014\nClasses: Sorcerer 5, Warlock 5\nFighting Style: Archery\nEquipment: Rope\n'),
    'ut-names': (x) => acSetup(x, 'ut-names', 'Vice\nRules: 2024\nClasses: Warlock 2\n\nSpecies: Gnome|PHB\nFeature: Gnomish Lineage\n\nL1 Warlock\nSkills: Arcana, Deception\nGear: A\nOptions: Agonizing Blast, Repelling Blast\nCantrips: Eldritch Blast, Minor Illusion\nSpells: Hex|PHB, Sleep|PHB\n'),
    'ut-over': async (x) => {
      await acSetup(x, 'ut-over', 'Vice\nRules: 2024\nClasses: Ranger 5\n\nL3 Ranger\nSubclass: Hunter\nPrepared: Hunter\'s Mark, Cure Wounds, Goodberry, Ensnaring Strike\nOptions: Colossus Slayer\n')
    },
    'ut-2014': async (x) => {
      await acSetup(x, 'ut-2014', 'Vice\nRules: 2014\nClasses: Cleric 3 / Paladin 2\n\nL1 Cleric\nSkills: Insight, Medicine\nSubclass: Life Domain\nCantrips: Guidance, Light, Sacred Flame\nSpells: Bless, Cure Wounds, Healing Word\n')
      if (document.querySelector('.wlpop')?.hidden) document.querySelector('.wlb[data-line="9"]')?.click()
    },
    'ut-ac': (x) => acSetup(x, 'ut-ac', 'Vice\nRules: 2024\nClasses: Warlock 1\n\nSpecies: E'),
    'ut-subclass': (x) => acSetup(x, 'ut-subclass', 'Vice\nRules: 2024\nClasses: Fighter 8\nSubclass: Eldritch Knight\n\nL8 Fighter\n'),
    // Round 2 for 0.9 (D225–D229).
    'r2-libfix': async (x) => {
      await acSetup(x, 'r2-libfix', 'Vice\nPaste: 1\nRules: 2014\nClasses: Sorcerer 5, Warlock 5\nFighting Style: Archery\n\nSpecies: Elf\nMasteries: Dagger\n')
      if (document.querySelector('.wlpop')?.hidden) document.querySelector('.wlb[data-line="8"]')?.click()
    },
    'r2-libfix2': (x) => acSetup(x, 'r2-libfix2', 'Vice\nPaste: 1\nRules: 2024\nClasses: Sorcerer 5, Warlock 5\nFighting Style: Archery\nSpels: Shield\n\nSpecies: Elf\nSpells: Shield\n'),
    'r2-tidy2': async (x) => {
      await acSetup(x, 'r2-tidy2', 'Vice\nRules: 2024\nClasses: Warlock 3 / Wizard 2\n\nSpecies: Elf\nMasteries: Dagger\nSubclass: Fiend Patron\n\nL1 Warlock\nOptions: Agonizing Blast\n\nL3 Warlock\n')
      await x.sleep(400)
    },
    'r2-skills-species': (x) => acSetup(x, 'r2-skills-species', 'Vice\nRules: 2024\nClasses: Wizard 5\n\nSpecies: Elf\nSkills: '),
    'r2-skills-class': (x) => acSetup(x, 'r2-skills-class', 'Vice\nRules: 2024\nClasses: Wizard 4 / Rogue 1\n\nL1 Wizard\nSkills: Arcana, \n\nL5 Rogue\nSkills: '),
    'r2-bracket': async (x) => {
      await acSetup(x, 'r2-bracket', 'Vice\nRules: 2024\nClasses: Warlock 1\n\nSpecies: Elf\nFeature: Elven Lineage [ ]')
      const ta = editor(); if (!ta) return
      const at = ta.value.lastIndexOf('[') + 1
      document.querySelector('.ed')?.dispatchEvent(new Event('focusout'))
      ta.setSelectionRange(at, at)
      ta.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await x.sleep(400)
    },
    'r2-tidy': async (x) => {
      await acSetup(x, 'r2-tidy', 'Vice\nRules: 2024\nClasses: Warlock 3 / Wizard 2\n\nSpecies: Elf\nMasteries: Dagger\nSubclass: Fiend Patron\n\nL1 Warlock\nOptions: Agonizing Blast\n\nL3 Warlock\n')
      if (document.querySelector('.tidypop')?.hidden) [...document.querySelectorAll('.bt')].find((b) => /Tidy/.test(b.textContent))?.click()
      await x.sleep(200)
    },
    'form-drop': async (x) => {
      await x.waitFor('form.pform textarea.src')
      const dt = new DataTransfer(); dt.items.add(new File(['Shigen\n'], 'shigen.dndpaste', { type: 'text/plain' }))
      editor().dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true, dataTransfer: dt }))
      editor().dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }))
      await x.sleep(150)
    },
  },
})
