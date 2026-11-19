// Leonida Ledger — hand-in program for gta6-trophy-guide-01 (Node 22,
// standard library only).
//
// The guide itself is this directory's app/ folder: plain static files a
// browser opens at app/index.html (ES modules, CSS, one JSON data file, no
// build step), offline — it loads nothing over the network, and its trophy
// list and guides are app/data/trophies.json. This program hands it in: it
// copies app/ and screenshots/ from beside this file to /output and writes
// /output/dossier.json, the summary the judge reads (your screenshots, the
// first load's files and bytes, and your source), with the vendored make.fun
// library. Leave vendor/makefun-frontend.ts exactly as the kit ships it:
// the scorer requires dossier.json to be byte for byte what its own copy
// of that library writes.
//
// Serve the guide locally with `node serve.ts`, then open
// http://localhost:8080. Outside the grader's container,
// MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Pre-flight: refuse a half-built hand-in instead of shipping it. The
// scorer would refuse it anyway; failing here, loudly, beats a silent
// invalid entry. Screenshots are checked by name, not just by folder:
// the gate needs 3 or 4 of them, each a PNG or JPEG.
const appDir = join(here, 'app');
const shotsDir = join(here, 'screenshots');
if (!existsSync(join(appDir, 'index.html'))) {
  throw new Error('app/index.html is missing — the guide was not built');
}
if (!existsSync(join(appDir, 'data', 'trophies.json'))) {
  throw new Error('app/data/trophies.json is missing — the trophy list was not built');
}
const shots = existsSync(shotsDir)
  ? readdirSync(shotsDir).filter((f) => /\.(png|jpe?g)$/i.test(f) && statSync(join(shotsDir, f)).isFile())
  : [];
if (shots.length < 3 || shots.length > 4) {
  throw new Error(`expected 3 or 4 screenshots, found ${shots.length}`);
}

mkdirSync(out, { recursive: true });
cpSync(appDir, join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes
// the dossier's bytes; the others refuse an entry the scorer would refuse
// (more than 4 screenshots or one over 256 KiB; more than 993 files and
// directories in app/ or 48 MiB of app files: app/ counts beside /output's
// own 1000-entry cap, its screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 }),
);

// Post-write check: the dossier must exist, parse as JSON and fit the
// scorer's 1.5 MiB cap. A corrupt or oversized dossier is a failed hand-in,
// so fail here instead of letting the grader discover it.
const dossierPath = join(out, 'dossier.json');
const dossierBytes = statSync(dossierPath).size;
if (dossierBytes === 0 || dossierBytes > 1572864) {
  throw new Error(`dossier.json is ${dossierBytes} bytes — expected between 1 and 1572864`);
}
JSON.parse(readFileSync(dossierPath, 'utf8'));
