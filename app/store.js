// Leonida Ledger progress store.
// Progress lives in this browser only (localStorage) and can be exported to
// a file and imported back. Nothing here touches the network, and nothing
// here reads the trophy list — callers pass trophies in where a helper
// needs them, so this file stays testable on its own.

export const STORE_KEY = 'leonida-ledger-v1';

// A fresh progress record: earned flags, count-tracker values and personal
// notes, all keyed by trophy id, plus the spoiler setting.
export function emptyProgress() {
  return { earned: {}, counts: {}, notes: {}, spoiler: false };
}

export function loadProgress() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return emptyProgress();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return emptyProgress();
    return {
      earned: objectOfBooleans(parsed.earned),
      counts: objectOfNumbers(parsed.counts),
      notes: objectOfStrings(parsed.notes),
      spoiler: parsed.spoiler === true,
    };
  } catch {
    return emptyProgress();
  }
}

// Saving must never crash the app: a full or blocked store just means this
// session's ticks are not kept. Returns true when the record was stored.
export function saveProgress(progress) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}

// Wipe the record entirely (Reset button). Returns a fresh empty record so
// the caller can keep rendering from one value.
export function resetProgress() {
  try {
    localStorage.removeItem(STORE_KEY);
  } catch {
    // A blocked store has nothing to remove; the fresh record still applies.
  }
  return emptyProgress();
}

export function isEarned(progress, id) {
  return progress.earned[id] === true;
}

export function setEarned(progress, id, value) {
  if (value) progress.earned[id] = true;
  else delete progress.earned[id];
  saveProgress(progress);
}

export function getCount(progress, id) {
  const n = progress.counts[id];
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

export function setCount(progress, id, value, target) {
  const n = Math.max(0, Math.min(target ?? value, Math.floor(value)));
  if (n <= 0) delete progress.counts[id];
  else progress.counts[id] = n;
  saveProgress(progress);
  return n;
}

export function getNote(progress, id) {
  return typeof progress.notes[id] === 'string' ? progress.notes[id] : '';
}

export function setNote(progress, id, text) {
  if (text) progress.notes[id] = text;
  else delete progress.notes[id];
  saveProgress(progress);
}

// Earned totals per grade, for the masthead line: { platinum: [got, total], … }.
export function countEarnedByGrade(trophies, progress) {
  const out = {};
  for (const grade of ['platinum', 'gold', 'silver', 'bronze']) {
    const ofGrade = trophies.filter((t) => t.grade === grade);
    out[grade] = [ofGrade.filter((t) => isEarned(progress, t.id)).length, ofGrade.length];
  }
  return out;
}

// The next trophy to chase: the first unearned one in roadmap order
// (earliest roadmap step first, then list order). Null when all are earned.
export function nextUnearned(trophies, progress) {
  const pending = trophies.filter((t) => !isEarned(progress, t.id));
  if (pending.length === 0) return null;
  pending.sort((a, b) => (a.stage ?? 99) - (b.stage ?? 99) || a.id - b.id);
  return pending[0];
}

// Serialise progress for the export file.
export function exportProgress(progress) {
  return JSON.stringify(progress, null, 2);
}

// Parse an imported progress file. Throws on anything that is not a
// Leonida Ledger progress record, so a wrong file never wipes real progress.
export function importProgress(text) {
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('not a progress file');
  }
  if (parsed.earned !== undefined && !isPlainObject(parsed.earned)) throw new Error('bad earned block');
  if (parsed.counts !== undefined && !isPlainObject(parsed.counts)) throw new Error('bad counts block');
  if (parsed.notes !== undefined && !isPlainObject(parsed.notes)) throw new Error('bad notes block');
  return {
    earned: objectOfBooleans(parsed.earned),
    counts: objectOfNumbers(parsed.counts),
    notes: objectOfStrings(parsed.notes),
    spoiler: parsed.spoiler === true,
  };
}

// Demo progress for screenshots: 13 of 55 earned, a few counters part way.
// Only ever used when the page is opened with ?seed=13.
export function seedDemo(trophies) {
  const progress = emptyProgress();
  const earnedIds = [2, 3, 8, 9, 20, 21, 35, 42, 44, 46, 52, 53, 55];
  for (const id of earnedIds) progress.earned[id] = true;
  const partial = { 15: 187, 17: 31, 28: 11, 31: 64, 32: 38, 48: 342 };
  for (const [id, n] of Object.entries(partial)) {
    const trophy = trophies.find((t) => t.id === Number(id));
    if (trophy && trophy.count) progress.counts[id] = Math.min(n, trophy.count);
  }
  return progress;
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function objectOfBooleans(value) {
  const out = {};
  if (isPlainObject(value)) {
    for (const [k, v] of Object.entries(value)) if (v === true) out[k] = true;
  }
  return out;
}

function objectOfNumbers(value) {
  const out = {};
  if (isPlainObject(value)) {
    for (const [k, v] of Object.entries(value)) {
      if (Number.isFinite(v) && v > 0) out[k] = Math.floor(v);
    }
  }
  return out;
}

function objectOfStrings(value) {
  const out = {};
  if (isPlainObject(value)) {
    for (const [k, v] of Object.entries(value)) {
      if (typeof v === 'string' && v) out[k] = v;
    }
  }
  return out;
}
