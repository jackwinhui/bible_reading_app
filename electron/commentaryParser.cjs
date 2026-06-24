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

// Parse a leading parenthetical verse reference from a point heading, e.g.
//   "2. (1) A simple factual statement"   -> [1, 1]
//   "3. (27-31) God's creation of man"     -> [27, 31]
//   "1. The philosophical importance..."   -> null
function parseVerseRange(headingText) {
  const m = headingText.match(/^\s*\d+\.\s*\(([^)]+)\)/);
  if (!m) return null;
  const inner = m[1];
  // Cross-chapter references like (31-2:3) — keep only the first number.
  const nums = inner.match(/\d+/g);
  if (!nums || nums.length === 0) return null;
  if (inner.includes(':')) {
    const n = parseInt(nums[0], 10);
    return [n, n];
  }
  const start = parseInt(nums[0], 10);
  const end = parseInt(nums[nums.length - 1], 10);
  return [start, Math.max(start, end)];
}

function indentFromStyle(attrs) {
  const m = /padding-left:\s*(\d+)px/i.exec(attrs || '');
  if (!m) return 0;
  const px = parseInt(m[1], 10);
  if (px >= 60) return 2;
  if (px >= 30) return 1;
  return 0;
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
  // ends at the copyright notice ("©1996–present ... David Guzik").
  const startMatch = html.search(/<h3[^>]*>\s*[A-Z]\.\s/);
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
        verses: level === 'point' ? parseVerseRange(heading) : null,
        paragraphs: [],
      };
      if (level === 'point') pointCounter++;
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
  const filtered = sections.filter(
    (s) => s.paragraphs.length > 0 || s.heading
  );
  if (filtered.length === 0 || pointCounter === 0) return null;

  return { book, chapter, source: 'Enduring Word', url, sections: filtered };
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

module.exports = {
  parseCommentaryHtml,
  sanitizeInline,
  plainText,
  parseVerseRange,
  bookToSlug,
  buildCommentaryUrl,
};
