# Bible App — Version History

## v5.0.3

### Bug Fixes
- **Recovered commentary for verse-by-verse chapters.** Chapters that Enduring Word formats without lettered sections — going straight to numbered points (e.g. Proverbs 10–21 and 27–29) — were showing as having no commentary. The parser now also recognizes these chapters, so all 15 affected Proverbs chapters now load correctly.

## v5.0.2

### Bug Fixes
- **Commentary headings piled up when navigating between chapters.** On combined commentary pages (e.g. Joshua 15–22) a top-level section heading could reuse the same internal id as a numbered point, producing duplicate React keys. Navigating chapter-to-chapter then left stale section headings stacked at the top of the panel. The panel now keys sections by position, so each chapter renders cleanly.

## v5.0.1

### Bug Fixes
- **Commentary parser missed entire sections on some chapters.** The Enduring Word page parser only recognized top-level section headings of the exact form `<h3>A. ...`. Three real-world variations caused sections (or whole chapters) to be silently dropped:
  - **`<strong>`-wrapped headings** (e.g. `<h3><strong>A. ...</strong></h3>`) — affected ~54 chapters that appeared to have *no* commentary at all (Ezekiel 25–48, many of Proverbs 10–21, 1 Kings, Job, etc.).
  - **Lowercased letters** (e.g. `<h3>a. ...`, a source-side typo on 2 Chronicles 12) — dropped the first section.
  - The combination also caused a handful of chapters (Numbers 1, 1 Kings 6, Job 8, Job 32) to drop their opening "A" section while keeping later ones.
- **Chapter:verse references broke verse-anchored scrolling.** Point headings like `(15:1-12)` (used throughout Joshua 15–19 and other chapters) were parsed as verse "15" instead of verses 1–12, so clicking a verse wouldn't scroll the commentary to the right place. The parser now resolves `chapter:verse` notation relative to the page's chapter, including ranges that span into the chapter.
- Added a re-usable progress bar to the commentary scraper plus `npm run watch:commentary` to follow a running scrape live.

## v5.0.0

### New Features
- **Enduring Word commentary alongside reading** — A toggleable side panel on the reading page shows David Guzik's Enduring Word commentary next to the chapter text. Clicking a verse scrolls the commentary to that verse's section (section-anchored sync, since exact line alignment isn't possible). The toggle state persists.
  - **Personal build** bundles commentary locally for offline use. Run `npm run fetch:commentary` to scrape and populate `src/data/commentary-enduring-word.json` (gitignored, like the bundled Bible text). Supports resume and a `--force` refetch.
  - **Public build** does *not* bundle commentary — it live-fetches each chapter from enduringword.com on demand via the Electron main process (the renderer can't fetch it directly due to CORS), with a persistent on-disk cache so each chapter is fetched at most once.
  - New `electron/preload.cjs` exposes a minimal `window.commentary.fetch` bridge; `electron/commentaryParser.cjs` is shared between the scraper and the live-fetch handler.

## v4.1.1

### Bug Fixes
- **Poetry line breaks for NASB1995 / CSB / NLT** — The API.Bible parser was collapsing all whitespace (including newlines) into single spaces, so Psalms and other poetry rendered as one long run-on line. The parser now treats each `<p class="q1">` / `<p class="q2">` (poetic line) as its own line with leading indentation, matching how ESV already rendered.
- **47 incomplete ESV chapters** — The original ESV fetch only retried chapters with 0–1 verses, so chapters that came back with 2+ verses but were still truncated stayed broken. Refetched every ESV chapter whose verse count was significantly fewer than NASB1995's. Notable repairs include **John 10** (was 2 → now 42), **1 Peter 3** (2 → 22), **1 Chronicles 12** (3 → 40), **Lamentations 3** (33 → 66), **Matthew 27** (43 → 66), **Mark 9** (16 → 48), **Romans 8** (30 → 39), **Hebrews 9** (9 → 28), and 39 others. (Mark 9 stays at 48 because ESV legitimately omits the disputed 9:44 and 9:46.)
- **698 ESV chapters had the next chapter's heading leaked into the last verse** — Refetched every affected chapter one-by-one (e.g., Psalm 86 no longer ends with "A Psalm of the Sons of Korah. A Song. Glorious Things of You Are Spoken").

### Infrastructure
- **Published DMG no longer bundles Bible text.** A new `npm run electron:build:public` build mode excludes the four bundled `bible-text-*.json` files (which contain ESV / NASB1995 / CSB / NLT text). The published DMG drops from ~116 MB to ~10 MB and the app falls back to live ESV API + api.bible fetches using the user's own API keys configured in Settings. The default `npm run electron:build` still bundles the JSONs for local/offline personal use only.
- New utility scripts for maintaining the local JSON bundles:
  - `scripts/refetch-esv-v2.mjs` — cross-references ESV verse counts against NASB1995 and refetches anything significantly short.
  - `scripts/refetch-esv-headings.mjs` — refetches any ESV chapter whose last verse has a stale trailing heading.
  - `scripts/refetch-apibible.mjs` — regenerates NASB1995 / CSB / NLT JSONs using the new line-break-preserving parser.

---

## v4.1.0

### New Features
- **"On This Day" journal view** — A new third tab on the Journal page (next to List and Calendar) that shows all journal entries from a given month/day across every year you've journaled — like a 5-year journal. Navigate day-by-day, jump back to today, or pick any date. When you have entries from past years on today's date, a small "On this day" card also appears on the home page linking straight to the view.
- **Custom memory verses** — A new "My Verses" tab on the Memory page lets you add your own verses to memorize (e.g., your church's weekly memory verse). Each verse has a title, reference, translation, and optional description/explanation. Verses can be edited, deleted, and practiced with the same study/test/score flow as Fighter Verses.

### Bug Fixes
- **Fighter Verses week alignment** — Previously the app counted weeks since January 1, which doesn't match the standard Sunday-anchored week numbering. Week 1 now correctly starts on Sunday, January 4, 2026, with each subsequent week starting on a Sunday.
- **Drag-and-drop journal blocks now reliable** — The grip handle's `onMouseLeave` was killing the drag the moment the cursor moved off the grip to actually drag. Also fixed the timing of the `draggable` attribute (it was being set via React state, which is async — by the time the browser checked for drag intent on the same mousedown, the attribute wasn't set yet). Now uses an imperative ref to set the attribute synchronously.

### Polish
- **Removed "attempts" counter on memory verses** — Just shows the best score so you can practice as much as you want without watching a discouraging tally climb.

### Infrastructure
- New `CustomVersesContext` with localStorage persistence.
- New `utils/bookResolver.ts` extracted from the verse picker so both the journal verse picker and the new custom verse editor share a single resolver for book names, abbreviations, and aliases.

---

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
