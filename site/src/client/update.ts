/**
 * The update notice (D138–D140): when the build deployed (GET /version) differs from the one this page's script was
 * built with, a toast says so and offers Reload. Checked when the tab comes back (visibilitychange, focus) and every
 * 15 minutes while it is visible, at most once a minute, never while typing. A failed check (offline) says nothing.
 * Close hides it for that deployed build, in this tab. DOM-free, so tests run the same logic the page does.
 */
import { icon } from "../render.ts";

export interface Build { version: string; commit: string }

/** The page foot's stamp (D137): the version only. The commit stays hidden; only the update check uses it. */
export const stampText = (b: Build): string => `v${b.version}`;

/** The one id two builds are compared by. */
export const buildId = (b: Build): string => `${b.version}+${b.commit}`;

/** A /version body the check can trust; anything else counts as a failed check. */
export function readBuild(data: unknown): Build | null {
  const o = data as Build;
  return !!o && typeof o === "object" && typeof o.version === "string" && typeof o.commit === "string" && !!o.version && !!o.commit
    ? { version: o.version, commit: o.commit } : null;
}

export const CHECK_GAP_MS = 60_000;
export const CHECK_EVERY_MS = 15 * 60_000;

export interface UpdateChecker {
  /** Asks /version unless a check ran under a minute ago (`force` skips that), one at a time. */
  check(force?: boolean): Promise<void>;
  /** Close on the toast: no notice again for this deployed build. */
  dismiss(): void;
  /** The deployed build the notice is showing for, or null. */
  readonly showing: string | null;
}

export interface CheckerDeps {
  current: Build;
  fetchBuild: () => Promise<unknown>;
  /** Called once per newer build found (and not dismissed). */
  onNew: (deployed: Build) => void;
  now?: () => number;
  /** The id closed in this tab (sessionStorage), read and written in try/catch by the caller. */
  dismissed?: { get(): string | null; set(id: string): void };
}

export function updateChecker(d: CheckerDeps): UpdateChecker {
  const now = d.now ?? Date.now;
  // The page just loaded with this build's script: no check is needed for a minute.
  let last = now();
  let running = false;
  let showing: string | null = null;
  return {
    get showing() { return showing; },
    async check(force = false) {
      if (running || (!force && now() - last < CHECK_GAP_MS)) return;
      running = true;
      last = now();
      try {
        const b = readBuild(await d.fetchBuild());
        if (!b) return;
        const id = buildId(b);
        if (id === buildId(d.current) || id === showing || id === d.dismissed?.get()) return;
        showing = id;
        d.onNew(b);
      } catch {
        // Offline or a bad answer: try again at the next trigger.
      } finally {
        running = false;
      }
    },
    dismiss() {
      if (showing) d.dismissed?.set(showing);
      showing = null;
    },
  };
}

/** sessionStorage key: set just before Reload, so the form puts its text back without asking (D139). */
export const RELOAD_FLAG = "dndpaste.reload";
/** sessionStorage key: the deployed build closed in this tab. */
export const DISMISSED_KEY = "dndpaste.update-closed";
/** Window event fired before Reload, so the form can keep its draft and its edit-link key first. */
export const BEFORE_RELOAD = "dndpaste:before-reload";
/** Window event that runs a check at once (the /ui-review dev tools). */
export const CHECK_NOW = "dndpaste:check-update";

/** The toast's inside: one line, Reload, Close (D140). */
export function toastHtml(): string {
  return `<span class="um">A new version of dndpaste is out.</span>` +
    `<button type="button" class="bt pri" data-act="reload">${icon("rotate-cw")}Reload</button>` +
    `<button type="button" class="x" data-act="close" aria-label="Close">${icon("x")}</button>`;
}
