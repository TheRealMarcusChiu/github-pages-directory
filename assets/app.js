"use strict";

(() => {
  const HOMEPAGE_REPO = "therealmarcuschiu.github.io";
  const DATA_URL = new URL("data/sites.json", document.baseURI);
  const SCREENSHOT_PATH = /^assets\/previews\/[A-Za-z0-9._-]+\.webp$/;
  const ALL = "all";
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

  let sections = [];
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
      name: site.name,
      haystack: normalize(`${site.name} ${site.title} ${category.label} ${memberLabels.join(" ")}`),
    };
  }

  function renderSection(category, sites, index, labels) {
    const headingId = `cat-${category.id}`;
    const count = el("span", { class: "section-count" });
    const heading = el("h2", { id: headingId, class: "section-title" }, [
      el("span", { class: "section-index", "aria-hidden": "true", text: String(index + 1).padStart(2, "0") }),
      el("span", { class: "section-name", text: category.label }),
      count,
    ]);
    const items = sites.map((s) => renderCard(s, category, labels));
    const list = el("ul", { class: "cards", role: "list" }, items.map((i) => i.node));
    const node = el("section", { class: "section", "aria-labelledby": headingId }, [heading, list]);
    return { category, node, count, items };
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

  function applyFilter() {
    const raw = input.value.trim();
    const terms = normalize(raw).split(" ").filter(Boolean);
    // A site can be carded in several sections; count each repository once.
    const shownSites = new Set();

    for (const section of sections) {
      const inCategory = activeCategory === ALL || section.category.id === activeCategory;
      let visible = 0;
      for (const item of section.items) {
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

    const message = shown
      ? scope
        ? `Showing ${shown} of ${plural(total, "site")} ${scope}.`
        : `Showing all ${plural(total, "site")}.`
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
      sections = data.categories
        .map((category) => [category, data.sites.filter((s) => isMember(s, category.id))])
        .filter(([, sites]) => sites.length)
        .map(([category, sites], i) => renderSection(category, sites, i, labels));
      // Unique repositories, not cards: secondary memberships duplicate cards across sections.
      total = new Set(sections.flatMap((s) => s.items.map((i) => i.name))).size;

      gallery.replaceChildren(...sections.map((s) => s.node));
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
    } catch (err) {
      status.textContent =
        "Could not load data/sites.json. If you opened this file directly, serve the folder over HTTP instead (see README).";
      console.error(err);
    }
  }

  input.addEventListener("input", applyFilter);
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
