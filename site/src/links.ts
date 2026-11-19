/**
 * The site's links to the repository's feedback and release pages (D145–D147). Its own module so both
 * `pages.ts` (/about) and `guide.ts` (/guide) can import it without an import cycle.
 */

/** Feedback goes to GitHub Issues, through the chooser with the two forms (D146, D147). */
export const FEEDBACK_URL = "https://github.com/francescocompa/dndpaste/issues/new/choose";
/** One GitHub release per tag lists what changed and how to migrate (D145). */
export const RELEASES_URL = "https://github.com/francescocompa/dndpaste/releases";
/** The "Send feedback" line on /about and /guide (D147). The page foot stays the version only (D137). */
export const FEEDBACK_LINE = `<p><a href="${FEEDBACK_URL}">Send feedback</a> on GitHub about a build you can't write or a build the site reads wrong.</p>`;
