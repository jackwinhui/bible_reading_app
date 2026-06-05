# Bible App — Version History

## v4.0.2

### New Features
- **WYSIWYG journal editor** — Replaced the markdown textarea with an inline rich-text editor. A small floating toolbar appears above the focused text block with Bold, Italic, Underline, H1/H2/H3, bullet & numbered lists, blockquote, and a "clear formatting" button.
  - Keyboard shortcuts work out of the box: ⌘/Ctrl+B / I / U.
  - Existing entries written in markdown are auto-migrated to HTML on first read; legacy `**asterisks**` and `# hashes` no longer leak into list previews or search results.
  - HTML is sanitized (whitelist of safe tags, all attributes stripped) so imported JSON entries can't smuggle in scripts.
- **Drag-and-drop block reordering** — Each block now has a ⋮⋮ grip handle in its hover toolbar. Drag to a highlighted drop zone between blocks to reorder. The existing up/down/delete arrow buttons are still there as a fallback.
- **Quick-reference parser accepts abbreviations** — The "Insert Verse" quick-reference field now resolves common abbreviations (e.g. `Jn 3:16`, `1 Cor 13:4-7`, `Ps 23`, `Rom 8`, `Phil 4:13`, `1Pet 5:7`, `Song 2:4`) in addition to full book names. Punctuation and spacing variants (`1Cor.`, `1 cor`, `1cor`) all work, as do en/em-dashes in ranges.
- **Prayer / Applications section** — A dedicated rich-text section is now always present at the bottom of every journal entry, with a prompt ("What is God leading you to pray about, repent of, or apply from what you read today?"). Indexed by search and included in the Markdown export under its own heading.

### Bug Fixes
- **Journal list dates were off by one** — Entries dated e.g. `2026-06-05` displayed as `Jun 4` in negative-UTC timezones because `new Date("YYYY-MM-DD")` is parsed as UTC midnight but rendered in local time. The list, calendar grouping, and popover now parse those strings as local dates.
- **Journal block toolbar reachable** — The move/delete buttons and the inter-block `+ text / + verse` buttons no longer disappear when you move the cursor toward them. The block toolbar is now an inline column inside the hover region, and the inter-block add controls have a persistent hit zone with their own hover state.
- **No more "shrink on focus"** — Re-clicking into a paragraph block no longer changes its height. The WYSIWYG editor renders as a single persistent contentEditable rather than toggling between a textarea and a preview view.

---

## v4.0.1

### Bug Fixes
- **Journal: block toolbar now reachable** — The move/delete buttons and "+ text / + verse" between-block buttons used to disappear the moment you moved your cursor toward them because they were positioned outside the hover area. Restructured the block layout so the toolbar is an inline column inside the hover region; the inter-block add controls now have a persistent hit zone.
- **Memory verse: smarter scoring** — Replaced the naive word-by-word index comparison with an LCS-based diff. Missing or extra words no longer cascade-fail the rest of the verse. The result view now distinguishes four categories:
  - 🟢 **Correct** word
  - 🔴 **Wrong** word at the right position (shows `yourword → expected`)
  - 🟡 **Missing** word (`+ expected`, dashed amber pill)
  - ⚪ **Extra** word (struck through)
  - Plus a summary row with totals for each category.
- **Memory verse: fixed broken smart-quote normalization** — The `normalize()` helper had lost its smart-quote / em-dash / ellipsis characters in past edits, so it was silently doing nothing. Rewritten using explicit Unicode escapes so `"`, `'`, `—`, and `…` typed by the user are properly normalized.

---

## v4.0.0

### New Features
- **Journal** — Dedicated digital journal for reflections and devotionals
  - Multiple entries per day, each with a title, date, optional tags, and a block-based body
  - Insert verses inline as styled blocks (with translation snapshot so entries stay stable over time)
  - Markdown-lite formatting in text blocks (`**bold**`, `*italic*`, `# heading`, `> quote`, lists)
  - Drag-free reordering, deletion, and inline add controls on every block
  - List view grouped by month + calendar view with per-day entry previews
  - Search across titles, body text, and references; tag filters
  - Click verse references inside entries to jump to the reader
