// Leonida Ledger — GTA 6 trophy guide & tracker.
// One page, four views (checklist, roadmap, missables, about). The trophy
// list comes from data/trophies.json; progress lives in store.js. The app
// fetches nothing else at run time, so it works with the network off.

import {
  STORE_KEY,
  emptyProgress,
  loadProgress,
  saveProgress,
  isEarned,
  setEarned,
  getCount,
  setCount,
  getNote,
  setNote,
  exportProgress,
  importProgress,
  seedDemo,
} from './store.js';

const GRADE_LABEL = { platinum: 'Platinum', gold: 'Gold', silver: 'Silver', bronze: 'Bronze' };
const KIND_LABEL = {
  story: 'Story',
  missable: 'Missable',
  collectibles: 'Collectibles',
  activities: 'Activities',
  online: 'Online',
};

// Query params exist for screenshots (?view, ?select, ?spoiler, ?kind,
// ?grade, ?seed) and are harmless in normal use: the app works the same
// without them.
const params = new URLSearchParams(location.search);

const doc = await (await fetch('data/trophies.json')).json();
const trophies = doc.trophies;
const byId = new Map(trophies.map((t) => [t.id, t]));

let progress = loadProgress();
if (params.get('seed') === '13') {
  progress = seedDemo(trophies);
  saveProgress(progress);
}

const ui = {
  view: ['checklist', 'roadmap', 'missables', 'about'].includes(params.get('view'))
    ? params.get('view')
    : 'checklist',
  kind: params.get('kind') || 'all',
  grade: params.get('grade') || 'all',
  search: '',
  earnedOnly: params.get('earnedOnly') === '1',
  selectedId: Number(params.get('select')) || null,
};
if (params.get('spoiler') === '1') progress.spoiler = true;
if (params.get('spoiler') === '0') progress.spoiler = false;

const $ = (id) => document.getElementById(id);
const listEl = $('trophyList');
const detailEl = $('detailPane');

function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined && text !== null) node.textContent = text;
  if (className) node.className = className;
  return node;
}

// A trophy is masked while spoilers are on, it is hidden on PlayStation and
// it has not been earned yet: name and description stay hidden.
function isMasked(trophy) {
  return progress.spoiler && trophy.hidden && !isEarned(progress, trophy.id);
}

function trophyMatches(trophy) {
  if (ui.kind !== 'all') {
    if (ui.kind === 'online') return false;
    if (!trophy.kinds.includes(ui.kind)) return false;
  }
  if (ui.grade !== 'all' && trophy.grade !== ui.grade) return false;
  if (ui.earnedOnly && !isEarned(progress, trophy.id)) return false;
  if (ui.search) {
    const hay = `${trophy.name} ${trophy.description} ${trophy.guide} ${trophy.chapter ?? ''}`.toLowerCase();
    if (!hay.includes(ui.search.toLowerCase())) return false;
  }
  return true;
}

function renderHeader() {
  const earned = trophies.filter((t) => isEarned(progress, t.id)).length;
  $('earnedCount').textContent = earned;
  $('progressBar').style.width = `${Math.round((earned / trophies.length) * 100)}%`;
  const parts = ['platinum', 'gold', 'silver', 'bronze'].map((grade) => {
    const total = trophies.filter((t) => t.grade === grade).length;
    const got = trophies.filter((t) => t.grade === grade && isEarned(progress, t.id)).length;
    return `${GRADE_LABEL[grade]} ${got}/${total}`;
  });
  $('gradeLine').textContent = parts.join(' · ');
  $('platinumLine').textContent = earned >= 55
    ? 'Platinum earned — Vice Got a Price! You are a Leonida Legend.'
    : 'Platinum: 4/10 difficulty · about 200 hours · 1 playthrough · 0 online trophies';
}

