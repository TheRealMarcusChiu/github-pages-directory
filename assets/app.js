"use strict";

(() => {
  const HOMEPAGE_REPO = "therealmarcuschiu.github.io";
  const DATA_URL = new URL("data/sites.json", document.baseURI);
  const SCREENSHOT_PATH = /^assets\/previews\/[A-Za-z0-9._-]+\.webp$/;
  // Repository dates are GitHub API ISO 8601 UTC timestamps (repo metadata, not page-content dates).
  const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
  // Preview capture dates are per entry (screenshotCapturedOn, YYYY-MM-DD) and separate from repository dates.
  const CAPTURE_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  // Created order never consults updated_at: ties fall straight through to repo name, then source order.
  const SORTS = {
    created: { keys: ["createdAt"] },
    updated: { keys: ["updatedAt", "createdAt"] },
    category: {},
  };
  const DEFAULT_SORT = "created";
  // Only the first gallery row loads eagerly; everything below the fold stays lazy.
  const EAGER_IMAGES = 3;

  const gallery = document.getElementById("gallery");
  const input = document.getElementById("filter");
  const categoryFilter = document.getElementById("category-filter");
  const categoryToggle = document.getElementById("category-toggle");
  const categorySummary = document.getElementById("category-summary");
  const categoryPanel = document.getElementById("category-panel");
  const categoryOptions = document.getElementById("category-options");
  const categoryClear = document.getElementById("category-clear");
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
  let checkboxes = [];
  // Selected category ids; empty means every category. A site matches if it is in any selected one.
  let activeCategories = new Set();
  let shotCount = 0;

  const plural = (n, word, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;
  // Fold case and punctuation so "var log" finds "/var/log" and "var-log-1".
  const normalize = (s) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim();
  const displayUrl = (url) => url.replace(/^https:\/\//, "").replace(/\/$/, "");
  const isHttps = (u) => { try { return new URL(u).protocol === "https:"; } catch { return false; } };
  // Secondary memberships: optional `alsoIn` list of extra category ids (primary stays `category`).
  const alsoIn = (site) => (Array.isArray(site.alsoIn) ? site.alsoIn.filter((id) => id !== site.category) : []);
  const isMember = (site, id) => site.category === id || alsoIn(site).includes(id);
  // "YYYY-MM-DD" → "D Month YYYY", formatted by hand so no time zone can shift the day.
  const longDate = (ymd) => {
    const m = CAPTURE_DATE.exec(ymd ?? "");
    return m && MONTHS[m[2] - 1] ? `${Number(m[3])} ${MONTHS[m[2] - 1]} ${m[1]}` : "";
  };
  const stamp = (site, key) => (ISO_UTC.test(site[key] ?? "") ? Date.parse(site[key]) : -Infinity);

  // Newest first by each sort key in turn, then repo name, then source order — on a copy, never in place.
  function sortedBy({ keys }, entries) {
    return [...entries].sort((a, b) =>
      keys.reduce((diff, key) => diff || b.time[key] - a.time[key], 0) ||
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
    const p = el("span", { class: "card-dates" }, [el("span", { class: "card-dates-label", text: "Repo" })]);
    parts.forEach(([key, word], i) => {
      if (i) p.append(el("span", { class: "card-dates-sep", "aria-hidden": "true", text: " ·" }));
      p.append(" ", el("span", { class: `card-date date-${word}` }, [
        `${word} `,
        el("time", { datetime: site[key], title: `GitHub repository ${word}: ${site[key]}`, text: site[key].slice(0, 10) }),
      ]));
    });
    return p;
  }

  function renderCapture(site) {
    const captured = longDate(site.screenshotCapturedOn);
    if (!captured) return null;
    return el("span", { class: "card-capture" }, [
      el("span", { class: "card-dates-label", text: "Preview" }),
      el("span", { class: "card-dates-sep", "aria-hidden": "true", text: " ·" }),
      " ",
      el("time", { datetime: site.screenshotCapturedOn, title: `Preview screenshot captured: ${site.screenshotCapturedOn}`, text: captured }),
    ]);
  }

  function renderCard(site, category, labels, idPrefix) {
    const isHome = site.name === HOMEPAGE_REPO;
    // Always lead with the primary category, then any secondary ones.
    const memberLabels = [site.category, ...alsoIn(site)].map((id) => labels.get(id)).filter(Boolean);
    const categoryText = memberLabels.length > 1
      ? `${memberLabels[0]} · also ${memberLabels.slice(1).join(", ")}`
      : category.label;
    // Cards repeat across sections, so ids are scoped to the section.
    const titleId = `${idPrefix}-${site.name}-title`;
    const hostId = `${idPrefix}-${site.name}-host`;
    const children = [];

    if (SCREENSHOT_PATH.test(site.screenshot)) {
      const captured = longDate(site.screenshotCapturedOn);
      children.push(el("span", { class: "shot" }, [el("img", {
        src: site.screenshot,
        alt: `Preview screenshot of ${site.title} (${site.name})${captured ? `, captured ${captured}` : ""}`,
        width: "1365",
        height: "900",
        loading: shotCount++ < EAGER_IMAGES ? "eager" : "lazy",
        decoding: "async",
      })]));
    }

    const body = el("span", { class: "card-body" }, [
      el("span", { class: "card-category", text: categoryText }),
      el("h3", { id: titleId, class: "card-title", text: site.title }),
      el("span", { class: "card-slug" }, [
        el("span", { class: "visually-hidden", text: "Repository: " }),
        el("code", { text: site.name }),
      ]),
      // Referenced by the link's aria-labelledby only; `hidden` keeps it out of the read-out content.
      el("span", { id: hostId, hidden: "", text: `(${displayUrl(site.url)})` }),
    ]);
    const dates = renderDates(site);
    if (dates) body.append(dates);
    const capture = renderCapture(site);
    if (capture) body.append(capture);
    children.push(body);

    // The whole tile (screenshot + text) is one site link; the GitHub link is a sibling, never nested.
    const parts = [];
    if (isHttps(site.url)) {
      parts.push(el("a", { class: "card-main", href: site.url, "aria-labelledby": `${titleId} ${hostId}` }, children));
    } else {
      parts.push(el("div", { class: "card-main" }, children));
    }
    if (isHttps(site.repository)) {
      // Accessible name starts with the visible label.
      parts.push(el("a", { class: "card-link card-repo", href: site.repository, "aria-label": `GitHub repo: ${site.name}`, text: "GitHub repo" }));
    }

    const li = el("li", { class: isHome ? "card home" : "card" }, [
      el("article", { class: "card-inner" }, parts),
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
    const items = sites.map((s) => renderCard(s, primaryOf(s), labels, headingId));
    const list = el("ul", { class: "cards", role: "list" }, items.map((i) => i.node));
    const node = el("section", { class: "section", "aria-labelledby": headingId }, [heading, list]);
    return { category, node, count, items, list };
  }

  function renderOption(id, label, count) {
    const box = el("input", { type: "checkbox", name: "category", value: id });
    box.addEventListener("change", () => {
      if (box.checked) activeCategories.add(id);
      else activeCategories.delete(id);
      syncCategories();
    });
    checkboxes.push(box);
    return el("li", {}, [
      el("label", { class: "menu-option" }, [
        box,
        el("span", { class: "menu-option-label", text: label }),
        el("span", { class: "chip-count", "aria-hidden": "true", text: String(count) }),
        el("span", { class: "visually-hidden", text: `, ${plural(count, "site")}` }),
      ]),
    ]);
  }

  const labelOf = (id) => sections.find((s) => s.category.id === id)?.category.label ?? "";
  // "A", "A or B", "A, B or C" — in category order.
  function selectedLabels() {
    const names = sections.filter((s) => activeCategories.has(s.category.id)).map((s) => s.category.label);
    return names.length > 1 ? `${names.slice(0, -1).join(", ")} or ${names.at(-1)}` : names.join("");
  }

  function setCategories(ids) {
    activeCategories = new Set(ids);
    syncCategories();
  }

  function syncCategories() {
    for (const box of checkboxes) box.checked = activeCategories.has(box.value);
    const n = activeCategories.size;
    categorySummary.textContent = n === 0 ? "All categories" : n === 1 ? labelOf([...activeCategories][0]) : `${n} categories`;
    categoryToggle.classList.toggle("is-filtered", n > 0);
    categoryClear.disabled = n === 0;
    applyFilter();
  }

  const menuItems = () => [...checkboxes, categoryClear].filter((n) => !n.disabled);

  function openMenu(focusFirst = false) {
    categoryPanel.hidden = false;
    categoryToggle.setAttribute("aria-expanded", "true");
    if (focusFirst) checkboxes[0]?.focus();
  }

  function closeMenu(returnFocus = false) {
    if (categoryPanel.hidden) return;
    categoryPanel.hidden = true;
    categoryToggle.setAttribute("aria-expanded", "false");
    if (returnFocus) categoryToggle.focus();
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
        const inCategory = inView && (activeCategories.size === 0 ||
          (isAll ? [...activeCategories].some((id) => isMember(item.site, id)) : activeCategories.has(section.category.id)));
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

    const categoryLabel = selectedLabels();
    const scope = [
      categoryLabel && `in ${categoryLabel}`,
      raw && `matching “${raw}”`,
    ].filter(Boolean).join(" ");

    empty.hidden = shown !== 0;
    clearSearch.hidden = !raw;
    showAll.hidden = activeCategories.size === 0;
    if (!shown) emptyDetail.textContent = `No sites ${scope}.`;
  }

  async function init() {
    try {
      const res = await fetch(DATA_URL, { cache: "no-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const labels = new Map(data.categories.map((c) => [c.id, c.label]));
      const categoryOf = new Map(data.categories.map((c) => [c.id, c]));
      const listed = data.sites
        .map((site, index) => ({ site, index, time: { createdAt: stamp(site, "createdAt"), updatedAt: stamp(site, "updatedAt") } }))
        .filter((e) => categoryOf.has(e.site.category));
      // Rendered first, in the default order, so the screenshots on screen at load are the eager ones.
      const initial = sortedBy(SORTS[DEFAULT_SORT], listed);
      allSection = renderSection({ id: "all-sites", label: "All sites" }, initial.map((e) => e.site), "All", labels,
        (s) => categoryOf.get(s.category));
      sections = data.categories
        .map((category) => [category, data.sites.filter((s) => isMember(s, category.id))])
        .filter(([, sites]) => sites.length)
        .map(([category, sites], i) => renderSection(category, sites, String(i + 1).padStart(2, "0"), labels));

      const entries = allSection.items.map((item, i) => ({ ...initial[i], item }));
      orders = {
        created: sortedBy(SORTS.created, entries).map((e) => e.item),
        updated: sortedBy(SORTS.updated, entries).map((e) => e.item),
      };

      gallery.replaceChildren(allSection.node, ...sections.map((s) => s.node));
      categoryOptions.replaceChildren(...sections.map((s) => renderOption(s.category.id, s.category.label, s.items.length)));

      // Honour checkboxes the browser restored on back/forward navigation.
      setCategories(checkboxes.filter((b) => b.checked).map((b) => b.value));
      // Honour a value the browser restored on back/forward navigation.
      setSort(sortSelect.value);
    } catch (err) {
      gallery.replaceChildren(el("p", { class: "status", role: "alert",
        text: "Could not load data/sites.json. If you opened this file directly, serve the folder over HTTP instead (see README)." }));
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
    setCategories([]);
    categoryToggle.focus();
  });

  // Category dropdown: a disclosure button over a group of checkboxes.
  categoryToggle.addEventListener("click", () => (categoryPanel.hidden ? openMenu() : closeMenu()));
  categoryToggle.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      openMenu(true);
    }
  });
  categoryClear.addEventListener("click", () => {
    setCategories([]);
    checkboxes[0]?.focus();
  });
  categoryPanel.addEventListener("keydown", (e) => {
    const items = menuItems();
    const at = items.indexOf(document.activeElement);
    const next = { ArrowDown: at + 1, ArrowUp: at - 1, Home: 0, End: items.length - 1 }[e.key];
    if (next === undefined || !items.length) return;
    e.preventDefault();
    items[(next + items.length) % items.length].focus();
  });
  categoryFilter.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !categoryPanel.hidden) {
      e.preventDefault();
      closeMenu(true);
    }
  });
  // Tabbing away closes the panel. Focus landing on an ancestor (clicking a label focuses the
  // tabindex=-1 <main>) is not leaving; real outside clicks are handled by pointerdown below.
  categoryFilter.addEventListener("focusout", (e) => {
    const to = e.relatedTarget;
    if (to instanceof Node && !categoryFilter.contains(to) && !to.contains(categoryFilter)) closeMenu();
  });
  document.addEventListener("pointerdown", (e) => {
    if (!categoryFilter.contains(e.target)) closeMenu();
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
