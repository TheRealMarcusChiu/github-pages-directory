// Dependency-free checks for the static directory. Run: node tests/verify.mjs
// Browser checks run too when Playwright can be imported (or PLAYWRIGHT_MODULE points at one);
// set REQUIRE_BROWSER=1 to fail instead of skipping when it can't.
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, extname, normalize as normalizePath } from "node:path";
import { createServer } from "node:http";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const EXPECTED_COUNT = 41;
const OWNER = "TheRealMarcusChiu";
const SNAPSHOT = "2026-10-18";
const PREVIEW_DIR = "assets/previews";
const PREVIEW_SIZE = { width: 1365, height: 900 };
const HOMEPAGE_REPO = "therealmarcuschiu.github.io";
// The only remote resource allowed: the same Google Fonts stylesheet the reference design uses.
const GOOGLE_FONTS =
  "https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400;1,6..72,500;1,6..72,600&family=JetBrains+Mono:wght@400;500;600&display=swap";

// Category id → label → primary repositories. Each repository has exactly one primary category.
const EXPECTED_CATEGORIES = [
  ["personal", "Personal & Portfolio", ["therealmarcuschiu.github.io", "personal-website", "personal-website-2-public", "personal-website-3", "projects", "now", "workouts", "images"]],
  ["writing", "Writing & Reflection", ["thoughts", "quotes", "meditations"]],
  ["faith", "Faith & Bible Study", ["bible-graph", "the-law-of-first-mention"]],
  ["tech", "Tech & Learning", ["bandwidth-compare", "barnes-hut-algorithm", "confluence-data", "display-tech-explorer", "fisher-information", "monitor-tech-guide", "tech", "visualizing-neural-networks", "obsidian-generator", "obsidian-stargazer", "crontab-guru-clone", "shazaam"]],
  ["knowledge", "Knowledge & Reading", ["quartz", "stardust", "var-log", "var-log-1"]],
  ["games", "Games & Simulations", ["better-plume", "birdseye-arena", "dark-twilight-imperium", "spinning-cube", "tetris-ascii", "tetris-canvas", "tetris-unicode", "tower-defense", "shared-canvas", "table-topics"]],
  ["art", "Art & 3D", ["art", "my-room-in-3d"]],
];
// Secondary memberships (optional `alsoIn`), repository → extra category ids. Primary category is unchanged.
const EXPECTED_ALSO_IN = {
  "art": ["personal"],
  "my-room-in-3d": ["personal"],
};
// Every site whose primary category is the key must also be listed in the value category.
const SECONDARY_COUNT = Object.values(EXPECTED_ALSO_IN).flat().length;
const REQUIRED_OVERLAPS = [["art", "personal"]];
// Exact source order, display titles and GitHub repository created_at / updated_at, retrieved once from the
// authenticated owner repo listing on 2026-10-18. Repository metadata only — not page-content dates.
const EXPECTED_SITES = [
  ["therealmarcuschiu.github.io", "Account Home", "2020-07-12T18:05:00Z", "2026-07-03T06:00:22Z"],
  ["personal-website", "Personal Website · Developer (v1)", "2018-12-21T07:19:36Z", "2025-05-28T20:45:00Z"],
  ["personal-website-2-public", "Personal Website · Hi There (v2)", "2025-06-09T05:09:38Z", "2026-07-03T06:00:55Z"],
  ["personal-website-3", "Personal Website · Terminal (v3)", "2026-06-10T00:53:07Z", "2026-10-18T20:24:47Z"],
  ["projects", "Projects · Selected Work", "2026-06-10T18:39:17Z", "2026-08-19T19:15:51Z"],
  ["now", "Now", "2026-07-01T21:51:17Z", "2026-10-18T20:03:31Z"],
  ["workouts", "Training Log", "2026-06-24T18:35:11Z", "2026-08-07T06:11:53Z"],
  ["thoughts", "Mark the Thoughts", "2026-06-09T23:29:40Z", "2026-09-26T20:14:02Z"],
  ["quotes", "Quotes Worth Keeping", "2026-06-09T06:46:37Z", "2026-08-19T19:14:09Z"],
  ["meditations", "Meditations", "2026-08-02T06:27:30Z", "2026-10-18T03:06:46Z"],
  ["bible-graph", "Bible Graph", "2026-07-03T20:27:30Z", "2026-07-10T03:36:13Z"],
  ["the-law-of-first-mention", "The Law of First Mention", "2025-08-14T20:27:13Z", "2026-07-03T05:46:27Z"],
  ["bandwidth-compare", "Bandwidth Compare", "2026-10-16T04:26:33Z", "2026-10-16T19:33:32Z"],
  ["barnes-hut-algorithm", "Barnes–Hut Gravity Simulation", "2026-01-26T18:15:23Z", "2026-07-03T05:56:58Z"],
  ["confluence-data", "Confluence Data Visualizations", "2020-05-12T01:03:40Z", "2026-07-03T07:09:14Z"],
  ["display-tech-explorer", "Display Tech Explorer", "2026-10-18T17:04:16Z", "2026-10-18T17:06:01Z"],
  ["fisher-information", "Fisher Information", "2021-12-23T19:39:34Z", "2026-07-03T05:56:08Z"],
  ["monitor-tech-guide", "Display Atlas · Monitor Tech Guide", "2026-10-18T04:20:19Z", "2026-10-18T04:20:35Z"],
  ["tech", "What the Tech?", "2026-06-09T18:22:49Z", "2026-07-03T06:42:43Z"],
  ["visualizing-neural-networks", "Visualizing Neural Networks", "2025-09-02T03:15:39Z", "2026-07-03T05:41:40Z"],
  ["obsidian-generator", "ZIM Archive → Obsidian Vault", "2026-07-09T20:20:13Z", "2026-07-10T03:57:54Z"],
  ["obsidian-stargazer", "Obsidian Stargazer", "2026-07-09T20:16:50Z", "2026-07-10T02:48:34Z"],
  ["crontab-guru-clone", "Crontab Guru Clone", "2019-04-01T04:23:31Z", "2026-07-03T05:44:58Z"],
  ["quartz", "/var/log · Quartz", "2026-06-04T17:24:25Z", "2026-07-11T17:41:12Z"],
  ["stardust", "Stardust Knowledge Garden", "2026-06-29T05:23:53Z", "2026-10-07T18:03:58Z"],
  ["var-log", "/var/log Knowledge Garden", "2026-06-04T20:38:46Z", "2026-07-12T04:06:25Z"],
  ["var-log-1", "/var/log · Quartz Archive", "2026-06-26T17:48:53Z", "2026-06-26T19:50:07Z"],
  ["better-plume", "Plume", "2026-10-10T05:28:48Z", "2026-10-10T06:13:20Z"],
  ["birdseye-arena", "Birdseye Arena", "2026-10-11T01:28:21Z", "2026-10-13T05:37:32Z"],
  ["dark-twilight-imperium", "Oracle Rex · Twilight Imperium Companion", "2026-07-03T05:27:24Z", "2026-07-03T05:40:05Z"],
  ["spinning-cube", "Spinning Cube", "2026-07-03T05:33:28Z", "2026-07-03T05:34:53Z"],
  ["tetris-ascii", "Tetris · ASCII", "2025-08-14T04:57:41Z", "2026-07-03T06:45:00Z"],
  ["tetris-canvas", "Tetris · Canvas", "2025-08-08T04:02:38Z", "2026-07-03T06:35:50Z"],
  ["tetris-unicode", "Tetris · Unicode", "2025-08-11T21:51:55Z", "2026-07-03T06:38:03Z"],
  ["tower-defense", "Hold the Margin · Tower Defense", "2026-07-06T03:42:06Z", "2026-07-06T03:54:32Z"],
  ["shared-canvas", "Common · Shared Canvas", "2026-09-26T21:46:08Z", "2026-10-18T21:14:42Z"],
  ["table-topics", "Table Topics", "2023-05-23T02:06:33Z", "2026-07-03T05:57:17Z"],
  ["art", "Art Gallery", "2026-09-07T06:35:16Z", "2026-09-07T06:36:29Z"],
  ["my-room-in-3d", "My Room in 3D", "2026-07-03T04:58:16Z", "2026-07-03T05:55:49Z"],
  ["images", "Markive · YouTube Videos, Quotes & Images", "2026-06-08T19:32:30Z", "2026-10-18T20:49:12Z"],
  ["shazaam", "Local Shazam", "2025-08-17T09:03:23Z", "2026-07-03T05:55:18Z"],
];
const DATES_RETRIEVED = "2026-10-18T21:24:42Z";
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const SORT_OPTIONS = [["updated", "Recently updated"], ["created", "Recently created"], ["category", "Category"]];
// Titles/categories settled by earlier requests that must not regress.
const PINNED = [
  { name: "images", title: "Markive · YouTube Videos, Quotes & Images", category: "personal" },
  { name: "shazaam", title: "Local Shazam", category: "tech" },
];

