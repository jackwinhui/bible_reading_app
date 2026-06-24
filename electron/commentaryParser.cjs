// Shared parser: converts an Enduring Word chapter HTML page into a normalized
// commentary model. Used by both the offline scraper (scripts/fetch-enduring-word.mjs)
// and the Electron main-process live-fetch handler (electron/main.cjs).
//
// The renderer never parses HTML — it only consumes the normalized JSON produced
// here, whether bundled (personal build) or fetched live (public build).

/**
 * @typedef {{ indent: number, html: string }} CommentaryParagraph
 * @typedef {{ id: string, level: 'section'|'point', heading: string,
 *             verses: [number, number] | null, paragraphs: CommentaryParagraph[] }} CommentarySection
 * @typedef {{ book: string, chapter: number, source: 'Enduring Word', url: string,
 *             sections: CommentarySection[] }} CommentaryChapter
 */

// Inline tags we keep (stripped of attributes). Everything else becomes text.
const ALLOWED_INLINE = new Set(['em', 'i', 'strong', 'b', 'br']);

function sanitizeInline(html) {
  // Normalize <br> variants
  let out = html.replace(/<br\s*\/?>/gi, '<br>');
  // Replace each remaining tag: keep allowed (without attrs), drop the rest.
  out = out.replace(/<\/?([a-zA-Z0-9]+)\b[^>]*>/g, (m, tag) => {
    const t = tag.toLowerCase();
    if (t === 'br') return '<br>';
    if (ALLOWED_INLINE.has(t)) return m[1] === '/' ? `</${t}>` : `<${t}>`;
    return '';
  });
  // Collapse whitespace
  out = out.replace(/[ \t\r\n]+/g, ' ').trim();
  return out;
}

function plainText(html) {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&#x27;|&rsquo;|&lsquo;/g, "'")
    .replace(/[ \t\r\n]+/g, ' ')
    .trim();
}

// Parse a leading parenthetical verse reference from a point heading into the
// verse range it covers within `pageChapter`. Handles plain verses, ranges,
// letter-suffixed fragments, and chapter:verse notation that may cross chapters.
//   "2. (1) ..."            -> [1, 1]
//   "3. (27-31) ..."        -> [27, 31]
//   "(5b-6a) ..."           -> [5, 6]
//   "(15:1-12)" on ch 15    -> [1, 12]   (chapter matches page → verse range)
//   "(36:1)"   on ch 35     -> null      (starts in a later chapter)
//   "(23:27-24:2)" on ch 24 -> [1, 2]    (spans into this chapter)
//   "1. The philosophical importance..."   -> null
function parseVerseRange(headingText, pageChapter) {
  const m = headingText.match(/^\s*\d+\.\s*\(([^)]+)\)/);
  if (!m) return null;
  const inner = m[1].trim();

  // An endpoint is either "verse" or "chapter:verse" (optional letter suffix).
  const endpoint = (tok) => {
    const t = tok.trim();
    const cv = t.match(/^(\d+)\s*:\s*(\d+)/);
    if (cv) return { ch: parseInt(cv[1], 10), v: parseInt(cv[2], 10) };
    const v = t.match(/^(\d+)/);
    if (v) return { ch: null, v: parseInt(v[1], 10) };
    return null;
  };

  const parts = inner.split('-');
  const start = endpoint(parts[0]);
  if (!start) return null;
  const end = endpoint(parts[parts.length - 1]) || start;

  const page = pageChapter != null ? pageChapter : (start.ch != null ? start.ch : null);
  const startCh = start.ch != null ? start.ch : page;
  const endCh = end.ch != null ? end.ch : startCh;

  if (page != null) {
    if (startCh != null && startCh > page) return null; // begins after this chapter
    if (endCh != null && endCh < page) return null;     // ends before this chapter
    const sv = startCh != null && startCh < page ? 1 : start.v;
    const ev = endCh != null && endCh > page ? start.v : end.v; // clamp cross-chapter tail
    return [Math.min(sv, ev), Math.max(sv, ev)];
  }

  // No page context: best effort within the leading chapter.
  const ev = end.ch == null || end.ch === start.ch ? end.v : start.v;
  return [Math.min(start.v, ev), Math.max(start.v, ev)];
}