function renderList() {
  const shown = trophies.filter(trophyMatches);
  listEl.replaceChildren();
  $('listMeta').textContent = `Showing ${shown.length} of ${trophies.length} trophies`
    + (ui.kind === 'online' ? ' — there are no online trophies; all 55 are single-player' : '');
  if (shown.length === 0) {
    const empty = el('li', null, 'empty-state');
    if (ui.kind === 'online') {
      empty.append(
        el('strong', 'No online trophies. '),
        document.createTextNode('Every one of the 55 trophies is single-player and offline — unlike GTA 5 and Red Dead Redemption 2, which tied 18 trophies each to online modes. The platinum can never expire with a server. (PowerPyx / GTA Zone.)'),
      );
    } else {
      empty.append(el('strong', 'Nothing matches those filters. '), document.createTextNode('Try clearing the search or picking another kind or grade.'));
    }
    listEl.append(empty);
    return;
  }
  for (const trophy of shown) {
    const earned = isEarned(progress, trophy.id);
    const masked = isMasked(trophy);
    const li = el('li', null, `trophy-row${earned ? ' earned' : ''}${ui.selectedId === trophy.id ? ' selected' : ''}`);
    li.addEventListener('click', () => {
      ui.selectedId = trophy.id;
      renderList();
      renderDetail();
    });

    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earned;
    box.setAttribute('aria-label', `Mark ${masked ? 'hidden trophy' : trophy.name} earned`);
    box.addEventListener('click', (event) => event.stopPropagation());
    box.addEventListener('change', () => {
      setEarned(progress, trophy.id, box.checked);
      renderHeader();
      renderList();
      renderDetail();
      renderRoadmapProgress();
    });
    li.append(box);
    li.append(el('span', null, `medal ${trophy.grade}`));

    const main = el('div');
    const name = el('div', null, 'trophy-name');
    name.append(document.createTextNode(masked ? 'Hidden trophy' : trophy.name));
    if (trophy.hidden && !masked) name.append(el('span', 'Hidden', 'hidden-tag'));
    main.append(name);
    main.append(el('div', masked ? 'Hidden on PlayStation until earned — tick it off to reveal it.' : trophy.description, 'trophy-desc'));
    const tags = el('div', null, 'trophy-tags');
    tags.append(el('span', GRADE_LABEL[trophy.grade], 'tag'));
    for (const kind of trophy.kinds) {
      if (kind === 'missable') tags.append(el('span', 'Missable', 'tag missable'));
      else tags.append(el('span', KIND_LABEL[kind], `tag kind-${kind}`));
    }
    if (trophy.chapter && !masked) tags.append(el('span', trophy.chapter, 'tag'));
    if (trophy.stage) tags.append(el('span', `Step ${trophy.stage}`, 'tag'));
    main.append(tags);
    li.append(main);

    const right = el('div', null, 'trophy-count');
    if (trophy.count) {
      const n = getCount(progress, trophy.id);
      right.append(el('span', `${n}/${trophy.count} ${trophy.countLabel}`, n >= trophy.count ? 'count-done' : null));
    } else if (earned) {
      right.append(el('span', '✓ Earned', 'count-done'));
    }
    li.append(right);
    listEl.append(li);
  }
}

function sourceListItems(sources) {
  const ul = el('ul', null, 'source-list-detail');
  for (const key of sources) {
    const source = doc.sources[key];
    if (!source) continue;
    const li = el('li');
    const a = document.createElement('a');
    a.href = source.url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = source.label;
    li.append(a);
    ul.append(li);
  }
  return ul;
}