let failures = 0;
function check(ok, message) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${message}`);
  if (!ok) failures++;
}
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const list = (arr) => (arr.length ? ` (bad: ${arr.join(", ")})` : "");

// Required files
const required = ["index.html", "assets/styles.css", "assets/app.js", "data/sites.json", "README.md"];
for (const file of required) check(existsSync(join(ROOT, file)), `file exists: ${file}`);
if (failures) process.exit(1);

// ---------------------------------------------------------------- Data
let data;
try {
  data = JSON.parse(read("data/sites.json"));
  check(true, "data/sites.json is valid JSON");
} catch (err) {
  check(false, `data/sites.json is valid JSON (${err.message})`);
  process.exit(1);
}
const sites = Array.isArray(data.sites) ? data.sites : [];
check(sites.length === EXPECTED_COUNT, `exactly ${EXPECTED_COUNT} entries (found ${sites.length})`);
check(data.snapshotDate === SNAPSHOT, `snapshotDate is ${SNAPSHOT}`);
check(data.screenshots?.capturedOn === SNAPSHOT && data.screenshots?.width === PREVIEW_SIZE.width &&
  data.screenshots?.height === PREVIEW_SIZE.height, "screenshot metadata records capture date and 1365×900 size");

const names = sites.map((s) => s.name);
const unique = (key) => new Set(sites.map((s) => s[key])).size === sites.length;
check(unique("name"), "names are unique");
check(unique("url"), "Pages URLs are unique");
check(unique("repository"), "repository URLs are unique");
check(unique("screenshot"), "screenshot paths are unique");
check(unique("title"), "display titles are unique (duplicate page titles are disambiguated)");
check(sites.every((s) => typeof s.name === "string" && /^[A-Za-z0-9._-]+$/.test(s.name)), "names are valid repository names");

const isHttps = (u) => { try { return new URL(u).protocol === "https:"; } catch { return false; } };
const badLinks = sites.flatMap((s) => [s.url, s.repository]).filter((u) => !isHttps(u));
check(badLinks.length === 0, `all Pages/repository links are valid HTTPS URLs${list(badLinks)}`);
const badPages = sites.filter((s) => !isHttps(s.url) || !new URL(s.url).pathname.endsWith("/")).map((s) => s.name);
check(badPages.length === 0, `Pages URLs are site roots ending in /${list(badPages)}`);

const wrongRepo = sites.filter((s) => s.repository !== `https://github.com/${OWNER}/${s.name}`).map((s) => s.name);
check(wrongRepo.length === 0, `repository URLs match https://github.com/${OWNER}/<repo>${list(wrongRepo)}`);

