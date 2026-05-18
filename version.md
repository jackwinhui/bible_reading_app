# Bible App — Version History

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
