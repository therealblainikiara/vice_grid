// build.mjs — produce dist/vice-grid-demo.html: one self-contained file.
// Bundles src/main.js (three.js included) with esbuild and inlines the result
// into index.html in place of the importmap + module script, so the demo runs
// from a double-click, a static host, or an artifact page with a strict CSP.
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const stamp = new Date().toISOString().slice(0, 10);

const result = await build({
  entryPoints: [path.join(root, 'src/main.js')],
  bundle: true,
  minify: true,
  format: 'iife',
  target: 'es2022',
  write: false,
  legalComments: 'inline', // keep the three.js MIT notice in the shipped file
});
const js = result.outputFiles[0].text;

let html = readFileSync(path.join(root, 'index.html'), 'utf8');

// strip the importmap (dev-only) and swap the module script for the bundle
html = html.replace(/<script type="importmap">[\s\S]*?<\/script>\s*/, '');
html = html.replace(
  /<script type="module" src="\.\/src\/main\.js"><\/script>/,
  () => `<script>${js}</script>`,
);

// demo badge on the title screen
html = html.replace(
  '<div class="tagline">Cobalt City · 2030 · Two badges left</div>',
  `<div class="tagline">Cobalt City · 2030 · Two badges left</div>
    <div class="hint" style="color:var(--gold)">FEEDBACK DEMO · ${stamp} · missions 1–10 playable · progress saves in your browser</div>`,
);

mkdirSync(path.join(root, 'dist'), { recursive: true });
const out = path.join(root, 'dist/vice-grid-demo.html');
writeFileSync(out, html);
console.log(`built ${out} (${(html.length / 1024 / 1024).toFixed(2)} MB)`);
