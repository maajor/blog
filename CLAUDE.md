# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Minimalist static blog with an interactive 3D racing game as the landing page. Replaces a previous Hexo blog at ma-yidong.com. Built with Next.js 16 (App Router), React Three Fiber, and Tailwind CSS 4.

## Commands

```bash
npm run dev          # Development server (localhost:3000)
npm run build        # Static export build (includes prebuild RSS generation)
npm run prebuild     # Generate RSS feed via scripts/generate-rss.ts
npm run lint         # ESLint
```

No test framework is configured.

## Architecture

**Static site generation** — `output: "export"` in next.config.ts produces a fully static site. No server-side rendering at runtime. All pages are pre-rendered at build time.

**Path alias** — `@/*` maps to `./src/*`.

### Key Directories

- `src/app/` — Next.js App Router pages. Home page is the racing game, `/blog` is the post listing, `/blog/[slug]` is individual posts, `/about` is static.
- `src/components/` — React components including `RacingGame.tsx` (the 3D game, dynamically imported with `ssr: false`).
- `src/content/posts/` — Markdown blog posts with YAML frontmatter (`title`, `date`, `tags`, `excerpt`).
- `src/lib/` — Post data loading (`posts.ts`), markdown-to-HTML pipeline (`markdown.ts` using unified/remark/rehype), RSS generation (`rss.ts`).
- `scripts/` — Build-time scripts (RSS feed generator).

### Content Pipeline

Posts are Markdown files in `src/content/posts/`. `posts.ts` reads them with gray-matter, sorts by date descending. `markdown.ts` converts markdown to HTML via unified pipeline: remark-parse → remark-gfm → remark-rehype → rehype-slug → rehype-autolink-headings → rehype-stringify. `extractHeadings()` generates TOC from h2/h3 headings.

### 3D Racing Game

`RacingGame.tsx` uses React Three Fiber with `@react-three/drei`. Figure-8 track with elevation changes, raycast vehicle physics (Rapier), keyboard controls (WASD/arrows), chase camera. Low-poly geometric aesthetic with warm earth tones. Desktop-only — mobile shows a fallback.

### Styling

Tailwind CSS 4 with custom minimalist theme defined via CSS variables in `globals.css`. Primary accent: `#b8612a` (burnt sienna). Warm neutrals, no glow effects.

## Design System
Always read DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match DESIGN.md.

## Deployment

Static export deployed to Tencent Cloud COS. Domain: ma-yidong.com. Images are unoptimized (`images.unoptimized: true`) since there's no image optimization CDN.
