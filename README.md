# Bible App

A modern React Bible app with ESV and NASB1995 translations, verse bookmarking, annotations, and a weekly Fighter Verse memory challenge.

## Features

- **Read the Bible** — All 66 books with chapter-by-chapter navigation
- **ESV & NASB1995** — Toggle between translations
- **Bookmarks** — Save favorite verses and revisit them
- **Annotations** — Add personal notes to any verse
- **Memory Challenge** — Weekly Fighter Verse memorization with scoring
- **Dark Mode** — Light/dark theme with system preference detection

## Getting Started

### Prerequisites

- Node.js 18+
- API keys (see below)

### API Keys

This app uses external APIs for Bible text:

1. **ESV API** (for ESV translation)
   - Sign up at [api.esv.org](https://api.esv.org/)
   - Free for non-commercial use

2. **Scripture API** (for NASB1995 translation)
   - Sign up at [scripture.api.bible](https://scripture.api.bible/)
   - Free to use

### Setup

```bash
# Install dependencies
npm install

# Copy env template and add your API keys
cp .env.example .env

# Edit .env with your API keys
# VITE_ESV_API_KEY=your_key_here
# VITE_SCRIPTURE_API_KEY=your_key_here

# Start development server
npm run dev
```

### Build for Production

```bash
npm run build
npm run preview
```

## Tech Stack

- **React** + TypeScript (Vite)
- **Tailwind CSS** for styling
- **React Router** for navigation
- **localStorage** for bookmarks, annotations, and progress
- **Lucide React** for icons

## Fighter Verses

The memory challenge uses Set 1 of the Fighter Verses — 52 weekly Scripture memory verses. The current week's verse is automatically selected based on the calendar week.
