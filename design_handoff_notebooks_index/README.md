# Handoff: Notebooks Index Redesign (Option 2A — Typographic + Hover Reveal)

## Overview
A redesign of the notebooks index page at `rreusser.github.io/notebooks/`. The goal
was to fix a grid of full-color thumbnails that read as visually noisy and disjoint,
and to remove a redundant list/card view toggle. The chosen direction (**2A**) is a
calm, typographic, single-column list grouped by year. Thumbnails are hidden by
default and revealed one at a time on hover (desktop only), so the imagery becomes a
reward rather than constant noise.

## About the Design Files
The file in this bundle (`Notebooks Index.dc.html`) is a **design reference created in
HTML** — a prototype demonstrating the intended look and behavior. It is **not
production code to copy directly**. The task is to **recreate this design in the target
codebase** (the site is built with Observable Notebook Kit; the index is generated from
notebook front-matter) using its existing patterns, templating, and data source. The
prototype contains four exploration options (1a/1b/1c/2a) laid out side by side on a
canvas — **only Option 2A is being implemented.** Ignore the others.

## Fidelity
**High-fidelity.** Colors, typography, spacing, and the hover interaction are final and
should be recreated faithfully, adapted to the site's existing dark theme and serif
body font.

## The One Screen: Notebooks Index (Option 2A)

### Purpose
Browse all notebooks, scan by title/description/tags, jump to a notebook. Preview
imagery appears on hover without cluttering the default view.

### Layout
- Single centered content column (prototype uses ~900px inner width; match the site's
  existing content width).
- Existing page header ("notebooks" title band + intro paragraphs + contact line)
  is unchanged — this redesign only replaces the notebook **listing** below it.
- **Remove the grid/list view toggle entirely.**
- The list is grouped by year, newest year first, notebooks newest-first within a year.

### Year group header (repeats per year)
- Horizontal row, `display:flex; align-items:baseline; gap:20px; margin:38px 0 6px`.
- Left: year, monospace, `13px`, `letter-spacing:.14em`, color `#e06b5b`.
- Middle: 1px horizontal rule, `background: rgba(255,255,255,.08)`, flex-grows to fill.
- Right: count label, monospace, `12px`, color `#5c5c5c`, text like `7 notebooks` /
  `1 notebook` (singular/plural).

### Notebook row (repeats per notebook)
An `<a>` linking to the notebook, `display:grid; grid-template-columns:128px 1fr;
gap:22px; padding:15px 14px; margin:0 -14px; border-radius:8px`.
- **Left column (128px) — date / thumbnail slot**, a relative-positioned box `height:72px`:
  - Date text: monospace, `12px`, color `#6f6f6f`, `letter-spacing:.02em`, positioned
    `top:6px`. Format uppercase like `JUL 14, 2026`. Fades to `opacity:0` on row hover
    (`transition: opacity .25s ease`).
  - Thumbnail `<img>`: absolutely positioned, `128px × 72px`, `object-fit:cover`,
    `border-radius:6px`, `box-shadow:0 6px 18px rgba(0,0,0,.4)`. Default
    `opacity:0; transform:scale(.96)`. On row hover → `opacity:1; transform:none`
    (`transition: opacity .3s ease, transform .3s ease`). Shown in **full color**.
- **Right column (1fr):**
  - Title + inline tags row (`display:flex; align-items:baseline; gap:12px;
    flex-wrap:wrap`):
    - Title: serif, `22px`, `font-weight:500`, color `#ededed`, `line-height:1.25`.
    - Tags: monospace, `10.5px`, `letter-spacing:.06em`, `text-transform:uppercase`,
      color `#7d7d7d`. (In the prototype these are plain labels; on the live site tags
      link to `?tag=<tag>` — preserve that.)
  - Description: serif, `16px`, color `#a2a2a2`, `line-height:1.5`, `max-width:640px`.

### Row hover (whole row)
- Background: `rgba(255,255,255,0.03)` (`transition: background .18s ease`).
- Triggers the date→thumbnail swap described above.

## Interactions & Behavior
- **Hover reveal must be gated behind `@media (hover: hover)`** so touch devices never
  trigger it and simply show the clean date-only text. The swap rules:
  ```css
  @media (hover: hover) {
    .reveal-row:hover .rr-date  { opacity: 0; }
    .reveal-row:hover .rr-thumb { opacity: 1; transform: none; }
  }
  ```
- Only one row reveals at a time (natural consequence of per-row hover).
- Clicking a row navigates to the notebook URL (`/notebooks/<slug>/`).
- Tag labels link to the filtered index (`/notebooks/?tag=<tag>`).

### Responsive
- On narrow/mobile: keep the two-column row or collapse the 128px column; either way no
  hover reveal (see media query). Date stays visible. Reduce title to ~18–20px.

## Design Tokens
- Panel background: `#1c1c1c` (page background on the live site is its existing dark
  tone; prototype canvas uses `#151515`).
- Accent red (year label / small headings): `#e06b5b`; brand red `#ca4747`.
- Title text: `#ededed`; description: `#a2a2a2`; date/muted: `#6f6f6f`; tag: `#7d7d7d`;
  count label: `#5c5c5c`.
- Hairline / hover bg: `rgba(255,255,255,.08)` / `rgba(255,255,255,0.03)`.
- Fonts: **serif** for titles + descriptions (prototype uses Newsreader; on the live
  site use its existing serif body font), **monospace** for dates/tags/year labels.
- Type scale: title 22px/500, description 16px, date 12px, tags 10.5px, year 13px.
- Radius: row 8px, thumbnail 6px. Row padding `15px 14px`, negative `-14px` side margin.
- Thumbnail: 128×72 (16:9), shadow `0 6px 18px rgba(0,0,0,.4)`.
- Transitions: bg .18s, date .25s, thumbnail .3s, all `ease`.

## Assets
- Thumbnails already exist on the site at `https://rreusser.github.io/meta/<slug>.webp`
  (one per notebook, referenced from front-matter). No new assets needed — reuse them.

## Files
- `Notebooks Index.dc.html` — the HTML prototype. Option **2A** is the panel labeled
  `2A` (top of the canvas). Its markup/logic is the reference; 1a/1b/1c are discarded
  alternatives. The notebook data array in the file's logic (`NB = [...]`) mirrors the
  fields the real index already has (title, slug, date, tags, description, image).
