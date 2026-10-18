"use strict";

(() => {
  const HOMEPAGE_REPO = "therealmarcuschiu.github.io";
  const DATA_URL = new URL("data/sites.json", document.baseURI);
  const SCREENSHOT_PATH = /^assets\/previews\/[A-Za-z0-9._-]+\.webp$/;
  const ALL = "all";
  // Repository dates are GitHub API ISO 8601 UTC timestamps (repo metadata, not page-content dates).
  const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
  const SORTS = {
    updated: { key: "updatedAt", then: "createdAt", phrase: "most recently updated repository first" },
    created: { key: "createdAt", then: "updatedAt", phrase: "most recently created repository first" },
    category: { phrase: "grouped by category" },
  };
  const DEFAULT_SORT = "updated";
  // Only the first gallery row loads eagerly; everything below the fold stays lazy.
  const EAGER_IMAGES = 3;

  const gallery = document.getElementById("gallery");
  const input = document.getElementById("filter");
  const chipsBox = document.getElementById("chips");
  const status = document.getElementById("result-status");
  const empty = document.getElementById("empty");
  const emptyDetail = document.getElementById("empty-detail");
  const clearSearch = document.getElementById("clear-search");
  const showAll = document.getElementById("show-all");
  const sortSelect = document.getElementById("sort");

  let sections = [];
  // Recent sorts show every unique site once, in one "All sites" section.
  let allSection = null;
  let orders = {};
  let sortMode = DEFAULT_SORT;
  let chips = [];
  let total = 0;
  let activeCategory = ALL;
  let statusTimer = 0;
  let shotCount = 0;

  const plural = (n, word, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;
  // Fold case and punctuation so "var log" finds "/var/log" and "var-log-1".
  const normalize = (s) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim();
  const displayUrl = (url) => url.replace(/^https:\/\//, "").replace(/\/$/, "");
  const isHttps = (u) => { try { return new URL(u).protocol === "https:"; } catch { return false; } };
  // Secondary memberships: optional `alsoIn` list of extra category ids (primary stays `category`).
  const alsoIn = (site) => (Array.isArray(site.alsoIn) ? site.alsoIn.filter((id) => id !== site.category) : []);
  const isMember = (site, id) => site.category === id || alsoIn(site).includes(id);
  const stamp = (site, key) => (ISO_UTC.test(site[key] ?? "") ? Date.parse(site[key]) : -Infinity);

  // Newest first, then the other date, then repo name, then source order — on a copy, never in place.
  function sortedBy({ key, then }, entries) {
    return [...entries].sort((a, b) =>
      b.time[key] - a.time[key] ||
      b.time[then] - a.time[then] ||
      (a.site.name < b.site.name ? -1 : a.site.name > b.site.name ? 1 : 0) ||
      a.index - b.index);
  }

  function el(tag, props = {}, children = []) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
      if (key === "text") node.textContent = value;
      else if (key === "class") node.className = value;
      else node.setAttribute(key, value);
    }
    for (const child of children) node.append(child);
    return node;
  }

  function renderDates(site) {
    const parts = [["createdAt", "created"], ["updatedAt", "updated"]].filter(([key]) => ISO_UTC.test(site[key] ?? ""));
    if (!parts.length) return null;
    const p = el("p", { class: "card-dates" }, [el("span", { class: "card-dates-label", text: "Repo" })]);
    parts.forEach(([key, word], i) => {
      if (i) p.append(el("span", { class: "card-dates-sep", "aria-hidden": "true", text: " ·" }));
      p.append(" ", el("span", { class: `card-date date-${word}` }, [
        `${word} `,
        el("time", { datetime: site[key], title: `GitHub repository ${word}: ${site[key]}`, text: site[key].slice(0, 10) }),
      ]));
    });
    return p;
  }

  function renderCard(site, category, labels) {
    const isHome = site.name === HOMEPAGE_REPO;
    // Always lead with the primary category, then any secondary ones.
    const memberLabels = [site.category, ...alsoIn(site)].map((id) => labels.get(id)).filter(Boolean);
    const categoryText = memberLabels.length > 1
      ? `${memberLabels[0]} · also ${memberLabels.slice(1).join(", ")}`
      : category.label;
    const children = [];

    if (SCREENSHOT_PATH.test(site.screenshot)) {
      const img = el("img", {
        src: site.screenshot,
        alt: `Preview screenshot of ${site.title} (${site.name}), captured 18 October 2026`,
        width: "1365",
        height: "900",
        loading: shotCount++ < EAGER_IMAGES ? "eager" : "lazy",
        decoding: "async",
      });
      children.push(el("a", { class: "shot", href: site.screenshot }, [
        img,
        el("span", { class: "visually-hidden", text: " — open full-size preview image" }),
      ]));
    }

    const body = el("div", { class: "card-body" }, [
      el("p", { class: "card-category", text: categoryText }),
      el("h3", { class: "card-title", text: site.title }),
      el("p", { class: "card-slug" }, [
        el("span", { class: "visually-hidden", text: "Repository: " }),
        el("code", { text: site.name }),
      ]),
    ]);
    const dates = renderDates(site);
    if (dates) body.append(dates);

    const links = el("p", { class: "card-links" });
    if (isHttps(site.url)) {
      // Visible label stays at the start of the accessible name.
      links.append(el("a", { class: "card-link visit", href: site.url }, [
        "Visit site",
        el("span", { class: "visually-hidden", text: `: ${site.title} (${displayUrl(site.url)})` }),
        el("span", { class: "arrow", "aria-hidden": "true", text: " ↗" }),
      ]));
    }
    if (isHttps(site.repository)) {
      links.append(el("a", { class: "card-link", href: site.repository }, [
        "GitHub repo",
        el("span", { class: "visually-hidden", text: `: ${site.name}` }),
      ]));
    }
    body.append(links);
    children.push(body);

    const li = el("li", { class: isHome ? "card home" : "card" }, [
      el("article", { class: "card-inner" }, children),
    ]);
    return {
      node: li,
      site,
      name: site.name,
      haystack: normalize(`${site.name} ${site.title} ${category.label} ${memberLabels.join(" ")}`),
    };
  }

  function renderSection(category, sites, marker, labels, primaryOf = () => category) {
    const headingId = `cat-${category.id}`;
    const count = el("span", { class: "section-count" });
    const heading = el("h2", { id: headingId, class: "section-title" }, [
      el("span", { class: "section-index", "aria-hidden": "true", text: marker }),
      el("span", { class: "section-name", text: category.label }),
      count,
    ]);
    const items = sites.map((s) => renderCard(s, primaryOf(s), labels));
    const list = el("ul", { class: "cards", role: "list" }, items.map((i) => i.node));
    const node = el("section", { class: "section", "aria-labelledby": headingId }, [heading, list]);
    return { category, node, count, items, list };
  }

  function renderChip(id, label, count) {
    const button = el("button", { type: "button", class: "chip", "aria-pressed": "false", "data-category": id }, [
      el("span", { class: "chip-label", text: label }),
      el("span", { class: "chip-count", text: String(count) }),
    ]);
    button.addEventListener("click", () => setCategory(id));
    return button;
  }

  function setCategory(id) {
    activeCategory = id;
    for (const chip of chips) chip.setAttribute("aria-pressed", String(chip.dataset.category === id));
    applyFilter();
  }

  function setSort(mode) {
    sortMode = Object.hasOwn(SORTS, mode) ? mode : DEFAULT_SORT;
    sortSelect.value = sortMode;
    if (!allSection) return; // data not loaded yet; init() picks up the select's value
    gallery.dataset.sort = sortMode;
    if (orders[sortMode]) allSection.list.replaceChildren(...orders[sortMode].map((item) => item.node));
    applyFilter();
  }

  function applyFilter() {
    if (!allSection) return;
    const raw = input.value.trim();
    const terms = normalize(raw).split(" ").filter(Boolean);
    // A site can be carded in several sections; count each repository once.
    const shownSites = new Set();

    const recent = sortMode !== "category";
    for (const section of [allSection, ...sections]) {
      const isAll = section === allSection;
      const inView = isAll === recent;
      let visible = 0;
      for (const item of section.items) {
        // Category sections hold their own members; the All section filters by any membership.
        const inCategory = inView && (activeCategory === ALL ||
          (isAll ? isMember(item.site, activeCategory) : section.category.id === activeCategory));
        const match = inCategory && terms.every((t) => item.haystack.includes(t));
        item.node.hidden = !match;
        if (match) {
          visible++;
          shownSites.add(item.name);
        }
      }
      section.node.hidden = visible === 0;
      section.count.textContent = visible === section.items.length
        ? plural(visible, "site")
        : `${visible} of ${section.items.length}`;
    }
    const shown = shownSites.size;

    const categoryLabel = activeCategory === ALL
      ? ""
      : sections.find((s) => s.category.id === activeCategory)?.category.label ?? "";
    const scope = [
      categoryLabel && `in ${categoryLabel}`,
      raw && `matching “${raw}”`,
    ].filter(Boolean).join(" ");

    empty.hidden = shown !== 0;
    clearSearch.hidden = !raw;
    showAll.hidden = activeCategory === ALL;
    if (!shown) emptyDetail.textContent = `No sites ${scope}.`;

    const order = SORTS[sortMode].phrase;
    const message = shown
      ? scope
        ? `Showing ${shown} of ${plural(total, "site")} ${scope}, ${order}.`
        : `Showing all ${plural(total, "site")}, ${order}.`
      : `No sites ${scope}.`;

    // Debounce the live region so screen readers aren't flooded while typing.
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => { status.textContent = message; }, raw ? 300 : 0);
  }

  async function init() {
    try {
      const res = await fetch(DATA_URL, { cache: "no-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const labels = new Map(data.categories.map((c) => [c.id, c.label]));
      const categoryOf = new Map(data.categories.map((c) => [c.id, c]));
      const listed = data.sites.filter((s) => categoryOf.has(s.category));
      // Rendered first so the default (recent) view gets the eager screenshots.
      allSection = renderSection({ id: "all-sites", label: "All sites" }, listed, "All", labels,
        (s) => categoryOf.get(s.category));
      sections = data.categories
        .map((category) => [category, data.sites.filter((s) => isMember(s, category.id))])
        .filter(([, sites]) => sites.length)
        .map(([category, sites], i) => renderSection(category, sites, String(i + 1).padStart(2, "0"), labels));
      // Unique repositories, not cards: secondary memberships duplicate cards across sections.
      total = new Set(sections.flatMap((s) => s.items.map((i) => i.name))).size;

      const entries = allSection.items.map((item, index) => ({
        item,
        index,
        site: item.site,
        time: { createdAt: stamp(item.site, "createdAt"), updatedAt: stamp(item.site, "updatedAt") },
      }));
      orders = {
        updated: sortedBy(SORTS.updated, entries).map((e) => e.item),
        created: sortedBy(SORTS.created, entries).map((e) => e.item),
      };

      gallery.replaceChildren(allSection.node, ...sections.map((s) => s.node));
      chips = [
        renderChip(ALL, "All", total),
        ...sections.map((s) => renderChip(s.category.id, s.category.label, s.items.length)),
      ];
      chipsBox.replaceChildren(...chips);

      document.getElementById("total-count").textContent = String(total);
      document.getElementById("total-label").textContent = total === 1 ? "site" : "sites";
      document.getElementById("category-count").textContent = String(sections.length);
      document.getElementById("category-label").textContent = sections.length === 1 ? "category" : "categories";

      setCategory(ALL);
      // Honour a value the browser restored on back/forward navigation.
      setSort(sortSelect.value);
    } catch (err) {
      status.textContent =
        "Could not load data/sites.json. If you opened this file directly, serve the folder over HTTP instead (see README).";
      console.error(err);
    }
  }

  input.addEventListener("input", applyFilter);
  sortSelect.addEventListener("change", () => setSort(sortSelect.value));
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && input.value) {
      e.preventDefault();
      input.value = "";
      applyFilter();
    }
  });
  clearSearch.addEventListener("click", () => {
    input.value = "";
    applyFilter();
    input.focus();
  });
  showAll.addEventListener("click", () => {
    setCategory(ALL);
    chips[0]?.focus();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    if (t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    e.preventDefault();
    input.focus();
    input.select();
  });

  init();
})();
