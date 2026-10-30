// Dependency-free checks for the static directory. Run: node tests/verify.mjs
// Browser checks run too when Playwright can be imported (or PLAYWRIGHT_MODULE points at one);
// set REQUIRE_BROWSER=1 to fail instead of skipping when it can't.
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, extname, normalize as normalizePath } from "node:path";
import { createServer } from "node:http";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const EXPECTED_COUNT = 55;
const OWNER = "TheRealMarcusChiu";
const SNAPSHOT = "2026-10-30";
// Preview capture dates are per entry: 40 of the original 41 previews kept their 2026-10-18 captures;
// bandwidth-compare (one of the original 41) was re-captured on 2026-10-19, and the four repositories
// added in the 2026-10-19 refresh were captured that day, as were the two later 2026-10-19 additions and
// the final 2026-10-19 addition; the newest addition (ups-topology-guide) was captured on 2026-10-20, as were
// the two latest additions (inside-the-machine, boba-passport); the most recent addition (homelab-rack-atlas)
// was captured on 2026-10-21, and the two current additions (Griefcase, bit-atlas) on 2026-10-28; Griefcase was
// re-captured on 2026-10-30, the day of the 2026-10-30 addition (inside-neural-engine) — 40 previews dated
// 2026-10-18, 8 dated 2026-10-19, 3 dated 2026-10-20, 1 dated 2026-10-21, 1 dated 2026-10-28, 2 dated 2026-10-30, 55 in total.
const ORIGINAL_CAPTURE = "2026-10-18";
const ADDED_CAPTURE = "2026-10-19";
const NEWEST_CAPTURE = "2026-10-20";
const RECENT_CAPTURE = "2026-10-21";
const CURRENT_CAPTURE = "2026-10-28";
const OCT30_CAPTURE = "2026-10-30";
const ORIGINAL_COUNT = 41;
const ADDED = ["confluence-obsidian-quartz", "f1-car-generations", "fake-personal-website", "wiki-viewer"];
// Added later on 2026-10-19 (after the four above), appended in this order.
const LATER_ADDED = ["zfs-layout-lab", "vram-fit-map"];
// Final addition on 2026-10-19 (after the two later additions), appended last.
const FINAL_ADDED = ["display-decision-lab"];
// Newest addition, on 2026-10-20 (after the final 2026-10-19 addition), appended last.
const NEWEST_ADDED = ["ups-topology-guide"];
// Latest additions, also captured on 2026-10-20 (after the newest addition), appended last in this order.
const LATEST_ADDED = ["inside-the-machine", "boba-passport"];
// Most recent addition, captured on 2026-10-21 (after the latest additions), appended last.
const RECENT_ADDED = ["homelab-rack-atlas"];
// Current additions, captured on 2026-10-28 (after the most recent addition), appended last in this order.
const CURRENT_ADDED = ["Griefcase", "bit-atlas"];
// Added on 2026-10-30 (after the current additions), appended last.
const OCT30_ADDED = ["inside-neural-engine"];
// Current additions whose preview was re-captured on OCT30_CAPTURE.
const OCT30_RECAPTURED = ["Griefcase"];
const ALL_ADDED = [...ADDED, ...LATER_ADDED, ...FINAL_ADDED, ...NEWEST_ADDED, ...LATEST_ADDED, ...RECENT_ADDED, ...CURRENT_ADDED, ...OCT30_ADDED];

// Original entries whose preview was re-captured on ADDED_CAPTURE after a redeploy.
const RECAPTURED = ["bandwidth-compare"];
// 40 previews dated ORIGINAL_CAPTURE, 8 dated ADDED_CAPTURE, 3 dated NEWEST_CAPTURE, 1 dated RECENT_CAPTURE,
// 1 dated CURRENT_CAPTURE, 2 dated OCT30_CAPTURE.
const ORIGINAL_CAPTURE_COUNT = ORIGINAL_COUNT - RECAPTURED.length;
const ADDED_CAPTURE_COUNT = RECAPTURED.length + ADDED.length + LATER_ADDED.length + FINAL_ADDED.length;
const NEWEST_CAPTURE_COUNT = NEWEST_ADDED.length + LATEST_ADDED.length;
const RECENT_CAPTURE_COUNT = RECENT_ADDED.length;
const CURRENT_CAPTURE_COUNT = CURRENT_ADDED.length - OCT30_RECAPTURED.length;
const OCT30_CAPTURE_COUNT = OCT30_RECAPTURED.length + OCT30_ADDED.length;
const LONG_DATE = { "2026-10-18": "18 October 2026", "2026-10-19": "19 October 2026", "2026-10-20": "20 October 2026", "2026-10-21": "21 October 2026", "2026-10-28": "28 October 2026", "2026-10-30": "30 October 2026" };
const PREVIEW_DIR = "assets/previews";
const PREVIEW_SIZE = { width: 1365, height: 900 };
const HOMEPAGE_REPO = "therealmarcuschiu.github.io";
// The only remote resource allowed: the same Google Fonts stylesheet the reference design uses.
const GOOGLE_FONTS =
  "https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400;1,6..72,500;1,6..72,600&family=JetBrains+Mono:wght@400;500;600&display=swap";

