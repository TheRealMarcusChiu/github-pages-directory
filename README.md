# GitHub Pages Directory

A small, dependency-free static index of the GitHub Pages sites published from
[TheRealMarcusChiu](https://github.com/TheRealMarcusChiu)'s repositories.

> **Snapshot caveat:** `data/sites.json` is a static snapshot of repositories that
> had GitHub Pages enabled when checked on **2026-10-18** (44 entries). It is not
> automatically synced, and listing a site here does not mean its live response
> was independently tested. This directory's own repository is not included.

## Structure

```
index.html          Page markup
assets/styles.css   Styles (dark theme, no external fonts)
assets/app.js       Loads data/sites.json, renders the list, live search
data/sites.json     The inventory (name, Pages URL, repository URL)
tests/verify.mjs    Dependency-free checks
```

All paths are relative, so the site works at a repository subpath such as
`https://git.marcuschiu.com/github-pages-directory/`. No CDNs, remote fonts, or analytics.

## Local preview

The page fetches `data/sites.json`, so serve the folder over HTTP rather than
opening `index.html` directly:

```sh
python3 -m http.server 8000
# open http://localhost:8000/
```

## Verify

```sh
node tests/verify.mjs
```

Checks: exactly 44 entries, unique names and URLs, HTTPS-only links, correct
repository URLs, no `github-pages-directory` entry, and that the required HTML
and assets exist with relative paths and no remote resources.

## Updating the inventory

Edit `data/sites.json` (each entry: `name`, `url`, `repository`), update
`snapshotDate` and the date shown in `index.html`, then adjust the expected
count in `tests/verify.mjs`.