function indentFromStyle(attrs) {
  const m = /padding-left:\s*(\d+)px/i.exec(attrs || '');
  if (!m) return 0;
  const px = parseInt(m[1], 10);
  if (px >= 60) return 2;
  if (px >= 30) return 1;
  return 0;
}

// The native chapter a point's verses belong to. Explicit "chapter:verse"
// headings (used on combined pages that cover several chapters) return that
// chapter; bare "(verse)" refs belong to the page's own chapter.
function pointRefChapter(heading, pageChapter) {
  const m = heading.match(/^\s*\d+\.\s*\(([^)]+)\)/);
  if (!m) return null;
  const lead = m[1].trim().match(/^(\d+)\s*:/);
  if (lead) return parseInt(lead[1], 10);
  return pageChapter != null ? pageChapter : null;
}

// Enduring Word sometimes serves several chapters on one combined page (e.g.
// joshua-15, -16, -17 all redirect to joshua-15-16-17). When a parsed page
// references more than one chapter, scope the sections to just `chapter`:
// keep each top-level section together with the points that belong to this
// chapter (or carry no chapter), dropping points that belong solely to other
// chapters. Sections left with no chapter-specific points are kept only if they
// never had any (i.e. general/intro material).
function scopeToChapter(sections, chapter) {
  const refChapters = new Set(
    sections
      .filter((s) => s.level === 'point' && s._refCh != null)
      .map((s) => s._refCh)
  );
  if (refChapters.size <= 1) return sections; // single chapter — nothing to do

  const kept = [];
  let i = 0;
  while (i < sections.length) {
    const sec = sections[i];
    if (sec.level === 'point') {
      // Orphan point with no enclosing section.
      if (sec._refCh == null || sec._refCh === chapter) kept.push(sec);
      i++;
      continue;
    }
    // Gather this section's points (until the next section).
    let j = i + 1;
    const points = [];
    while (j < sections.length && sections[j].level === 'point') {
      points.push(sections[j]);
      j++;
    }
    const relevant = points.filter((p) => p._refCh == null || p._refCh === chapter);
    const hadChapterPoints = points.some((p) => p._refCh != null);
    if (relevant.length > 0 || !hadChapterPoints) {
      kept.push(sec, ...relevant);
    }
    i = j;
  }
  return kept;
}

/**
 * Parse a full Enduring Word chapter HTML page.
 * @param {string} html
 * @param {string} book
 * @param {number} chapter
 * @param {string} url
 * @returns {CommentaryChapter | null} null when no commentary content is found.
 */
