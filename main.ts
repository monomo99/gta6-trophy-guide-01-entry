// Leonida Ledger v2 — hand-in program (Node 22+, standard library only).
// Copies app/ and screenshots/ from beside this file into the output
// directory, writes dossier.json with buildDossier from the vendored
// make.fun frontend library, then validates the result.
import { cp, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-frontend.ts";

const repoRoot = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(process.env.MAKEFUN_OUTPUT_DIR ?? "/output");
const appDir = path.join(repoRoot, "app");
const shotsDir = path.join(repoRoot, "screenshots");
const outAppDir = path.join(outDir, "app");
const outShotsDir = path.join(outDir, "screenshots");
const dossierPath = path.join(outDir, "dossier.json");

const MAX_DOSSIER_BYTES = 1572864;

async function countFiles(dir: string): Promise<number> {
  const entries = await readdir(dir, { withFileTypes: true });
  let n = 0;
  for (const e of entries) {
    const p = path.join(dir, e.name);
    n += e.isDirectory() ? await countFiles(p) : 1;
  }
  return n;
}

async function main(): Promise<void> {
  await mkdir(outDir, { recursive: true });

  // 1. Copy the app and its screenshots into the output directory.
  await cp(appDir, outAppDir, { recursive: true });
  await cp(shotsDir, outShotsDir, { recursive: true });

  // 2. Build the dossier from exactly what was handed in.
  // buildDossier(rootDir, caps) reads rootDir/app and rootDir/screenshots
  // and returns the dossier as bytes (a Uint8Array); write them verbatim.
  // caps.text_max_bytes is the dossier's byte cap (1.5 MiB); it is a
  // validation limit only and is not embedded in the dossier itself.
  const dossier = await buildDossier(outDir, { text_max_bytes: MAX_DOSSIER_BYTES });
  const dossierBytesRaw =
    dossier instanceof Uint8Array
      ? dossier
      : Buffer.from(typeof dossier === "string" ? dossier : JSON.stringify(dossier));
  await writeFile(dossierPath, dossierBytesRaw);

  // 3. Validate the result before reporting success.
  const parsed = JSON.parse(await readFile(dossierPath, "utf8"));
  if (parsed === null || typeof parsed !== "object") {
    throw new Error("dossier.json did not parse into an object");
  }
  const dossierBytes = (await stat(dossierPath)).size;
  if (dossierBytes > MAX_DOSSIER_BYTES) {
    throw new Error(`dossier.json is ${dossierBytes} bytes, over the 1572864 byte limit`);
  }
  const indexStat = await stat(path.join(outAppDir, "index.html"));
  if (!indexStat.isFile() || indexStat.size === 0) {
    throw new Error("output is missing app/index.html");
  }
  const trophyData = JSON.parse(await readFile(path.join(outAppDir, "data", "trophies.json"), "utf8"));
  const trophyList = Array.isArray(trophyData) ? trophyData : trophyData.trophies;
  if (!Array.isArray(trophyList) || trophyList.length !== 55) {
    throw new Error(`expected 55 trophies in app/data/trophies.json, found ${Array.isArray(trophyList) ? trophyList.length : "none"}`);
  }
  if (trophyList.some((t: { name?: unknown; guide?: unknown }) => !t.name || !t.guide)) {
    throw new Error("every trophy in app/data/trophies.json needs a name and a guide");
  }
  const shotFiles = (await readdir(outShotsDir)).filter((f) => !f.startsWith("."));
  if (shotFiles.length < 3 || shotFiles.length > 4) {
    throw new Error(`expected 3-4 screenshots in output, found ${shotFiles.length}`);
  }
  for (const f of shotFiles) {
    const s = await stat(path.join(outShotsDir, f));
    if (s.size > 262144) throw new Error(`screenshot ${f} is ${s.size} bytes, over the 256 KiB limit`);
  }
  const appFiles = await countFiles(outAppDir);
  console.log(
    `Leonida Ledger v2: ${appFiles} app files, ${shotFiles.length} screenshots, ` +
    `dossier.json ${dossierBytes} bytes — OK (${path.relative(process.cwd(), outDir) || outDir})`,
  );
}

await main();
