#!/usr/bin/env node
// Real-browser proof of the compact tile -> #site-details dialog contract, run against a served site.
// Usage: node tests/tile-details.browser.cjs BASEURL OUTDIR   (PLAYWRIGHT_MODULE overrides the Playwright path)
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "/root/projects/bandwidth-compare/node_modules/playwright");

const [baseArg, outDir] = process.argv.slice(2);
if (!baseArg || !outDir) {
  console.error("usage: node tests/tile-details.browser.cjs BASEURL OUTDIR");
  process.exit(2);
}
const BASE = new URL(baseArg.endsWith("/") ? baseArg : `${baseArg}/`).href;
const CONTEXTS = [
  { name: "desktop", viewport: { width: 1365, height: 900 } },
  { name: "tablet", viewport: { width: 768, height: 1024 } },
  { name: "phone", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  { name: "smallphone", viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true },
  { name: "phone-reduced-motion", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" },
];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const longDate = (ymd) => { const [y, m, d] = ymd.split("-"); return `${Number(d)} ${MONTHS[m - 1]} ${y}`; };
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const results = [];

async function step(name, fn) {
  try {
    await fn();
    results.push({ step: name, ok: true });
    console.log(`PASS ${name}`);
    return true;
  } catch (err) {
    const error = String(err?.message ?? err).split("\n").slice(0, 3).join(" | ");
    results.push({ step: name, ok: false, error });
    console.log(`FAIL ${name}: ${error}`);
    return false;
  }
}

// Source-derived expectations: category text mirrors the existing "Primary · also Secondary" label.
function expectations(data) {
  const labels = new Map(data.categories.map((c) => [c.id, c.label]));
  const sites = data.sites.filter((s) => labels.has(s.category)).map((site, index) => {
    const extra = (Array.isArray(site.alsoIn) ? site.alsoIn : []).filter((id) => id !== site.category && labels.has(id));
    const category = extra.length ? `${labels.get(site.category)} · also ${extra.map((id) => labels.get(id)).join(", ")}` : labels.get(site.category);
    return { ...site, index, categoryText: category };
  });
  const created = [...sites].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) ||
    (a.name < b.name ? -1 : a.name > b.name ? 1 : 0) || a.index - b.index);
  return { sites, created };
}

// Everything the dialog shows, read from the live DOM.
const readDetails = (page) => page.evaluate(() => {
  const d = document.getElementById("site-details");
  const q = (s) => d?.querySelector(s);
  const t = (s) => q(s)?.textContent.replace(/\s+/g, " ").trim() ?? null;
  const cap = q("#details-capture");
  const capTime = cap?.matches("time") ? cap : cap?.querySelector("time");
  return {
    open: !!d?.open, modal: !!d?.matches(":modal"),
    title: t("#details-title"), category: t("#details-category"), name: t("#details-repo-name"), host: t("#details-host"),
    siteHref: q("#details-site-link")?.getAttribute("href"), siteText: t("#details-site-link"), siteTag: q("#details-site-link")?.tagName,
    repoHref: q("#details-repo-link")?.getAttribute("href"), repoTag: q("#details-repo-link")?.tagName,
    img: q("#details-image")?.src, alt: q("#details-image")?.alt,
    dates: [...(q("#details-dates")?.querySelectorAll("time") ?? [])].map((n) => [n.getAttribute("datetime"), n.textContent.trim()]),
    datesText: t("#details-dates"), capture: capTime?.getAttribute("datetime"), captureText: cap?.textContent ?? "",
    text: d?.textContent ?? "",
  };
});

