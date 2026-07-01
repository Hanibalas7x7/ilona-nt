/**
 * compress-images.mjs
 *
 * Nuskaito visus vaizdus iš  images-raw/**
 * Kompresuoja į WebP (80 %, max 1400 px pločio) ir išsaugo į images/**
 * Išlaiko tą pačią aplankų struktūrą.
 *
 * Naudojimas:
 *   npm run build          – vienkartinis paleidimas
 *   node scripts/compress-images.mjs --watch  – stebi failus (kuriant)
 */

import sharp from 'sharp';
import { readdir, mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const SRC_DIR  = 'images-raw';
const OUT_DIR  = 'images';
const MAX_WIDTH = 1400;
const QUALITY   = 80;
const THUMB_WIDTH = 400;   // miniatiūroms – pats main.js naudoja tą patį failą, bet galite skirti

const SUPPORTED = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tiff', '.bmp']);

// ─────────────────────────────────────────────────────────────────────────────

async function walkDir(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walkDir(fullPath));
    } else if (SUPPORTED.has(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }
  return files;
}

async function processFile(srcPath) {
  // pvz.  images-raw/obj1/foto1.jpg  →  images/obj1/foto1.webp
  const rel     = path.relative(SRC_DIR, srcPath);
  const outRel  = rel.replace(/\.[^.]+$/, '.webp');
  const outPath = path.join(OUT_DIR, outRel);
  const outDir  = path.dirname(outPath);

  // Praleidziam jei išvesties failas naujesnis
  if (existsSync(outPath)) {
    const [srcStat, outStat] = await Promise.all([stat(srcPath), stat(outPath)]);
    if (outStat.mtimeMs >= srcStat.mtimeMs) {
      console.log(`  skip  ${outRel}`);
      return;
    }
  }

  await mkdir(outDir, { recursive: true });

  await sharp(srcPath)
    .rotate()                          // ištaiso EXIF orientaciją
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toFile(outPath);

  const [srcS, outS] = await Promise.all([stat(srcPath), stat(outPath)]);
  const saved = (((srcS.size - outS.size) / srcS.size) * 100).toFixed(0);
  console.log(`  ✓  ${outRel}  (${kb(srcS.size)} → ${kb(outS.size)}, -${saved}%)`);
}

function kb(bytes) {
  return bytes > 1024 * 1024
    ? (bytes / 1024 / 1024).toFixed(1) + ' MB'
    : Math.round(bytes / 1024) + ' KB';
}

// ─────────────────────────────────────────────────────────────────────────────

async function runBuild() {
  if (!existsSync(SRC_DIR)) {
    console.log(`Aplankas "${SRC_DIR}" nerastas – nėra ką kompresuoti.`);
    return;
  }

  const files = await walkDir(SRC_DIR);
  if (files.length === 0) {
    console.log(`"${SRC_DIR}" aplankas tuščias.`);
    return;
  }

  console.log(`\nKompresuojama ${files.length} nuotrauk${files.length === 1 ? 'a' : 'os'}...\n`);
  for (const f of files) {
    await processFile(f);
  }
  console.log('\nAtlikta!\n');
}

// ─────────────────────────────────────────────────────────────────────────────

const watch = process.argv.includes('--watch');

if (watch) {
  // Paprastas --watch naudojant Node.js fs.watch (nereikia papildomų bibliotekų)
  const { watch: fsWatch } = await import('node:fs');

  await runBuild();
  console.log(`Stebiu "${SRC_DIR}" pakeitimus...\n`);

  let debounce;
  fsWatch(SRC_DIR, { recursive: true }, (event, filename) => {
    if (!filename) return;
    const ext = path.extname(filename).toLowerCase();
    if (!SUPPORTED.has(ext)) return;
    clearTimeout(debounce);
    debounce = setTimeout(async () => {
      console.log(`Pasikeitė: ${filename}`);
      await runBuild();
    }, 300);
  });
} else {
  await runBuild();
}
