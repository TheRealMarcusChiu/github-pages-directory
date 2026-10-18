"use strict";

(() => {
  const HOMEPAGE_REPO = "therealmarcuschiu.github.io";
  const DATA_URL = new URL("data/sites.json", document.baseURI);

  const list = document.getElementById("site-list");
  const input = document.getElementById("filter");
  const status = document.getElementById("result-status");
  const totalCount = document.getElementById("total-count");
  const totalLabel = document.getElementById("total-label");

  let items = [];

  const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
  const normalize = (s) => s.toLowerCase().replace(/[\s_-]+/g, " ").trim();
  const displayUrl = (url) => url.replace(/^https:\/\//, "").replace(/\/$/, "");

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

  function renderItem(site) {
    const isHome = site.name === HOMEPAGE_REPO;
    const title = isHome ? "Account homepage" : site.name;

    const heading = el("h2", { class: "site-name" }, [
      el("a", { href: site.url, text: title }),
    ]);
    const meta = el("p", { class: "site-url", text: displayUrl(site.url) });
    const repoLink = el("a", { class: "repo-link", href: site.repository }, [
      "Repository",
      isHome
        ? el("span", { class: "repo-name", text: site.name })
        : el("span", { class: "visually-hidden", text: ` for ${site.name}` }),
    ]);

    const li = el("li", { class: isHome ? "site home" : "site" }, [
      heading,
      meta,
      el("p", { class: "site-links" }, [repoLink]),
    ]);
    return {
      node: li,
      haystack: normalize(`${site.name} ${title} ${displayUrl(site.url)}`),
    };
  }

  function applyFilter() {
    const query = normalize(input.value);
    let shown = 0;
    for (const item of items) {
      const match = !query || item.haystack.includes(query);
      item.node.hidden = !match;
      if (match) shown++;
    }
    list.classList.toggle("is-empty", shown === 0);
    status.textContent = query
      ? shown
        ? `Showing ${shown} of ${plural(items.length, "site")} matching “${input.value.trim()}”.`
        : `No sites match “${input.value.trim()}”.`
      : `Showing all ${plural(items.length, "site")}.`;
  }

  async function init() {
    try {
      const res = await fetch(DATA_URL, { cache: "no-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const sites = [...data.sites].sort((a, b) =>
        (b.name === HOMEPAGE_REPO) - (a.name === HOMEPAGE_REPO) ||
        a.name.localeCompare(b.name));

      items = sites.map(renderItem);
      list.replaceChildren(...items.map((i) => i.node));

      totalCount.textContent = String(items.length);
      totalLabel.textContent = items.length === 1 ? "site" : "sites";
      applyFilter();
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