function renderDetail() {
  detailEl.replaceChildren();
  const trophy = byId.get(ui.selectedId);
  if (!trophy) {
    detailEl.append(el('div', null, 'detail-empty'));
    const empty = detailEl.firstChild;
    empty.append(el('h2', 'Pick a trophy to see its guide'));
    empty.append(el('p', 'Click any row in the checklist. Each guide is written in this guide\u2019s own words and names its sources — what to do, where and how, and when it can be missed.'));
    const stats = el('p');
    const missables = trophies.filter((t) => t.missable).length;
    const hidden = trophies.filter((t) => t.hidden).length;
    stats.append(document.createTextNode(`${trophies.length} trophies · ${hidden} hidden until earned · ${missables} possibly missable · 0 online. Start with Step 1 of the roadmap, and do the Chapter 1 meditation while you still can.`));
    empty.append(stats);
    return;
  }
  const earned = isEarned(progress, trophy.id);
  const masked = isMasked(trophy);
  detailEl.append(el('h2', masked ? 'Hidden trophy' : trophy.name));
  detailEl.append(el('p', masked ? 'Hidden on PlayStation until earned.' : trophy.description, 'official-desc'));
  const meta = el('p', null, 'meta-line');
  meta.append(el('b', GRADE_LABEL[trophy.grade]));
  meta.append(document.createTextNode(` · ${trophy.hidden ? 'Hidden' : 'Visible'} on PlayStation`));
  if (trophy.chapter && !masked) meta.append(document.createTextNode(` · ${trophy.chapter}`));
  if (trophy.stage) meta.append(document.createTextNode(` · Roadmap step ${trophy.stage}`));
  meta.append(document.createTextNode(earned ? ' · Earned ✓' : ' · Not earned yet'));
  detailEl.append(meta);

  if (trophy.missable) {
    const banner = el('div', null, 'missable-banner');
    banner.append(el('strong', '⚠ Possibly missable — '));
    banner.append(document.createTextNode('the only trophy PowerPyx flags. Do the Chapter 1 meditation before that chapter ends; whether it is required is still unconfirmed.'));
    detailEl.append(banner);
  }

  detailEl.append(el('h3', 'How to unlock it'));
  detailEl.append(el('p', trophy.guide, 'guide-text'));

  if (trophy.count) {
    detailEl.append(el('h3', 'Your count'));
    const counter = el('div', null, 'counter');
    const minus = el('button', '−');
    const readout = el('span', null, 'count-readout');
    const plus = el('button', '+');
    const refreshCounter = () => {
      const n = getCount(progress, trophy.id);
      readout.textContent = `${n} / ${trophy.count} ${trophy.countLabel}`;
      if (n >= trophy.count && !isEarned(progress, trophy.id)) {
        setEarned(progress, trophy.id, true);
        renderHeader();
        renderList();
      }
    };
    minus.addEventListener('click', () => {
      setCount(progress, trophy.id, getCount(progress, trophy.id) - 1, trophy.count);
      refreshCounter();
      renderList();
    });
    plus.addEventListener('click', () => {
      setCount(progress, trophy.id, getCount(progress, trophy.id) + 1, trophy.count);
      refreshCounter();
      renderList();
    });
    refreshCounter();
    counter.append(minus, readout, plus);
    detailEl.append(counter);
    if (getCount(progress, trophy.id) >= trophy.count) {
      detailEl.append(el('p', 'Target reached — marked earned.'));
    }
  }

  detailEl.append(el('h3', 'Your note'));
  const note = document.createElement('textarea');
  note.className = 'note-box';
  note.placeholder = 'Your own note — where you left off, a spot that worked…';
  note.value = getNote(progress, trophy.id);
  note.addEventListener('input', () => setNote(progress, trophy.id, note.value));
  detailEl.append(note);

  detailEl.append(el('h3', 'Sources'));
  detailEl.append(sourceListItems(trophy.src));
  const honesty = el('p', null, 'source-note');
  honesty.textContent = 'Name, description and grade as PlayStation publishes them (Exophase / PSNProfiles). The guide above is this guide\u2019s own words.';
  detailEl.append(honesty);
}

function renderRoadmap() {
  const stepsEl = $('roadmapSteps');
  stepsEl.replaceChildren();
  for (const step of doc.roadmap) {
    const stepTrophies = trophies.filter((t) => t.stage === step.step);
    const done = stepTrophies.filter((t) => isEarned(progress, t.id)).length;
    const card = el('div', null, 'step');
    card.append(el('h2', `Step ${step.step}: ${step.title}`));
    card.append(el('p', step.time, 'step-time'));
    card.append(el('p', step.text));
    card.append(el('p', `${done} of ${stepTrophies.length} trophies in this step earned`, 'step-count'));
    const chips = el('div', null, 'step-trophies');
    for (const t of stepTrophies) {
      const chip = el('span', isMasked(t) ? 'Hidden trophy' : t.name, `tag${isEarned(progress, t.id) ? ' done' : ''}`);
      chips.append(chip);
    }
    card.append(chips);
    stepsEl.append(card);
  }
  renderRoadmapProgress();
}