// Category id → label → primary repositories. Each repository has exactly one primary category.
const EXPECTED_CATEGORIES = [
  ["personal", "Personal & Portfolio", ["therealmarcuschiu.github.io", "personal-website", "personal-website-2-public", "personal-website-3", "projects", "now", "workouts", "images", "fake-personal-website", "boba-passport"]],
  ["writing", "Writing & Reflection", ["thoughts", "quotes", "meditations", "Griefcase"]],
  ["faith", "Faith & Bible Study", ["bible-graph", "the-law-of-first-mention"]],
  ["tech", "Tech & Learning", ["bandwidth-compare", "barnes-hut-algorithm", "confluence-data", "display-tech-explorer", "fisher-information", "monitor-tech-guide", "tech", "visualizing-neural-networks", "obsidian-generator", "obsidian-stargazer", "crontab-guru-clone", "shazaam", "f1-car-generations", "zfs-layout-lab", "vram-fit-map", "display-decision-lab", "ups-topology-guide", "inside-the-machine", "homelab-rack-atlas", "bit-atlas", "inside-neural-engine"]],
  ["knowledge", "Knowledge & Reading", ["quartz", "stardust", "var-log", "var-log-1", "confluence-obsidian-quartz", "wiki-viewer"]],
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
// Exact source order, display titles, GitHub repository created_at / updated_at (retrieved once from the
// authenticated owner Pages inventory, all refreshed from the 2026-10-30 retrieval) and per-entry preview capture
// date. Repository metadata only — not page-content dates. The four additions are appended after the original 41,
// then the two later additions after them, then the final 2026-10-19 addition, then the newest addition, then the
// two latest additions, then the most recent addition, then the two current additions, then the 2026-10-30 addition last.
const EXPECTED_SITES = [
  ["therealmarcuschiu.github.io", "Account Home", "2020-07-12T18:05:00Z", "2026-10-26T22:40:55Z", "2026-10-18"],
  ["personal-website", "Personal Website · Developer (v1)", "2018-12-21T07:19:36Z", "2025-05-28T20:45:00Z", "2026-10-18"],
  ["personal-website-2-public", "Personal Website · Hi There (v2)", "2025-06-09T05:09:38Z", "2026-07-03T06:00:55Z", "2026-10-18"],
  ["personal-website-3", "Personal Website · Terminal (v3)", "2026-06-10T00:53:07Z", "2026-10-26T22:40:54Z", "2026-10-18"],
  ["projects", "Projects · Selected Work", "2026-06-10T18:39:17Z", "2026-08-19T19:15:51Z", "2026-10-18"],
  ["now", "Now", "2026-07-01T21:51:17Z", "2026-10-30T03:33:42Z", "2026-10-18"],
  ["workouts", "Training Log", "2026-06-24T18:35:11Z", "2026-08-07T06:11:53Z", "2026-10-18"],
  ["thoughts", "Mark the Thoughts", "2026-06-09T23:29:40Z", "2026-09-26T20:14:02Z", "2026-10-18"],
  ["quotes", "Quotes Worth Keeping", "2026-06-09T06:46:37Z", "2026-08-19T19:14:09Z", "2026-10-18"],
  ["meditations", "Meditations", "2026-08-02T06:27:30Z", "2026-10-18T03:06:46Z", "2026-10-18"],
  ["bible-graph", "Bible Graph", "2026-07-03T20:27:30Z", "2026-07-10T03:36:13Z", "2026-10-18"],
  ["the-law-of-first-mention", "The Law of First Mention", "2025-08-14T20:27:13Z", "2026-07-03T05:46:27Z", "2026-10-18"],
  ["bandwidth-compare", "Bandwidth Compare", "2026-10-16T04:26:33Z", "2026-10-19T02:52:50Z", "2026-10-19"],
  ["barnes-hut-algorithm", "Barnes–Hut Gravity Simulation", "2026-01-26T18:15:23Z", "2026-07-03T05:56:58Z", "2026-10-18"],
  ["confluence-data", "Confluence Data Visualizations", "2020-05-12T01:03:40Z", "2026-07-03T07:09:14Z", "2026-10-18"],
  ["display-tech-explorer", "Display Tech Explorer", "2026-10-18T17:04:16Z", "2026-10-18T17:06:01Z", "2026-10-18"],
  ["fisher-information", "Fisher Information", "2021-12-23T19:39:34Z", "2026-07-03T05:56:08Z", "2026-10-18"],
  ["monitor-tech-guide", "Display Atlas · Monitor Tech Guide", "2026-10-18T04:20:19Z", "2026-10-18T04:20:35Z", "2026-10-18"],
  ["tech", "What the Tech?", "2026-06-09T18:22:49Z", "2026-07-03T06:42:43Z", "2026-10-18"],
  ["visualizing-neural-networks", "Visualizing Neural Networks", "2025-09-02T03:15:39Z", "2026-07-03T05:41:40Z", "2026-10-18"],
  ["obsidian-generator", "ZIM Archive → Obsidian Vault", "2026-07-09T20:20:13Z", "2026-07-10T03:57:54Z", "2026-10-18"],
  ["obsidian-stargazer", "Obsidian Stargazer", "2026-07-09T20:16:50Z", "2026-07-10T02:48:34Z", "2026-10-18"],
  ["crontab-guru-clone", "Crontab Guru Clone", "2019-04-01T04:23:31Z", "2026-07-03T05:44:58Z", "2026-10-18"],
  ["quartz", "/var/log · Quartz", "2026-06-04T17:24:25Z", "2026-07-11T17:41:12Z", "2026-10-18"],
  ["stardust", "Stardust Knowledge Garden", "2026-06-29T05:23:53Z", "2026-10-07T18:03:58Z", "2026-10-18"],
  ["var-log", "/var/log Knowledge Garden", "2026-06-04T20:38:46Z", "2026-07-12T04:06:25Z", "2026-10-18"],
  ["var-log-1", "/var/log · Quartz Archive", "2026-06-26T17:48:53Z", "2026-06-26T19:50:07Z", "2026-10-18"],
  ["better-plume", "Plume", "2026-10-10T05:28:48Z", "2026-10-18T22:30:26Z", "2026-10-18"],
  ["birdseye-arena", "Birdseye Arena", "2026-10-11T01:28:21Z", "2026-10-18T22:35:00Z", "2026-10-18"],
  ["dark-twilight-imperium", "Oracle Rex · Twilight Imperium Companion", "2026-07-03T05:27:24Z", "2026-07-03T05:40:05Z", "2026-10-18"],
  ["spinning-cube", "Spinning Cube", "2026-07-03T05:33:28Z", "2026-07-03T05:34:53Z", "2026-10-18"],
  ["tetris-ascii", "Tetris · ASCII", "2025-08-14T04:57:41Z", "2026-07-03T06:45:00Z", "2026-10-18"],
  ["tetris-canvas", "Tetris · Canvas", "2025-08-08T04:02:38Z", "2026-07-03T06:35:50Z", "2026-10-18"],
  ["tetris-unicode", "Tetris · Unicode", "2025-08-11T21:51:55Z", "2026-07-03T06:38:03Z", "2026-10-18"],
  ["tower-defense", "Hold the Margin · Tower Defense", "2026-07-06T03:42:06Z", "2026-07-06T03:54:32Z", "2026-10-18"],
  ["shared-canvas", "Common · Shared Canvas", "2026-09-26T21:46:08Z", "2026-10-18T21:14:42Z", "2026-10-18"],
  ["table-topics", "Table Topics", "2023-05-23T02:06:33Z", "2026-07-03T05:57:17Z", "2026-10-18"],
  ["art", "Art Gallery", "2026-09-07T06:35:16Z", "2026-09-07T06:36:29Z", "2026-10-18"],
  ["my-room-in-3d", "My Room in 3D", "2026-07-03T04:58:16Z", "2026-07-03T05:55:49Z", "2026-10-18"],
  ["images", "Markive · YouTube Videos, Quotes & Images", "2026-06-08T19:32:30Z", "2026-10-30T03:09:42Z", "2026-10-18"],
  ["shazaam", "Local Shazam", "2025-08-17T09:03:23Z", "2026-07-03T05:55:18Z", "2026-10-18"],
  ["confluence-obsidian-quartz", "Quartz Feed · /var/log", "2026-06-01T19:51:03Z", "2026-06-04T07:37:11Z", "2026-10-19"],
  ["f1-car-generations", "The Shape of Speed · F1, 1950–2026", "2026-10-19T05:44:38Z", "2026-10-19T05:57:46Z", "2026-10-19"],
  ["fake-personal-website", "Fake Personal Site · Inspector", "2019-03-02T04:36:01Z", "2026-07-03T05:29:35Z", "2026-10-19"],
  ["wiki-viewer", "Wiki Viewer · Empty Garden", "2026-07-09T07:20:31Z", "2026-07-12T04:51:36Z", "2026-10-19"],
  ["zfs-layout-lab", "ZFS Layout Lab · Pool Geometry", "2026-10-19T16:17:23Z", "2026-10-19T16:17:33Z", "2026-10-19"],
  ["vram-fit-map", "VRAM Fit Map · Local LLM Budget", "2026-10-19T16:17:32Z", "2026-10-19T16:17:43Z", "2026-10-19"],
  ["display-decision-lab", "Display Decision Lab · Panel Trade-offs", "2026-10-19T21:16:15Z", "2026-10-19T21:45:05Z", "2026-10-19"],
  ["ups-topology-guide", "UPS, visualized · UPS topology guide", "2026-10-20T01:24:54Z", "2026-10-20T02:08:13Z", "2026-10-20"],
  ["inside-the-machine", "Inside the Machine · Computing Museum", "2026-10-20T05:39:29Z", "2026-10-20T05:44:02Z", "2026-10-20"],
  ["boba-passport", "Boba Passport · Tea Journal", "2026-10-20T18:54:33Z", "2026-10-20T18:54:42Z", "2026-10-20"],
  ["homelab-rack-atlas", "Homelab Rack Atlas · Interactive 3D Rack", "2026-10-21T03:06:45Z", "2026-10-21T03:06:55Z", "2026-10-21"],
  ["Griefcase", "greifcase", "2026-10-28T00:10:19Z", "2026-10-30T03:25:00Z", "2026-10-30"],
  ["bit-atlas", "Bit Atlas", "2026-10-28T00:25:22Z", "2026-10-28T04:41:29Z", "2026-10-28"],
  ["inside-neural-engine", "Inside the Neural Engine", "2026-10-30T02:52:50Z", "2026-10-30T03:34:07Z", "2026-10-30"],
];
// Exact timestamp of the owner Pages inventory every entry's dates come from (no per-entry later lookups).
const DATES_RETRIEVED = "2026-10-30T03:36:12.974716+00:00";
// Earlier retrievals (and the old bit-atlas later-lookup exception) that must not linger now every entry is refreshed.
const STALE_RETRIEVALS = /2026-10-19T21:46:15Z|2026-10-20T01:28:53Z|2026-10-28T00:50:50Z|2026-10-28T04:42:51Z|later lookup|carried forward|not applied/;
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const SORT_OPTIONS = [["created", "Recently created"], ["updated", "Recently updated"], ["category", "Category"]];
// Titles/categories settled by earlier requests that must not regress.
const PINNED = [
  { name: "images", title: "Markive · YouTube Videos, Quotes & Images", category: "personal" },
  { name: "shazaam", title: "Local Shazam", category: "tech" },
  // The owner's own lowercase spelling; id, Pages URL and repository keep the repo's case.
  { name: "Griefcase", title: "greifcase", category: "writing" },
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
check(!("capturedOn" in (data.screenshots ?? {})) && data.screenshots?.captureDatePolicy === "per-entry" &&
  data.screenshots?.width === PREVIEW_SIZE.width && data.screenshots?.height === PREVIEW_SIZE.height && data.screenshots?.format === "webp",
  "screenshot metadata: per-entry capture dates (no global capturedOn), 1365×900 WebP");
const screenshotNote = data.screenshots?.note ?? "";
check(/screenshotCapturedOn/.test(screenshotNote) &&
  screenshotNote.includes(`${ORIGINAL_COUNT - RECAPTURED.length} of the original ${ORIGINAL_COUNT} previews were captured on ${ORIGINAL_CAPTURE}`) &&
  RECAPTURED.every((name) => screenshotNote.includes(`${name} was re-captured on ${ADDED_CAPTURE}`)) &&
  screenshotNote.includes(`the four additions were captured on ${ADDED_CAPTURE}`) &&
  screenshotNote.includes(`the two later additions (${LATER_ADDED.join(", ")}) were captured on ${ADDED_CAPTURE}`) &&
  screenshotNote.includes(`the final addition (${FINAL_ADDED.join(", ")}) was captured on ${ADDED_CAPTURE}`) &&
  screenshotNote.includes(`the newest addition (${NEWEST_ADDED.join(", ")}) was captured on ${NEWEST_CAPTURE}`) &&
  screenshotNote.includes(`the latest additions (${LATEST_ADDED.join(", ")}) were captured on ${NEWEST_CAPTURE}`) &&
  screenshotNote.includes(`the most recent addition (${RECENT_ADDED.join(", ")}) was captured on ${RECENT_CAPTURE}`) &&
  screenshotNote.includes(`the current additions (${CURRENT_ADDED.join(", ")}) were captured on ${CURRENT_CAPTURE}`) &&
  OCT30_RECAPTURED.every((name) => screenshotNote.includes(`${name} was re-captured on ${OCT30_CAPTURE}`)) &&
  screenshotNote.includes(`the ${OCT30_CAPTURE} addition (${OCT30_ADDED.join(", ")}) was captured on ${OCT30_CAPTURE}`) &&
  screenshotNote.includes(`${ORIGINAL_CAPTURE_COUNT} previews are dated ${ORIGINAL_CAPTURE}, ${ADDED_CAPTURE_COUNT} are dated ${ADDED_CAPTURE}, ${NEWEST_CAPTURE_COUNT} are dated ${NEWEST_CAPTURE}, ${RECENT_CAPTURE_COUNT} is dated ${RECENT_CAPTURE}, ${CURRENT_CAPTURE_COUNT} is dated ${CURRENT_CAPTURE} and ${OCT30_CAPTURE_COUNT} are dated ${OCT30_CAPTURE}`) &&
  !/The original \d+ previews were captured/.test(screenshotNote) &&
  /may have changed/.test(screenshotNote),
  `screenshot note says ${ORIGINAL_COUNT - RECAPTURED.length} of the original ${ORIGINAL_COUNT} are dated ${ORIGINAL_CAPTURE}, ${RECAPTURED.join(", ")} was re-captured on ${ADDED_CAPTURE}, the other additions are dated ${ADDED_CAPTURE}, ${[...NEWEST_ADDED, ...LATEST_ADDED].join(", ")} are dated ${NEWEST_CAPTURE}, ${RECENT_ADDED.join(", ")} is dated ${RECENT_CAPTURE}, bit-atlas is dated ${CURRENT_CAPTURE} and ${[...OCT30_RECAPTURED, ...OCT30_ADDED].join(", ")} are dated ${OCT30_CAPTURE} (${ORIGINAL_CAPTURE_COUNT}/${ADDED_CAPTURE_COUNT}/${NEWEST_CAPTURE_COUNT}/${RECENT_CAPTURE_COUNT}/${CURRENT_CAPTURE_COUNT}/${OCT30_CAPTURE_COUNT})`);

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
const BASE_KEYS = "category,createdAt,name,repository,screenshot,screenshotCapturedOn,title,updatedAt,url";
const unexpectedKeys = sites.filter((s) => Object.keys(s).filter((k) => k !== "alsoIn").sort().join() !== BASE_KEYS).map((s) => s.name);
check(unexpectedKeys.length === 0,
  `entries have exactly name/title/category/url/repository/screenshot/screenshotCapturedOn/createdAt/updatedAt, plus optional alsoIn${list(unexpectedKeys)}`);
check(JSON.stringify(sites.map((s) => [s.name, s.title])) === JSON.stringify(EXPECTED_SITES.map(([n, t]) => [n, t])),
  `the ${EXPECTED_COUNT} names and display titles match, in source order`);
check(EXPECTED_SITES.length === EXPECTED_COUNT && ORIGINAL_COUNT + ALL_ADDED.length === EXPECTED_COUNT &&
  JSON.stringify(names.slice(ORIGINAL_COUNT)) === JSON.stringify(ALL_ADDED),
  `the original ${ORIGINAL_COUNT} keep their relative order, then the ${ADDED.length} additions, then the ${LATER_ADDED.length} later additions (${LATER_ADDED.join(", ")}), then the final addition (${FINAL_ADDED.join(", ")}), then the newest addition (${NEWEST_ADDED.join(", ")}), then the latest additions (${LATEST_ADDED.join(", ")}), then the most recent addition (${RECENT_ADDED.join(", ")}), then the current additions (${CURRENT_ADDED.join(", ")}), then the ${OCT30_CAPTURE} addition (${OCT30_ADDED.join(", ")})`);

// Repository dates (GitHub created_at / updated_at)
const meta = data.repositoryDates ?? {};
check(meta.retrievedAt === DATES_RETRIEVED && meta.retrievedAt.startsWith(SNAPSHOT) && /created_at/.test(meta.source ?? "") &&
  /updated_at/.test(meta.source ?? "") && /not page-content dates/i.test(meta.note ?? ""),
  "repositoryDates records the GitHub API source, retrieval time on the snapshot date, and that these are not page-content dates");
check((meta.note ?? "").includes(DATES_RETRIEVED) && !STALE_RETRIEVALS.test(meta.note ?? ""),
  `repositoryDates names the ${DATES_RETRIEVED} inventory for every entry, with no later-lookup or carried-forward caveat`);
check(!("capturedOn" in meta) && !/screenshot|capture/i.test(meta.note ?? ""), "repositoryDates stays separate from preview capture dates");
const validIso = (t) => typeof t === "string" && ISO_UTC.test(t) && new Date(t).toISOString() === t.replace("Z", ".000Z");
const badStamps = sites.filter((s) => !validIso(s.createdAt) || !validIso(s.updatedAt)).map((s) => s.name);
check(badStamps.length === 0, `all ${sites.length} entries have valid ISO 8601 UTC createdAt and updatedAt${list(badStamps)}`);
const badRange = sites.filter((s) => !(s.createdAt <= s.updatedAt && Date.parse(s.updatedAt) <= Date.parse(DATES_RETRIEVED))).map((s) => s.name);
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
const griefcase = sites.find((s) => s.name === "Griefcase");
check(griefcase?.url === "https://git.marcuschiu.com/Griefcase/" && griefcase?.screenshot === `${PREVIEW_DIR}/griefcase.webp`,
  "Griefcase keeps its uppercase Pages URL and lowercase preview path");

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
const badShotPath = sites.filter((s) => s.screenshot !== `${PREVIEW_DIR}/${s.name.toLowerCase()}.webp`).map((s) => s.name);
check(badShotPath.length === 0, `screenshot paths are relative ${PREVIEW_DIR}/<lowercased repo>.webp${list(badShotPath)}`);
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
// Re-captured from the live sites after the game restyles on 2026-10-18 (part of the original 41 captures).
const REFRESHED_PREVIEWS = ["shared-canvas", "better-plume", "birdseye-arena"];
const badRefreshed = [...REFRESHED_PREVIEWS, ...RECAPTURED].filter((name) => {
  const s = sites.find((x) => x.name === name);
  const file = join(ROOT, PREVIEW_DIR, `${name}.webp`);
  const size = existsSync(file) && webpSize(readFileSync(file));
  return !s || s.screenshot !== `${PREVIEW_DIR}/${name}.webp` || !size ||
    size.width !== PREVIEW_SIZE.width || size.height !== PREVIEW_SIZE.height;
});
check(badRefreshed.length === 0, `refreshed previews (${[...REFRESHED_PREVIEWS, ...RECAPTURED].join(", ")}) are referenced 1365×900 WebP${list(badRefreshed)}`);
// Per-entry capture dates: required on every entry, valid calendar dates, never after the snapshot.
const validDay = (d) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) && new Date(`${d}T00:00:00Z`).toISOString().startsWith(d);
const badCapture = sites.filter((s) => !validDay(s.screenshotCapturedOn) || s.screenshotCapturedOn > SNAPSHOT || "capturedOn" in s).map((s) => s.name);
check(badCapture.length === 0, `every entry has a valid screenshotCapturedOn on or before ${SNAPSHOT}${list(badCapture)}`);
const wrongCapture = sites.filter((s, i) => s.screenshotCapturedOn !== EXPECTED_SITES[i]?.[4]).map((s) => `${s.name}→${s.screenshotCapturedOn}`);
check(wrongCapture.length === 0, `capture dates match the expected per-entry dates${list(wrongCapture)}`);
const originals = sites.filter((s) => !ALL_ADDED.includes(s.name));
const additions = sites.filter((s) => ADDED.includes(s.name));
const laterAdditions = sites.filter((s) => LATER_ADDED.includes(s.name));
const finalAdditions = sites.filter((s) => FINAL_ADDED.includes(s.name));
const newestAdditions = sites.filter((s) => NEWEST_ADDED.includes(s.name));
const latestAdditions = sites.filter((s) => LATEST_ADDED.includes(s.name));
const recentAdditions = sites.filter((s) => RECENT_ADDED.includes(s.name));
const currentAdditions = sites.filter((s) => CURRENT_ADDED.includes(s.name) && !OCT30_RECAPTURED.includes(s.name));
const oct30Previews = sites.filter((s) => OCT30_RECAPTURED.includes(s.name) || OCT30_ADDED.includes(s.name));
const kept = originals.filter((s) => !RECAPTURED.includes(s.name));
const recaptured = originals.filter((s) => RECAPTURED.includes(s.name));
check(originals.length === ORIGINAL_COUNT && kept.length === ORIGINAL_COUNT - RECAPTURED.length &&
  kept.every((s) => s.screenshotCapturedOn === ORIGINAL_CAPTURE),
  `${kept.length} of the ${ORIGINAL_COUNT} original previews keep capture date ${ORIGINAL_CAPTURE}`);
check(recaptured.length === RECAPTURED.length && recaptured.every((s) => s.screenshotCapturedOn === ADDED_CAPTURE),
  `the ${RECAPTURED.length} re-captured original preview (${RECAPTURED.join(", ")}) is dated ${ADDED_CAPTURE}`);
check(additions.length === ADDED.length && additions.every((s) => s.screenshotCapturedOn === ADDED_CAPTURE),
  `the ${ADDED.length} added previews (${ADDED.join(", ")}) are dated ${ADDED_CAPTURE}`);
check(laterAdditions.length === LATER_ADDED.length && laterAdditions.every((s) => s.screenshotCapturedOn === ADDED_CAPTURE),
  `the ${LATER_ADDED.length} later added previews (${LATER_ADDED.join(", ")}) are dated ${ADDED_CAPTURE}`);
check(finalAdditions.length === FINAL_ADDED.length && finalAdditions.every((s) => s.screenshotCapturedOn === ADDED_CAPTURE),
  `the final added preview (${FINAL_ADDED.join(", ")}) is dated ${ADDED_CAPTURE}`);
check(newestAdditions.length === NEWEST_ADDED.length && newestAdditions.every((s) => s.screenshotCapturedOn === NEWEST_CAPTURE),
  `the newest added preview (${NEWEST_ADDED.join(", ")}) is dated ${NEWEST_CAPTURE}`);
check(latestAdditions.length === LATEST_ADDED.length && latestAdditions.every((s) => s.screenshotCapturedOn === NEWEST_CAPTURE),
  `the ${LATEST_ADDED.length} latest added previews (${LATEST_ADDED.join(", ")}) are dated ${NEWEST_CAPTURE}`);
check(recentAdditions.length === RECENT_ADDED.length && recentAdditions.every((s) => s.screenshotCapturedOn === RECENT_CAPTURE),
  `the most recent added preview (${RECENT_ADDED.join(", ")}) is dated ${RECENT_CAPTURE}`);
check(currentAdditions.length === CURRENT_CAPTURE_COUNT && currentAdditions.every((s) => s.screenshotCapturedOn === CURRENT_CAPTURE),
  `the ${CURRENT_CAPTURE_COUNT} current added preview not re-captured (bit-atlas) is dated ${CURRENT_CAPTURE}`);
check(oct30Previews.length === OCT30_CAPTURE_COUNT && oct30Previews.every((s) => s.screenshotCapturedOn === OCT30_CAPTURE),
  `the re-captured ${OCT30_RECAPTURED.join(", ")} and the added ${OCT30_ADDED.join(", ")} previews are dated ${OCT30_CAPTURE}`);
const datedOriginal = sites.filter((s) => s.screenshotCapturedOn === ORIGINAL_CAPTURE).length;
const datedAdded = sites.filter((s) => s.screenshotCapturedOn === ADDED_CAPTURE).length;
const datedNewest = sites.filter((s) => s.screenshotCapturedOn === NEWEST_CAPTURE).length;
const datedRecent = sites.filter((s) => s.screenshotCapturedOn === RECENT_CAPTURE).length;
const datedCurrent = sites.filter((s) => s.screenshotCapturedOn === CURRENT_CAPTURE).length;
const datedOct30 = sites.filter((s) => s.screenshotCapturedOn === OCT30_CAPTURE).length;
check(ORIGINAL_CAPTURE_COUNT === 40 && ADDED_CAPTURE_COUNT === 8 && NEWEST_CAPTURE_COUNT === 3 && RECENT_CAPTURE_COUNT === 1 &&
  CURRENT_CAPTURE_COUNT === 1 && OCT30_CAPTURE_COUNT === 2 &&
  datedOriginal === ORIGINAL_CAPTURE_COUNT && datedAdded === ADDED_CAPTURE_COUNT && datedNewest === NEWEST_CAPTURE_COUNT &&
  datedRecent === RECENT_CAPTURE_COUNT && datedCurrent === CURRENT_CAPTURE_COUNT && datedOct30 === OCT30_CAPTURE_COUNT &&
  datedOriginal + datedAdded + datedNewest + datedRecent + datedCurrent + datedOct30 === EXPECTED_COUNT,
  `${ORIGINAL_CAPTURE_COUNT} previews dated ${ORIGINAL_CAPTURE} + ${ADDED_CAPTURE_COUNT} dated ${ADDED_CAPTURE} + ${NEWEST_CAPTURE_COUNT} dated ${NEWEST_CAPTURE} + ${RECENT_CAPTURE_COUNT} dated ${RECENT_CAPTURE} + ${CURRENT_CAPTURE_COUNT} dated ${CURRENT_CAPTURE} + ${OCT30_CAPTURE_COUNT} dated ${OCT30_CAPTURE} = ${EXPECTED_COUNT} (found ${datedOriginal} + ${datedAdded} + ${datedNewest} + ${datedRecent} + ${datedCurrent} + ${datedOct30})`);

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
const mastheadHtml = html.match(/<header class="masthead">[\s\S]*?<\/header>/)?.[0] ?? "";
const footerHtml = html.match(/<footer[\s\S]*?<\/footer>/)?.[0] ?? "";
const footerText = footerHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
check(/^<header class="masthead">\s*<div class="wrap">\s*<p class="eyebrow">TheRealMarcusChiu · GitHub Pages<\/p>\s*<h1>Pages, <em>gathered\.<\/em><\/h1>\s*<\/div>\s*<\/header>$/.test(mastheadHtml),
  "masthead holds only the eyebrow and the concise title");
check(!/class="lede"|class="note"|id="snapshot-note"|id="total-count"|id="category-count"/.test(html) &&
  !/\.lede\b|\.note\b/.test(css) && !/total-count|category-count|snapshot-note/.test(js),
  "the old masthead lede (site/category counts) and snapshot note are gone from markup, styles and script");
check(/<main[\s>]/.test(html) && /<header[\s>]/.test(html) && /<footer[\s>]/.test(html), "index.html has header/main/footer landmarks");
check(/class="skip-link" href="#directory"/.test(html) && /id="directory"/.test(html), "skip link targets the directory");
check(/<label for="filter"[^>]*>Search<\/label>/.test(html) && /<input id="filter" type="search"/.test(html), "search input has an associated label");
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
check(!/id="result-status"|role="status"|aria-live/.test(html) && !/result-status|Showing (?:all )?\$\{|statusTimer/.test(js),
  "no result-status line or live result counter in the markup or script");
// Each control is one outlined field: its short label sits inside, before the active value; no labels above fields.
const fieldOf = (cls) => controlsHtml.match(new RegExp(`<div class="field ${cls}">([\\s\\S]*?)</div>`))?.[1] ?? "";
check(/^\s*<label for="filter" class="field-label">Search<\/label>\s*<input id="filter"[^>]*placeholder="title, repo or category"/.test(fieldOf("search-field")),
  "search field: in-field SEARCH label before the input, placeholder “title, repo or category”");
check(/<button type="button" id="category-toggle" class="field menu-toggle"[^>]*>\s*<span id="category-filter-label" class="field-label">Category<\/span>\s*<span id="category-summary" class="field-value">All categories<\/span>\s*<\/button>/.test(controlsHtml),
  "category field: the toggle shows its CATEGORY label, then the active selection");
check(/^\s*<label for="sort" class="field-label">Sort by<\/label>\s*<select id="sort"[^>]*class="field-value"/.test(fieldOf("sort-field")),
  "sort field: in-field SORT BY label before the select");
check(!/class="label"/.test(html) && !/\.label\b/.test(css) && (controlsHtml.match(/class="field-label"/g) ?? []).length === 3,
  "no stacked labels above the fields; exactly three in-field labels");
check(/\.field \{[^}]*border: 1px solid var\(--border\)[^}]*border-radius: [1-9]\d*px[^}]*background-color: var\(--surface\)/.test(css) &&
  /\.field-label \{[^}]*color: var\(--muted\)/.test(css) && /\.eyebrow, \.field-label,[^{]*\{[^}]*font-family: var\(--mono\)[^}]*text-transform: uppercase/.test(css) &&
  /\.field-value \{[^}]*color: var\(--text\)[^}]*var\(--mono\)[^}]*text-transform: uppercase/.test(css),
  "fields: rounded warm-dark outline, muted uppercase mono label, light uppercase mono value");