check(!names.some((n) => n.toLowerCase() === "github-pages-directory") &&
  !sites.some((s) => /github-pages-directory/i.test(`${s.url} ${s.repository}`)), "no github-pages-directory self-entry");
check(names.includes(HOMEPAGE_REPO), "account homepage repository is present");
check(sites.find((s) => s.name === HOMEPAGE_REPO)?.title === "Account Home", "account homepage has a friendly display title");

// Titles: present, readable, no markup (scan text is untrusted; nothing HTML-like may slip in)
const badTitles = sites.filter((s) => typeof s.title !== "string" || !s.title.trim() || s.title !== s.title.trim() ||
  s.title.length > 60 || /[<>]/.test(s.title)).map((s) => s.name);
check(badTitles.length === 0, `every entry has a readable plain-text title${list(badTitles)}`);
const BASE_KEYS = "category,createdAt,name,repository,screenshot,title,updatedAt,url";
const unexpectedKeys = sites.filter((s) => Object.keys(s).filter((k) => k !== "alsoIn").sort().join() !== BASE_KEYS).map((s) => s.name);
check(unexpectedKeys.length === 0,
  `entries have exactly name/title/category/url/repository/screenshot/createdAt/updatedAt, plus optional alsoIn${list(unexpectedKeys)}`);
check(JSON.stringify(sites.map((s) => [s.name, s.title])) === JSON.stringify(EXPECTED_SITES.map(([n, t]) => [n, t])),
  `the ${EXPECTED_COUNT} names and display titles are unchanged, in their original source order`);

// Repository dates (GitHub created_at / updated_at)
const meta = data.repositoryDates ?? {};
check(meta.retrievedAt === DATES_RETRIEVED && meta.retrievedAt.startsWith(SNAPSHOT) && /created_at/.test(meta.source ?? "") &&
  /updated_at/.test(meta.source ?? "") && /not page-content dates/i.test(meta.note ?? ""),
  "repositoryDates records the GitHub API source, retrieval time on the snapshot date, and that these are not page-content dates");
const validIso = (t) => typeof t === "string" && ISO_UTC.test(t) && new Date(t).toISOString() === t.replace("Z", ".000Z");
const badStamps = sites.filter((s) => !validIso(s.createdAt) || !validIso(s.updatedAt)).map((s) => s.name);
check(badStamps.length === 0, `all ${sites.length} entries have valid ISO 8601 UTC createdAt and updatedAt${list(badStamps)}`);
const badRange = sites.filter((s) => !(s.createdAt <= s.updatedAt && s.updatedAt <= DATES_RETRIEVED)).map((s) => s.name);
check(badRange.length === 0, `createdAt ≤ updatedAt ≤ retrieval time for every entry${list(badRange)}`);
const wrongStamps = sites.filter((s, i) => s.createdAt !== EXPECTED_SITES[i]?.[2] || s.updatedAt !== EXPECTED_SITES[i]?.[3]).map((s) => s.name);
check(wrongStamps.length === 0, `repository dates match the values retrieved from the GitHub API${list(wrongStamps)}`);

// Categories
const categories = Array.isArray(data.categories) ? data.categories : [];
check(JSON.stringify(categories.map((c) => [c.id, c.label])) === JSON.stringify(EXPECTED_CATEGORIES.map(([id, label]) => [id, label])),
  `categories are the ${EXPECTED_CATEGORIES.length} expected ids/labels in order`);
const categoryIds = new Set(categories.map((c) => c.id));
const unknownCat = sites.filter((s) => !categoryIds.has(s.category)).map((s) => s.name);
check(unknownCat.length === 0, `every entry has a known category${list(unknownCat)}`);

const expectedOf = new Map();
const assigned = [];
for (const [id, , repos] of EXPECTED_CATEGORIES) for (const repo of repos) { expectedOf.set(repo, id); assigned.push(repo); }
check(assigned.length === EXPECTED_COUNT && new Set(assigned).size === EXPECTED_COUNT,
  `expected assignment lists ${EXPECTED_COUNT} repositories, each exactly once`);
const misassigned = sites.filter((s) => expectedOf.get(s.name) !== s.category).map((s) => `${s.name}→${s.category}`);
check(misassigned.length === 0, `every entry is in its expected category${list(misassigned)}`);
const missing = assigned.filter((n) => names.filter((m) => m === n).length !== 1);
check(missing.length === 0, `every expected repository appears exactly once${list(missing)}`);
for (const [id, label, repos] of EXPECTED_CATEGORIES) {
  const count = sites.filter((s) => s.category === id).length;
  check(count === repos.length, `${label}: ${repos.length} primary sites (found ${count})`);
}

// Secondary memberships (alsoIn)
const badAlsoInShape = sites.filter((s) => "alsoIn" in s && !(Array.isArray(s.alsoIn) && s.alsoIn.length > 0 &&
  s.alsoIn.every((id) => typeof id === "string" && categoryIds.has(id) && id !== s.category) &&
  new Set(s.alsoIn).size === s.alsoIn.length)).map((s) => s.name);
