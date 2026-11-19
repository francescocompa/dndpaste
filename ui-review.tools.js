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
    { id: 'display', label: 'Display (the site’s own setting)', open: true, controls: [
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
    'form-drop': async (x) => {
      await x.waitFor('form.pform textarea.src')
      const dt = new DataTransfer(); dt.items.add(new File(['Shigen\n'], 'shigen.dndpaste', { type: 'text/plain' }))
      editor().dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true, dataTransfer: dt }))
      editor().dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }))
      await x.sleep(150)
    },
  },
})