check(/\.menu-toggle, \.sort-field select \{[^}]*linear-gradient\(45deg, transparent 50%, var\(--gold\) 50%\)/.test(css),
  "category and sort fields draw a gold chevron");
check(/id="empty"[^>]*hidden/.test(html), "empty state exists and is hidden by default");
check(html.includes('href="assets/styles.css"'), "stylesheet linked with a relative path");
check(html.includes('src="assets/app.js"'), "script linked with a relative path");
const metaDescription = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? "";
check(/<time datetime="2026-10-30">2026-10-30<\/time>/.test(footerHtml) && /dated 30 October 2026/.test(metaDescription) && !/<time/.test(mastheadHtml),
  "snapshot date 2026-10-30 kept in the footer and meta description, not the masthead");
check(!/2026-10-(?:1[89]|2[018])|(?:1[89]|2[018]) October 2026/.test(html), "no stale 18/19/20/21/28 October snapshot/global capture date in the page");
check(/55 sites/.test(footerHtml) && /55-site/.test(metaDescription), "footer and meta description describe 55 sites");
check(!/\b(?:4[578]|5[1234])(?: sites|-site|<\/strong>)/.test(html), "no stale 45-, 47-, 48-, 51-, 52-, 53- or 54-site count in the page");
check(/GitHub Pages configured/.test(metaDescription), "meta description says membership means GitHub Pages is configured");
check(/capture dates vary by entry/.test(metaDescription), "meta description says preview capture dates vary by entry");
check(/Static 55-site snapshot/.test(metaDescription) && /^Snapshot /.test(footerText), "meta description and footer present the page as a static snapshot");
check(/1365×900/.test(metaDescription) && /viewport (?:previews?|captures?)/i.test(metaDescription), "meta description says screenshots are 1365×900 viewport captures");
const headerText = mastheadHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
check(headerText === "TheRealMarcusChiu · GitHub Pages Pages, gathered.", `masthead text is just the eyebrow and title (“${headerText}”)`);
check(footerText.length <= 110 && (footerHtml.match(/<p>/g) ?? []).length === 1,
  `footer is a single short line (${footerText.length} chars)`);