function assertDetails(got, site) {
  assert.ok(got.open && got.modal, `${site.name}: dialog not open as modal`);
  assert.equal(got.title, site.title);
  assert.equal(got.category, site.categoryText);
  assert.equal(got.name, site.name);
  assert.ok(got.host?.includes(new URL(site.url).hostname), `${site.name}: host ${got.host}`);
  assert.equal(got.siteTag, "A");
  assert.equal(got.siteHref, site.url);
  assert.match(got.siteHref, /^https:\/\//);
  assert.match(got.siteText, /Visit website/i);
  assert.equal(got.repoTag, "A");
  assert.equal(got.repoHref, site.repository);
  assert.match(got.repoHref, /^https:\/\//);
  assert.equal(got.img, new URL(site.screenshot, BASE).href);
  assert.ok(got.alt?.includes(site.title), `${site.name}: alt "${got.alt}"`);
  for (const iso of [site.createdAt, site.updatedAt]) {
    assert.ok(got.dates.some(([dt, txt]) => dt === iso && txt), `${site.name}: missing <time datetime=${iso}>`);
  }
  assert.match(got.datesText, /repo/i, "repository dates must be labelled as repository dates");
  assert.equal(got.capture, site.screenshotCapturedOn);
  assert.ok(got.captureText.includes(longDate(site.screenshotCapturedOn)), `${site.name}: capture text`);
  assert.match(got.text, /preview/i, "static preview distinction missing");
}

async function journey(browser, spec, exp) {
  const ctx = await browser.newContext({ viewport: spec.viewport, isMobile: spec.isMobile, hasTouch: spec.hasTouch,
    reducedMotion: spec.reducedMotion, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const problems = [];
  page.on("console", (m) => m.type() === "error" && problems.push(`console: ${m.text()}`));
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  page.on("requestfailed", (r) => problems.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`));
  page.on("response", (r) => r.status() >= 400 && problems.push(`HTTP ${r.status()}: ${r.url()}`));
  const n = spec.name;
  const dialog = page.locator("#site-details");
  const scoped = (scope, site) => page.locator(`${scope} .card-main:visible`)
    .filter({ has: page.locator(".card-title", { hasText: new RegExp(`^\\s*${esc(site.title)}\\s*$`) }) });
  const all = (site) => scoped('section[aria-labelledby="cat-all-sites"]', site);
  const isOpen = () => dialog.evaluate((d) => d.open);
  // Poll until fonts are ready and the dialog box is unchanged across two frames (no fixed sleeps).
  const settle = () => page.waitForFunction(() => document.fonts.ready.then(() => new Promise((r) => {
    const box = () => JSON.stringify(document.getElementById("site-details")?.getBoundingClientRect());
    const a = box();
    requestAnimationFrame(() => requestAnimationFrame(() => r(box() === a)));
  })));
  const waitOpen = async (want) => { await page.waitForFunction((w) => document.getElementById("site-details")?.open === w, want, { timeout: 3000 }); };
  async function open(trig, how = "click", opts) {
    const url = page.url();
    if (how === "tap") await trig.tap(opts); else await trig.click(opts);
    await waitOpen(true);
    assert.equal(page.url(), url, "opening must not navigate");
    if (spec.reducedMotion) assert.equal(await page.evaluate(() => document.getAnimations().filter((a) => a.playState === "running").length), 0, "animation under reduced motion");
    await settle();
  }
  async function closeVia(how, trig) {
    if (how === "esc") await page.keyboard.press("Escape");
    if (how === "button") await page.locator("#details-close").click();
    if (how === "backdrop") {
      const pt = await dialog.evaluate((d) => {
        const r = d.getBoundingClientRect(), W = innerWidth, H = innerHeight;
        return [[4, 4], [W - 4, 4], [4, H - 4], [W - 4, H - 4], [W / 2, 4], [W / 2, H - 4], [4, H / 2], [W - 4, H / 2]]
          .find(([x, y]) => x < r.left || x > r.right || y < r.top || y > r.bottom);
      });
      assert.ok(pt, "no backdrop area outside the dialog panel to click");
      await page.mouse.click(pt[0], pt[1]);
    }
    await waitOpen(false);
    if (trig) assert.ok(await trig.evaluate((el) => document.activeElement === el), "focus not restored to the origin button");
  }
  const scroller = exp.created[19]; // below the fold at every width, so scrollY restoration is meaningful

  try {
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.waitForFunction((want) => [...document.querySelectorAll(".card-main")].filter((e) => e.checkVisibility()).length === want,
      exp.sites.length, { timeout: 15000 }).catch(() => {});
    await page.evaluate(() => document.fonts.ready);

    const ready = await step(`${n}: collapsed tiles are image+category+title buttons in created order, one closed dialog`, async () => {
      const tiles = await page.evaluate(() => [...document.querySelectorAll(".card")].filter((c) => c.checkVisibility()).map((card) => {
        const main = card.querySelector(".card-main");
        const body = card.querySelector(".card-body");
        const ids = main?.getAttribute("aria-labelledby");
        return {
          tag: main?.tagName, type: main?.getAttribute("type"), popup: main?.getAttribute("aria-haspopup"), controls: main?.getAttribute("aria-controls"),
          name: ids ? ids.split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? "").join(" ") : main?.getAttribute("aria-label") ?? main?.textContent,
          img: !!card.querySelector(".card-main .shot img"), category: card.querySelector(".card-category")?.textContent, title: card.querySelector(".card-title")?.textContent,
          forbidden: card.querySelectorAll(".card-slug,.card-dates,.card-capture,.card-repo,a").length,
          // Visible boxes in the body other than category/title (visually-hidden text is 1px and allowed).
          extra: [...(body?.querySelectorAll("*") ?? [])].filter((x) => !x.closest(".card-category,.card-title") &&
            x.getBoundingClientRect().width > 1 && x.getBoundingClientRect().height > 1).map((x) => x.className || x.tagName),
        };
      }));
      assert.deepEqual(tiles.map((t) => t.title), exp.created.map((s) => s.title), "visible tiles/order differ from source created order");
      tiles.forEach((t, i) => {
        const s = exp.created[i];
        const trigger = [t.tag, t.type, t.popup, t.controls];
        assert.deepEqual(trigger, ["BUTTON", "button", "dialog", "site-details"], `${s.name} trigger ${JSON.stringify(trigger)}`);
        assert.ok(t.name?.includes(s.title), `${s.name}: accessible name "${t.name}"`);
        assert.ok(t.img, `${s.name}: missing .shot img`);
        assert.equal(t.category, s.categoryText);
        assert.equal(t.forbidden, 0, `${s.name}: collapsed metadata/anchors present`);
        assert.deepEqual(t.extra, [], `${s.name}: extra visible body content`);
      });
      const dlg = await page.evaluate(() => ({ count: document.querySelectorAll("#site-details").length,
        tag: document.getElementById("site-details")?.tagName, open: document.getElementById("site-details")?.open,
        labelledby: document.getElementById("site-details")?.getAttribute("aria-labelledby") }));
      assert.deepEqual(dlg, { count: 1, tag: "DIALOG", open: false, labelledby: "details-title" });
    });
    if (!ready) throw new Error("contract DOM missing; remaining steps not runnable");

    if (n === "desktop" || n === "phone") {
      await step(`${n}: collapsed screenshot`, async () => {
        await page.evaluate(() => scrollTo(0, 0));
        await page.waitForFunction(() => [...document.querySelectorAll(".card-main:not([hidden]) img")].slice(0, 3).every((i) => i.complete && i.naturalWidth));
        await settle();
        await page.screenshot({ path: path.join(outDir, `${n}-collapsed.png`) });
      });
    }

    if (n === "desktop") {
      await step(`${n}: every source record opens with matching details, full image, and closes`, async () => {
        for (const site of exp.created) {
          const trig = all(site);
          assert.equal(await trig.count(), 1, `${site.title}: expected one visible trigger`);
          await open(trig);
          assertDetails(await readDetails(page), site);
          await page.waitForFunction(() => { const i = document.getElementById("details-image"); return i.complete && i.naturalWidth === 1365 && i.naturalHeight === 900; },
            null, { timeout: 10000 });
          await closeVia("button", trig);
        }
      });
    }

    await step(`${n}: image/title/category/padding clicks open the same card without navigating`, async () => {
      const trig = all(scroller);
      const targets = [trig.locator(".shot img"), trig.locator(".card-title"), trig.locator(".card-category"), trig];
      for (const [i, target] of targets.entries()) {
        const box = i === 3 ? await trig.boundingBox() : null;
        await open(target, "click", box ? { position: { x: box.width / 2, y: box.height - 4 } } : undefined);
        assertDetails(await readDetails(page), scroller);
        await closeVia("esc", trig);
      }
    });

    await step(`${n}: dialog fits, header/close/links reachable, no overflow (long title and URL)`, async () => {
      const longest = (k) => [...exp.sites].sort((a, b) => b[k].length - a[k].length)[0];
      for (const site of [longest("title"), longest("url")]) {
        const trig = all(site);
        await open(trig);
        const geo = await page.evaluate(() => {
          const d = document.getElementById("site-details"), W = document.documentElement.clientWidth;
          const close = document.getElementById("details-close").getBoundingClientRect();
          const wide = [d, ...d.querySelectorAll("*")].filter((x) => x.checkVisibility() && x.getBoundingClientRect().width > 1 && (x.getBoundingClientRect().left < -1 ||
            x.getBoundingClientRect().right > W + 1 || x.scrollWidth > x.clientWidth + 1 && getComputedStyle(x).overflowX !== "visible" && x.clientWidth));
          return { pageOver: document.documentElement.scrollWidth - W, wide: wide.map((x) => x.id || x.className || x.tagName),
            dialogW: d.getBoundingClientRect().width, close: [close.width, close.height, close.top >= 0 && close.bottom <= innerHeight],
            closeName: document.getElementById("details-close").getAttribute("aria-label") ?? document.getElementById("details-close").textContent.trim(),
            closeType: document.getElementById("details-close").getAttribute("type"), titleVisible: document.getElementById("details-title").checkVisibility() };
        });
        assert.ok(geo.pageOver <= 0, `page overflows by ${geo.pageOver}px`);
        assert.deepEqual(geo.wide, [], "dialog panel content overflows horizontally");
        assert.ok(geo.close[0] >= 44 && geo.close[1] >= 44 && geo.close[2], `close button ${geo.close}`);
        assert.equal(geo.closeName, "Close details");
        assert.equal(geo.closeType, "button");
        assert.ok(geo.titleVisible, "dialog header title hidden");
        if (n === "desktop") assert.ok(geo.dialogW > (await trig.boundingBox()).width, "dialog not larger than compact tile");
        for (const sel of ["#details-site-link", "#details-repo-link", "#details-close"]) {
          const loc = page.locator(sel);
          await loc.scrollIntoViewIfNeeded();
          const b = await loc.boundingBox();
          assert.ok(b && b.y >= 0 && b.y + b.height <= spec.viewport.height + 1, `${sel} not reachable in viewport`);
        }
        await closeVia("button", trig);
      }
    });

    await step(`${n}: inside clicks stay open; Close/Esc/backdrop close; focus trapped and restored; scroll locked`, async () => {
      const trig = all(scroller);
      for (const how of ["button", "esc", "backdrop"]) {
        await trig.scrollIntoViewIfNeeded();
        const y = await page.evaluate(() => scrollY);
        assert.ok(y > 0, "scroller tile should sit below the fold");
        await open(trig, spec.hasTouch && how === "backdrop" ? "tap" : "click");
        assert.equal(await page.evaluate(() => scrollY), y, "opening jumped the page");
        await page.locator("#details-title").click();
        await page.locator("#details-dates").click();
        assert.ok(await isOpen(), "click inside dialog closed it");
        if (how === "button") {
          assert.ok(await page.evaluate(() => document.getElementById("site-details").contains(document.activeElement)), "initial focus outside dialog");
          const leaks = [];
          for (const key of [...Array(12).fill("Tab"), ...Array(12).fill("Shift+Tab")]) {
            await page.keyboard.press(key);
            const where = await page.evaluate(() => document.getElementById("site-details").contains(document.activeElement) ||
              document.activeElement === document.body ? null : document.activeElement.id || document.activeElement.className);
            if (where !== null) leaks.push(`${key}->${where}`);
          }
          assert.deepEqual(leaks, [], "focus escaped the modal");
          await page.locator("#details-close").focus();
          await page.keyboard.press("/");
          assert.ok(await isOpen(), "/ closed the dialog");
          assert.notEqual(await page.evaluate(() => document.activeElement?.id), "filter", "/ stole focus to the inert filter");
          const bg = await page.evaluate(() => ({ modal: document.getElementById("site-details").matches(":modal"),
            hidden: !!document.getElementById("site-details").parentElement.closest("[aria-hidden=true]") }));
          assert.deepEqual(bg, { modal: true, hidden: false }, "background must be native-modal inert, not aria-hidden");
        }
        if (!spec.isMobile) {
          await page.mouse.move(spec.viewport.width / 2, spec.viewport.height / 2);
          await page.mouse.wheel(0, 600);
          await page.waitForFunction(() => new Promise((r) => requestAnimationFrame(() => r(true))));
          assert.equal(await page.evaluate(() => scrollY), y, "background scrolled while modal open");
        }
        await closeVia(how, trig);
        assert.equal(await page.evaluate(() => scrollY), y, `scrollY changed after ${how} close`);
      }
      for (const key of ["Enter", "Space"]) {
        await trig.focus();
        await page.keyboard.press(key);
        await waitOpen(true);
        assertDetails(await readDetails(page), scroller);
        await closeVia("esc", trig);
      }
    });

    await step(`${n}: reopening another site fully replaces details`, async () => {
      const [a, b] = [exp.created[0], exp.created.at(-1)];
      await open(all(a));
      assertDetails(await readDetails(page), a);
      await closeVia("esc", all(a));
      await open(all(b), spec.hasTouch ? "tap" : "click");
      const got = await readDetails(page);
      assertDetails(got, b);
      for (const stale of [a.url, a.repository, a.createdAt, a.updatedAt, a.title]) {
        assert.ok(![got.siteHref, got.repoHref, got.title, ...got.dates.map((d) => d[0])].includes(stale), `stale ${stale}`);
      }
      await closeVia("button", all(b));
    });

    if (n === "desktop" || n === "phone") {
      await step(`${n}: expanded screenshot`, async () => {
        const site = exp.created[0];
        await open(all(site));
        await page.waitForFunction(() => { const i = document.getElementById("details-image"); return i.complete && i.naturalWidth > 0; }, null, { timeout: 10000 });
        await settle();
        await page.screenshot({ path: path.join(outDir, `${n}-expanded.png`) });
        await closeVia("esc", all(site));
      });
    }

    await step(`${n}: category sort secondary Personal entries open with correct labels, then all sites return`, async () => {
      await page.selectOption("#sort", "category");
      const secondary = exp.sites.filter((s) => (s.alsoIn ?? []).includes("personal") && s.category !== "personal");
      assert.ok(secondary.length >= 2, "expected the Art/Personal secondary entries in source");
      for (const site of secondary) {
        const trig = scoped('section[aria-labelledby="cat-personal"]', site);
        assert.equal(await trig.count(), 1, `${site.title} not visible once under Personal`);
        await open(trig);
        assertDetails(await readDetails(page), site);
        await closeVia("esc", trig);
      }
      await page.selectOption("#sort", "created");
      assert.equal(await page.locator(".card-main:visible").count(), exp.sites.length);
    });

    await step(`${n}: query/category/sort/scrollY preserved after close`, async () => {
      const site = exp.created[5];
      const word = site.title.split(/\s+/).find((w) => w.length >= 3) ?? site.title;
      await page.fill("#filter", word);
      await page.selectOption("#sort", "updated");
      await page.locator("#category-toggle").click();
      await page.locator(`#category-options input[value="${site.category}"]`).check();
      await page.keyboard.press("Escape");
      const snap = () => page.evaluate(() => ({ q: document.getElementById("filter").value, sort: document.getElementById("sort").value,
        cats: [...document.querySelectorAll("#category-options input:checked")].map((b) => b.value), summary: document.getElementById("category-summary").textContent,
        visible: [...document.querySelectorAll(".card-main")].filter((e) => e.checkVisibility()).map((e) => e.querySelector(".card-title")?.textContent),
        y: scrollY }));
      const trig = all(site);
      await trig.scrollIntoViewIfNeeded();
      const before = await snap();
      assert.ok(before.visible.includes(site.title), "filtered view lost the target site");
      await open(trig);
      await closeVia("esc", trig);
      assert.deepEqual(await snap(), before);
    });

    await step(`${n}: no console errors, page errors or failed resources`, () => assert.deepEqual(problems, []));
  } catch (err) {
    results.push({ step: `${n}: remaining steps`, ok: false, error: `skipped: ${err.message}` });
    console.log(`FAIL ${n}: remaining steps skipped: ${err.message}`);
    if (problems.length) results.push({ step: `${n}: browser problems`, ok: false, error: problems.slice(0, 5).join(" | ") });
  } finally {
    await ctx.close();
  }
}

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  let browser;
  try {
    const res = await fetch(new URL("data/sites.json", BASE));
    assert.ok(res.ok, `data/sites.json HTTP ${res.status}`);
    const exp = expectations(await res.json());
    browser = await chromium.launch();
    for (const spec of CONTEXTS) await journey(browser, spec, exp);
  } catch (err) {
    results.push({ step: "setup", ok: false, error: String(err?.message ?? err) });
    console.log(`FAIL setup: ${err?.message ?? err}`);
  } finally {
    await browser?.close();
  }
  const failed = results.filter((r) => !r.ok);
  const report = { base: BASE, passed: results.length - failed.length, failed: failed.length, results };
  fs.writeFileSync(path.join(outDir, "tile-details-report.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ base: BASE, passed: report.passed, failed: report.failed, failures: failed.map((f) => f.step) }));
  process.exit(failed.length || !results.length ? 1 : 0);
})();
