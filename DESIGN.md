# Design System — ma-yidong.com

## Product Context
- **What this is:** Personal blog with an interactive 3D racing game as the landing page
- **Who it's for:** Developers, tech-curious readers, potential collaborators
- **Space/industry:** Personal developer blog / creative portfolio
- **Project type:** Editorial blog with interactive 3D hero element

## Aesthetic Direction
- **Direction:** Brutally Minimal with Warmth
- **Decoration level:** Minimal — typography and whitespace do all the work
- **Mood:** Calm precision. The blog feels like a well-set book page. The game feels like an architectural model. Both reward attention without demanding it.
- **Reference:** Japanese-inspired simplicity, Monument Valley's geometric restraint, Alto's Adventure's serene naturalism

## Typography
- **Display/Hero:** Instrument Serif — warm, refined serifs give personality without decoration
- **Body:** Plus Jakarta Sans — geometric, clean, excellent long-form readability
- **UI/Labels:** Plus Jakarta Sans (same as body)
- **Data/Tables:** JetBrains Mono (tabular-nums)
- **Code:** JetBrains Mono
- **Loading:** Google Fonts via `<link>` tags
- **Scale:** 4px base, 1.25 modular ratio
  - h1: 36px (2.25rem)
  - h2: 24px (1.5rem)
  - h3: 18px (1.125rem)
  - body: 15px (0.9375rem)
  - small: 13px (0.8125rem)
  - xs: 11px (0.6875rem)

## Color
- **Approach:** Restrained — one warm accent, everything else is neutrals
- **Primary (accent):** `#b8612a` — burnt sienna/terracotta. Used for links, active states, buttons, car body. The personality carrier.
- **Secondary:** `#8a9a7b` — sage green. Used sparingly in game trees and subtle accents.
- **Neutrals:** Warm grays
  - `#1a1918` — text (light mode)
  - `#6b6862` — muted text
  - `#9c9a95` — tertiary text
  - `#d4d2cd` — borders
  - `#e8e6e1` — light borders
  - `#f2f0ec` — card backgrounds
  - `#faf9f6` — page background (warm paper white)
- **Dark mode:**
  - Background: `#111110`
  - Elevated: `#1a1a18`
  - Card: `#222220`
  - Text: `#e8e6e1`
  - Accent: `#c87340` (slightly lighter for dark backgrounds)
  - Reduce saturation ~10% from light palette
- **Semantic:** success `#5a7a5a`, warning `#b8922a`, error `#a63d2f`, info `#4a6a8a`

## Spacing
- **Base unit:** 4px
- **Density:** Comfortable — generous breathing room
- **Scale:**
  - 2xs: 2px
  - xs: 4px
  - sm: 8px
  - md: 16px
  - lg: 24px
  - xl: 32px
  - 2xl: 48px
  - 3xl: 64px

## Layout
- **Approach:** Grid-disciplined — single column for blog, classic editorial alignment
- **Grid:** Single column, max-width 640px for prose content
- **Max content width:** 960px (listing pages), 640px (prose)
- **Border radius:** sm: 3px, md: 6px, lg: 8px, full: 9999px (tags/pills only)

## Motion
- **Approach:** Minimal-functional — only transitions that aid comprehension
- **Easing:** enter (ease-out), exit (ease-in), move (ease-in-out)
- **Duration:** micro (50-100ms), short (150ms default), medium (250ms), long (400ms)

## Game Visual Direction
- **Aesthetic:** Low-poly geometric — solid flat colors, no emissive/glow materials
- **Track:** Sand/stone tone (`#c4b9a8`), clean dark gray edge lines
- **Car:** Solid burnt sienna body (`#b8612a`), no neon wireframe edges, clean geometry
- **Trees:** Low-poly cones in muted sage/olive greens (`#7a8b6a`, `#8a9a7b`, `#6d7d5d`)
- **Buildings:** Geometric warm gray forms (`#9c9180`, `#a89c88`), no window lights
- **Ground:** Warm earth tone (`#b8ad9a`)
- **Sky/atmosphere:** Soft warm tones (`#d4c8b8`), warm haze replaces blue fog
- **Lighting:** Warm directional light + soft ambient — no colored point lights
- **HUD:** Thin sans-serif/mono text, no glow, clean transparent dark panels with subtle borders
- **Minimap:** Muted strokes, terracotta dot for car position
- **Start gate:** Simplified clean geometric arch, no neon

## CSS Variable Mapping (globals.css)
```css
:root {
  --accent: #b8612a;
  --accent-hover: #a55523;
  --secondary: #8a9a7b;
  --bg: #faf9f6;
  --bg-elevated: #ffffff;
  --bg-card: #f2f0ec;
  --bg-card-hover: #eae8e3;
  --text: #1a1918;
  --text-secondary: #6b6862;
  --text-tertiary: #9c9a95;
  --border: #d4d2cd;
  --border-light: #e8e6e1;
  --success: #5a7a5a;
  --warning: #b8922a;
  --error: #a63d2f;
  --info: #4a6a8a;
}
```

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-09 | Initial design system created | Replaced TRON Legacy aesthetic with minimalism. Created by /design-consultation based on product context + competitive research |