check(/id="sort-hint"[^>]*>Recent orders use GitHub repository created and updated dates, not page-content dates\./.test(html),
  "sort hint labels created/updated as GitHub repository dates, not page-content dates");
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
check(/`Preview screenshot of \$\{site\.title\} \(\$\{site\.name\}\)\$\{captured \? `, captured \$\{captured\}` : ""\}`/.test(js) &&
  /const captured = longDate\(site\.screenshotCapturedOn\)/.test(js) && (js.match(/alt: previewAlt\(site\)/g) ?? []).length === 2,
  "tile and dialog screenshots get meaningful alt text (title + repo + that entry's capture date)");
check(!/(?:1[89]|2[018]|30) October 2026|2026-10-(?:1[89]|2[018]|30)/.test(js), "app.js has no hard-coded global screenshot/snapshot date");
check(/<dt>Preview<\/dt>\s*<dd id="details-capture"><\/dd>/.test(html) && /replaceChildren\(\.\.\.renderCapture\(site\)\)/.test(js) &&
  /datetime: site\.screenshotCapturedOn/.test(js) && /CAPTURE_DATE\.exec/.test(js),
  "the details dialog shows the validated per-entry preview capture date in a separate Preview row");
check(/el\("button", \{\s*type: "button", class: "card-main", "aria-haspopup": "dialog", "aria-controls": "site-details", "aria-label": site\.title,\s*\}, children\)/.test(js) &&
  /el\("h3", \{ class: "card-heading" \}, \[button\]\)/.test(js) && /el\("span", \{ class: "card-title", text: site\.title \}\)/.test(js),
  "each tile is one dialog button (screenshot + category + title) inside its h3; no h3 inside the button");