check(badAlsoInShape.length === 0,
  `alsoIn, when present, is a non-empty list of unique known category ids other than the primary${list(badAlsoInShape)}`);
const alsoInOf = (s) => (Array.isArray(s.alsoIn) ? s.alsoIn : []);
const wrongAlsoIn = sites.filter((s) => JSON.stringify(alsoInOf(s)) !== JSON.stringify(EXPECTED_ALSO_IN[s.name] ?? []))
  .map((s) => `${s.name}→[${alsoInOf(s).join(",")}]`);
check(wrongAlsoIn.length === 0, `secondary memberships are exactly the expected ${Object.keys(EXPECTED_ALSO_IN).length}${list(wrongAlsoIn)}`);
const unknownAlsoIn = Object.keys(EXPECTED_ALSO_IN).filter((n) => !names.includes(n));
check(unknownAlsoIn.length === 0, `every expected secondary membership names a real entry${list(unknownAlsoIn)}`);
for (const [from, to] of REQUIRED_OVERLAPS) {
  const label = (id) => categories.find((c) => c.id === id)?.label ?? id;
  const primaries = sites.filter((s) => s.category === from);
  const notAlso = primaries.filter((s) => !alsoInOf(s).includes(to)).map((s) => s.name);
  check(primaries.length > 0 && notAlso.length === 0,
    `every ${label(from)} site keeps its primary category and also appears in ${label(to)}${list(notAlso)}`);
}
const isMember = (s, id) => s.category === id || alsoInOf(s).includes(id);
for (const [id, label, repos] of EXPECTED_CATEGORIES) {
  const want = [...repos, ...Object.keys(EXPECTED_ALSO_IN).filter((n) => EXPECTED_ALSO_IN[n].includes(id))].sort();
  const got = sites.filter((s) => isMember(s, id)).map((s) => s.name).sort();
  check(JSON.stringify(got) === JSON.stringify(want), `${label}: ${want.length} member sites (primary + secondary; found ${got.length})`);
}
const memberships = sites.reduce((n, s) => n + 1 + alsoInOf(s).length, 0);
const uniqueMembers = new Set(sites.filter((s) => categories.some((c) => isMember(s, c.id))).map((s) => s.name)).size;
check(uniqueMembers === EXPECTED_COUNT && memberships === EXPECTED_COUNT + SECONDARY_COUNT,
  `overall total counts ${EXPECTED_COUNT} unique sites across ${EXPECTED_COUNT + SECONDARY_COUNT} category memberships (found ${uniqueMembers}/${memberships})`);

// Earlier decisions stay in place
for (const pin of PINNED) {
  const s = sites.find((x) => x.name === pin.name);
  check(s?.title === pin.title && s?.category === pin.category && !("alsoIn" in s),
    `${pin.name} keeps title “${pin.title}” in ${pin.category}`);
}

// Screenshots
function webpSize(buf) {
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WEBP") return null;
  const chunk = buf.toString("ascii", 12, 16);
  if (chunk === "VP8 ") return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
  if (chunk === "VP8L") {
    const b = buf.readUInt32LE(21);
    return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 };
  }
  if (chunk === "VP8X") return { width: buf.readUIntLE(24, 3) + 1, height: buf.readUIntLE(27, 3) + 1 };
  return null;
}
const badShotPath = sites.filter((s) => s.screenshot !== `${PREVIEW_DIR}/${s.name}.webp`).map((s) => s.name);
check(badShotPath.length === 0, `screenshot paths are relative ${PREVIEW_DIR}/<repo>.webp${list(badShotPath)}`);
const badShotFile = [];
for (const s of sites) {
  const file = join(ROOT, s.screenshot ?? "");
  if (!s.screenshot || !existsSync(file)) { badShotFile.push(`${s.name} (missing)`); continue; }
  const size = webpSize(readFileSync(file));
  if (!size) badShotFile.push(`${s.name} (not WebP)`);
  else if (size.width !== PREVIEW_SIZE.width || size.height !== PREVIEW_SIZE.height) badShotFile.push(`${s.name} (${size.width}×${size.height})`);
}
check(badShotFile.length === 0, `all ${sites.length} screenshot files exist as 1365×900 WebP${list(badShotFile)}`);
const onDisk = existsSync(join(ROOT, PREVIEW_DIR)) ? readdirSync(join(ROOT, PREVIEW_DIR)).filter((f) => f.endsWith(".webp")) : [];
const referenced = new Set(sites.map((s) => s.screenshot));
const orphans = onDisk.filter((f) => !referenced.has(`${PREVIEW_DIR}/${f}`));
check(onDisk.length === EXPECTED_COUNT && orphans.length === 0, `${PREVIEW_DIR} holds exactly the ${EXPECTED_COUNT} referenced previews${list(orphans)}`);

// ---------------------------------------------------------------- HTML / assets
const html = read("index.html");
const css = read("assets/styles.css");
const js = read("assets/app.js");
// Collapse line wraps and blockquote markers so prose checks don't depend on wrapping.
const readme = read("README.md").replace(/\n>?\s*/g, " ");

check(/<html[^>]*\blang="en"/.test(html), "index.html declares lang");
check(/<meta name="viewport" content="width=device-width, initial-scale=1">/.test(html), "index.html has a responsive viewport meta");
check((html.match(/<h1[\s>]/g) ?? []).length === 1, "index.html has exactly one h1");
check(/<h1>Pages, <em>gathered\.<\/em><\/h1>/.test(html), "h1 is the concise title “Pages, gathered.”");
check(/h1 em \{[^}]*color: var\(--gold\)/.test(css) && /h1 \{[^}]*font-family: var\(--serif\)[^}]*font-style: italic/.test(css),
  "h1 keeps the Newsreader italic / gold treatment");
