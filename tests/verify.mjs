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
const SORT_OPTIONS = [["created", "Recently created"], ["updated", "Recently updated"], ["category", "Category"]];
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
// Every preview uses the same encoding (simple lossy "VP8 " WebP, no alpha/metadata container), has a RIFF
// size matching the file, and is big enough not to be a blank frame (a flat 1365×900 lossy WebP is < 1 KB).
const MIN_PREVIEW_BYTES = 3000;
const badShotFormat = [];
for (const f of onDisk) {
  const buf = readFileSync(join(ROOT, PREVIEW_DIR, f));
  if (buf.toString("ascii", 12, 16) !== "VP8 ") badShotFormat.push(`${f} (${buf.toString("ascii", 12, 16).trim()})`);
  else if (buf.readUInt32LE(4) + 8 !== buf.length) badShotFormat.push(`${f} (truncated)`);
  else if (buf.length < MIN_PREVIEW_BYTES) badShotFormat.push(`${f} (${buf.length} bytes, likely blank)`);
}
check(badShotFormat.length === 0, `all previews are complete, non-trivial lossy VP8 WebP${list(badShotFormat)}`);
// Re-captured from the live sites after the game restyles; still covered by the single global capture date.
const REFRESHED_PREVIEWS = ["shared-canvas", "better-plume", "birdseye-arena"];
const badRefreshed = REFRESHED_PREVIEWS.filter((name) => {
  const s = sites.find((x) => x.name === name);
  const file = join(ROOT, PREVIEW_DIR, `${name}.webp`);
  const size = existsSync(file) && webpSize(readFileSync(file));
  return !s || s.screenshot !== `${PREVIEW_DIR}/${name}.webp` || !size ||
    size.width !== PREVIEW_SIZE.width || size.height !== PREVIEW_SIZE.height;
});
check(badRefreshed.length === 0, `refreshed previews (${REFRESHED_PREVIEWS.join(", ")}) are referenced 1365×900 WebP${list(badRefreshed)}`);
const perEntryDates = sites.filter((s) => "capturedOn" in s || "screenshotCapturedOn" in s).map((s) => s.name);
check(perEntryDates.length === 0, `capture date is the single global screenshots.capturedOn (no per-entry dates)${list(perEntryDates)}`);

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
check(/<button type="button" id="category-toggle"[^>]*aria-expanded="false"[^>]*aria-controls="category-panel"[^>]*aria-labelledby="category-filter-label category-summary"/.test(html) &&
  /id="category-filter-label"[^>]*>Category</.test(html),
  "category filter is a labelled disclosure button with aria-expanded/aria-controls");
check(/<div id="category-panel"[^>]*role="group"[^>]*aria-labelledby="category-filter-label"[^>]*hidden>/.test(html) &&
  /type: "checkbox", name: "category"/.test(js), "category dropdown panel is a labelled group of checkboxes, hidden by default");
check(!/id="chips"|class="chip"|aria-pressed/.test(html + js), "the old single-select category chips are gone");
const controlsHtml = html.match(/<search class="controls"[\s\S]*?<\/search>/)?.[0] ?? "";
check(["id=\"filter\"", "id=\"category-toggle\"", "id=\"sort\""].every((id) => controlsHtml.includes(id)),
  "search, category dropdown and sort live together in the controls row");
