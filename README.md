# Bible App

A modern desktop Bible app with multi-translation reading, verse bookmarking,
annotations, a digital journal for reflections, and a weekly Fighter Verse
memory challenge. Available as a desktop app (macOS, Windows, Linux) and as
a regular web app.

## Features

- **Read the Bible** — All 66 books with chapter-by-chapter navigation
- **Four translations** — ESV, NASB1995, CSB, and NLT (toggle in the header)
- **Commentary** — Read David Guzik's Enduring Word commentary in a side panel
  alongside any chapter (toggle with the book icon in the reading header).
  Click a verse to scroll the commentary to that verse's section. The personal
  build bundles commentary for offline use; the published build fetches it live
  from enduringword.com on demand.
- **Bookmarks** — Save favorite verses and revisit them
- **Annotations** — Add short personal notes to any verse
- **Journal** — Dated, block-based reflections with inline verse embeds
  - Insert verses as styled blocks with a snapshot of the text at the time
    you wrote (so entries stay stable even if a translation changes)
  - Markdown-lite formatting (`**bold**`, `*italic*`, headings, lists, quotes)
  - Reverse lookup: a small `j` superscript appears next to any verse that
    has a journal entry referencing it — click for a quick popover
  - List view (grouped by month) and calendar view
  - Search across titles, body text, and references; tag filters
  - Export entries to JSON or Markdown; import JSON to merge or replace
- **Memory Challenge** — Weekly Fighter Verse memorization with scoring
- **Dark Mode** — Light/dark theme with system preference detection
- **Local-first** — All bookmarks, annotations, journal entries, and progress
  live in your browser's `localStorage`. Nothing leaves your machine except
  API requests to fetch Bible text.

## Getting Started

### Prerequisites

- Node.js 22.12+ (Node.js 24 LTS recommended)
- API keys (see below)

### API Keys

Public downloads start with empty API-key fields. Enter your own keys in the
in-app **Settings** page; they are stored locally on your device. Public builds
ignore `.env` files and never include the developer's build-time API keys.

For personal development builds only, keys can also be supplied in `.env`.

1. **ESV API** (for ESV translation)
   - Sign up at [api.esv.org](https://api.esv.org/)
   - Free for non-commercial use

2. **Scripture API** (for NASB1995, CSB, NLT)
   - Sign up at [scripture.api.bible](https://scripture.api.bible/)
   - Free to use

Public downloads fetch Bible text and commentary on demand. Personal builds
can use local, gitignored Bible and commentary data for offline reading.

### Setup

```bash
# Install dependencies
npm install

# (Optional) Copy env template and add your API keys
cp .env.example .env

# Edit .env with your API keys
# VITE_ESV_API_KEY=your_key_here
# VITE_SCRIPTURE_API_KEY=your_key_here

# Start development server
npm run dev
```

### Build

```bash
# Public web build (safe to distribute; outputs to dist/)
npm run build:public
npm run preview

# Public desktop build (safe to distribute)
npm run electron:build:public

# Personal web build (may include your .env keys and local Bible text)
npm run build

# Personal desktop build (do not distribute)
npm run electron:build

# Personal desktop build (all platforms — macOS, Windows, Linux)
npm run electron:build:all
```

Desktop binaries are written to `release/` (gitignored; published as GitHub
Release assets).

The public build also rejects output containing configured API keys,
environment files, or bundled Bible/commentary data before packaging.

Pushing a stable `vX.Y.Z` tag publishes the public macOS Apple Silicon installers
through `.github/workflows/release.yml`. The workflow builds the tagged source,
runs the release guards, and uploads all assets before making the release public.
It can also be run manually with an existing release tag.

### Regression tests

Run `npm test` for the Bible API and public-build regression cases. They use Node's built-in
test runner with mocked responses, so no API keys or network access are needed.

## Tech Stack

- **React 19** + TypeScript (Vite)
- **Electron** for the desktop shell
- **Tailwind CSS v4** for styling
- **React Router** (HashRouter for Electron) for navigation
- **localStorage** for bookmarks, annotations, journal entries, and progress
- **Lucide React** for icons

## Fighter Verses

The memory challenge uses Set 1 of the Fighter Verses — 52 weekly Scripture
memory verses. The current week's verse is automatically selected based on
the calendar week.

## Versioning

See [`version.md`](./version.md) for the full version history.

## Licence

The code is [MIT](LICENSE) — use it, change it, ship it, no warranty.

Scripture text is **not** covered by that licence and is not mine to grant. This
app ships no Bible text: verses are fetched at runtime from the ESV and
api.bible services using your own API key, and that text stays subject to the
publishers' terms — see [`ESV_API_v3_guidelines.md`](./ESV_API_v3_guidelines.md).
The verse lists here are references only (book, chapter, verse), which are facts
rather than anything copyrightable.
