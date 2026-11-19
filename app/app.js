/* Leonida Ledger v2 — offline GTA VI trophy tracker.
   Plain script, no libraries, no network calls except loading data/trophies.json
   from this same app. Progress lives in localStorage on this device only. */
(function () {
  "use strict";

  var STORE_KEY = "leonida-ledger-v2";
  var DATA_URL = "data/trophies.json";

  var GRADE_ORDER = { Platinum: 0, Gold: 1, Silver: 2, Bronze: 3 };
  var STAGE_ORDER = { story: 0, collectibles: 1, activities: 2, cleanup: 3 };
  var STAGES = [
    { key: "story", num: 1, title: "Story", blurb: "Play the campaign in order, chapters 1 to the finale. Every story trophy pops as you go — no grinding, just don't rush past Chapter 1 without the meditation spot." },
    { key: "collectibles", num: 2, title: "Collectibles", blurb: "Meditation spots, card sets, WAiNK It locations, vehicles and full map exploration. Best done region by region after the story, with a checklist in hand." },
    { key: "activities", num: 3, title: "Activities", blurb: "Races, drone races, the shooting range, robberies, fishing, arcade games and the money trophies. The long middle of the hunt — spread it out, don't binge it." },
    { key: "cleanup", num: 4, title: "Cleanup", blurb: "A Long Road (100% completion) and the Platinum itself. If the first three phases are done, this phase is mostly ticking off the last few challenges and stunts." }
  ];
  var DEMO_EARNED = [
    "just-like-paradise", "paradise-lost", "trust", "family-matters",
    "baited-my-tackle", "stick-fiddler", "in-the-beginning", "lets-go-bowling",
    "capital-offense", "hot-together", "treat-yo-self", "on-the-spot",
    "the-goodtime-state", "whip-it-good"
  ];

  var trophies = [];
  var state = loadState();
  var kindFilter = "all";
  var searchText = "";
  var sortMode = "roadmap";
  var openGuideId = null;

  var $ = function (id) { return document.getElementById(id); };
  var params = new URLSearchParams(window.location.search);
  var shot = params.get("shot") || params.get("view") || "";

  function loadState() {
    try {
      var raw = window.localStorage.getItem(STORE_KEY);
      if (!raw) return { earned: {}, notes: {}, spoiler: false, theme: "dark", bannerOff: false };
      var s = JSON.parse(raw);
      return {
        earned: s.earned || {},
        notes: s.notes || {},
        spoiler: !!s.spoiler,
        theme: s.theme === "light" ? "light" : "dark",
        bannerOff: !!s.bannerOff
      };
    } catch (e) {
      return { earned: {}, notes: {}, spoiler: false, theme: "dark", bannerOff: false };
    }
  }
  function saveState() {
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* storage full or blocked: progress stays for this session */ }
  }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function stars(n) {
    var out = "";
    for (var i = 1; i <= 5; i++) out += i <= n ? "●" : "○";
    return out;
  }
  function earnedCount() {
    return trophies.filter(function (t) { return state.earned[t.id]; }).length;
  }
  function isSpoiled(t) {
    return state.spoiler && t.kind === "story" && !state.earned[t.id];
  }

  function applyTheme() {
    document.documentElement.setAttribute("data-theme", state.theme);
    var b = $("themeBtn");
    b.textContent = state.theme === "light" ? "☾ Dark" : "☀︎ Light";
    b.setAttribute("aria-pressed", state.theme === "light" ? "true" : "false");
  }
  function applySpoiler() {
    var b = $("spoilerBtn");
    b.textContent = state.spoiler ? "🙈 Spoilers: on" : "🙈 Spoilers: off";
    b.setAttribute("aria-pressed", state.spoiler ? "true" : "false");
  }

  function visibleTrophies() {
    var q = searchText.trim().toLowerCase();
    var list = trophies.filter(function (t) {
      if (kindFilter === "missable") { if (!t.missable) return false; }
      else if (kindFilter === "online") { return false; }
      else if (kindFilter !== "all") { if (t.kind !== kindFilter) return false; }
      if (q) {
        var hay = (t.name + " " + t.description + " " + t.guide + " " + t.kind).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
    var byRoadmap = function (a, b) {
      var d = STAGE_ORDER[a.stage] - STAGE_ORDER[b.stage];
      if (d) return d;
      return trophies.indexOf(a) - trophies.indexOf(b);
    };
    if (sortMode === "grade") {
      list.sort(function (a, b) {
        var d = GRADE_ORDER[a.grade] - GRADE_ORDER[b.grade];
        return d || a.name.localeCompare(b.name);
      });
    } else if (sortMode === "name") {
      list.sort(function (a, b) { return a.name.localeCompare(b.name); });
    } else if (sortMode === "difficulty") {
      list.sort(function (a, b) { return (b.difficulty - a.difficulty) || byRoadmap(a, b); });
    } else if (sortMode === "difficulty-asc") {
      list.sort(function (a, b) { return (a.difficulty - b.difficulty) || byRoadmap(a, b); });
    } else {
      list.sort(byRoadmap);
    }
    return list;
  }

  function renderHero() {
    var total = trophies.length || 55;
    var n = earnedCount();
    var pct = total ? Math.round((n / total) * 100) : 0;
    $("earnedCount").textContent = n;
    $("overallPct").textContent = pct + "%";
    $("bigBar").style.width = pct + "%";
    $("bigBarWrap").setAttribute("aria-valuenow", String(pct));
    var missable = trophies.find(function (t) { return t.id === "positive-mental-attitude"; });
    var banner = $("missableBanner");
    banner.classList.toggle("dismissed", state.bannerOff || !!(missable && state.earned[missable.id]));
    renderNextUp();
  }

  function renderNextUp() {
    var nameEl = $("nextUpName"), whyEl = $("nextUpWhy");
    if (!trophies.length) { nameEl.textContent = "—"; whyEl.textContent = "Loading the trophy list…"; return; }
    var missable = trophies.find(function (t) { return t.missable && !state.earned[t.id]; });
    var pick = null, why = "";
    if (missable) {
      pick = missable;
      why = "Do this first — it is the only trophy you can lose. Meditate at the Chapter 1 balcony spot before the chapter ends.";
    } else {
      var rest = trophies.filter(function (t) { return !state.earned[t.id]; });
      if (!rest.length) {
        nameEl.textContent = "Vice Got a Price! — earned 🏆";
        whyEl.textContent = "Every trophy is ticked. You are a Leonida Legend.";
        return;
      }
      rest.sort(function (a, b) {
        var d = STAGE_ORDER[a.stage] - STAGE_ORDER[b.stage];
        if (d) return d;
        return a.difficulty - b.difficulty;
      });
      pick = rest[0];
      why = pick.stage === "story"
        ? "Next story beat — just keep playing the campaign."
        : "Easiest remaining trophy in the current roadmap phase (difficulty " + pick.difficulty + "/5, " + pick.time + ").";
    }
    nameEl.textContent = pick.name;
    whyEl.textContent = why;
  }

  function renderKindBars() {
    var kinds = [
      { key: "story", label: "Story", total: 0, done: 0 },
      { key: "collectibles", label: "Collectibles", total: 0, done: 0 },
      { key: "activities", label: "Activities", total: 0, done: 0 },
      { key: "platinum", label: "Platinum", total: 0, done: 0 }
    ];
    trophies.forEach(function (t) {
      var row = kinds.find(function (k) { return k.key === t.kind; });
      if (row) { row.total++; if (state.earned[t.id]) row.done++; }
    });
    $("kindBars").innerHTML = kinds.map(function (k) {
      var pct = k.total ? Math.round((k.done / k.total) * 100) : 0;
      return '<div class="kindbar" data-kind="' + k.key + '">' +
        '<div class="kb-top"><span>' + esc(k.label) + '</span><span>' + k.done + " / " + k.total + " · " + pct + '%</span></div>' +
        '<div class="kb-track"><span style="width:' + pct + '%"></span></div></div>';
    }).join("");
  }

  function renderPhases() {
    $("phases").innerHTML = STAGES.map(function (st) {
      var inPhase = trophies.filter(function (t) { return t.stage === st.key; });
      var done = inPhase.filter(function (t) { return state.earned[t.id]; }).length;
      var pct = inPhase.length ? Math.round((done / inPhase.length) * 100) : 0;
      return '<article class="phase" data-stage="' + st.key + '">' +
        '<h3><span class="pnum">' + st.num + '</span>' + esc(st.title) + '</h3>' +
        '<p>' + esc(st.blurb) + '</p>' +
        '<p class="p-count">' + done + " / " + inPhase.length + " · " + pct + '%</p>' +
        '<div class="phasebar"><span style="width:' + pct + '%"></span></div></article>';
    }).join("");
  }

  function cardHtml(t) {
    var earned = !!state.earned[t.id];
    var spoiled = isSpoiled(t);
    var name = spoiled ? "Hidden story trophy" : t.name;
    var desc = spoiled
      ? "Hidden until earned — turn the spoiler setting off, or earn it, to reveal the name and description."
      : t.description;
    var open = openGuideId === t.id;
    var badges = '<span class="badge grade-' + t.grade + '">' + esc(t.grade) + '</span>' +
      '<span class="badge diff" title="Difficulty ' + t.difficulty + ' out of 5">Difficulty ' + stars(t.difficulty) + '</span>' +
      '<span class="badge">⏱ ' + esc(t.time) + '</span>' +
      '<span class="badge">' + esc(t.kind) + '</span>';
    if (t.hidden) badges += '<span class="badge hidden-tag">Hidden on PSN</span>';
    if (t.missable) badges += '<span class="badge flag">⚠ Missable</span>';
    var guide = open
      ? '<div class="tguide"><p>' + esc(t.guide) + '</p>' +
        '<p class="tsource"><strong>Source:</strong> ' + esc(t.source) + '</p>' +
        '<div class="tnotes"><label for="note-' + t.id + '">Your notes (saved on this device)</label>' +
        '<textarea id="note-' + t.id + '" data-note="' + t.id + '" placeholder="e.g. where you found it, what loadout worked…">' + esc(state.notes[t.id] || "") + '</textarea></div></div>'
      : "";
    return '<article class="tcard' + (earned ? " earned" : "") + '" data-id="' + t.id + '">' +
      '<div class="tcard-top">' +
      '<input class="tcheck" type="checkbox" data-earn="' + t.id + '"' + (earned ? " checked" : "") + ' aria-label="Mark ' + esc(name) + ' as earned">' +
      '<div class="tcard-body">' +
      '<div class="tname">' + esc(name) + (earned ? '<span class="tick" title="Earned">✓</span>' : "") + '</div>' +
      '<p class="tdesc' + (spoiled ? " spoiled" : "") + '">' + esc(desc) + '</p>' +
      '<div class="badges">' + badges + '</div>' +
      '<button class="tguide-toggle" type="button" data-guide="' + t.id + '" aria-expanded="' + (open ? "true" : "false") + '">' +
      (open ? "Hide guide ▲" : "Guide &amp; sources ▼") + '</button>' +
      guide +
      '</div></div></article>';
  }

  function renderList() {
    var list = visibleTrophies();
    var el = $("list");
    el.innerHTML = list.map(cardHtml).join("");
    $("emptyState").hidden = list.length > 0;
    var total = trophies.length;
    $("shownCount").textContent = "Showing " + list.length + " of " + total + " trophies";
    var notes = {
      all: "Roadmap order: story, then collectibles, then activities, then cleanup.",
      story: "Story trophies — they pop as you play the campaign. Nothing here is missable.",
      missable: "The only trophy in the list that can be lost in a playthrough.",
      collectibles: "Spots, cards, locations, vehicles and map exploration.",
      activities: "Races, ranges, robberies, fishing, arcade games and money.",
      online: "GTA VI has no online trophies at launch — every trophy is single-player.",
      platinum: "The one that needs everything else."
    };
    $("filterNote").textContent = notes[kindFilter] || "";
    document.querySelectorAll("#kindChips .chip").forEach(function (c) {
      c.classList.toggle("active", c.getAttribute("data-kind") === kindFilter);
    });
  }

  function renderAll() {
    renderHero();
    renderKindBars();
    renderPhases();
    renderList();
  }

  function setFilter(kind) {
    kindFilter = kind;
    openGuideId = null;
    renderList();
  }

  function download(filename, text) {
    var blob = new Blob([text], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  function wireEvents() {
    $("themeBtn").addEventListener("click", function () {
      state.theme = state.theme === "light" ? "dark" : "light";
      saveState();
      applyTheme();
    });
    $("spoilerBtn").addEventListener("click", function () {
      state.spoiler = !state.spoiler;
      saveState();
      applySpoiler();
      renderList();
    });
    $("search").addEventListener("input", function (e) {
      searchText = e.target.value;
      renderList();
    });
    $("sort").addEventListener("change", function (e) {
      sortMode = e.target.value;
      renderList();
    });
    $("kindChips").addEventListener("click", function (e) {
      var b = e.target.closest("[data-kind]");
      if (b) setFilter(b.getAttribute("data-kind"));
    });
    $("list").addEventListener("change", function (e) {
      var box = e.target.closest("[data-earn]");
      if (!box) return;
      state.earned[box.getAttribute("data-earn")] = box.checked;
      saveState();
      renderHero(); renderKindBars(); renderPhases();
      var card = box.closest(".tcard");
      if (card) {
        card.classList.toggle("earned", box.checked);
        var tick = card.querySelector(".tick");
        var nameEl = card.querySelector(".tname");
        if (box.checked && !tick && nameEl) {
          var s = document.createElement("span");
          s.className = "tick"; s.title = "Earned"; s.textContent = "✓";
          nameEl.appendChild(s);
        } else if (!box.checked && tick) { tick.remove(); }
      }
      var changedTrophy = trophies.find(function (t) { return t.id === box.getAttribute("data-earn"); });
      if (changedTrophy && state.spoiler && changedTrophy.kind === "story") {
        renderList(); /* earning a story trophy unmasks its name — re-render to reveal it */
      }
    });
    $("list").addEventListener("click", function (e) {
      var btn = e.target.closest("[data-guide]");
      if (!btn) return;
      var id = btn.getAttribute("data-guide");
      openGuideId = openGuideId === id ? null : id;
      renderList();
      if (openGuideId) {
        var card = document.querySelector('.tcard[data-id="' + openGuideId + '"]');
        if (card) card.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    });
    $("list").addEventListener("input", function (e) {
      var area = e.target.closest("[data-note]");
      if (!area) return;
      state.notes[area.getAttribute("data-note")] = area.value;
      saveState();
    });
    $("missableGo").addEventListener("click", function () {
      setFilter("missable");
      document.querySelector(".tracker").scrollIntoView({ behavior: "smooth" });
    });
    $("missableHide").addEventListener("click", function () {
      state.bannerOff = true;
      saveState();
      renderHero();
    });
    $("exportBtn").addEventListener("click", function () {
      download("leonida-ledger-progress.json", JSON.stringify({
        app: "Leonida Ledger v2",
        exportedAt: new Date().toISOString(),
        earned: Object.keys(state.earned).filter(function (k) { return state.earned[k]; }),
        notes: state.notes
      }, null, 2));
    });
    $("importBtn").addEventListener("click", function () { $("importFile").click(); });
    $("importFile").addEventListener("change", function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var data = JSON.parse(String(reader.result));
          var known = {};
          trophies.forEach(function (t) { known[t.id] = true; });
          var earned = {};
          (data.earned || []).forEach(function (id) { if (known[id]) earned[id] = true; });
          state.earned = earned;
          var notes = {};
          Object.keys(data.notes || {}).forEach(function (id) { if (known[id]) notes[id] = String(data.notes[id]); });
          state.notes = notes;
          saveState();
          renderAll();
        } catch (err) {
          window.alert("That file could not be imported — it is not a Leonida Ledger export.");
        }
        e.target.value = "";
      };
      reader.readAsText(file);
    });
    $("resetBtn").addEventListener("click", function () {
      if (window.confirm("Reset the tracker? This clears every tick and note on this device.")) {
        state.earned = {};
        state.notes = {};
        saveState();
        renderAll();
      }
    });
  }

  function applyShotPreset() {
    if (shot === "cover") {
      if (earnedCount() === 0) {
        DEMO_EARNED.forEach(function (id) { state.earned[id] = true; });
        saveState();
      }
      openGuideId = "positive-mental-attitude";
      kindFilter = "all";
      renderAll();
      var card = document.querySelector('.tcard[data-id="positive-mental-attitude"]');
      if (card) card.scrollIntoView({ block: "center", behavior: "instant" });
    } else if (shot === "roadmap") {
      renderAll();
      document.getElementById("roadmap").scrollIntoView({ behavior: "instant", block: "start" });
    } else if (shot === "missables" || shot === "missable") {
      kindFilter = "missable";
      renderAll();
      document.querySelector(".tracker").scrollIntoView({ behavior: "instant" });
    } else if (shot === "spoiler") {
      state.spoiler = true;
      saveState();
      applySpoiler();
      renderAll();
    } else if (shot === "story" || shot === "collectibles" || shot === "activities" || shot === "online" || shot === "platinum") {
      kindFilter = shot;
      renderAll();
    } else {
      renderAll();
    }
    window.__shotReady = true;
  }

  function init() {
    applyTheme();
    applySpoiler();
    wireEvents();
    fetch(DATA_URL)
      .then(function (r) {
        if (!r.ok) throw new Error("Could not load " + DATA_URL + " (" + r.status + ")");
        return r.json();
      })
      .then(function (data) {
        trophies = (data.trophies || data).slice();
        applyShotPreset();
      })
      .catch(function (err) {
        $("list").innerHTML = '<p class="empty">Could not load the trophy list (' + esc(err.message) + '). Check that data/trophies.json is beside this page.</p>';
        $("emptyState").hidden = true;
        window.__shotReady = true;
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