check(/grid-template-columns: minmax\(0, 2fr\) minmax\(0, 1fr\) minmax\(0, 1fr\)/.test(css), "desktop controls share one three-column row");
check(/role="status"/.test(html) && /aria-live="polite"/.test(html), "result count uses a live status region");
check(/id="empty"[^>]*hidden/.test(html), "empty state exists and is hidden by default");
check(html.includes('href="assets/styles.css"'), "stylesheet linked with a relative path");
check(html.includes('src="assets/app.js"'), "script linked with a relative path");
check(html.includes(SNAPSHOT) || /18 October 2026/.test(html), "capture date shown in the UI");
check(/not automatically synced/i.test(html) && /may have changed/i.test(html), "static-snapshot disclaimer shown in the UI");
check(/1365×900/.test(html) && /viewport (?:previews?|captures?)/i.test(html), "UI says screenshots are 1365×900 viewport captures");
const headerText = (html.match(/<header[\s\S]*?<\/header>/)?.[0] ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const footerText = (html.match(/<footer[\s\S]*?<\/footer>/)?.[0] ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
check(headerText.length <= 330 && (html.match(/class="note"/g) ?? []).length === 1, `header copy is short: one note (${headerText.length} chars)`);
check(footerText.length <= 110 && (html.match(/<footer[\s\S]*?<\/footer>/)?.[0].match(/<p>/g) ?? []).length === 1,
  `footer is a single short line (${footerText.length} chars)`);
check(/GitHub repository metadata/.test(html) && /not page-content dates/.test(html), "UI labels created/updated as repository metadata, not page-content dates");
const sortSelect = html.match(/<select id="sort"[^>]*>([\s\S]*?)<\/select>/);
check(/<label for="sort"[^>]*>Sort by<\/label>/.test(html) && !!sortSelect, "a labelled “Sort by” select exists");
const sortOpts = [...(sortSelect?.[1] ?? "").matchAll(/<option value="([^"]+)"( selected)?>([^<]+)<\/option>/g)];
check(JSON.stringify(sortOpts.map((m) => [m[1], m[3]])) === JSON.stringify(SORT_OPTIONS),
  `sort options are ${SORT_OPTIONS.map(([, l]) => l).join(" / ")}`);
check(sortOpts.filter((m) => m[2]).map((m) => m[1]).join() === "created" && /const DEFAULT_SORT = "created";/.test(js),
  "sort defaults to Recently created (repository created_at)");

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
check(/el\("a", \{ class: "card-main", href: site\.url, "aria-labelledby": `\$\{titleId\} \$\{hostId\}` \}, children\)/.test(js) &&
  /el\("a", \{ class: "card-link card-repo", href: site\.repository, "aria-label": `GitHub repo: \$\{site\.name\}`/.test(js),
  "each tile is one site link (screenshot + text) with a sibling GitHub repository link");
check(!/Visit site|Visit website|href: site\.screenshot/.test(js + html), "no “Visit site” link and no screenshot-file link");
check(/site\.name\} \$\{site\.title\} \$\{category\.label\}/.test(js), "search covers repo name, title and category");
check(/inCategory && terms\.every/.test(js), "search and category filter combine (AND)");
check(/data\.sites\.filter\(\(s\) => isMember\(s, category\.id\)\)/.test(js) &&
  /const isMember = \(site, id\) => site\.category === id \|\| alsoIn\(site\)\.includes\(id\)/.test(js),
  "sections include sites by primary category or alsoIn membership");
check(/total = new Set\(/.test(js) && /const shownSites = new Set\(\)/.test(js) && /const shown = shownSites\.size/.test(js),
  "header total and status count unique sites, not duplicated cards");
check(/renderOption\(s\.category\.id, s\.category\.label, s\.items\.length\)/.test(js),
  "category checkboxes count every member (primary + secondary)");
check(/return \[\.\.\.entries\]\.sort\(/.test(js) && !/data\.sites\.sort\(|\bsites\.sort\(|\.reverse\(\)/.test(js),
  "recent sorts work on copies; the source data order is never mutated");
check(/created: \{ keys: \["createdAt"\]/.test(js) && /updated: \{ keys: \["updatedAt", "createdAt"\]/.test(js) &&
  /keys\.reduce\(\(diff, key\) => diff \|\| b\.time\[key\] - a\.time\[key\], 0\) \|\|[\s\S]{0,120}a\.site\.name < b\.site\.name[\s\S]{0,80}a\.index - b\.index/.test(js),
  "created order uses only createdAt then repo name then source order; updated order keeps createdAt as its tie-break");
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
// Created order never looks at updatedAt: ties go to repo name, then source order.
const createdOrder = sites.map((s, index) => ({ ...s, index }))
  .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || nameCmp(a, b) || a.index - b.index)
  .map((s) => s.name);
const EXPECTED_ORDER = { updated: recentOrder("updatedAt", "createdAt"), created: createdOrder };
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

// Category dropdown helpers
const menuOpen = (page) => page.getAttribute("#category-toggle", "aria-expanded").then((v) => v === "true");
async function pickCategories(page, ids) {
  if (!(await menuOpen(page))) await page.click("#category-toggle");
  for (const box of await page.$$("#category-options input[type=checkbox]")) {
    const want = ids.includes(await box.getAttribute("value"));
    if (await box.isChecked() !== want) await box.click();
  }
  await page.keyboard.press("Escape");
}
const checkedIds = (page) => page.$$eval("#category-options input", (b) => b.filter((x) => x.checked).map((x) => x.value));
const activeId = (page) => page.evaluate(() => document.activeElement?.id || document.activeElement?.value || "");

async function exercise(page, label) {
  const tag = (m) => `[${label}] ${m}`;
  await page.waitForSelector(".card");
  const select = page.getByLabel("Sort by", { exact: true });
  check(await select.evaluate((n) => n.id) === "sort" && await select.inputValue() === "created",
    tag("Sort by select is labelled and defaults to Recently created"));
  check(JSON.stringify(await page.$$eval("#sort option", (o) => o.map((x) => [x.value, x.textContent]))) === JSON.stringify(SORT_OPTIONS),
    tag("sort options render in order"));

  // Default view, before touching anything: created_at descending.
  const initial = await visibleCards(page);
  check(JSON.stringify(initial.map((c) => c[1])) === JSON.stringify(EXPECTED_ORDER.created) && isDescending(initial.map((c) => c[3])),
    tag("default load shows all sites by repository created_at, newest first"));
  check(JSON.stringify(EXPECTED_ORDER.created) !== JSON.stringify(EXPECTED_ORDER.updated),
    tag("created and updated orders differ, so the default-order check is meaningful"));
  check(await page.$eval(".gallery", (g) => g.dataset.sort) === "created", tag("created date is highlighted by default"));
  const eager = await page.$$eval("#cat-all-sites + ul img", (imgs) => imgs.slice(0, 4).map((i) => i.loading));
  check(eager.join() === "eager,eager,eager,lazy", tag(`the first three cards in the default order load eagerly (${eager.join()})`));

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
  check(await page.textContent("#total-count") === "41" && await page.textContent("#category-count") === "7", tag("header shows 41 sites across 7 categories"));

  // Category dropdown: closed by default; opens to checkboxes carrying member counts.
  check(!(await menuOpen(page)) && await page.isHidden("#category-panel") &&
    (await page.textContent("#category-summary")) === "All categories", tag("dropdown: closed by default, summary reads All categories"));
  check(await page.getByRole("button", { name: "Category All categories" }).count() === 1, tag("dropdown: toggle's accessible name includes the label and summary"));
  await page.click("#category-toggle");
  const options = await page.$$eval("#category-options label", (ls) => ls.map((l) => [
    l.querySelector("input").value, l.querySelector(".menu-option-label").textContent, Number(l.querySelector(".chip-count").textContent), l.querySelector("input").checked]));
  check(await menuOpen(page) && await page.isVisible("#category-panel") &&
    JSON.stringify(options) === JSON.stringify(EXPECTED_CATEGORIES.map(([id, l]) => [id, l, membersOf(id).length, false])),
    tag("dropdown: opens to 7 unchecked checkboxes with member counts, in category order"));
  check(await page.getByRole("group", { name: "Category" }).getByRole("checkbox").count() === 7 &&
    await page.getByRole("checkbox", { name: /^Personal & Portfolio/ }).count() === 1, tag("dropdown: checkboxes are labelled in a named group"));
  await page.click("#category-toggle");
  check(!(await menuOpen(page)) && await page.isHidden("#category-panel"), tag("dropdown: clicking the toggle again closes it"));

  // Multi-select + search + every sort compose (OR across categories, AND with search).
  for (const mode of ["created", "updated", "category"]) {
    await select.selectOption(mode);
    await pickCategories(page, ["personal"]);
    let cards = await visibleCards(page);
    const want = membersOf("personal");
    const ordered = mode === "category" ? want : EXPECTED_ORDER[mode].filter((n) => want.includes(n));
    check(JSON.stringify(cards.map((c) => c[1])) === JSON.stringify(ordered) &&
      (await statusText(page)).startsWith(`Showing ${want.length} of 41 sites in Personal & Portfolio`) &&
      (await page.textContent("#category-summary")) === "Personal & Portfolio",
      tag(`${mode}: Personal checkbox shows its ${want.length} members${mode === "category" ? "" : " in global sort order"}`));

    await pickCategories(page, ["games", "faith"]);
    cards = await visibleCards(page);
    const both = sites.filter((s) => isMember(s, "games") || isMember(s, "faith")).map((s) => s.name);
    const wantBoth = mode === "category" ? [...membersOf("faith"), ...membersOf("games")] : EXPECTED_ORDER[mode].filter((n) => both.includes(n));
    check(JSON.stringify(cards.map((c) => c[1])) === JSON.stringify(wantBoth) &&
      (await page.textContent("#category-summary")) === "2 categories" &&
      (await statusText(page)).startsWith(`Showing ${both.length} of 41 sites in Faith & Bible Study or Games & Simulations`),
      tag(`${mode}: two checked categories show the union (${both.length}) in ${mode === "category" ? "section" : "global sort"} order`));

    await page.fill("#filter", "tetris");
    cards = await visibleCards(page);
    const tetris = (mode === "category" ? membersOf("games") : EXPECTED_ORDER[mode]).filter((n) => n.startsWith("tetris-"));
    check(JSON.stringify(cards.map((c) => c[1])) === JSON.stringify(tetris) &&
      (await statusText(page)).startsWith("Showing 3 of 41 sites in Faith & Bible Study or Games & Simulations matching “tetris”"),
      tag(`${mode}: search + categories → the 3 Tetris builds, still in sort order`));

    await pickCategories(page, ["personal"]);
    await statusText(page);
    check(await page.isVisible("#empty") && (await visibleCards(page)).length === 0 &&
      await page.isVisible("#clear-search") && await page.isVisible("#show-all") &&
      (await page.textContent("#empty-detail")) === "No sites in Personal & Portfolio matching “tetris”.",
      tag(`${mode}: zero results show the empty state with both reset buttons`));
    await page.click("#show-all");
    check(uniqueNames(await visibleCards(page)).length === 3 && await page.isHidden("#empty") &&
      (await checkedIds(page)).length === 0 && (await page.textContent("#category-summary")) === "All categories" &&
      await activeId(page) === "category-toggle",
      tag(`${mode}: Show all categories unchecks every box, keeps the search, focuses the dropdown`));
    await page.fill("#filter", "zzzz-no-match");
    await page.click("#clear-search");
    check((await visibleCards(page)).length === (mode === "category" ? EXPECTED_COUNT + SECONDARY_COUNT : EXPECTED_COUNT) &&
      await select.inputValue() === mode && await activeId(page) === "filter",
      tag(`${mode}: Clear search restores everything and keeps the sort`));
  }
  await select.selectOption("created");

  // Dropdown keyboard: Enter opens, arrows move focus, Space checks, Escape closes back to the toggle.
  await page.focus("#filter");
  await page.keyboard.press("Tab");
  check(await activeId(page) === "category-toggle", tag("keyboard: Tab moves from search to the category dropdown"));
  await page.keyboard.press("Enter");
  check(await menuOpen(page), tag("keyboard: Enter opens the dropdown"));
  await page.keyboard.press("Tab");
  check(await activeId(page) === "personal", tag("keyboard: Tab enters the open panel at the first checkbox"));
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  check(await activeId(page) === "faith", tag("keyboard: ArrowDown moves between checkboxes"));
  await page.keyboard.press("Space");
  check(JSON.stringify(await checkedIds(page)) === '["faith"]' && uniqueNames(await visibleCards(page)).length === 2 &&
    await page.getByRole("checkbox", { name: /^Faith/ }).isChecked(), tag("keyboard: Space checks a category and filters"));
  await page.keyboard.press("End");
  check(await activeId(page) === "category-clear", tag("keyboard: End reaches Show all categories"));
  await page.keyboard.press("Home");
  check(await activeId(page) === "personal", tag("keyboard: Home returns to the first checkbox"));
  await page.keyboard.press("Escape");
  check(!(await menuOpen(page)) && await activeId(page) === "category-toggle" &&
    JSON.stringify(await checkedIds(page)) === '["faith"]' && (await page.textContent("#category-summary")) === "Faith & Bible Study",
    tag("keyboard: Escape closes the dropdown, returns focus to the toggle and keeps the selection"));
  await page.keyboard.press("ArrowDown");
  check(await menuOpen(page) && await activeId(page) === "personal",
    tag("keyboard: ArrowDown on the toggle opens it and focuses the first checkbox"));
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  check((await checkedIds(page)).length === 0 && uniqueNames(await visibleCards(page)).length === EXPECTED_COUNT,
    tag("keyboard: Show all categories inside the panel clears every checkbox"));
  await page.keyboard.press("Escape");
  await page.keyboard.press("Tab");
  check(await activeId(page) === "sort" && !(await menuOpen(page)), tag("keyboard: Tab from the closed dropdown reaches Sort by"));
  await page.keyboard.press("ArrowDown");
  check(await select.inputValue() === "updated" &&
    JSON.stringify((await visibleCards(page)).map((c) => c[1])) === JSON.stringify(EXPECTED_ORDER.updated),
    tag("keyboard: ArrowDown on Sort by switches to Recently updated and re-sorts"));
  await page.keyboard.press("/");
  check(await select.inputValue() === "updated", tag("keyboard: “/” in the select does not hijack it"));
  await select.selectOption("created");

  // Focus leaving the panel and clicks outside it close the dropdown.
  await page.click("#category-toggle");
  await page.focus("#category-options input");
  await page.focus("#sort");
  check(!(await menuOpen(page)), tag("dropdown: moving focus out of the panel closes it"));
  await page.click("#category-toggle");
  await page.click("h1");
  check(!(await menuOpen(page)), tag("dropdown: a click outside closes it"));
  await page.click("#category-toggle");
  await page.click("#category-options label >> nth=3");
  check(await menuOpen(page) && JSON.stringify(await checkedIds(page)) === '["tech"]', tag("dropdown: clicking an option label checks it and keeps the panel open"));
  const panel = await page.locator("#category-panel").boundingBox();
  check(panel && panel.x >= 0 && panel.x + panel.width <= page.viewportSize().width, tag("dropdown panel fits inside the viewport"));
  await page.click("#category-clear");
  await page.keyboard.press("Escape");

  await page.click("body", { position: { x: 1, y: 1 } });
  await page.keyboard.press("/");
  await page.keyboard.type("quartz");
  check(await activeId(page) === "filter" && uniqueNames(await visibleCards(page)).length === 2, tag("keyboard: “/” focuses search"));
  await page.keyboard.press("Escape");
  check(await page.inputValue("#filter") === "" && uniqueNames(await visibleCards(page)).length === EXPECTED_COUNT,
    tag("keyboard: Esc clears the search"));

  // Tiles: one site anchor wraps image + text; the GitHub anchor is a separate sibling. No nested anchors.
  const structure = await page.$$eval(".card", (cards) => cards.map((li) => {
    const main = li.querySelector("a.card-main");
    const repo = li.querySelectorAll("a.card-repo");
    return {
      name: li.querySelector(".card-slug code").textContent,
      href: main?.getAttribute("href"),
      repo: repo.length === 1 ? repo[0].getAttribute("href") : null,
      imgInside: !!main?.querySelector(".shot img"),
      titleInside: !!main?.querySelector(".card-title"),
      nested: li.querySelectorAll("a a").length,
      repoOutside: repo.length === 1 && !repo[0].closest("a.card-main") && repo[0].parentElement === main?.parentElement,
      anchors: li.querySelectorAll("a").length,
      visitText: /visit/i.test(li.textContent),
      labelled: main?.getAttribute("aria-labelledby")?.split(" ").map((id) => document.getElementById(id)?.textContent ?? "").join(" "),
    };
  }));
  const badTiles = structure.filter((t) => {
    const s = sites.find((x) => x.name === t.name);
    return t.href !== s.url || t.repo !== s.repository || !t.imgInside || !t.titleInside || t.nested || !t.repoOutside ||
      t.anchors !== 2 || t.visitText || t.labelled !== `${s.title} (${s.url.replace(/^https:\/\//, "").replace(/\/$/, "")})`;
  }).map((t) => t.name);
  check(structure.length === EXPECTED_COUNT * 2 + SECONDARY_COUNT && badTiles.length === 0,
    tag(`every tile: image + text inside one site anchor, separate GitHub anchor, no nested anchors, no “Visit” text${list(badTiles)}`));
  check(await page.getByRole("link", { name: "Account Home (git.marcuschiu.com)", exact: true }).count() >= 1 &&
    await page.getByRole("link", { name: "GitHub repo: therealmarcuschiu.github.io", exact: true }).count() >= 1,
    tag("site and GitHub links have distinct accessible names"));

  // Real hit-testing: which anchor would a click at each point activate?
  const first = sites.find((s) => s.name === EXPECTED_ORDER.created[0]);
  const card = page.locator("#cat-all-sites + ul .card:not([hidden])").first();
  await card.scrollIntoViewIfNeeded();
  const box = await card.boundingBox();
  const repoBox = await card.locator(".card-repo").boundingBox();
  const imgBox = await card.locator(".shot img").boundingBox();
  const hrefAt = (x, y) => page.evaluate(([px, py]) => document.elementFromPoint(px, py)?.closest("a")?.getAttribute("href") ?? null, [x, y]);
  const hits = {
    image: await hrefAt(imgBox.x + imgBox.width / 2, imgBox.y + imgBox.height / 2),
    topLeft: await hrefAt(box.x + 3, box.y + 3),
    bottomRight: await hrefAt(box.x + box.width - 3, box.y + box.height - 3),
    bottomLeft: await hrefAt(box.x + 3, box.y + box.height - 3),
    besideGitHub: await hrefAt(Math.min(box.x + box.width - 3, repoBox.x + repoBox.width + 8), repoBox.y + repoBox.height / 2),
    body: await hrefAt(box.x + box.width / 2, box.y + box.height * 0.78),
    github: await hrefAt(repoBox.x + repoBox.width / 2, repoBox.y + repoBox.height / 2),
  };
  const misses = Object.entries(hits).filter(([k, v]) => k !== "github" && v !== first.url).map(([k, v]) => `${k}→${v}`);
  check(misses.length === 0, tag(`image, corners, body and the strip beside GitHub all hit the site link${list(misses)}`));
  check(hits.github === first.repository, tag(`the GitHub link area hits the repository link (${hits.github})`));

  // Real clicks navigate (destinations are answered locally by the route handler).
  const firstCard = () => page.locator("#cat-all-sites + ul .card:not([hidden])").first();
  const goAndBack = async (locator, target, position) => {
    await Promise.all([page.waitForURL(target), locator.click(position ? { position } : {})]);
    const ok = page.url() === target;
    await page.goBack();
    await page.waitForSelector(".card");
    return ok;
  };
  check(await goAndBack(firstCard().locator(".shot img"), first.url), tag("clicking the screenshot navigates to the site"));
  check(await goAndBack(firstCard(), first.url, { x: box.width - 4, y: box.height - 4 }), tag("clicking the card background navigates to the site"));
  check(await goAndBack(firstCard().locator(".card-repo"), first.repository), tag("clicking the GitHub link navigates to the repository"));
  await firstCard().locator(".card-main").focus();
  await page.keyboard.press("Tab");
  check(await page.evaluate(() => document.activeElement?.classList.contains("card-repo")), tag("keyboard: Tab goes from a tile's site link to its GitHub link"));

  // Layout: controls share one row on desktop and stack on phones. No horizontal overflow in any mode.
  const tops = await page.$$eval("#filter, #category-toggle, #sort", (n) => n.map((x) => Math.round(x.getBoundingClientRect().top)));
  const width = page.viewportSize().width;
  check(width >= 900 ? new Set(tops).size === 1 : tops[0] < tops[1] && tops[1] < tops[2],
    tag(width >= 900 ? "desktop: search, category and sort are on one row" : "phone: controls stack"));
  const overflow = [];
  for (const mode of ["created", "updated", "category"]) {
    await select.selectOption(mode);
    for (const open of [false, true]) {
      if (open) await page.click("#category-toggle");
      const o = await page.evaluate(() => ({
        doc: document.documentElement.scrollWidth - window.innerWidth,
        wide: [...document.querySelectorAll("body *")].filter((n) => {
          const r = n.getBoundingClientRect();
          return r.width && n.offsetParent !== null && !n.closest(".visually-hidden") && (r.right > window.innerWidth + 0.5 || r.left < -0.5);
        }).length,
      }));
      if (o.doc > 0 || o.wide) overflow.push(`${mode}${open ? "+menu" : ""}: +${o.doc}px, ${o.wide} element(s)`);
      if (open) await page.keyboard.press("Escape");
    }
  }
  check(overflow.length === 0, tag(`no horizontal overflow in any sort mode, menu open or closed${list(overflow)}`));
  const sortBox = await page.locator(".sort").boundingBox();
  check(sortBox && sortBox.x >= 0 && sortBox.x + sortBox.width <= width, tag("Sort by control fits inside the viewport"));
  await select.selectOption("created");
}

// Deterministic tie-breaks: serve a copy of the data with tied created_at values (updated_at deliberately disagreeing).
async function exerciseTies(page) {
  const tied = structuredClone(data);
  const set = (name, createdAt, updatedAt) => Object.assign(tied.sites.find((s) => s.name === name), { createdAt, updatedAt });
  set("tetris-unicode", "2026-10-18T22:00:00Z", "2026-10-18T23:59:00Z");
  set("quotes", "2026-10-18T22:00:00Z", "2026-10-18T22:30:00Z");
  set("art", "2026-10-18T22:00:00Z", "2026-10-18T22:00:00Z");
  await page.route("**/data/sites.json", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify(tied) }));
  const load = async () => { await page.reload(); await page.waitForSelector(".card"); return (await visibleCards(page)).map((c) => c[1]); };
  const order = await load();
  check(JSON.stringify(order.slice(0, 3)) === JSON.stringify(["art", "quotes", "tetris-unicode"]),
    `[ties] equal created_at break by repo name, never by updated_at (got ${order.slice(0, 3).join(", ")})`);
  check(JSON.stringify(await load()) === JSON.stringify(order), "[ties] the order is identical across reloads");
  await page.unroute("**/data/sites.json");
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
        // Tile/GitHub navigation targets: answered locally, never fetched.
        if (route.request().isNavigationRequest() && sites.some((s) => u === s.url || u === s.repository)) {
          return route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>stub</title>" });
        }
        offsite.push(u);
        return route.abort();
      });
      await page.goto(url);
      await exercise(page, label);
      if (label === "desktop") await exerciseTies(page);
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
