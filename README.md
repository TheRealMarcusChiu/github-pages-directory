# GitHub Pages Directory

A small, dependency-free static gallery of the GitHub Pages sites published from
[TheRealMarcusChiu](https://github.com/TheRealMarcusChiu)'s repositories, grouped
by category with a preview screenshot for each site. Search, a multi-select
**Category** dropdown and a Finder-style **Sort by** control share one row on desktop;
the gallery is ordered by *Recently created* (default), *Recently updated* or
*Category*. Each tile is one link to the live site (screenshot included), with a
separate *GitHub repo* link.

> **Snapshot caveat:** `data/sites.json` is a static snapshot dated **2026-10-19**
> (48 entries). It is not automatically synced. Membership means the repository is
> public and has GitHub Pages configured according to the authenticated GitHub Pages
> API owner inventory — not that the page was reviewed or looks finished. The account
> homepage is included; this directory's own repository is not.
>
> **Screenshots:** `assets/previews/<repo>.webp` are 1365×900 viewport previews
> (top of the page only, not full-page). Capture dates vary by entry and are stored
> per site as `screenshotCapturedOn`: 40 of the original 41 were captured on **2026-10-18**;
> `bandwidth-compare` (one of the original 41) was re-captured on **2026-10-19**, and the
> four added in this refresh were captured on **2026-10-19**, as were the two later
> additions (`zfs-layout-lab`, `vram-fit-map`) and the final addition
> (`display-decision-lab`) — 40 previews dated 2026-10-18,
> 8 dated 2026-10-19, 48 in total. They are local static images, not
> live views — the live sites may have changed since.
>
> **Notes on the 2026-10-19 additions:** `confluence-obsidian-quartz` answers HTTP 200
> but serves a raw RSS feed (`application/rss+xml`), not a styled site, so its title is
> *Quartz Feed · /var/log* and its preview shows the raw feed.
> `wiki-viewer` rendered its empty state (`0 shown`) at capture time, hence
> *Wiki Viewer · Empty Garden*.
>
> **Repository dates:** each entry's `createdAt` / `updatedAt` are the GitHub
> repository `created_at` / `updated_at` values from the authenticated GitHub REST API
> (one owner Pages inventory, retrieved 2026-10-19T21:46:15Z). They are
> repository metadata, not page-content dates — `updated_at` moves on any repository
> update (pushes, settings, description). They are stored statically; the page makes
> no GitHub API calls.

## Structure

```
index.html              Page markup
assets/styles.css       Warm editorial dark theme (Newsreader + JetBrains Mono)
assets/app.js           Loads data/sites.json, renders the gallery, search, category dropdown + sort
assets/previews/*.webp  48 local 1365×900 preview screenshots, capture date per entry
data/sites.json         The inventory (see below)
tests/verify.mjs        Dependency-free checks
```

All paths are relative, so the site works at a repository subpath such as
`https://git.marcuschiu.com/github-pages-directory/`. The only remote resource is the
Google Fonts stylesheet for Newsreader and JetBrains Mono (with Georgia / system
monospace fallbacks). No CDNs, third-party images, runtime GitHub API calls, or analytics.

## Local preview

The page fetches `data/sites.json`, so serve the folder over HTTP rather than
opening `index.html` directly:

```sh
python3 -m http.server 8000
# open http://localhost:8000/
```

To check the repository-subpath behaviour, serve the parent directory instead and
open `http://localhost:8000/github-pages-directory/`.

## Sorting and filtering

- **Recently created** (default) shows every unique site once in a single *All sites*
  section, by descending repository `createdAt` (GitHub `created_at`); ties go to
  repository name, then source order — never `updatedAt` or screenshot dates.
- **Recently updated** uses the same single section by descending `updatedAt`; ties
  fall back to `createdAt`, then repository name, then source order. Sorting works on
  copies; `data/sites.json` order is never changed.
- **Category** shows the original category sections in source order, with secondary
  (`alsoIn`) cards as before.
- The **Category** dropdown is a disclosure button over a labelled group of
  checkboxes (with member counts). No boxes checked means every category; checked
  boxes combine with OR, and search narrows the result further (AND) in every sort
  mode. Escape, Tab-away or a click outside closes it; arrow keys, Home and End move
  between options; *Show all categories* clears the selection.
- Counts and the empty/reset state (*Clear search*, *Show all categories*) work the
  same in every mode. Every card shows its category labels and repo created/updated
  dates, with the active sort date in gold, plus a separate, quieter
  *Preview · <date>* line giving that card's screenshot capture date.

## Tiles

Each tile is one `<a>` to the GitHub Pages URL wrapping the screenshot, category,
title, repo slug and dates, so clicking anywhere on the tile opens the site. The
*GitHub repo* link is a sibling anchor (never nested) pinned into a reserved strip at
the bottom of the tile.

## Verify

```sh
node tests/verify.mjs
# include the browser checks (needs Playwright + Chromium somewhere on disk):
PLAYWRIGHT_MODULE=/path/to/node_modules/playwright REQUIRE_BROWSER=1 node tests/verify.mjs
```

Without Playwright the browser stage prints `SKIP`; `REQUIRE_BROWSER=1` turns that
into a failure.

Checks include: exactly 48 unique entries (names, Pages URLs, repository URLs,
titles, screenshots); HTTPS-only links and correct repository URLs; no
`github-pages-directory` self-entry; every repository in its expected primary
category exactly once, with exactly the expected `alsoIn` secondary memberships; each screenshot path is relative and points at an existing 1365×900
WebP with no orphans (all complete, non-blank lossy VP8), each entry's required `screenshotCapturedOn` (exact per entry: 2026-10-18 for 40 of the original 41, 2026-10-19 for the re-captured `bandwidth-compare`, the four additions, the two later additions and the final addition); relative asset paths; only the Google Fonts stylesheet as a
remote resource; no HTML-injection APIs; and accessibility basics (lang, landmarks,
labelled search, category dropdown and checkbox group, alt text, focus styles, reduced motion,
tap targets) plus the snapshot disclaimers in the meta description, footer and this README.
The masthead is just the eyebrow and title, with no result-status line; each control is
one outlined field with its short uppercase label inside, before the active value. The exact
names, titles and source order are pinned, and every entry must carry valid ISO 8601
UTC `createdAt` ≤ `updatedAt` matching the retrieved GitHub values; the page must
offer a labelled *Sort by* select defaulting to *Recently created*.

The browser stage serves the folder under `/github-pages-directory/` and, at desktop
(1365×900) and phone (360×740) sizes, checks the default *Recently created* order on
load, all three sort modes (global descending order with tie-breakers, plus a
tied-`created_at` fixture; category sections and members), multi-category checkbox +
search composition in every mode, zero results and both reset buttons, the dropdown
(open/close, Escape, Tab-away, outside click, focus return, checked states, arrow
keys), tile structure (one site anchor around image and text, a separate GitHub
anchor, no nested anchors) and real clicks on the image, card background and GitHub
link, in-field labels (SEARCH, CATEGORY, SORT BY) with gold chevrons on the two menus,
controls on one row on desktop, no horizontal overflow (menu open or closed),
and no console errors, failed requests or off-site requests besides Google Fonts.

## Data format

`data/sites.json` has `snapshotDate`, `screenshots` (size, format and
`captureDatePolicy: "per-entry"`),
`repositoryDates` (source and retrieval time of the repo dates),
`categories` (ordered `id`/`label` pairs) and `sites`, where each entry is:

| field        | meaning                                                         |
|--------------|-----------------------------------------------------------------|
| `name`       | original repository name (slug, shown on every card)           |
| `title`      | hand-written display title                                       |
| `category`   | primary category `id`                                            |
| `alsoIn`     | optional list of extra category `id`s the card is also shown in  |
| `url`        | GitHub Pages URL                                                 |
| `repository` | GitHub repository URL                                            |
| `screenshot` | relative path, `assets/previews/<name>.webp`                     |
| `screenshotCapturedOn` | date (`YYYY-MM-DD`) this entry's preview was captured  |
| `createdAt`  | GitHub repository `created_at` (ISO 8601 UTC), repo metadata     |
| `updatedAt`  | GitHub repository `updated_at` (ISO 8601 UTC), repo metadata     |

A site with `alsoIn` keeps its primary `category` and gets an extra card in each
listed section; its card label names the primary category first. Category checkboxes and
section headers count every member, while the empty state counts unique sites. Currently every Art & 3D site is also in
Personal & Portfolio.

Display titles were written by hand, using the 2026-10-18 and 2026-10-19 scans' page
titles and headings only as hints. Scraped page text is never stored or rendered; the repo slug
stays visible to tell apart pages with identical titles (e.g. the three Tetris builds
and the personal-site versions).

## Updating the inventory

Edit `data/sites.json`, add or replace the matching preview in `assets/previews/`,
set that entry's `screenshotCapturedOn`, update the snapshot date in `data/sites.json`,
`index.html` and this README,
refresh `createdAt` / `updatedAt` from the GitHub API (and `repositoryDates.retrievedAt`),
then adjust `EXPECTED_COUNT`, `EXPECTED_CATEGORIES`, `EXPECTED_ALSO_IN`, `EXPECTED_SITES`
(including capture dates) and `DATES_RETRIEVED` in `tests/verify.mjs`.
