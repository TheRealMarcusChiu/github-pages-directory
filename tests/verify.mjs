// Dependency-free checks for the static directory. Run: node tests/verify.mjs
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

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
const BASE_KEYS = "category,name,repository,screenshot,title,url";
const unexpectedKeys = sites.filter((s) => Object.keys(s).filter((k) => k !== "alsoIn").sort().join() !== BASE_KEYS).map((s) => s.name);
check(unexpectedKeys.length === 0, `entries have exactly name/title/category/url/repository/screenshot, plus optional alsoIn${list(unexpectedKeys)}`);

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

console.log(failures ? `\n${failures} check(s) failed.` : "\nAll checks passed.");
process.exit(failures ? 1 : 0);
