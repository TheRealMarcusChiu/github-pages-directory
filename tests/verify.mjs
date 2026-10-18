// Dependency-free checks for the static directory. Run: node tests/verify.mjs
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const EXPECTED_COUNT = 44;
const OWNER = "TheRealMarcusChiu";

let failures = 0;
function check(ok, message) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${message}`);
  if (!ok) failures++;
}
const read = (p) => readFileSync(join(ROOT, p), "utf8");

// Required files
const required = ["index.html", "assets/styles.css", "assets/app.js", "data/sites.json", "README.md"];
for (const file of required) check(existsSync(join(ROOT, file)), `file exists: ${file}`);
if (failures) process.exit(1);

// Data
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
check(data.snapshotDate === "2026-10-18", "snapshotDate is 2026-10-18");

const names = sites.map((s) => s.name);
const urls = sites.map((s) => s.url);
const repos = sites.map((s) => s.repository);
check(new Set(names).size === names.length, "names are unique");
check(new Set(urls).size === urls.length, "Pages URLs are unique");
check(new Set(repos).size === repos.length, "repository URLs are unique");
check(sites.every((s) => typeof s.name === "string" && /^[A-Za-z0-9._-]+$/.test(s.name)), "names are valid repository names");

const isHttps = (u) => { try { return new URL(u).protocol === "https:"; } catch { return false; } };
const badLinks = sites.flatMap((s) => [s.url, s.repository]).filter((u) => !isHttps(u));
check(badLinks.length === 0, `all links use HTTPS${badLinks.length ? ` (bad: ${badLinks.join(", ")})` : ""}`);

const wrongRepo = sites.filter((s) => s.repository !== `https://github.com/${OWNER}/${s.name}`);
check(wrongRepo.length === 0, `repository URLs match https://github.com/${OWNER}/<repo>${wrongRepo.length ? ` (bad: ${wrongRepo.map((s) => s.name).join(", ")})` : ""}`);

check(!names.some((n) => n.toLowerCase() === "github-pages-directory"), "no github-pages-directory entry");
check(names.includes("therealmarcuschiu.github.io"), "account homepage repository is present");

// HTML / assets
const html = read("index.html");
check(/<html[^>]*\blang="en"/.test(html), "index.html declares lang");
check(/<meta name="viewport"/.test(html), "index.html has viewport meta");
check(/<h1[\s>]/.test(html), "index.html has an h1");
check(/<main[\s>]/.test(html), "index.html has a main landmark");
check(/<label for="filter">/.test(html) && /<input id="filter" type="search"/.test(html), "search input has an associated label");
check(/role="status"/.test(html), "result count uses a live status region");
check(html.includes('href="assets/styles.css"'), "stylesheet linked with a relative path");
check(html.includes('src="assets/app.js"'), "script linked with a relative path");
check(/2026-10-18/.test(html) && /not automatically synced/i.test(html), "snapshot caveat shown in the UI");

const sources = { "index.html": html, "assets/styles.css": read("assets/styles.css"), "assets/app.js": read("assets/app.js") };
const remoteRef = /(?:src|href)\s*=\s*["'](?:https?:)?\/\/|@import|url\(\s*["']?(?:https?:)?\/\//i;
for (const [file, text] of Object.entries(sources)) {
  check(!remoteRef.test(text), `${file} loads no remote assets`);
  check(!/(?:src|href)\s*=\s*["']\/(?!\/)/.test(text), `${file} uses no root-absolute asset paths`);
}
const js = sources["assets/app.js"];
check(!/innerHTML|outerHTML|insertAdjacentHTML|document\.write/.test(js), "app.js inserts text safely (no HTML injection APIs)");
check(/new URL\("data\/sites\.json", document\.baseURI\)/.test(js), "app.js loads data relative to the page");
check(/prefers-reduced-motion/.test(sources["assets/styles.css"]), "styles respect prefers-reduced-motion");
check(/:focus-visible/.test(sources["assets/styles.css"]), "styles define visible focus states");

console.log(failures ? `\n${failures} check(s) failed.` : "\nAll checks passed.");
process.exit(failures ? 1 : 0);