function parseCommentaryHtml(html, book, chapter, url) {
  // Commentary body starts at the first lettered top section ("A. ...") and
  // ends at the copyright notice ("©1996–present ... David Guzik"). The letter
  // may be wrapped in inline tags (e.g. <h3><strong>A. ...</strong></h3>) and is
  // occasionally lowercased on the source page (e.g. "<h3>a. ..."), so allow
  // optional inline markup and either case between the <h3> and the letter.
  let startMatch = html.search(/<h3[^>]*>\s*(?:<[^>]+>\s*)*[A-Za-z]\.\s/);
  if (startMatch === -1) {
    // Some chapters (e.g. Proverbs 10-21, 27-29) have no lettered sections and
    // go straight to numbered points ("<h4>1. (1) ...</h4>"). Start there,
    // skipping the AI-summary <h4> blocks ("High Points", "Application") that
    // don't begin with a numbered verse reference.
    startMatch = html.search(/<h4[^>]*>\s*(?:<[^>]+>\s*)*\d+\.\s*\(/);
  }
  if (startMatch === -1) return null;

  let endIdx = html.indexOf('\u00A9', startMatch); // ©
  if (endIdx === -1) {
    const rel = html.indexOf('Related Commentary', startMatch);
    endIdx = rel === -1 ? html.length : rel;
  }

  const body = html.slice(startMatch, endIdx);

  /** @type {CommentarySection[]} */
  const sections = [];
  let current = null;
  let pointCounter = 0;

  // Walk block-level elements (h3 / h4 / p) in document order.
  const blockRe = /<(h3|h4|p)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = blockRe.exec(body)) !== null) {
    const tag = m[1].toLowerCase();
    const attrs = m[2];
    const inner = m[3];

    if (tag === 'h3' || tag === 'h4') {
      const heading = plainText(inner);
      if (!heading) continue;
      const level = tag === 'h3' ? 'section' : 'point';
      const idMatch = /id="([^"]+)"/i.exec(attrs);
      const id = idMatch ? idMatch[1] : `${level}-${sections.length}`;
      current = {
        id,
        level,
        heading,
        verses: level === 'point' ? parseVerseRange(heading, chapter) : null,
        paragraphs: [],
      };
      if (level === 'point') {
        pointCounter++;
        current._refCh = pointRefChapter(heading, chapter);
      }
      sections.push(current);
    } else if (tag === 'p') {
      const cleaned = sanitizeInline(inner);
      if (!cleaned) continue;
      if (!current) {
        // Paragraph before any heading — create an intro section.
        current = { id: 'intro', level: 'section', heading: '', verses: null, paragraphs: [] };
        sections.push(current);
      }
      current.paragraphs.push({ indent: indentFromStyle(attrs), html: cleaned });
    }
  }

  // Drop empty trailing sections (heading with no body and no verses).
  let filtered = sections.filter(
    (s) => s.paragraphs.length > 0 || s.heading
  );
  if (filtered.length === 0 || pointCounter === 0) return null;

  // Detect combined/grouped pages from the (post-redirect) URL slug. Enduring
  // Word redirects e.g. joshua-16 -> joshua-15-16-17 and 1-chronicles-4 ->
  // 1-chronicles-4-8. The URL is authoritative; point references alone can give
  // false positives (e.g. Jonah 2 cites Jonah 1:17 due to Hebrew versification).
  const urlChapters = chaptersFromUrl(url, book);
  const grouped = !!urlChapters && urlChapters.length > 1;
  if (grouped) {
    filtered = scopeToChapter(filtered, chapter);
  }

  // Strip internal bookkeeping before returning.
  for (const s of filtered) delete s._refCh;

  const result = { book, chapter, source: 'Enduring Word', url, sections: filtered };
  if (grouped) {
    result.grouped = true;
    result.groupChapters = [...new Set(urlChapters)].sort((a, b) => a - b);
  }
  return result;
}

// Book-name -> Enduring Word URL slug. Default rule: lowercase, spaces -> '-'.
// Exceptions verified against the live site.
const EW_SLUG_OVERRIDES = {
  Psalms: 'psalm',
  'Song of Solomon': 'song-of-solomon',
};

function bookToSlug(book) {
  if (EW_SLUG_OVERRIDES[book]) return EW_SLUG_OVERRIDES[book];
  return book.toLowerCase().replace(/\s+/g, '-');
}

function buildCommentaryUrl(book, chapter) {
  return `https://enduringword.com/bible-commentary/${bookToSlug(book)}-${chapter}/`;
}

// Extract the chapter number(s) from a commentary URL slug, e.g.
//   .../joshua-15-16-17/   -> [15, 16, 17]
//   .../1-chronicles-4-8/  -> [4, 8]
//   .../jonah-2/           -> [2]
// Returns null when the slug doesn't match the book (so callers can ignore it).
function chaptersFromUrl(url, book) {
  if (!url) return null;
  const m = url.match(/bible-commentary\/([^/?#]+)/i);
  if (!m) return null;
  const slug = m[1];
  const bookSlug = bookToSlug(book);
  if (!slug.startsWith(bookSlug)) return null;
  const rest = slug.slice(bookSlug.length).replace(/^-/, '');
  if (!rest) return null;
  const nums = rest.split('-').map((n) => parseInt(n, 10)).filter((n) => !Number.isNaN(n));
  return nums.length ? nums : null;
}

module.exports = {
  parseCommentaryHtml,
  sanitizeInline,
  plainText,
  parseVerseRange,
  bookToSlug,
  buildCommentaryUrl,
  chaptersFromUrl,
};
