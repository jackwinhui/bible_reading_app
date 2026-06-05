// HTML helpers for the WYSIWYG journal editor.
// Keep this file lightweight — no dependencies, runs in the renderer.

import { renderMarkdown } from './markdown';

const ALLOWED_TAGS = new Set([
  'P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U',
  'H1', 'H2', 'H3', 'UL', 'OL', 'LI', 'BLOCKQUOTE',
  'DIV', 'SPAN',
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  // Intentionally empty for now — no attrs preserved on any tag.
};

/**
 * Strip everything not in the whitelist. Allowed elements have their content
 * preserved (unwrap). All attributes are removed except those explicitly
 * allowed per tag. Removes script tags entirely (including content).
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstElementChild;
  if (!root) return '';

  const walk = (node: Element) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType !== 1) continue;
      const el = child as Element;
      const tag = el.tagName;

      // Drop script/style and their contents
      if (tag === 'SCRIPT' || tag === 'STYLE') {
        el.remove();
        continue;
      }

      if (!ALLOWED_TAGS.has(tag)) {
        // Unwrap: move children up, then remove the wrapper
        while (el.firstChild) node.insertBefore(el.firstChild, el);
        el.remove();
        continue;
      }

      // Strip attributes (except whitelisted per tag)
      const allowed = ALLOWED_ATTRS[tag] ?? new Set<string>();
      for (const attr of Array.from(el.attributes)) {
        if (!allowed.has(attr.name)) el.removeAttribute(attr.name);
      }

      walk(el);
    }
  };

  walk(root);
  return root.innerHTML;
}

/**
 * Best-effort plain-text extraction (for excerpts / search / markdown export).
 */
export function htmlToPlainText(html: string): string {
  if (!html) return '';
  const looksLikeHtml = /<\w+[\s>/]/.test(html);
  if (!looksLikeHtml) return html;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * Same as `htmlToPlainText`, but first migrates legacy markdown content
 * to HTML so excerpts of old entries don't show raw markdown syntax
 * (e.g. `**bold**`, `# heading`) until the user opens & edits them.
 */
export function contentToPlainText(content: string): string {
  return htmlToPlainText(migrateContentToHtml(content));
}

/**
 * Decide whether a block.content string is already HTML (from the new
 * WYSIWYG editor) or legacy markdown that should be converted on read.
 * Migration runs once per block on edit; old entries continue to render
 * correctly via this same helper before they're touched.
 */
export function migrateContentToHtml(content: string): string {
  if (!content) return '';
  const looksLikeHtml = /<(p|h[1-6]|ul|ol|blockquote|div|br|strong|em|u)\b/i.test(content);
  if (looksLikeHtml) return sanitizeHtml(content);
  return sanitizeHtml(renderMarkdown(content));
}