function renderRoadmapProgress() {
  const wrap = $('roadmapProgress');
  if (!wrap) return;
  wrap.replaceChildren();
  for (const step of doc.roadmap) {
    const stepTrophies = trophies.filter((t) => t.stage === step.step);
    const done = stepTrophies.filter((t) => isEarned(progress, t.id)).length;
    const row = el('div', null, 'roadmap-row');
    row.append(el('span', `Step ${step.step} — ${step.title}`));
    const bar = el('div', null, 'mini-bar');
    bar.append(el('div'));
    bar.firstChild.style.width = `${stepTrophies.length ? Math.round((done / stepTrophies.length) * 100) : 0}%`;
    row.append(bar);
    row.append(el('span', `${done}/${stepTrophies.length}`, 'row-count'));
    wrap.append(row);
  }
}

function renderMissables() {
  const wrap = $('missableList');
  wrap.replaceChildren();
  for (const trophy of trophies.filter((t) => t.missable)) {
    const card = el('div', null, 'missable-card');
    card.append(el('h2', trophy.name));
    card.append(el('p', trophy.description, 'official-desc'));
    card.append(el('p', trophy.guide, 'guide-text'));
    card.append(el('h3', 'Sources'));
    card.append(sourceListItems(trophy.src));
    wrap.append(card);
  }
}

function renderSources() {
  const ul = $('sourceList');
  ul.replaceChildren();
  for (const source of Object.values(doc.sources)) {
    const li = el('li');
    const a = document.createElement('a');
    a.href = source.url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = source.label;
    li.append(a);
    ul.append(li);
  }
}

function switchView(view) {
  ui.view = view;
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.view === view);
  });
  document.querySelectorAll('.view').forEach((section) => {
    section.hidden = section.id !== `view-${view}`;
  });
  if (view === 'roadmap') renderRoadmap();
  if (view === 'missables') renderMissables();
}

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => switchView(tab.dataset.view));
});

$('search').addEventListener('input', (event) => {
  ui.search = event.target.value;
  renderList();
});
$('kindChips').addEventListener('click', (event) => {
  const chip = event.target.closest('[data-kind]');
  if (!chip) return;
  ui.kind = chip.dataset.kind;
  document.querySelectorAll('#kindChips .chip').forEach((c) => {
    c.classList.toggle('active', c === chip);
  });
  renderList();
});
$('gradeFilter').addEventListener('change', (event) => {
  ui.grade = event.target.value;
  renderList();
});
$('earnedOnly').addEventListener('change', (event) => {
  ui.earnedOnly = event.target.checked;
  renderList();
});
$('spoilerToggle').addEventListener('change', (event) => {
  progress.spoiler = event.target.checked;
  saveProgress(progress);
  renderList();
  renderDetail();
});
$('exportBtn').addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([exportProgress(progress)], { type: 'application/json' }));
  a.download = 'leonida-ledger-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
});
$('importFile').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    progress = importProgress(await file.text());
    saveProgress(progress);
    $('spoilerToggle').checked = progress.spoiler;
    renderHeader();
    renderList();
    renderDetail();
    renderRoadmapProgress();
  } catch {
    alert('That file is not a Leonida Ledger progress export — nothing was changed.');
  }
  event.target.value = '';
});

// Initial state from the saved record and the query params.
$('spoilerToggle').checked = progress.spoiler;
if (ui.kind !== 'all') {
  document.querySelectorAll('#kindChips .chip').forEach((c) => {
    c.classList.toggle('active', c.dataset.kind === ui.kind);
  });
}
if (ui.grade !== 'all') $('gradeFilter').value = ui.grade;
if (ui.earnedOnly) $('earnedOnly').checked = true;
if (!ui.selectedId) {
  // Open on the missable trophy by default: it is the one thing a reader
  // must not miss.
  ui.selectedId = 28;
}

renderHeader();
renderList();
renderDetail();
renderRoadmap();
renderMissables();
renderSources();
switchView(ui.view);

window.__shotReady = true;
