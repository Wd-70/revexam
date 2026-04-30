import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PUBLIC = resolve(ROOT, 'public');
const ICONS = resolve(PUBLIC, 'icons');

mkdirSync(ICONS, { recursive: true });

// Source SVG: simple R logomark
const SRC_SVG = readFileSync(resolve(PUBLIC, 'favicon.svg'));

// Standard icons (transparent background -> theme background)
async function buildStandard(size, filename) {
  const png = await sharp(SRC_SVG, { density: 384 })
    .resize(size, size, { fit: 'contain', background: { r: 15, g: 17, b: 21, alpha: 1 } })
    .flatten({ background: { r: 15, g: 17, b: 21 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
  writeFileSync(resolve(ICONS, filename), png);
  console.log(`  ✓ ${filename} (${size}x${size})`);
}

// Maskable icon: needs ~10% safe-zone padding around the logomark
async function buildMaskable(size, filename) {
  const padded = Math.round(size * 0.62); // logomark at ~62% of canvas (within 80% safe zone)
  const inner = await sharp(SRC_SVG, { density: 384 })
    .resize(padded, padded, { fit: 'contain' })
    .toBuffer();

  const canvas = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 15, g: 17, b: 21, alpha: 1 },
    },
  })
    .composite([{ input: inner, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toBuffer();
  writeFileSync(resolve(ICONS, filename), canvas);
  console.log(`  ✓ ${filename} (${size}x${size}, maskable)`);
}

// Apple touch icon: rounded rectangle is applied by iOS automatically; just need a 180x180 square
async function buildAppleTouch() {
  await buildStandard(180, 'apple-touch-icon.png');
}

console.log('Generating PWA icons…');
await buildStandard(192, 'icon-192.png');
await buildStandard(512, 'icon-512.png');
await buildMaskable(512, 'icon-maskable.png');
await buildAppleTouch();
console.log('Done.');
