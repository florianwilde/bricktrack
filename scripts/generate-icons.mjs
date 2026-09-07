/**
 * Renders the app icons from one SVG source.
 *
 * Run with `node scripts/generate-icons.mjs` after changing the mark; the
 * results are committed so neither the build nor the container needs to draw
 * anything at runtime.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const OUT_DIR = path.resolve(process.cwd(), 'public/icons');

// Four studs on a rounded plate - readable down to 32px, which a detailed
// brick drawing would not be.
const mark = (background, foreground) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="${background}"/>
  <g fill="${foreground}">
    <rect x="112" y="112" width="128" height="128" rx="28"/>
    <rect x="272" y="112" width="128" height="128" rx="28"/>
    <rect x="112" y="272" width="128" height="128" rx="28"/>
    <rect x="272" y="272" width="128" height="128" rx="28"/>
  </g>
</svg>`;

/**
 * A maskable icon has to survive being cropped to a circle, so the mark sits
 * on a full-bleed background with generous padding.
 */
const maskable = (background, foreground) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${background}"/>
  <g fill="${foreground}">
    <rect x="146" y="146" width="100" height="100" rx="22"/>
    <rect x="266" y="146" width="100" height="100" rx="22"/>
    <rect x="146" y="266" width="100" height="100" rx="22"/>
    <rect x="266" y="266" width="100" height="100" rx="22"/>
  </g>
</svg>`;

const DARK = '#0a0a0a';
const LIGHT = '#fafafa';

const targets = [
  { file: 'icon-192.png', size: 192, svg: mark(DARK, LIGHT) },
  { file: 'icon-512.png', size: 512, svg: mark(DARK, LIGHT) },
  { file: 'icon-maskable-512.png', size: 512, svg: maskable(DARK, LIGHT) },
  { file: 'apple-touch-icon.png', size: 180, svg: mark(DARK, LIGHT) },
];

fs.mkdirSync(OUT_DIR, { recursive: true });

for (const target of targets) {
  await sharp(Buffer.from(target.svg))
    .resize(target.size, target.size)
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT_DIR, target.file));
  console.log(`[icons] ${target.file} (${target.size}px)`);
}

// The favicon keeps the same mark so the browser tab matches the home screen.
await sharp(Buffer.from(mark(DARK, LIGHT)))
  .resize(32, 32)
  .png({ compressionLevel: 9 })
  .toFile(path.resolve(process.cwd(), 'public/favicon.png'));
console.log('[icons] favicon.png (32px)');