- **Reader → Journal integration**
  - Small green `j` superscript appears next to verses that have journal entries; click to open a popover showing entry titles, dates, and excerpts
  - **Add to Journal** action in the verse menu — appends the verse to today's most recent entry (or creates a new one) and opens the editor
- **Journal export / import** — Back up entries as JSON or Markdown; import JSON to merge or replace

### Infrastructure
- New `JournalContext` with reverse-index for fast verse → entries lookup
- `release/` added to `.gitignore` so build artifacts don't get accidentally committed from GitHub Desktop

---

## v3.0.1

### Bug Fixes
- **Fixed incomplete ESV chapters** — Re-fetched all ESV chapters one-by-one to work around the ESV API's "500 verses or half a book" per-query limit. Previously, 154 chapters across most books were missing or truncated (e.g., 2 John only loaded verse 1; Romans 9–16, Hebrews 10–13, Mark 10–16, Luke 11–24, John 11–15, and Revelation 13–22 were missing entirely).
- **Fixed single-chapter book queries** — Obadiah, Philemon, 2 John, 3 John, and Jude now load correctly. The ESV API interprets `Obadiah 1` as "verse 1" rather than "chapter 1," so the fetch script now queries single-chapter books by name only.

### Infrastructure
- Added `scripts/refetch-esv.mjs` that fetches one chapter at a time with rate-limit/retry handling, replacing the previous batched approach that silently truncated.

---

## v3.0.0

### New Features
- **Settings page** — Users can enter their own API keys (stored locally, never shared)
- **Desktop app** — Electron packaging for Mac (.dmg), Windows (.exe), and Linux (.AppImage)
- **Custom app icon** — Logo displayed in Dock, taskbar, and window title

### Bug Fixes
- **Fixed Electron CommonJS error** — Renamed `main.js` to `main.cjs` to avoid ES module conflict

### Infrastructure
- Switched from BrowserRouter to HashRouter for Electron compatibility
- Added `base: './'` to Vite config for file:// protocol support

---

## v2.0.0

### New Features
- **CSB & NLT translations** — Added Christian Standard Bible and New Living Translation support
- **Reading location persistence** — Clicking the Read tab returns you to where you left off

### Bug Fixes
- **Fixed API.Bible URL** — Changed from `scripture.api.bible` to `rest.api.bible`
- **Fixed Bible IDs** — Corrected NASB1995, CSB, and NLT Bible IDs on API.Bible
- **Fixed USFM book mapping** — API.Bible requires USFM book codes (e.g., `PSA`, `1JN`); was sending incorrect abbreviations causing 400 errors
- **Fixed verse text cut off across paragraphs** — Verses spanning multiple `<p>` tags in API.Bible HTML (e.g., Matthew 1:6 NASB1995) are now fully captured
- **Fixed poetry formatting** — Psalm poetry now renders with proper line breaks and indented continuation lines
- **Fixed verse number placement** — Verse numbers appear inline with the first line of text in poetry, not on a separate line
- **Fixed ESV section headings** — Headings and subtitles (e.g., Psalm superscriptions) are extracted and rendered
- **Fixed ESV prose paragraph breaks** — Paragraph spacing now appears between verse groups in prose passages
- **Fixed stanza breaks** — Poetry stanza breaks now show proper vertical spacing
- **Fixed API.Bible section headings** — `<p class="s">` heading tags are now correctly parsed

---

## v1.0.0

### Initial Release
- React + TypeScript + Vite + Tailwind CSS
- All 66 books with Old Testament / New Testament grouping
- Chapter-by-chapter reading with verse-level rendering
- ESV and NASB1995 translation toggle
- Verse bookmarking with dedicated bookmarks page
- Verse annotations (add, edit, delete) with visual indicators
- Fighter Verse weekly memory challenge (52 weeks, Set 1)
- Word-by-word scoring with color-coded feedback
- Dark/light theme with system preference detection
- All user data persisted in browser localStorage
