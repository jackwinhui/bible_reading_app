# Bible App

A modern desktop Bible app with multi-translation reading, verse bookmarking,
annotations, a digital journal for reflections, and a weekly Fighter Verse
memory challenge. Available as a desktop app (macOS, Windows, Linux) and as
a regular web app.

## Features

- **Read the Bible** — All 66 books with chapter-by-chapter navigation
- **Four translations** — ESV, NASB1995, CSB, and NLT (toggle in the header)
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

- Node.js 18+
- API keys (see below)

### API Keys

This app uses external APIs for Bible text. Keys can be set in `.env` (build
time) or via the in-app **Settings** page (stored locally per user).

1. **ESV API** (for ESV translation)
   - Sign up at [api.esv.org](https://api.esv.org/)
   - Free for non-commercial use

2. **Scripture API** (for NASB1995, CSB, NLT)
   - Sign up at [scripture.api.bible](https://scripture.api.bible/)
   - Free to use

Note: ESV, NASB1995, CSB, and NLT text is pre-bundled with the app for
offline use; the APIs are only used when local data is missing.

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
# Web build (outputs to dist/)
npm run build
npm run preview

# Desktop build (current platform)
npm run electron:build

# Desktop build (all platforms — macOS, Windows, Linux)
npm run electron:build:all
```

Desktop binaries are written to `release/` (gitignored; published as GitHub
Release assets).

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

