/* global uiReview, dispatchEvent, document, localStorage, location, URLSearchParams, DataTransfer, File, DragEvent, InputEvent, sessionStorage, addEventListener, history, Event, PointerEvent, indexedDB, MouseEvent */
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
// T8.4 (D321): a Cleric 4 with a background increase and an L4 ASI; S_ARRAY is a standard array, S_BUY point-buy legal.
const S_TAIL = '\nClasses: Cleric 4\n\nSpecies: Elf\n\nBackground: Acolyte\nScores: +2 WIS, +1 CON\n\nL1 Cleric|XPHB\n\nL4 Cleric|XPHB\nFeat: Ability Score Improvement [+2 WIS]\n'
const S_ARRAY = 'Vesk\nRules: 2024\nScores: STR 8/DEX 14/CON 13/INT 10/WIS 15/CHA 12' + S_TAIL
const S_BUY = 'Vesk\nRules: 2024\nScores: STR 8/DEX 14/CON 14/INT 8/WIS 15/CHA 10' + S_TAIL
// An emptied editor first, so the method picked in another item (D323, per draft) doesn't carry over.
const scoreSetup = async (x, name, text) => { await x.waitFor('form.pform textarea.src'); typeIn(''); await acSetup(x, name, text) }
// A click on a score, the way the mouse puts the caret there (in its number).
const scoreClick = async (x, name, text, at) => {
  await scoreSetup(x, name, text)
  const ta = editor(), i = text.indexOf(at) + at.length - 1
  ta.focus(); ta.setSelectionRange(i, i)
  ta.dispatchEvent(new MouseEvent('click', { bubbles: true })); await x.sleep(400)
}
// M8 (D304): a Wizard 5 build, for the swap list on its L1 header.
const M8_SWAP = 'Vesk\nRules: 2024\nClasses: Wizard 5\n\nL1 Wizard|XPHB\nSpells: Shield, Magic Missile\n'
// T8.2 (D305): a multiclass build for the level-up lens.
const M8_LENS = 'Vesk\nRules: 2024\nScores: 8/14/14/15/12/10\nClasses: Wizard 5 / Fighter 1\n\nSpecies: Elf|XPHB [High; INT]\n\nL1 Wizard|XPHB\nCantrips: Fire Bolt, Mage Hand, Light\nSpells: Shield, Magic Missile, Sleep, Detect Magic, Mage Armor, Find Familiar\n\nL3 Wizard|XPHB\n\nL6 Fighter|XPHB\nSkills: Athletics\n'
// Round 3 (D314): his note's build, Classes: Wizard 6 / Fighter 2 with blocks at L1, L3, L6 only.
const M8_STUCK = 'Vesk\nRules: 2024\nScores: 8/14/14/15/12/10\nClasses: Wizard 6 / Fighter 2\n\nSpecies: Elf|XPHB [High; INT]\n\nBackground: Sage\n\nL1 Wizard|XPHB\nCantrips: Fire Bolt, Mage Hand, Light\n\nL3 Wizard|XPHB\n\nL6 Fighter|XPHB\nSkills: Athletics\n'
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
// M9 (D351–D354): Start a build (Fighter 1, 2024), then the caret at the end of a line with its list opened by a click
// (D302), then, for a pick, the list's row whose name starts with `row`.
const m9Click = async (x, name, line) => {
  await x.waitFor('form.pform textarea.src')
  if (editor().value) { typeIn(''); await x.sleep(100) }   // each item starts from a fresh layout
  await laidPreset(x, name, [['Fighter', 1]])
  const ta = editor(), at = ta.value.indexOf(line) + line.length
  ta.focus(); ta.setSelectionRange(at, at)
  ta.dispatchEvent(new MouseEvent('click', { bubbles: true })); await x.sleep(250)
}
const pickRow = async (x, row) => {
  await x.waitFor('.ac:not([hidden]) .ao')
  const o = [...document.querySelectorAll('.ac .ao')].find((e) => e.querySelector('.an')?.textContent.startsWith(row))
  if (!o) { x.toast(`No ${row} row`); return }
  o.click(); await x.sleep(250)
}
const m9Pick = async (x, name, line, row) => { await m9Click(x, name, line); await pickRow(x, row) }
// M9 site-b (D360–D363): a Gear line, a Fighter 10 with additive Masteries, a Custom score.
const M9B_MAST = 'Vesk\nRules: 2024\nClasses: Fighter 10\n\nL1 Fighter|XPHB\nMasteries: Longsword, Sickle, Handaxe\n\nL4 Fighter|XPHB\nMasteries: Lance\n\nL10 Fighter|XPHB\nMasteries: Flail, -Sickle\n'
const M9B_SNAP = 'Vesk\nRules: 2024\nClasses: Fighter 10\n\nL1 Fighter|XPHB\nMasteries: Longsword, Sickle, Handaxe\n\nL4 Fighter|XPHB\nMasteries: Longsword, Sickle, Handaxe, Lance\n\nL10 Fighter|XPHB\nMasteries: Longsword, Handaxe, Lance, Flail\n'
const gearHalf = async (x, half) => { await x.waitFor('.ac:not([hidden]) [data-g]'); const b = document.querySelector(`.ac [data-g="${half}"]`); if (b && !b.classList.contains('on')) { b.click(); await x.sleep(250) } }
// A click at the end of `line`'s last occurrence (or inside `word` on it), the way the mouse puts the caret there.
const clickAt = async (x, text, at) => {
  const ta = editor(); ta.focus(); ta.setSelectionRange(at, at)
  ta.dispatchEvent(new MouseEvent('click', { bubbles: true })); await x.sleep(300)
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

// T6.2 (D244–D265): your own sources on /sources. A hand-written names file, the one the build was checked with.
const HOMEBREW = 'Spell: Moonbeam Lance|MYHB [2; Druid, Ranger]\nSpell: Ember Ward|MYHB [cantrip; Wizard]\nFeat: Lucky Streak|MYHB [Origin]\n' +
  'Subclass: Oath of Ash|MYHB [Paladin]\nItem: Lantern of Echoes|MYHB\nFeature: Ember Gift|MYHB [Spark, Flare]\nClass: Gunslinger|MYTR\n' +
  'Option: Ember Lance|MYHB [Eldritch Invocations]\nFeat: Fey Sentinel [General; INT, WIS, CHA]\nSpellz: Not a kind\n'
const SRC_DB = 'dndpaste-sources', SRC_SUMMARY = 'dndpaste.sources', SRC_LENS = 'dndpaste.sources.lens'
const srcCount = () => { try { return JSON.parse(localStorage.getItem(SRC_SUMMARY) || 'null')?.n || 0 } catch { return 0 } }
// Drops a file on a /sources page's drop zone (this page's, or an iframe's) the way a real drop does.
const srcDrop = (doc, text, name = 'homebrew.txt') => {
  const W = doc.defaultView, dt = new W.DataTransfer(); dt.items.add(new W.File([text], name, { type: 'text/plain' }))
  doc.querySelector('.srcp .drop')?.dispatchEvent(new W.DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }))
}
// Every source and switch gone: both stores emptied in place (deleting the database would wait on the page's own
// connection), then one reload so the page and the editor read the empty state.
const srcClear = async (x, name) => {
  if (!srcCount() && !document.querySelector('.srcp .srow .act [data-remove]')) return false
  await new Promise((resolve) => {
    const req = indexedDB.open(SRC_DB, 1)
    req.onerror = () => resolve()
    req.onupgradeneeded = () => { req.result.createObjectStore('sources', { keyPath: 'id' }); req.result.createObjectStore('state') }
    req.onsuccess = () => {
      const db = req.result, t = db.transaction(['sources', 'state'], 'readwrite')
      t.objectStore('sources').clear(); t.objectStore('state').clear()
      t.oncomplete = t.onerror = () => { db.close(); resolve() }
    }
  })
  try { localStorage.removeItem(SRC_SUMMARY); localStorage.removeItem(SRC_LENS) } catch { /* storage blocked */ }
  return reloadOnce(name)
}
// /sources with the homebrew file added (and nothing else). `fresh` clears first, so the add message shows.
// One at a time: the overlay can start an item's setup again while the first run is still adding.
let srcBusy = null
const srcHomebrew = (x, name, fresh = false) => srcBusy || (srcBusy = srcAdd(x, name, fresh).finally(() => { srcBusy = null }))
// The stored sources, read straight from the page's database (names and ids only).
const srcIdb = (mode, fn) => new Promise((resolve) => {
  const req = indexedDB.open(SRC_DB, 1)
  req.onerror = () => resolve([])
  req.onupgradeneeded = () => { req.result.createObjectStore('sources', { keyPath: 'id' }); req.result.createObjectStore('state') }
  req.onsuccess = () => {
    const db = req.result, t = db.transaction(['sources'], mode), st = t.objectStore('sources'), out = []
    const all = st.getAll(); all.onsuccess = () => { for (const r of all.result) out.push(r); fn?.(st, all.result) }
    t.oncomplete = t.onerror = () => { db.close(); resolve(out.map((r) => ({ id: r.id, name: r.name }))) }
  }
})
// Only the test file is added or replaced: any other source (his data folder link) stays as it is.
const srcAdd = async (x, name, fresh) => {
  await x.waitFor('.srcp .list .srow, .srcp .list .bgrp, .srcp .list .empty', 6000)
  const hb = (await srcIdb('readonly')).filter((r) => r.name === 'homebrew.txt')
  const said = /Added homebrew\.txt/.test(document.querySelector('.srcp .addout')?.textContent || '')
  if (hb.length === 1 && (!fresh || said)) return
  if (hb.length) {
    await srcIdb('readwrite', (st, rows) => { for (const r of rows) if (r.name === 'homebrew.txt') st.delete(r.id) })
    if (reloadOnce(name)) return
  }
  srcDrop(document, HOMEBREW)
  await x.waitFor('.srcp .addout .done', 4000)
  await x.sleep(200)
}
const srcLens = async (x, lens, split = false) => {
  const b = document.querySelector(`.srcp [data-lens="${lens}"]`)
  if (b && b.getAttribute('aria-checked') !== 'true') { b.click(); await x.sleep(150) }
  const k = document.querySelector('.srcp [data-split]')
  if (k && (k.getAttribute('aria-pressed') === 'true') !== split) { k.click(); await x.sleep(150) }
}
// The editor with the homebrew source: read by the site's own yours.js and stored the way /sources stores it, then one
// reload (the form reads sources at load). No hidden /sources frame: the dev CSP's frame-src blocks it.
const edHomebrew = async (x, name) => {
  await x.waitFor('form.pform textarea.src')
  if (srcCount()) return true
  const [{ fromFile }, n] = await Promise.all([import(`${location.origin}/assets/yours.js`), import(`${location.origin}/assets/names.js`)])
  const rec = await fromFile(new File([HOMEBREW], 'homebrew.txt', { type: 'text/plain' }), n.FEAT_CATEGORIES)
  const all = await srcIdb('readwrite', (st) => st.put(rec))
  try { localStorage.setItem(SRC_SUMMARY, JSON.stringify({ n: all.length + 1, on: all.length + 1 })) } catch { /* storage blocked */ }
  return !reloadOnce(name)
}
// T7.2 (D291): a JSON source of edition unknown with species variants, stored as /sources stores it, then one reload.
const LIN_OWN = JSON.stringify({ race: [{ name: 'Dwarf (Deep)', source: 'MYHB' }, { name: 'Dragonborn (Gem)', source: 'MYHB' }] })
const edLinOwn = async (x, name) => {
  await x.waitFor('form.pform textarea.src')
  if ((await srcIdb('readonly')).some((r) => r.name === 'lineage-own.json')) return true
  const [{ fromFile }, n] = await Promise.all([import(`${location.origin}/assets/yours.js`), import(`${location.origin}/assets/names.js`)])
  const rec = await fromFile(new File([LIN_OWN], 'lineage-own.json', { type: 'application/json' }), n.FEAT_CATEGORIES)
  const all = await srcIdb('readwrite', (st) => st.put(rec))
  try { localStorage.setItem(SRC_SUMMARY, JSON.stringify({ n: all.length + 1, on: all.length + 1 })) } catch { /* storage blocked */ }
  return !reloadOnce(name)
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
    { id: 'sources', label: 'Your sources (T6.2)', open: false, controls: [
      { id: 'add', label: 'Add the test homebrew file', kind: 'action', dodge: false, run: async (x) => { if (location.pathname === '/sources') await srcHomebrew(x, 'tool-add'); else x.toast('Open /sources first') } },
      { id: 'clear', label: 'Remove every source', kind: 'action', dodge: false, run: async (x) => { if (!(await srcClear(x, 'tool-clear'))) x.toast('No sources here') } },
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
    // D240–D242 (0.9.0 live bugs): a species fix to click, a Subclass list by class, a feat pick that opens its brackets.
    'bug-species-fix': async (x) => { await acSetup(x, 'bug-species-fix', 'Rules: 2024\nClasses: Wizard 3\nSpecies: Elf'); editor().blur() },
    'bug-subclass': (x) => acSetup(x, 'bug-subclass', 'Rules: 2024\nClasses: Wizard 3 / Fighter 3\n\nL3 Fighter\nSubclass: '),
    'bug-brackets': (x) => acSetup(x, 'bug-brackets', 'Rules: 2024\nClasses: Wizard 3\n\nL1 Wizard\nFeat: Magic Ini'),
    'bug-dim-spells': (x) => acSetup(x, 'bug-dim-spells', 'Rules: 2024\nClasses: Cleric 5\n\nL5 Cleric\nSpells: fi'),
    'bug-dim-features': (x) => acSetup(x, 'bug-dim-features', 'Rules: 2024\nClasses: Cleric 1\n\nL1 Cleric\nFeature: '),
    'bug-dim-options': (x) => acSetup(x, 'bug-dim-options', 'Rules: 2024\nClasses: Warlock 2\n\nL2 Warlock\nOptions: '),
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
    // T6.2 (D244–D265): /sources states, and the editor with your own names.
    'src-empty': async (x) => {
      await x.waitFor('.srcp .list .srow, .srcp .list .empty', 6000)
      if (await srcClear(x, 'src-empty')) return
      await x.waitFor('.srcp .list .empty', 4000)
    },
    'src-plain': async (x) => {
      await x.waitFor('.srcp .list .srow, .srcp .list .empty', 6000)
      if (await srcClear(x, 'src-plain')) return
      document.querySelector('#names-format').open = true; document.querySelector('#format-plain').open = true
      document.querySelector('#format-plain').scrollIntoView({ block: 'start' })
    },
    'src-added': (x) => srcHomebrew(x, 'src-added', true),
    'src-bysource': async (x) => { await srcHomebrew(x, 'src-bysource'); await srcLens(x, 'source'); document.querySelector('.srcp [data-remove-no]')?.click() },
    'src-remove': async (x) => {
      await srcHomebrew(x, 'src-remove'); await srcLens(x, 'source')
      if (!document.querySelector('.srcp [data-remove-yes]')) document.querySelector('.srcp .srow [data-remove]')?.click()
      await x.sleep(150)
    },
    'src-bybook': async (x) => {
      await srcHomebrew(x, 'src-bybook'); await srcLens(x, 'book')
      // "Other books" open (MYHB and MYTR are codes the site doesn't know), so a category switch and book rows show.
      const hb = document.querySelector('.srcp .ghb[data-cat="Other books"]')
      if (hb && hb.getAttribute('aria-expanded') !== 'true') { hb.click(); await x.sleep(150) }
    },
    // D267: Group by Source with Kinds on.
    'src-split': async (x) => { await srcHomebrew(x, 'src-split'); await srcLens(x, 'source', true); document.querySelector('.srcp [data-remove-no]')?.click() },
    'src-unread': async (x) => {
      await srcHomebrew(x, 'src-unread'); await srcLens(x, 'source')
      const d = document.querySelector('.srcp .upop'); if (d) d.open = true
      await x.sleep(100)
    },
    'ed-own-spell': async (x) => { if (await edHomebrew(x, 'ed-own-spell')) await acSetup(x, 'ed-own-spell', 'Rules: 2024\nClasses: Druid 3\n\nL3 Druid\nSpells: Moonb') },
    'ed-own-options': async (x) => { if (await edHomebrew(x, 'ed-own-options')) await acSetup(x, 'ed-own-options', 'Rules: 2024\nClasses: Wizard 1\n\nL1 Wizard\nFeature: Ember Gift [') },
    // D266: brackets with two slots keep their title; an unknown feature's brackets offer nothing. Since 0.10 (D291)
    // the two slots are the Species line's lineage and ability.
    'ed-two-slots': (x) => acSetup(x, 'ed-two-slots', 'Rules: 2024\nSpecies: Elf ['),
    // T7.2 (D280–D291): the 0.10 Species line in the editor.
    'lin-pick': (x) => acSetup(x, 'lin-pick', 'Rules: 2024\nClasses: Wizard 1\n\nSpecies: El'),
    'lin-list': (x) => acSetup(x, 'lin-list', 'Rules: 2024\nClasses: Wizard 1\n\nSpecies: Elf ['),
    'lin-ability': (x) => acSetup(x, 'lin-ability', 'Rules: 2024\nClasses: Wizard 1\n\nSpecies: Elf [Drow; '),
    'lin-2014': (x) => acSetup(x, 'lin-2014', 'Rules: 2014\nClasses: Wizard 1\n\nSpecies: Dwarf ['),
    'lin-ghost': (x) => acSetup(x, 'lin-ghost', 'Rules: 2024\nClasses: Wizard 1\n\nSpecies: Tiefling'),
    'lin-feature': (x) => acSetup(x, 'lin-feature', 'Rules: 2024\nClasses: Wizard 1\n\nSpecies: Elf [Drow; WIS]\nFeature: '),
    'lin-wood': async (x) => {
      await acSetup(x, 'lin-wood', 'Rules: 2024\nClasses: Wizard 1\n\nSpecies: Wood Elf\nSkills: Perception\n\nL1 Wizard\n')
      await x.sleep(300)
      document.querySelector('button.wlb[data-line="4"]')?.click(); await x.sleep(150)
    },
    'lin-old': async (x) => {
      await acSetup(x, 'lin-old', 'Rules: 2024\nClasses: Wizard 1\n\nSpecies: Elf|XPHB\nFeature: Elven Lineage [WIS; Wood Elf]\nSkills: Perception\n\nL1 Wizard\n')
      editor().blur(); await x.sleep(300)
    },
    // Round 2 (D295, D296): the 2014 pick opens its subraces; a lineage keeps its species' skill list.
    'lin-2014-pick': (x) => acSetup(x, 'lin-2014-pick', 'Rules: 2014\nClasses: Wizard 1\n\nSpecies: Dwa'),
    'lin-2014-ghost': (x) => acSetup(x, 'lin-2014-ghost', 'Rules: 2014\nClasses: Wizard 1\n\nSpecies: Dwarf'),
    'lin-skills': (x) => acSetup(x, 'lin-skills', 'Rules: 2024\nClasses: Wizard 1\n\nSpecies: Elf [Drow; WIS]\nSkills: '),
    'lin-wood-tidy': async (x) => {
      await acSetup(x, 'lin-wood-tidy', 'Rules: 2024\nClasses: Wizard 1\n\nSpecies: Wood Elf\nSkills: Perception\n\nL1 Wizard\n')
      editor().blur(); await x.sleep(600)
      if (document.querySelector('.tidypop')?.hidden) document.querySelector('.tbadge')?.click()
      await x.sleep(200)
    },
    // Round 4 (D298): a 0.9 lineage Feature line offers its abilities, then the lineages.
    'lin-feature-old': (x) => acSetup(x, 'lin-feature-old', 'Rules: 2024\nClasses: Wizard 1\n\nSpecies: Elf\nFeature: Elven Lineage ['),
    'lin-own': async (x) => { if (await edLinOwn(x, 'lin-own')) await acSetup(x, 'lin-own', 'Rules: 2024\nClasses: Wizard 1\n\nSpecies: Dwa') },
    'ed-unknown-feature':(x) => acSetup(x, 'ed-unknown-feature', 'Rules: 2024\nSpecies: Elf\nFeature: Elf Lineage ['),
    // D268: needs a data folder with species variants added on /sources (his link).
    'ed-species': (x) => acSetup(x, 'ed-species', 'Rules: 2024\nSpecies: Drag'),
    'ed-nomatch': async (x) => {
      await x.waitFor('form.pform textarea.src')
      if (await srcClear(x, 'ed-nomatch')) return
      await acSetup(x, 'ed-nomatch', 'Rules: 2024\nClasses: Wizard 1\n\nL1 Wizard\nSpells: Zzqx')
    },
    'ed-settings': async (x) => {
      if (!(await edHomebrew(x, 'ed-settings'))) return
      await x.waitFor('.top .dbtn'); if (!document.querySelector('.srcrow')) await x.click('.top .dbtn'); await x.sleep(150)
    },
    // Round 3 (D270): the species fix writes the trait's brackets; the cursor goes inside, the list open.
    'ed-fix-brackets': async (x) => {
      await acSetup(x, 'ed-fix-brackets', 'Rules: 2024\nClasses: Wizard 1\nSpecies: Elf\n\nL1 Wizard\n')
      await x.sleep(300)
      document.querySelector('button.wlb[data-line="3"]')?.click(); await x.sleep(150)
      ;[...document.querySelectorAll('button')].find((b) => /^Add Skills, Elven Lineage$/.test(b.textContent.trim()))?.click()
      await x.sleep(300)
    },
    'src-docs-folder': async (x) => {
      await x.waitFor('.srcp .list .srow, .srcp .list .empty', 6000)
      document.querySelector('#names-format').open = true; document.querySelector('#format-more').open = true
      document.querySelector('#format-more').scrollIntoView({ block: 'start' })
    },
    'src-builtin': async (x) => { await srcHomebrew(x, 'src-builtin'); await srcLens(x, 'source'); document.querySelector('.srcp [data-remove-no]')?.click() },
    // T6.3 (D272–D278): small fixes after M6.
    'codes-phone': async (x) => { await x.waitFor('table.ctab thead .srt'); document.querySelector('table.ctab th.ct .srt')?.click(); await x.sleep(150) },
    'codes-pl': async (x) => { await x.waitFor('table.ctab thead .srt'); const q = document.querySelector('#cq'); q.value = 'Lamordia'; q.dispatchEvent(new Event('input', { bubbles: true })); await x.sleep(150) },
    'ed-own-ability': async (x) => { if (await edHomebrew(x, 'ed-own-ability')) await acSetup(x, 'ed-own-ability', 'Rules: 2024\nClasses: Warlock 4\n\nL4 Warlock\nFeat: Fey Sentinel [') },
    'src-format-plain': async (x) => {
      await x.waitFor('.srcp .list .srow, .srcp .list .bgrp, .srcp .list .empty', 6000)
      document.querySelector('#names-format').open = true; document.querySelector('#format-plain').open = true
      document.querySelector('#format-plain').scrollIntoView({ block: 'start' })
    },
    'src-top': async (x) => { await x.waitFor('.srcp .list .srow, .srcp .list .bgrp, .srcp .list .empty', 6000); window.scrollTo(0, 0) },
    'form-drop': async (x) => {
      await x.waitFor('form.pform textarea.src')
      const dt = new DataTransfer(); dt.items.add(new File(['Shigen\n'], 'shigen.dndpaste', { type: 'text/plain' }))
      editor().dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true, dataTransfer: dt }))
      editor().dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }))
      await x.sleep(150)
    },
    // T8.2 (D305): a Wizard 5 / Fighter 1 build; the lens sits after its last block.
    'm8-lens': (x) => acSetup(x, 'm8-lens', M8_LENS),
    // Round 3 (D310, D311, D313, D314, D316).
    'm8-stuck': (x) => acSetup(x, 'm8-stuck', M8_STUCK),
    'm8-mismatch': (x) => acSetup(x, 'm8-mismatch', 'Vesk\nRules: 2024\nClasses: Wizard 2\n\nSpecies: Elf\n\nBackground: Sage\n\nL1 Wizard|XPHB\n\nL3 Fighter|XPHB\n'),
    'm8-cleric': (x) => acSetup(x, 'm8-cleric', 'Vesk\nRules: 2024\nClasses: Cleric 1\n\nSpecies: Elf\n\nBackground: Sage\n\nL1 Cleric|XPHB\nSkills: Insight, Religion\nGear: A\n'),
    'm8-cleric-up': (x) => acSetup(x, 'm8-cleric-up', 'Vesk\nRules: 2024\nClasses: Wizard 1\n\nSpecies: Elf\n\nBackground: Sage\n\nL1 Wizard|XPHB\nCantrips: Fire Bolt, Mage Hand, Light\n'),
    'm8-nohead': (x) => acSetup(x, 'm8-nohead', 'Vesk\nRules: 2024\nClasses: Wizard 1\n\nL1 Wizard|XPHB\nCantrips:\n'),
    'm8-subclass': (x) => acSetup(x, 'm8-subclass', 'Vesk\nRules: 2024\nClasses: Wizard 3\n\nSpecies: Elf\n\nBackground: Sage\n\nL3 Wizard|XPHB\nSubclass: Evo\nSpells:\n'),
    'm8-start': async (x) => { await x.waitFor('form.pform textarea.src'); typeIn(''); await x.waitFor('.sb:not([hidden])') },
    'm8-lens-tab': (x) => acSetup(x, 'm8-lens-tab', M8_LENS + '\nL7 '),
    // D307: a short Cantrips line; take Fire Bolt and the list comes back after `, `.
    'm8-comma': (x) => acSetup(x, 'm8-comma', 'Vesk\nRules: 2024\nClasses: Wizard 1\n\nL1 Wizard|XPHB\nCantrips: Fire Bo'),
    // M8 (D303, D304, D306): a 60-row list, a name written in full, the swap list on a click.
    'm8-classes': (x) => acSetup(x, 'm8-classes', 'Vesk\nRules: 2024\nClasses: '),
    'm8-spells': (x) => acSetup(x, 'm8-spells', 'Vesk\nRules: 2024\nClasses: Wizard 5\n\nL1 Wizard|XPHB\nSpells: '),
    'm8-full': (x) => acSetup(x, 'm8-full', 'Vesk\nRules: 2024\nClasses: Wizard 5\n\nL1 Wizard|XPHB\nSpells: Shield'),
    // T8.4 (D321–D325): the base Scores line.
    's-start': async (x) => {
      await x.waitFor('form.pform textarea.src'); typeIn(''); await x.waitFor('.sb:not([hidden])')
      const sel = document.querySelector('#sbsc'); sel.value = 'standard-array'; sel.dispatchEvent(new Event('change', { bubbles: true }))
    },
    's-fill': async (x) => {
      await x.waitFor('form.pform textarea.src'); typeIn(''); await x.waitFor('.sb:not([hidden])')
      const sel = document.querySelector('#sbsc'); sel.value = 'standard-array'; sel.dispatchEvent(new Event('change', { bubbles: true }))
      starter([['Cleric', 1]]); await x.sleep(100); await x.click('.sbmake'); await x.sleep(400)
    },
    's-pop-array': (x) => scoreClick(x, 's-pop-array', S_ARRAY, 'WIS 15'),
    's-pop-buy': (x) => scoreClick(x, 's-pop-buy', S_BUY, 'CON 14'),
    's-pop-custom': (x) => scoreClick(x, 's-pop-custom', S_ARRAY.replace('STR 8/', 'STR 17/'), 'STR 17'),
    's-chip': async (x) => { await scoreSetup(x, 's-chip', S_ARRAY); await x.waitFor('.ed .wsm'); await x.click('.ed .wsm'); await x.sleep(150) },
    's-marker': async (x) => { await scoreSetup(x, 's-marker', S_BUY.replace('Scores:', 'Scores (point buy):')); await x.waitFor('.ed .wsm'); await x.click('.ed .wsm'); await x.sleep(150) },
    's-clash': (x) => scoreSetup(x, 's-clash', S_ARRAY.replace('Scores: STR 8/', 'Scores (point buy): STR 17/')),
    'm8-swap': async (x) => {
      await acSetup(x, 'm8-swap', M8_SWAP)
      const ta = editor(), at = M8_SWAP.indexOf('L1 Wizard') + 6
      ta.focus(); ta.setSelectionRange(at, at)
      ta.dispatchEvent(new MouseEvent('click', { bubbles: true })); await x.sleep(200)
    },
    // M9 site-a (D351–D354): the Background block, its Scores bonuses, Start a build on Custom, a pick's held error.
    'm9-start': async (x) => { await x.waitFor('form.pform textarea.src'); if (editor().value) typeIn(''); await x.waitFor('.sb:not([hidden])') },
    'm9-bglist': (x) => m9Click(x, 'm9-bglist', 'Background:'),
    'm9-fit': (x) => m9Pick(x, 'm9-fit', 'Background:', 'Sage'),
    'm9-custom': (x) => m9Pick(x, 'm9-custom', 'Background:', 'Custom'),
    'm9-mast-open': (x) => m9Click(x, 'm9-mast-open', 'Masteries:'),
    // M9 site-b (D360–D363).
    'm9b-gear': async (x) => { await acSetup(x, 'm9b-gear', 'Vesk\nRules: 2024\nClasses: Fighter 1\nGear: '); await gearHalf(x, 'mundane') },
    'm9b-magic': async (x) => { await acSetup(x, 'm9b-magic', 'Vesk\nRules: 2024\nClasses: Fighter 1\nGear: amm'); await gearHalf(x, 'magic') },
    'm9b-other': async (x) => { await acSetup(x, 'm9b-other', 'Vesk\nRules: 2024\nClasses: Fighter 1\nGear: '); await gearHalf(x, 'mundane'); typeMore('flame t'); await x.sleep(300) },
    'm9b-l1': async (x) => { await acSetup(x, 'm9b-l1', 'Vesk\nRules: 2024\nClasses: Fighter 1\n\nL1 Fighter|XPHB\nGear: '); await gearHalf(x, 'mundane') },
    'm9b-l1-2014': async (x) => { await acSetup(x, 'm9b-l1-2014', 'Vesk\nRules: 2014\nClasses: Cleric 1\n\nL1 Cleric|PHB\nGear: '); await gearHalf(x, 'mundane') },
    'm9b-mast': async (x) => { await acSetup(x, 'm9b-mast', M9B_MAST); editor().blur(); await x.sleep(200) },
    'm9b-drop': (x) => acSetup(x, 'm9b-drop', M9B_MAST.replace('Masteries: Flail, -Sickle\n', 'Masteries: Flail, -')),
    'm9b-snap': async (x) => { await acSetup(x, 'm9b-snap', M9B_SNAP); editor().blur(); await x.sleep(200) },
    'm9b-swap': async (x) => { await acSetup(x, 'm9b-swap', M9B_SNAP); await clickAt(x, M9B_SNAP, M9B_SNAP.lastIndexOf('Handaxe') + 3) },
    'm9b-asi': (x) => scoreClick(x, 'm9b-asi', S_ARRAY.replace('[+2 WIS]', '[WIS]'), 'WIS 15'),
    'm9b-asi2': (x) => scoreClick(x, 'm9b-asi2', S_ARRAY.replace('[+2 WIS]', '[WIS, CON]'), 'CON 13'),
    'm9b-custom': async (x) => {
      await x.waitFor('form.pform textarea.src'); if (editor().value) typeIn(''); await x.waitFor('.sb:not([hidden])')
      const sel = document.querySelector('#sbsc'); sel.value = 'custom'; sel.dispatchEvent(new Event('change', { bubbles: true }))
      starter([['Fighter', 1]]); await x.sleep(100); await x.click('.sbmake'); await x.sleep(400)
      const ta = editor(), at = ta.value.indexOf('Scores:') + 7
      await clickAt(x, ta.value, at)
    },
    // M9 site-b r2 (D364–D366): a letter's detail view, a level header's divider, the snapshot line as a Tidy step.
    'm9b2-detail': async (x) => { await acSetup(x, 'm9b2-detail', 'Vesk\nRules: 2024\nClasses: Fighter 1\n\nL1 Fighter|XPHB\nGear: '); await gearHalf(x, 'mundane'); await x.click('.ac [data-det="0"]'); await x.sleep(200) },
    'm9b2-bg': async (x) => { await acSetup(x, 'm9b2-bg', 'Vesk\nRules: 2024\nClasses: Fighter 1\n\nBackground: Sage\nGear: '); await gearHalf(x, 'mundane') },
    'm9b2-level': (x) => acSetup(x, 'm9b2-level', 'Vesk\nRules: 2024\nClasses: Fighter 1 / Wizard 1\n\nL1 Fighter|XPHB\n\nL2 '),
    'm9b2-tidy': async (x) => { await acSetup(x, 'm9b2-tidy', M9B_SNAP); editor().blur(); await x.sleep(600) },
    'm9b-custom-pop': (x) => scoreClick(x, 'm9b-custom-pop', S_ARRAY.replace('Scores:', 'Scores (custom):').replace('STR 8/', 'STR 17/'), 'STR 17'),
  },
})