check(!/el\("a"|card-repo|card-slug|card-dates|card-capture|card-link/.test(js) && !/\.card-(?:repo|slug|dates?|capture|link)\b/.test(css),
  "collapsed tiles render no anchors, repo slug, dates or capture line (and no leftover styles for them)");
const dialogs = html.match(/<dialog\b[^>]*>/g) ?? [];
const dialogHtml = html.match(/<dialog[\s\S]*?<\/dialog>/)?.[0] ?? "";
check(dialogs.length === 1 && /^<dialog id="site-details" class="details" aria-labelledby="details-title">$/.test(dialogs[0]) &&
  /<button type="button" id="details-close" class="details-close" aria-label="Close details">/.test(dialogHtml) &&
  ["details-title", "details-category", "details-repo-name", "details-host", "details-site-link", "details-repo-link", "details-dates", "details-capture"]
    .every((id) => (html.match(new RegExp(`id="${id}"`, "g")) ?? []).length === 1 && dialogHtml.includes(`id="${id}"`)) &&
  /<h2 id="details-title"/.test(dialogHtml) && !/<main[\s\S]*<dialog[\s\S]*<\/main>/.test(html),
  "index.html has exactly one labelled details <dialog> (outside <main>) with a real close button and every details field");
check(/<a id="details-site-link" class="details-link">Visit website<\/a>/.test(dialogHtml) &&
  /<a id="details-repo-link" class="details-link">GitHub repo<\/a>/.test(dialogHtml) &&
  !/Visit site|href: site\.screenshot/.test(js + html) && (html.match(/Visit website/g) ?? []).length === 1,
  "“Visit website” appears only once, as the dialog's site link; no screenshot-file link");
check(/details\.showModal\(\)/.test(js) && !/\bdetails\.show\(\)|inert/.test(js) &&
  /opener\?\.focus\(\{ preventScroll: true \}\)/.test(js) && /e\.key !== "\/"[^\n]*details\.open\) return;/.test(js),
  "dialog opens modally (native inert/focus trap), restores focus without scrolling, and “/” is ignored while it is open");
check(/setLink\(detailsSiteLink, site\.url\)/.test(js) && /setLink\(detailsRepoLink, site\.repository\)/.test(js) &&
  /function setLink\(a, url\) \{\s*if \(isHttps\(url\)\) a\.setAttribute\("href", url\);/.test(js),
  "dialog links are only set from validated HTTPS source URLs");
check(/site\.name\} \$\{site\.title\} \$\{category\.label\}/.test(js), "search covers repo name, title and category");
check(/inCategory && terms\.every/.test(js), "search and category filter combine (AND)");
check(/data\.sites\.filter\(\(s\) => isMember\(s, category\.id\)\)/.test(js) &&
  /const isMember = \(site, id\) => site\.category === id \|\| alsoIn\(site\)\.includes\(id\)/.test(js),
  "sections include sites by primary category or alsoIn membership");
check(/const shownSites = new Set\(\)/.test(js) && /const shown = shownSites\.size/.test(js) && /empty\.hidden = shown !== 0/.test(js),
  "the empty state counts unique sites, not duplicated cards");
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
check(/#details-capture time \{[^}]*color: var\(--muted\)/.test(css) && !/data-sort/.test(css),
  "preview capture date is subtle muted text, never highlighted as a sort date");
check(/html:has\(\.details\[open\]\) \{ overflow: hidden;/.test(css) && /\.details-close \{[^}]*width: 2\.75rem;[^}]*height: 2\.75rem;/.test(css) &&
  /\.details-scroll \{[^}]*overflow-y: auto;/.test(css) && /\.details::backdrop/.test(css),
  "dialog locks background scroll, scrolls its own content and has a 44px close button");
check(/--tap:\s*2\.75rem/.test(css) && /min-height: var\(--tap\)/.test(css), "controls and links have comfortable tap targets");

// README
check(readme.includes(SNAPSHOT) && /not automatically synced/i.test(readme), "README states the snapshot date and that it is not synced");
check(/1365×900/.test(readme) && /may have changed/i.test(readme), "README notes screenshots are dated 1365×900 previews");
check(/\(55 entries\)/.test(readme) && /exactly 55 unique entries/.test(readme) && /55 local 1365×900/.test(readme) &&
  !/\((?:41|45|47|48|49|51|52|53|54) entries\)|exactly (?:41|45|47|48|49|51|52|53|54) unique|(?:41|45|47|48|49|51|52|53|54) local/.test(readme), "README describes 55 entries, not the old 41, 45, 47, 48, 49, 51, 52, 53 or 54");
check([...LATER_ADDED, ...FINAL_ADDED, ...NEWEST_ADDED, ...LATEST_ADDED, ...RECENT_ADDED, ...CURRENT_ADDED, ...OCT30_ADDED].every((n) => readme.includes(`\`${n}\``)) &&
  /40 previews dated 2026-10-18, 8 dated 2026-10-19, 3 dated 2026-10-20,\s+1 dated 2026-10-21, 1 dated 2026-10-28, 2 dated 2026-10-30, 55 in total/.test(readme) &&
  !/\b[57] dated 2026-10-19|\b1 dated 2026-10-20|\b2 dated 2026-10-28|(?:4[789]|5[1234]) in total/.test(readme), "README capture prose counts 40 + 8 + 3 + 1 + 1 + 2 = 55 previews and names the later, final, newest, latest, most recent, current and 2026-10-30 additions");
check(!STALE_RETRIEVALS.test(readme), "README has no carried-forward updated_at caveat now that every entry is refreshed");
check(/GitHub Pages\s+configured/.test(readme) && /Pages\s+API/.test(readme), "README says membership means Pages configured per the Pages API inventory");
check(/Capture dates vary by entry/.test(readme) && /screenshotCapturedOn/.test(readme) && readme.includes(ORIGINAL_CAPTURE) &&
  readme.includes(ADDED_CAPTURE) && readme.includes(NEWEST_CAPTURE) && readme.includes(RECENT_CAPTURE) && readme.includes(CURRENT_CAPTURE) && readme.includes(OCT30_CAPTURE) && !/one global capture date/.test(readme), "README documents per-entry capture dates");
check(/confluence-obsidian-quartz/.test(readme) && /raw RSS feed/.test(readme) && /application\/rss\+xml/.test(readme) &&
  /wiki-viewer/.test(readme) && /empty state/.test(readme) && /0 shown/.test(readme),
  "README discloses the RSS-feed and empty-wiki capture states");
check(readme.includes(DATES_RETRIEVED), "README records the repository-date retrieval time");
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

