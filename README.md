# GitHub Pages Directory

A small, dependency-free static gallery of the GitHub Pages sites published from
[TheRealMarcusChiu](https://github.com/TheRealMarcusChiu)'s repositories, grouped
by category with a preview screenshot for each site. A Finder-style **Sort by**
control orders the gallery by *Recently updated* (default), *Recently created* or
*Category*.

> **Snapshot caveat:** `data/sites.json` is a static snapshot of repositories that
> had GitHub Pages enabled when checked on **2026-10-18** (41 entries). It is not
> automatically synced. This directory's own repository is not included.
>
> **Screenshots:** `assets/previews/<repo>.webp` are 1365×900 viewport previews
> (top of the page only, not full-page) captured on **2026-10-18**. They are local
> static images, not live views — the live sites may have changed since.
>
> **Repository dates:** each entry's `createdAt` / `updatedAt` are the GitHub
> repository `created_at` / `updated_at` values from the authenticated GitHub REST API
> (one paginated owner repo listing, retrieved 2026-10-18T21:24:42Z). They are
> repository metadata, not page-content dates — `updated_at` moves on any repository
> update (pushes, settings, description). They are stored statically; the page makes
> no GitHub API calls.

## Structure

```
index.html              Page markup
assets/styles.css       Warm editorial dark theme (Newsreader + JetBrains Mono)
assets/app.js           Loads data/sites.json, renders the gallery, search, category chips + sort
assets/previews/*.webp  41 local 1365×900 preview screenshots, dated 2026-10-18
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

## Sorting

- **Recently updated** (default) and **Recently created** show every unique site once
  in a single *All sites* section, sorted globally by descending `updatedAt` /
  `createdAt`. Ties fall back to the other date, then repository name, then source
  order. Sorting works on copies; `data/sites.json` order is never changed.
- **Category** shows the original category sections in source order, with secondary
  (`alsoIn`) cards as before.
- Category chips, search, counts and the empty/reset state work the same in every
  mode; in the recent modes a category chip keeps all its members (primary or
  secondary) in the global order. Every card shows its category labels and its repo
  created/updated dates, with the active sort date in gold.

## Verify

```sh
node tests/verify.mjs
# include the browser checks (needs Playwright + Chromium somewhere on disk):
PLAYWRIGHT_MODULE=/path/to/node_modules/playwright REQUIRE_BROWSER=1 node tests/verify.mjs
```

Without Playwright the browser stage prints `SKIP`; `REQUIRE_BROWSER=1` turns that
into a failure.

Checks include: exactly 41 unique entries (names, Pages URLs, repository URLs,
titles, screenshots); HTTPS-only links and correct repository URLs; no
`github-pages-directory` self-entry; every repository in its expected primary
category exactly once, with exactly the expected `alsoIn` secondary memberships; each screenshot path is relative and points at an existing 1365×900
WebP with no orphans; relative asset paths; only the Google Fonts stylesheet as a
remote resource; no HTML-injection APIs; and accessibility basics (lang, landmarks,
labelled search and chip group, live status, alt text, focus styles, reduced motion,
tap targets) plus the snapshot disclaimers in the page and this README. The exact
names, titles and source order are pinned, and every entry must carry valid ISO 8601
UTC `createdAt` ≤ `updatedAt` matching the retrieved GitHub values; the page must
offer a labelled *Sort by* select defaulting to *Recently updated*.

The browser stage serves the folder under `/github-pages-directory/` and, at desktop
(1365×900) and phone (360×740) sizes, checks all three sort modes (global descending
order with tie-breakers; category sections and members), chip + search composition,
zero results and both reset buttons, keyboard use (Tab to the select, arrow keys,
chips, `/`, Esc), no horizontal overflow, and no console errors, failed requests or
off-site requests besides Google Fonts.

## Data format

`data/sites.json` has `snapshotDate`, `screenshots` (capture date and size),
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
| `createdAt`  | GitHub repository `created_at` (ISO 8601 UTC), repo metadata     |
| `updatedAt`  | GitHub repository `updated_at` (ISO 8601 UTC), repo metadata     |

A site with `alsoIn` keeps its primary `category` and gets an extra card in each
listed section; its card label names the primary category first. Category chips and
section headers count every member, while the header total, the All chip and the
result status count unique sites. Currently every Art & 3D site is also in
Personal & Portfolio.

Display titles were written by hand, using the 2026-10-18 scan's page titles and
headings only as hints. Scraped page text is never stored or rendered; the repo slug
stays visible to tell apart pages with identical titles (e.g. the three Tetris builds
and the personal-site versions).

## Updating the inventory

Edit `data/sites.json`, add or replace the matching preview in `assets/previews/`,
update the snapshot/capture dates in `data/sites.json`, `index.html` and this README,
refresh `createdAt` / `updatedAt` from the GitHub API (and `repositoryDates.retrievedAt`),
then adjust `EXPECTED_COUNT`, `EXPECTED_CATEGORIES`, `EXPECTED_ALSO_IN`, `EXPECTED_SITES`
and `DATES_RETRIEVED` in `tests/verify.mjs`.
