# Bible App — Version History

## v2.0.0

### New Features
- **CSB & NLT translations** — Added Christian Standard Bible and New Living Translation support
- **Reading location persistence** — Clicking the Read tab returns you to where you left off

### Bug Fixes
- **Fixed API.Bible URL** — Changed from `scripture.api.bible` to `rest.api.bible`
- **Fixed Bible IDs** — Corrected NASB1995, CSB, and NLT Bible IDs on API.Bible
- **Fixed USFM book mapping** — API.Bible requires USFM book codes (e.g., `PSA`, `1JN`); was sending incorrect abbreviations causing 400 errors
- **Fixed missing `.env`** — App now ships with `.env.example` and clear setup instructions
- **Fixed verse text cut off across paragraphs** — Verses spanning multiple `<p>` tags in API.Bible HTML (e.g., Matthew 1:6 NASB1995) are now fully captured
- **Fixed poetry formatting** — Psalm poetry now renders with proper line breaks and indented continuation lines matching BibleGateway layout
- **Fixed verse number placement** — Verse numbers now appear inline with the first line of text in poetry, not on a separate line
- **Fixed ESV section headings** — Headings and subtitles (e.g., Psalm superscriptions) are extracted and rendered
- **Fixed ESV prose paragraph breaks** — Paragraph spacing now appears between verse groups in prose passages (e.g., Genesis 1)
- **Fixed stanza breaks** — Poetry stanza breaks (e.g., between Psalm 51:2–3) now show proper vertical spacing
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