check(/\.lede \{(?![^}]*font-family: var\(--serif\))[^}]*color: var\(--muted\)[^}]*max-width: \d+ch/.test(css) ||
  /\.lede \{(?![^}]*font-family: var\(--serif\))[^}]*max-width: \d+ch[^}]*color: var\(--muted\)/.test(css),
  "supporting copy is muted mono with a restrained line length");
check(/<main[\s>]/.test(html) && /<header[\s>]/.test(html) && /<footer[\s>]/.test(html), "index.html has header/main/footer landmarks");
check(/class="skip-link" href="#directory"/.test(html) && /id="directory"/.test(html), "skip link targets the directory");
check(/<label for="filter"[^>]*>/.test(html) && /<input id="filter" type="search"/.test(html), "search input has an associated label");
check(/role="search"/.test(html), "search region is exposed as a landmark");
check(/id="chips"[^>]*role="group"[^>]*aria-labelledby="chips-label"/.test(html) && /id="chips-label"/.test(html), "category chips are a labelled group");
check(/role="status"/.test(html) && /aria-live="polite"/.test(html), "result count uses a live status region");
check(/id="empty"[^>]*hidden/.test(html), "empty state exists and is hidden by default");
check(html.includes('href="assets/styles.css"'), "stylesheet linked with a relative path");
check(html.includes('src="assets/app.js"'), "script linked with a relative path");
check(html.includes(SNAPSHOT) || /18 October 2026/.test(html), "capture date shown in the UI");
check(/not automatically synced/i.test(html) && /may have changed/i.test(html), "static-snapshot disclaimer shown in the UI");
check(/1365×900/.test(html) && /viewport previews?/i.test(html), "UI says screenshots are 1365×900 viewport previews");
check(/GitHub repository metadata/.test(html) && /not page-content dates/.test(html), "UI labels created/updated as repository metadata, not page-content dates");
const sortSelect = html.match(/<select id="sort"[^>]*>([\s\S]*?)<\/select>/);
check(/<label for="sort"[^>]*>Sort by<\/label>/.test(html) && !!sortSelect, "a labelled “Sort by” select exists");
const sortOpts = [...(sortSelect?.[1] ?? "").matchAll(/<option value="([^"]+)"( selected)?>([^<]+)<\/option>/g)];
check(JSON.stringify(sortOpts.map((m) => [m[1], m[3]])) === JSON.stringify(SORT_OPTIONS),
  `sort options are ${SORT_OPTIONS.map(([, l]) => l).join(" / ")}`);
check(sortOpts.filter((m) => m[2]).map((m) => m[1]).join() === "updated" && /const DEFAULT_SORT = "updated";/.test(js),
  "sort defaults to Recently updated");

// Remote resources: only the Google Fonts stylesheet, linked exactly once from index.html.
const fontLinks = html.split(`<link rel="stylesheet" href="${GOOGLE_FONTS.replace(/&/g, "&amp;")}">`).length - 1 +
  html.split(`<link rel="stylesheet" href="${GOOGLE_FONTS}">`).length - 1;