// Visible cards in DOM order: [section id, repo name, category label, screenshot alt]. Collapsed tiles show only
// the image, category and title, so the repo name comes from the (unique) title.
const siteOf = (name) => sites.find((s) => s.name === name);
const nameOfTitle = new Map(sites.map((s) => [s.title, s.name]));
const visibleCards = (page) => page.$$eval(".section:not([hidden]) .card:not([hidden])", (cards) => cards.map((li) => [
  li.closest(".section").getAttribute("aria-labelledby"),
  li.querySelector(".card-title").textContent,
  li.querySelector(".card-category").textContent,
  li.querySelector(".shot img")?.getAttribute("alt"),
])).then((rows) => rows.map(([section, title, ...rest]) => [section, nameOfTitle.get(title) ?? `?${title}`, ...rest]));
// Exact text the tile and the dialog use for a site's categories: primary first, then any secondary ones.
const categoryTextOf = (s) => {
  const labels = [s.category, ...alsoInOf(s)].map((id) => labelOf.get(id));
  return labels.length > 1 ? `${labels[0]} · also ${labels.slice(1).join(", ")}` : labels[0];
};
// "D Month YYYY" in UTC, computed independently of app.js.
const longDay = (iso) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const uniqueNames = (cards) => [...new Set(cards.map((c) => c[1]))];
const isDescending = (values) => values.every((v, i) => i === 0 || values[i - 1] >= v);

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

// Masthead is just eyebrow + title; no visible status line; each control is one field with its label inside.
async function minimalHeaderAndFields(page, tag) {
  const masthead = await page.$$eval(".masthead .wrap > *", (n) => n.map((x) => `${x.tagName}.${x.className}`));
  check(JSON.stringify(masthead) === JSON.stringify(["P.eyebrow", "H1."]), tag(`masthead shows only the eyebrow and title (${masthead.join(", ")})`));
  check(await page.locator("#result-status, [role=status], [aria-live]").count() === 0 &&
    !/Showing|across \d+ categor|Snapshot from/.test(await page.innerText("body")),
    tag("no visible result-status line, live counter, header counts or snapshot note"));
  check(await page.getByLabel("Search", { exact: true }).evaluate((n) => n.id) === "filter" &&
    await page.getByRole("button", { name: "Category All categories", exact: true }).count() === 1 &&
    await page.getByLabel("Sort by", { exact: true }).evaluate((n) => n.id) === "sort",
    tag("search, category and sort keep programmatic labels"));

  const fields = await page.evaluate(() => {
    const box = (n) => n.getBoundingClientRect();
    const style = (n) => getComputedStyle(n);
    return [
      ["search", ".search-field", ".search-field .field-label", "#filter"],
      ["category", "#category-toggle", "#category-filter-label", "#category-summary"],
      ["sort", ".sort-field", ".sort-field .field-label", "#sort"],
    ].map(([name, f, l, v]) => {
      const [field, label, value] = [f, l, v].map((sel) => document.querySelector(sel));
      const [fb, lb, vb, cb] = [field, label, value, field.closest(".control")].map(box);
      // Where the value text starts: inside the select's left padding for sort, the element's left edge otherwise.
      const valueStart = vb.left + (value.tagName === "SELECT" ? parseFloat(style(value).paddingLeft) : 0);
      const chevronOn = name === "search" ? null : style(name === "sort" ? value : field).backgroundImage;
      const center = [lb.left + lb.width / 2, lb.top + lb.height / 2];
      return {
        name,
        labelText: label.innerText,
        valueText: value.tagName === "INPUT" ? value.placeholder : value.tagName === "SELECT" ? value.selectedOptions[0].textContent : value.innerText,
        valueUpper: style(value).textTransform === "uppercase",
        labelInside: lb.left >= fb.left && lb.right <= fb.right && lb.top >= fb.top && lb.bottom <= fb.bottom,
        labelBefore: lb.right <= valueStart + 0.5 && Math.abs((lb.top + lb.bottom) / 2 - (vb.top + vb.bottom) / 2) < 3,
        nothingAbove: Math.abs(cb.top - fb.top) < 0.5,
        height: Math.round(fb.height),
        border: style(field).borderTopColor,
        borderWidth: style(field).borderTopWidth,
        radius: parseFloat(style(field).borderTopLeftRadius),
        labelColor: style(label).color,
        labelFont: style(label).fontFamily,
        labelUpper: style(label).textTransform === "uppercase",
        valueColor: style(value).color,
        valueFont: style(value).fontFamily,
        chevron: chevronOn,
        hit: document.elementFromPoint(...center)?.closest("label, button, select, input")?.id || document.elementFromPoint(...center)?.closest("label")?.htmlFor,
      };
    });
  });
  const MUTED = "rgb(169, 158, 136)", TEXT = "rgb(236, 225, 207)", BORDER = "rgb(42, 34, 24)";
  const want = { search: ["SEARCH", "title, repo or category"], category: ["CATEGORY", "ALL CATEGORIES"], sort: ["SORT BY", "Recently created"] };
  for (const f of fields) {
    check(f.labelText === want[f.name][0] && f.valueText === want[f.name][1] && f.labelInside && f.labelBefore && f.nothingAbove,
      tag(`${f.name}: “${f.labelText}” sits inside the field, before “${f.valueText}”, with no label above`));
    check(f.border === BORDER && f.borderWidth === "1px" && f.radius >= 4 && f.labelColor === MUTED && f.labelUpper &&
      /JetBrains Mono/.test(f.labelFont) && /JetBrains Mono/.test(f.valueFont) &&
      (f.name === "search" ? true : f.valueColor === TEXT && f.valueUpper),
      tag(`${f.name}: rounded warm-dark outline, muted uppercase mono label, light mono value`));
  }
  const chevrons = fields.filter((f) => f.chevron !== null);
  check(chevrons.length === 2 && chevrons.every((f) => /linear-gradient/.test(f.chevron) && f.chevron.includes("rgb(216, 169, 66)")),
    tag("category and sort fields show a gold chevron"));
  check(new Set(fields.map((f) => f.height)).size === 1, tag(`the three fields share one height (${fields.map((f) => f.height).join("/")})`));
  check(fields.find((f) => f.name === "sort").hit === "sort" && fields.find((f) => f.name === "category").hit === "category-toggle",
    tag("clicks on the SORT BY and CATEGORY labels land on their controls"));
  await page.click(".search-field .field-label");
  check(await activeId(page) === "filter", tag("clicking the in-field SEARCH label focuses the search input"));
  await page.locator("#filter").blur();
}

// Everything the open details dialog shows, plus focus, scroll and layout facts.
const dialogState = (page) => page.evaluate(() => {
  const d = document.getElementById("site-details");
  const q = (id) => document.getElementById(id);
  const img = q("details-image");
  const scroll = d.querySelector(".details-scroll");
  const box = d.getBoundingClientRect();
  const close = q("details-close").getBoundingClientRect();
  const times = (id) => [...q(id).querySelectorAll("time")].map((t) => t.getAttribute("datetime"));
  return {
    open: d.open, modal: d.matches(":modal"), dialogs: document.querySelectorAll("dialog").length,
    title: q("details-title").textContent, category: q("details-category").textContent,
    src: img?.getAttribute("src"), alt: img?.getAttribute("alt"), size: img && `${img.getAttribute("width")}x${img.getAttribute("height")}`,
    images: d.querySelectorAll("img").length,
    repoName: q("details-repo-name").textContent, host: q("details-host").textContent,
    siteHref: q("details-site-link").getAttribute("href"), siteText: q("details-site-link").textContent,
    repoHref: q("details-repo-link").getAttribute("href"), repoText: q("details-repo-link").textContent,
    dates: times("details-dates"), datesText: q("details-dates").textContent,
    capture: times("details-capture"), captureText: q("details-capture").textContent,
    active: document.activeElement?.id,
    fits: box.left >= 0 && box.top >= 0 && box.right <= innerWidth && box.bottom <= innerHeight,
    hOverflow: scroll.scrollWidth - scroll.clientWidth,
    closeSize: [Math.round(close.width), Math.round(close.height)],
    closeVisible: close.top >= 0 && close.right <= innerWidth,
    scrollY: window.scrollY,
  };
});
const isOpen = (page) => page.$eval("#site-details", (d) => d.open);
const isFocused = (locator) => locator.evaluate((n) => n === document.activeElement);

// Every way the expected dialog content for `s` can be wrong (empty when it is right).
function detailsProblems(d, s) {
  const long = LONG_DATE[s.screenshotCapturedOn];
  return Object.entries({
    open: d.open && d.modal && d.dialogs === 1,
    focus: d.active === "details-close",
    title: d.title === s.title,
    category: d.category === categoryTextOf(s),
    image: d.images === 1 && d.src === s.screenshot && d.size === "1365x900" &&
      d.alt === `Preview screenshot of ${s.title} (${s.name}), captured ${long}`,
    repo: d.repoName === s.name && d.repoHref === s.repository && d.repoText === "GitHub repo",
    site: d.host === s.url && d.siteHref === s.url && d.siteText === "Visit website",
    dates: JSON.stringify(d.dates) === JSON.stringify([s.createdAt, s.updatedAt]) &&
      d.datesText === `created ${longDay(s.createdAt)} · updated ${longDay(s.updatedAt)}`,
    capture: JSON.stringify(d.capture) === JSON.stringify([s.screenshotCapturedOn]) && d.captureText === `${long} · static viewport capture`,
    layout: d.fits && d.hOverflow <= 0 && d.closeSize[0] >= 44 && d.closeSize[1] >= 44 && d.closeVisible,
  }).filter(([, ok]) => !ok).map(([k]) => k);
}