check(fontLinks === 1, "index.html links the Google Fonts stylesheet exactly once");
const stripFonts = (text) => text.split(GOOGLE_FONTS.replace(/&/g, "&amp;")).join("").split(GOOGLE_FONTS).join("");
const remoteRef = /(?:src|href|srcset|action|poster)\s*=\s*["'](?:https?:)?\/\/|@import|url\(\s*["']?(?:https?:)?\/\//i;
const sources = { "index.html": stripFonts(html), "assets/styles.css": css, "assets/app.js": js };
for (const [file, text] of Object.entries(sources)) {
  check(!remoteRef.test(text), `${file} loads no remote assets other than the Google Fonts stylesheet`);
  check(!/(?:src|href)\s*=\s*["']\/(?!\/)/.test(text), `${file} uses no root-absolute asset paths`);
  check(!/api\.github\.com|googletagmanager|google-analytics|gtag\(|plausible|umami|segment\.io|hotjar/i.test(text), `${file} has no runtime GitHub API calls or analytics`);
}
check(!/<script[^>]+src=["'](?:https?:)?\/\//i.test(html), "no third-party scripts");
check(!/(?:https?:)?\/\/[^"'\s]+\.(?:webp|png|jpe?g|gif|avif)/i.test(JSON.stringify(data) + js + html), "no third-party image hosts");

// JS behaviour
check(!/innerHTML|outerHTML|insertAdjacentHTML|document\.write|DOMParser|createContextualFragment/.test(js), "app.js inserts text safely (no HTML injection APIs)");
check(/new URL\("data\/sites\.json", document\.baseURI\)/.test(js), "app.js loads data relative to the page");
check(/width: "1365"/.test(js) && /height: "900"/.test(js), "screenshots have intrinsic 1365×900 dimensions");
check(/const EAGER_IMAGES = 3;/.test(js) && /loading: shotCount\+\+ < EAGER_IMAGES \? "eager" : "lazy"/.test(js) &&
  (js.match(/loading:/g) ?? []).length === 1 && (js.match(/shotCount = 0/g) ?? []).length === 1,
  "first three screenshots load eagerly; all others are lazy-loaded");
check(/alt: `Preview screenshot of \$\{site\.title\} \(\$\{site\.name\}\)/.test(js), "screenshots get meaningful alt text (title + repo)");
check(/class: "shot", href: site\.screenshot/.test(js), "screenshot links to its full-size local image");
check(/href: site\.url/.test(js) && /href: site\.repository/.test(js), "cards link to the live site and the repository");
check(/"aria-pressed"/.test(js), "category chips expose pressed state");
check(/renderChip\(ALL, "All"/.test(js), "an All chip is rendered");
check(/site\.name\} \$\{site\.title\} \$\{category\.label\}/.test(js), "search covers repo name, title and category");
check(/inCategory && terms\.every/.test(js), "search and category filter combine (AND)");
check(/data\.sites\.filter\(\(s\) => isMember\(s, category\.id\)\)/.test(js) &&
  /const isMember = \(site, id\) => site\.category === id \|\| alsoIn\(site\)\.includes\(id\)/.test(js),
  "sections include sites by primary category or alsoIn membership");
check(/total = new Set\(/.test(js) && /const shownSites = new Set\(\)/.test(js) && /const shown = shownSites\.size/.test(js) &&
  /renderChip\(ALL, "All", total\)/.test(js),
  "All chip, header total and status count unique sites, not duplicated cards");
check(/renderChip\(s\.category\.id, s\.category\.label, s\.items\.length\)/.test(js),
  "category chips count every member (primary + secondary)");
check(/return \[\.\.\.entries\]\.sort\(/.test(js) && !/data\.sites\.sort\(|\bsites\.sort\(|\.reverse\(\)/.test(js),
  "recent sorts work on copies; the source data order is never mutated");
check(/b\.time\[key\] - a\.time\[key\] \|\|\s*b\.time\[then\] - a\.time\[then\] \|\|[\s\S]{0,120}a\.site\.name < b\.site\.name[\s\S]{0,80}a\.index - b\.index/.test(js),
  "recent sorts break ties by the other date, then repo name, then source order");
check(/ISO_UTC\.test\(site\[key\]/.test(js), "repository dates are validated before they are rendered or sorted");
check(/SCREENSHOT_PATH\.test\(site\.screenshot\)/.test(js) && /isHttps\(site\.url\)/.test(js), "data is validated before it becomes a URL attribute");

// CSS: design tokens, focus, motion, small screens
for (const token of ["#0f0c09", "#14110b", "#1a150e", "#2a2218", "#ece1cf", "#cdc1ab", "#a99e88", "#d8a942"]) {
  check(css.toLowerCase().includes(token), `styles use palette colour ${token}`);
}
check(/"Newsreader", Georgia/.test(css) && /"JetBrains Mono", ui-monospace/.test(css), "styles use Newsreader and JetBrains Mono with local fallbacks");
check(/prefers-reduced-motion/.test(css), "styles respect prefers-reduced-motion");
check(/:focus-visible/.test(css), "styles define visible focus states");
check(/minmax\(min\(100%,/.test(css), "card grid collapses without overflow on narrow screens");
check(/--tap:\s*2\.75rem/.test(css) && /min-height: var\(--tap\)/.test(css), "controls and links have comfortable tap targets");

// README
check(readme.includes(SNAPSHOT) && /not automatically synced/i.test(readme), "README states the snapshot date and that it is not synced");
check(/1365×900/.test(readme) && /may have changed/i.test(readme), "README notes screenshots are dated 1365×900 previews");
check(/python3 -m http\.server/.test(readme) && /node tests\/verify\.mjs/.test(readme), "README has local preview and test instructions");

// ---------------------------------------------------------------- Browser (optional: needs Playwright)
async function loadPlaywright() {
  for (const spec of [process.env.PLAYWRIGHT_MODULE, "playwright"].filter(Boolean)) {
    try {
      const mod = await import(spec.startsWith("/") ? `file://${spec}/index.mjs` : spec);
      return mod.chromium ?? mod.default?.chromium;
    } catch { /* try the next one */ }
  }
  return null;
}

// Serves the repo under a subpath, like https://git.marcuschiu.com/github-pages-directory/.
function serve() {
  const BASE = "/github-pages-directory/";
  const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".webp": "image/webp" };
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
    const rel = path.startsWith(BASE) ? normalizePath(path.slice(BASE.length) || "index.html") : null;
    const file = rel && !rel.startsWith("..") ? join(ROOT, rel) : null;
    if (!file || !existsSync(file) || !extname(file)) { res.writeHead(404).end("not found"); return; }
    res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" }).end(readFileSync(file));
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () =>
    resolve({ server, url: `http://127.0.0.1:${server.address().port}${BASE}` })));
}

// Expected orders, computed independently of app.js from the data file.
const nameCmp = (a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
const recentOrder = (key, then) => sites.map((s, index) => ({ ...s, index }))
  .sort((a, b) => Date.parse(b[key]) - Date.parse(a[key]) || Date.parse(b[then]) - Date.parse(a[then]) || nameCmp(a, b) || a.index - b.index)
  .map((s) => s.name);
const EXPECTED_ORDER = { updated: recentOrder("updatedAt", "createdAt"), created: recentOrder("createdAt", "updatedAt") };
const labelOf = new Map(categories.map((c) => [c.id, c.label]));
const membersOf = (id) => sites.filter((s) => isMember(s, id)).map((s) => s.name);

// Visible cards in DOM order: [section id, repo name, category label, created datetime, updated datetime].
const visibleCards = (page) => page.$$eval(".section:not([hidden]) .card:not([hidden])", (cards) => cards.map((li) => [
  li.closest(".section").getAttribute("aria-labelledby"),
  li.querySelector(".card-slug code").textContent,
  li.querySelector(".card-category").textContent,
  li.querySelector(".date-created time")?.getAttribute("datetime"),
  li.querySelector(".date-updated time")?.getAttribute("datetime"),
]));
const uniqueNames = (cards) => [...new Set(cards.map((c) => c[1]))];
const isDescending = (values) => values.every((v, i) => i === 0 || values[i - 1] >= v);
const statusText = async (page) => { await page.waitForTimeout(350); return page.textContent("#result-status"); };

async function exercise(page, label) {
  const tag = (m) => `[${label}] ${m}`;
  await page.waitForSelector(".card");
  const select = page.getByLabel("Sort by", { exact: true });
  check(await select.evaluate((n) => n.id) === "sort" && await select.inputValue() === "updated",
    tag("Sort by select is labelled and defaults to Recently updated"));
  check(JSON.stringify(await page.$$eval("#sort option", (o) => o.map((x) => [x.value, x.textContent]))) === JSON.stringify(SORT_OPTIONS),
    tag("sort options render in order"));

  for (const mode of ["updated", "created"]) {
    await select.selectOption(mode);
    const cards = await visibleCards(page);
    const key = mode === "updated" ? 4 : 3;
    check(cards.length === EXPECTED_COUNT && uniqueNames(cards).length === EXPECTED_COUNT && cards.every((c) => c[0] === "cat-all-sites"),
      tag(`${mode}: one All sites section with ${EXPECTED_COUNT} unique cards (found ${cards.length})`));
    check(JSON.stringify(cards.map((c) => c[1])) === JSON.stringify(EXPECTED_ORDER[mode]),
      tag(`${mode}: global order matches descending ${mode === "updated" ? "updatedAt" : "createdAt"} with tie-breakers`));
    check(isDescending(cards.map((c) => c[key])), tag(`${mode}: rendered datetimes are globally descending`));
    const wrongMeta = cards.filter(([, name, cat, created, updated]) => {
      const s = sites.find((x) => x.name === name);
      const want = [s.category, ...alsoInOf(s)].map((id) => labelOf.get(id));
      return created !== s.createdAt || updated !== s.updatedAt || !cat.startsWith(want[0]) || !want.every((l) => cat.includes(l));
    }).map((c) => c[1]);
    check(wrongMeta.length === 0, tag(`${mode}: every card shows its primary/secondary categories and repo dates${list(wrongMeta)}`));
    check(/Showing all 41 sites, most recently (updated|created) repository first\./.test(await statusText(page)),
      tag(`${mode}: status announces the count and order`));
  }

  await select.selectOption("category");
  const grouped = await visibleCards(page);
  const sectionIds = [...new Set(grouped.map((c) => c[0]))];
  check(JSON.stringify(sectionIds) === JSON.stringify(EXPECTED_CATEGORIES.map(([id]) => `cat-${id}`)),
    tag("category: the 7 category sections appear in their original order"));
  const badGroups = EXPECTED_CATEGORIES.filter(([id]) =>
    JSON.stringify(grouped.filter((c) => c[0] === `cat-${id}`).map((c) => c[1])) !== JSON.stringify(membersOf(id))).map(([id]) => id);
  check(badGroups.length === 0, tag(`category: each section lists exactly its primary + secondary members in source order${list(badGroups)}`));
  check(grouped.length === EXPECTED_COUNT + SECONDARY_COUNT && uniqueNames(grouped).length === EXPECTED_COUNT &&
    /Showing all 41 sites, grouped by category\./.test(await statusText(page)),
    tag(`category: ${EXPECTED_COUNT + SECONDARY_COUNT} cards, ${EXPECTED_COUNT} unique sites counted`));

  // Chip counts and header totals hold in every mode
  const chipCounts = await page.$$eval(".chip", (c) => c.map((x) => [x.dataset.category, Number(x.querySelector(".chip-count").textContent)]));
  check(JSON.stringify(chipCounts) === JSON.stringify([["all", EXPECTED_COUNT], ...EXPECTED_CATEGORIES.map(([id]) => [id, membersOf(id).length])]),
    tag("chips count All as unique sites and each category by members"));
  check(await page.textContent("#total-count") === "41" && await page.textContent("#category-count") === "7", tag("header shows 41 sites across 7 categories"));

  // Category chips + search compose in every sort mode
  for (const mode of ["updated", "created", "category"]) {
    await select.selectOption(mode);
    await page.click('.chip[data-category="personal"]');
    let cards = await visibleCards(page);
    const want = membersOf("personal");
    const ordered = mode === "category" ? want : EXPECTED_ORDER[mode].filter((n) => want.includes(n));
    check(JSON.stringify(cards.map((c) => c[1])) === JSON.stringify(ordered) &&
      (await statusText(page)).startsWith(`Showing ${want.length} of 41 sites in Personal & Portfolio`),
      tag(`${mode}: Personal chip shows its ${want.length} members${mode === "category" ? "" : " in global sort order"}`));

    await page.click('.chip[data-category="games"]');
    await page.fill("#filter", "tetris");
    cards = await visibleCards(page);
    check(uniqueNames(cards).sort().join() === "tetris-ascii,tetris-canvas,tetris-unicode" &&
      (await statusText(page)).startsWith("Showing 3 of 41 sites in Games & Simulations matching “tetris”"),
      tag(`${mode}: search + Games chip → the 3 Tetris builds`));

    await page.click('.chip[data-category="personal"]');
    await statusText(page);
    check(await page.isVisible("#empty") && (await visibleCards(page)).length === 0 &&
      await page.isVisible("#clear-search") && await page.isVisible("#show-all") &&
      (await page.textContent("#empty-detail")) === "No sites in Personal & Portfolio matching “tetris”.",
      tag(`${mode}: zero results show the empty state with both reset buttons`));
    await page.click("#show-all");
    check(uniqueNames(await visibleCards(page)).length === 3 && await page.isHidden("#empty") &&
      await page.evaluate(() => document.activeElement?.dataset.category) === "all",
      tag(`${mode}: Show all categories resets the chip and keeps the search`));
    await page.fill("#filter", "zzzz-no-match");
    await page.click("#clear-search");
    check((await visibleCards(page)).length === (mode === "category" ? EXPECTED_COUNT + SECONDARY_COUNT : EXPECTED_COUNT) &&
      await select.inputValue() === mode && await page.evaluate(() => document.activeElement?.id) === "filter",
      tag(`${mode}: Clear search restores everything and keeps the sort`));
  }

  // Keyboard: Tab reaches the select after the chips; arrows change the sort; chips and "/" + Esc work.
  await page.click("body", { position: { x: 1, y: 1 } });
  await page.focus('.chip[data-category="art"]');
  await page.keyboard.press("Tab");
  check(await page.evaluate(() => document.activeElement?.id) === "sort", tag("keyboard: Tab moves from the last chip to Sort by"));
  await select.selectOption("updated");
  await page.focus("#sort");
  await page.keyboard.press("ArrowDown");
  check(await select.inputValue() === "created" &&
    JSON.stringify((await visibleCards(page)).map((c) => c[1])) === JSON.stringify(EXPECTED_ORDER.created),
    tag("keyboard: ArrowDown on Sort by switches to Recently created and re-sorts"));
  await page.keyboard.press("ArrowDown");
  check(await select.inputValue() === "category" && (await visibleCards(page)).length === EXPECTED_COUNT + SECONDARY_COUNT,
    tag("keyboard: ArrowDown again switches to Category"));
  await page.keyboard.press("/");
  check(await select.inputValue() === "category", tag("keyboard: “/” in the select does not hijack it"));
  await page.focus('.chip[data-category="faith"]');
  await page.keyboard.press("Enter");
  check(uniqueNames(await visibleCards(page)).length === 2, tag("keyboard: Enter on a chip filters"));
  await page.focus('.chip[data-category="all"]');
  await page.keyboard.press("Space");
  await page.click("body", { position: { x: 1, y: 1 } });
  await page.keyboard.press("/");
  await page.keyboard.type("quartz");
  check(await page.evaluate(() => document.activeElement?.id) === "filter" && uniqueNames(await visibleCards(page)).length === 2,
    tag("keyboard: Space selects All, “/” focuses search"));
  await page.keyboard.press("Escape");
  check(await page.inputValue("#filter") === "" && uniqueNames(await visibleCards(page)).length === EXPECTED_COUNT,
    tag("keyboard: Esc clears the search"));

  // No horizontal overflow, in every mode, with the empty state too
  const overflow = [];
  for (const mode of ["updated", "created", "category"]) {
    await select.selectOption(mode);
    const o = await page.evaluate(() => ({
      doc: document.documentElement.scrollWidth - window.innerWidth,
      wide: [...document.querySelectorAll("body *")].filter((n) => {
        const r = n.getBoundingClientRect();
        return r.width && n.offsetParent !== null && !n.closest(".visually-hidden") && (r.right > window.innerWidth + 0.5 || r.left < -0.5);
      }).length,
    }));
    if (o.doc > 0 || o.wide) overflow.push(`${mode}: +${o.doc}px, ${o.wide} element(s)`);
  }
  check(overflow.length === 0, tag(`no horizontal overflow in any sort mode${list(overflow)}`));
  const sortBox = await page.locator(".sort").boundingBox();
  check(sortBox && sortBox.x >= 0 && sortBox.x + sortBox.width <= page.viewportSize().width,
    tag("Sort by control fits inside the viewport"));
  await select.selectOption("updated");
}

const chromium = await loadPlaywright();
if (!chromium) {
  if (process.env.REQUIRE_BROWSER === "1") check(false, "Playwright is available for browser checks");
  else console.log("SKIP  browser checks (Playwright not found; set PLAYWRIGHT_MODULE=/path/to/node_modules/playwright)");
} else {
  const { server, url } = await serve();
  const browser = await chromium.launch();
  try {
    for (const [label, options] of [
      ["desktop", { viewport: { width: 1365, height: 900 } }],
      ["phone", { viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }],
    ]) {
      const context = await browser.newContext(options);
      const page = await context.newPage();
      const problems = [];
      const offsite = [];
      page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") problems.push(`${m.type()}: ${m.text()}`); });
      page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
      page.on("response", (r) => { if (r.status() >= 400) problems.push(`HTTP ${r.status()} ${r.url()}`); });
      // Keep the run offline: answer the one allowed remote stylesheet locally, flag anything else.
      await context.route("**/*", (route) => {
        const u = route.request().url();
        if (u.startsWith(url)) return route.continue();
        if (u === GOOGLE_FONTS) return route.fulfill({ status: 200, contentType: "text/css", body: "" });
        offsite.push(u);
        return route.abort();
      });
      await page.goto(url);
      await exercise(page, label);
      check(problems.length === 0, `[${label}] no console errors/warnings, page errors or failed requests${list(problems)}`);
      check(offsite.length === 0, `[${label}] no requests outside the site other than Google Fonts${list(offsite)}`);
      await context.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
}

console.log(failures ? `\n${failures} check(s) failed.` : "\nAll checks passed.");
process.exit(failures ? 1 : 0);