// Collapsed tiles (image + category + title in one dialog button) and the details dialog they open.
async function exerciseTiles(page, tag) {
  const touch = await page.evaluate(() => navigator.maxTouchPoints > 0);
  const press = (locator) => (touch ? locator.tap() : locator.click());
  const select = page.getByLabel("Sort by", { exact: true });
  await select.selectOption("created");

  // Structure: the h3 wraps one phrasing-only button; the card holds nothing but category and title text.
  const structure = await page.$$eval(".card", (cards) => cards.map((li) => {
    const mains = li.querySelectorAll(".card-main");
    const b = mains[0];
    const category = li.querySelector(".card-category")?.textContent ?? "";
    const title = li.querySelector(".card-title")?.textContent ?? "";
    return {
      title,
      ok: mains.length === 1 && b.tagName === "BUTTON" && b.type === "button" &&
        b.getAttribute("aria-haspopup") === "dialog" && b.getAttribute("aria-controls") === "site-details" &&
        b.getAttribute("aria-label") === title && b.parentElement.matches("h3.card-heading") &&
        b.parentElement.parentElement.matches("article.card-inner") &&
        [...b.querySelectorAll("*")].every((n) => n.tagName === "SPAN" || n.tagName === "IMG") &&
        !!b.querySelector(".shot img") &&
        [...li.querySelector(".card-body").children].map((n) => n.className).join() === "card-category,card-title" &&
        li.querySelectorAll("a, code, time, .card-repo, .card-slug, .card-dates, .card-capture, .card-link").length === 0 &&
        li.textContent === category + title,
    };
  }));
  const badTiles = structure.filter((t) => !t.ok).map((t) => t.title);
  check(structure.length === EXPECTED_COUNT * 2 + SECONDARY_COUNT && badTiles.length === 0,
    tag(`every tile: one h3-wrapped dialog button around image, category and title; no links, slug, dates or capture line${list(badTiles)}`));
  const first = siteOf(EXPECTED_ORDER.created[0]);
  check(await page.getByRole("button", { name: first.title, exact: true }).filter({ visible: true }).count() === 1 &&
    await page.getByRole("heading", { level: 3, name: first.title, exact: true }).filter({ visible: true }).count() === 1 &&
    await page.getByRole("link").filter({ visible: true }).count() === 2,
    tag("tile buttons are named by the title, keep h3 heading navigation, and the page shows no tile links (only skip + footer)"));

  // Category and title keep their previous computed styles.
  const styles = await page.locator(".card-main:visible").first().evaluate((b) => {
    const pick = (n, keys) => Object.fromEntries(keys.map((k) => [k, getComputedStyle(n)[k]]));
    const keys = ["color", "fontFamily", "fontSize", "fontWeight", "fontStyle", "letterSpacing", "lineHeight", "textTransform", "textAlign", "display", "marginBottom"];
    return { category: pick(b.querySelector(".card-category"), keys), title: pick(b.querySelector(".card-title"), keys),
      body: getComputedStyle(b.querySelector(".card-body")).padding };
  });
  const MONO = '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  const SERIF = 'Newsreader, Georgia, "Times New Roman", serif';
  const wantStyles = {
    category: { color: "rgb(216, 169, 66)", fontFamily: MONO, fontSize: "10px", fontWeight: "500", fontStyle: "normal", letterSpacing: "1.4px",
      lineHeight: "16.5px", textTransform: "uppercase", textAlign: "start", display: "block", marginBottom: "6.4px" },
    title: { color: "rgb(236, 225, 207)", fontFamily: SERIF, fontSize: "22px", fontWeight: "500", fontStyle: "normal", letterSpacing: "normal",
      lineHeight: "26.4px", textTransform: "none", textAlign: "start", display: "block", marginBottom: "0px" },
    body: "16px 17.6px 0px",
  };
  check(JSON.stringify(styles) === JSON.stringify(wantStyles), tag(`category and title keep their computed styles (${JSON.stringify(styles)})`));

  // Hit-testing: the image, corners and body of a tile all land on its one button.
  const buttons = page.locator("#cat-all-sites + ul .card-main:visible");
  const card = page.locator("#cat-all-sites + ul .card:not([hidden])").first();
  await card.scrollIntoViewIfNeeded();
  const box = await card.boundingBox();
  const imgBox = await card.locator(".shot img").boundingBox();
  const hitAt = (x, y) => page.evaluate(([px, py]) =>
    document.elementFromPoint(px, py)?.closest(".card-main") === document.querySelector("#cat-all-sites + ul .card:not([hidden]) .card-main"), [x, y]);
  const hits = {
    image: await hitAt(imgBox.x + imgBox.width / 2, imgBox.y + imgBox.height / 2),
    topLeft: await hitAt(box.x + 3, box.y + 3),
    bottomRight: await hitAt(box.x + box.width - 3, box.y + box.height - 3),
    bottomLeft: await hitAt(box.x + 3, box.y + box.height - 3),
    body: await hitAt(box.x + box.width / 2, box.y + box.height * 0.85),
  };
  const misses = Object.entries(hits).filter(([, v]) => !v).map(([k]) => k);
  check(misses.length === 0, tag(`image, corners and body all hit the tile button${list(misses)}`));

  // Every one of the 55 tiles opens the one dialog with exactly its own data; closing returns focus to it.
  const wrongDetails = [];
  const count = await buttons.count();
  for (let i = 0; i < count; i++) {
    const b = buttons.nth(i);
    const s = siteOf(EXPECTED_ORDER.created[i]);
    await press(b);
    const problems = detailsProblems(await dialogState(page), s);
    await page.keyboard.press("Escape");
    if (await isOpen(page)) problems.push("Esc");
    if (!(await isFocused(b))) problems.push("focus-restore");
    if (problems.length) wrongDetails.push(`${s.name}: ${problems.join("/")}`);
  }
  check(count === EXPECTED_COUNT && wrongDetails.length === 0,
    tag(`all ${EXPECTED_COUNT} tiles open the dialog with their own title, categories, image, URL, repo, dates and capture date; Esc closes and refocuses the tile${list(wrongDetails)}`));
  await press(buttons.first());
  check(await page.$eval("#details-image", (img) => img.decode().then(() => img.naturalWidth === 1365 && img.naturalHeight === 900)),
    tag("the dialog image is the original 1365×900 preview"));
  await page.keyboard.press("Escape");

  // Real clicks on the screenshot and the tile background open it; the close button closes it.
  await buttons.first().locator(".shot img").click();
  check(await isOpen(page) && (await dialogState(page)).title === first.title, tag("clicking the screenshot opens the details dialog"));
  await page.click("#details-close");
  check(!(await isOpen(page)) && await isFocused(buttons.first()), tag("the Close details button closes the dialog and refocuses the tile"));
  await buttons.first().click({ position: { x: box.width - 4, y: box.height - 4 } });
  check(await isOpen(page), tag("clicking the tile background opens the details dialog"));
  check(await page.getByRole("dialog", { name: first.title, exact: true }).count() === 1 &&
    await page.getByRole("button", { name: "Close details", exact: true }).count() === 1 &&
    await page.getByRole("link", { name: "Visit website", exact: true }).count() === 1 &&
    await page.getByRole("link", { name: "GitHub repo", exact: true }).count() === 1,
    tag("dialog is named by the site title, with Close details, Visit website and GitHub repo controls"));

  // Clicking content stays open; a real backdrop click/tap closes.
  await page.click("#details-title");
  check(await isOpen(page), tag("clicking inside the dialog content does not close it"));
  if (touch) await page.touchscreen.tap(2, 2); else await page.mouse.click(2, 2);
  check(!(await isOpen(page)) && await isFocused(buttons.first()), tag("a backdrop click closes the dialog and refocuses the tile"));

  // Keyboard: Enter and Space open; focus is trapped in the dialog; the page behind is inert; "/" does nothing.
  await buttons.first().focus();
  await page.keyboard.press("Enter");
  check(await isOpen(page) && (await dialogState(page)).active === "details-close", tag("keyboard: Enter opens the dialog with focus on Close details"));
  await page.keyboard.press("Tab");
  const tab1 = await activeId(page);
  await page.keyboard.press("Tab");
  const tab2 = await activeId(page);
  check(tab1 === "details-site-link" && tab2 === "details-repo-link", tag(`keyboard: Tab moves through the dialog links (${tab1}, ${tab2})`));
  await page.keyboard.press("/");
  check(await isOpen(page) && await activeId(page) === "details-repo-link", tag("keyboard: “/” does not steal focus while the dialog is open"));
  const inert = await page.evaluate(() => {
    document.getElementById("filter").focus();
    const sort = document.getElementById("sort").getBoundingClientRect();
    const hit = document.elementFromPoint(sort.left + 5, sort.top + 5);
    return document.activeElement?.id !== "filter" && !hit?.closest("search, main");
  });
  check(inert, tag("the filters behind the open dialog cannot be focused or clicked"));
  await page.keyboard.press("Escape");
  check(!(await isOpen(page)) && await isFocused(buttons.first()), tag("keyboard: Esc closes and returns focus to the tile"));
  await buttons.nth(1).focus();
  await page.keyboard.press("Space");
  check(await isOpen(page) && (await dialogState(page)).title === siteOf(EXPECTED_ORDER.created[1]).title,
    tag("keyboard: Space opens the focused tile's dialog"));
  await page.keyboard.press("Escape");
  // Native Esc fires the dialog's `close` event (which restores focus) one task later; let it run before tabbing
  // (sub-millisecond, only reachable by automation).
  await page.waitForTimeout(50);
  const restored = await isFocused(buttons.nth(1));
  await page.keyboard.press("Tab");
  check(restored && await isFocused(buttons.nth(2)),
    tag(`keyboard: Tab goes from one tile straight to the next (now on ${await page.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? document.activeElement?.tagName)})`));

  // Background scroll is locked while open; closing keeps scroll position, sort, categories and search.
  await select.selectOption("category");
  await pickCategories(page, ["tech"]);
  await page.fill("#filter", "a");
  const shown = page.locator(".card-main:visible");
  const target = shown.nth(8);
  await target.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => [window.scrollY, document.getElementById("filter").value, document.getElementById("sort").value,
    document.getElementById("category-summary").textContent, document.querySelectorAll(".card:not([hidden])").length]);
  await press(target);
  await page.mouse.wheel(0, 800);
  await page.waitForTimeout(300);
  const during = await dialogState(page);
  await page.click("#details-close");
  const after = await page.evaluate(() => [window.scrollY, document.getElementById("filter").value, document.getElementById("sort").value,
    document.getElementById("category-summary").textContent, document.querySelectorAll(".card:not([hidden])").length]);
  check(before[0] > 0 && during.open && during.scrollY === before[0] && JSON.stringify(after) === JSON.stringify(before) && await isFocused(target),
    tag(`background does not scroll while open; closing keeps scroll, sort, category, search and refocuses the tile (${before} → ${during.scrollY} → ${after})`));

  // The dialog scrolls on its own so the bottom link is reachable on small screens.
  await press(target);
  const reach = await page.evaluate(() => {
    const d = document.getElementById("site-details");
    const scroll = d.querySelector(".details-scroll");
    scroll.scrollTop = scroll.scrollHeight;
    const link = document.getElementById("details-repo-link").getBoundingClientRect();
    const close = document.getElementById("details-close").getBoundingClientRect();
    return link.bottom <= innerHeight && link.top >= 0 && close.top >= 0 && close.bottom <= innerHeight;
  });
  check(reach, tag("with the dialog scrolled to the end, its links and close button stay on screen"));
  await page.keyboard.press("Escape");
  await page.fill("#filter", "");
  await pickCategories(page, []);
  await select.selectOption("created");

  // The dialog links are ordinary links that navigate (answered locally by the route handler).
  const goAndBack = async (id, target) => {
    await press(buttons.first());
    await Promise.all([page.waitForURL(target), page.click(id)]);
    const ok = page.url() === target;
    await page.goBack();
    await page.waitForSelector(".card");
    if (await isOpen(page)) await page.keyboard.press("Escape");
    return ok;
  };
  check(await goAndBack("#details-site-link", first.url), tag("Visit website navigates to the site"));
  check(await goAndBack("#details-repo-link", first.repository), tag("GitHub repo navigates to the repository"));
}

async function exercise(page, label) {
  const tag = (m) => `[${label}] ${m}`;
  await page.waitForSelector(".card");
  const select = page.getByLabel("Sort by", { exact: true });
  check(await select.evaluate((n) => n.id) === "sort" && await select.inputValue() === "created",
    tag("Sort by select is labelled and defaults to Recently created"));
  check(JSON.stringify(await page.$$eval("#sort option", (o) => o.map((x) => [x.value, x.textContent]))) === JSON.stringify(SORT_OPTIONS),
    tag("sort options render in order"));
  await minimalHeaderAndFields(page, tag);

  // Default view, before touching anything: created_at descending.
  const initial = await visibleCards(page);
  check(JSON.stringify(initial.map((c) => c[1])) === JSON.stringify(EXPECTED_ORDER.created) && isDescending(initial.map((c) => siteOf(c[1])?.createdAt)),
    tag("default load shows all sites by repository created_at, newest first"));
  check(JSON.stringify(EXPECTED_ORDER.created) !== JSON.stringify(EXPECTED_ORDER.updated),
    tag("created and updated orders differ, so the default-order check is meaningful"));
  check(await page.$eval(".gallery", (g) => g.dataset.sort) === "created", tag("gallery records the created sort by default"));
  const eager = await page.$$eval("#cat-all-sites + ul img", (imgs) => imgs.slice(0, 4).map((i) => i.loading));
  check(eager.join() === "eager,eager,eager,lazy", tag(`the first three cards in the default order load eagerly (${eager.join()})`));

  for (const mode of ["updated", "created"]) {
    await select.selectOption(mode);
    const cards = await visibleCards(page);
    const key = mode === "updated" ? "updatedAt" : "createdAt";
    check(cards.length === EXPECTED_COUNT && uniqueNames(cards).length === EXPECTED_COUNT && cards.every((c) => c[0] === "cat-all-sites"),
      tag(`${mode}: one All sites section with ${EXPECTED_COUNT} unique cards (found ${cards.length})`));
    check(JSON.stringify(cards.map((c) => c[1])) === JSON.stringify(EXPECTED_ORDER[mode]),
      tag(`${mode}: global order matches descending ${key} with tie-breakers`));
    check(isDescending(cards.map((c) => siteOf(c[1])?.[key])), tag(`${mode}: the shown sites' ${key} values are globally descending`));
    const wrongMeta = cards.filter(([, name, cat]) => cat !== categoryTextOf(siteOf(name))).map((c) => c[1]);
    check(wrongMeta.length === 0, tag(`${mode}: every card shows its primary/secondary categories${list(wrongMeta)}`));
    const wrongAlt = cards.filter(([, name, , alt]) => {
      const s = siteOf(name);
      return alt !== `Preview screenshot of ${s.title} (${s.name}), captured ${LONG_DATE[s.screenshotCapturedOn]}`;
    }).map((c) => c[1]);
    check(wrongAlt.length === 0, tag(`${mode}: every card's screenshot alt names its own preview capture date${list(wrongAlt)}`));
  }

  await select.selectOption("category");
  const grouped = await visibleCards(page);
  const sectionIds = [...new Set(grouped.map((c) => c[0]))];
  check(JSON.stringify(sectionIds) === JSON.stringify(EXPECTED_CATEGORIES.map(([id]) => `cat-${id}`)),
    tag("category: the 7 category sections appear in their original order"));
  const badGroups = EXPECTED_CATEGORIES.filter(([id]) =>
    JSON.stringify(grouped.filter((c) => c[0] === `cat-${id}`).map((c) => c[1])) !== JSON.stringify(membersOf(id))).map(([id]) => id);
  check(badGroups.length === 0, tag(`category: each section lists exactly its primary + secondary members in source order${list(badGroups)}`));
  check(grouped.length === EXPECTED_COUNT + SECONDARY_COUNT && uniqueNames(grouped).length === EXPECTED_COUNT,
    tag(`category: ${EXPECTED_COUNT + SECONDARY_COUNT} cards, ${EXPECTED_COUNT} unique sites`));

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
      (await page.textContent("#category-summary")) === "Personal & Portfolio" &&
      (await page.innerText("#category-summary")) === "PERSONAL & PORTFOLIO",
      tag(`${mode}: Personal checkbox shows its ${want.length} members${mode === "category" ? "" : " in global sort order"}`));

    await pickCategories(page, ["games", "faith"]);
    cards = await visibleCards(page);
    const both = sites.filter((s) => isMember(s, "games") || isMember(s, "faith")).map((s) => s.name);
    const wantBoth = mode === "category" ? [...membersOf("faith"), ...membersOf("games")] : EXPECTED_ORDER[mode].filter((n) => both.includes(n));
    check(JSON.stringify(cards.map((c) => c[1])) === JSON.stringify(wantBoth) &&
      (await page.textContent("#category-summary")) === "2 categories",
      tag(`${mode}: two checked categories show the union (${both.length}) in ${mode === "category" ? "section" : "global sort"} order`));

    await page.fill("#filter", "tetris");
    cards = await visibleCards(page);
    const tetris = (mode === "category" ? membersOf("games") : EXPECTED_ORDER[mode]).filter((n) => n.startsWith("tetris-"));
    check(JSON.stringify(cards.map((c) => c[1])) === JSON.stringify(tetris),
      tag(`${mode}: search + categories → the 3 Tetris builds, still in sort order`));

    await pickCategories(page, ["personal"]);
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
  const quartzHits = sites.filter((s) => /quartz/i.test(`${s.name} ${s.title}`)).length;
  check(await activeId(page) === "filter" && quartzHits === 3 && uniqueNames(await visibleCards(page)).length === quartzHits,
    tag(`keyboard: “/” focuses search (“quartz” finds ${quartzHits} sites)`));
  await page.keyboard.press("Escape");
  check(await page.inputValue("#filter") === "" && uniqueNames(await visibleCards(page)).length === EXPECTED_COUNT,
    tag("keyboard: Esc clears the search"));

  await exerciseTiles(page, tag);

  // Layout: controls share one row on desktop and stack on phones. No horizontal overflow in any mode.
  const tops = await page.$$eval(".search-field, #category-toggle, .sort-field", (n) => n.map((x) => Math.round(x.getBoundingClientRect().top)));
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
  // The tied created_at must be newer than every real createdAt (latest: inside-neural-engine, 2026-10-30T02:52:50Z).
  set("tetris-unicode", "2026-10-30T03:00:00Z", "2026-10-30T03:00:30Z");
  set("quotes", "2026-10-30T03:00:00Z", "2026-10-30T03:00:20Z");
  set("art", "2026-10-30T03:00:00Z", "2026-10-30T03:00:00Z");
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
      ["phone-390", { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }],
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
