#!/usr/bin/env node
// navet-webview83-compat: build a WebView-83-compatible copy of the Navet Home Assistant integration.
// Usage: node build.mjs <path/to/custom_components/navet> <output-dir>
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
import * as esbuild from 'esbuild';
import { processCss } from './lib/css.mjs';

const [src, out] = process.argv.slice(2);
if (!src || !out) { console.error('Usage: node build.mjs <navet-folder> <output-dir>'); process.exit(1); }
const fe = path.join(src, 'frontend');
if (!fs.existsSync(path.join(fe, 'navet-panel.js'))) { console.error('Not a Navet folder (frontend/navet-panel.js missing)'); process.exit(1); }
if (fs.existsSync(out)) { console.error(`Output ${out} already exists - choose an empty path`); process.exit(1); }

// 1) copy integration (skip caches and old backups)
fs.cpSync(src, out, { recursive: true, filter: p => !/__pycache__|\.(bak|pre-|backup)/.test(path.basename(p)) });
const ofe = path.join(out, 'frontend');

// 2) CSS
const cssFiles = fs.readdirSync(path.join(fe, 'assets')).filter(f => /\.css$/.test(f));
const conds = {}; const stats = {};
for (const f of cssFiles) {
  const r = processCss(fs.readFileSync(path.join(fe, 'assets', f), 'utf8'), stats);
  fs.writeFileSync(path.join(ofe, 'assets', f), r.css);
  for (const [k, v] of Object.entries(r.conds)) { const l = (conds[k] ||= []); v.forEach(c => l.some(x => x.cls === c.cls) || l.push(c)); }
}
const ver = crypto.createHash('sha1').update(cssFiles.map(f => fs.readFileSync(path.join(ofe, 'assets', f))).join('')).digest('hex').slice(0, 8);

// 3) JS bundle (single file, syntax lowered for Chrome 83)
const res = await esbuild.build({ entryPoints: [path.join(fe, 'navet-panel.js')], bundle: true, format: 'esm',
  target: 'chrome83', write: false, logLevel: 'warning', loader: { '.svg': 'file', '.webp': 'file', '.avif': 'file', '.woff2': 'file', '.png': 'file' }, outdir: 'x' });
let js = res.outputFiles.find(f => f.path.endsWith('.js')).text;

// 4) bundle patches
let n = 0;
js = js.replace(/return (\w+) \? `image-set\(url\("\$\{([\w$]+)\((\w+)\.avifSrc\)\}"\) type\("image\/avif"\) 1x, url\("\$\{\2\(\3\.webpSrc\)\}"\) type\("image\/webp"\) 1x\)` : null;/,
  (m, c, fn, o) => { n++; return `return ${c} ? ((window.__navetIST ?? (window.__navetIST = !!(window.CSS && CSS.supports && CSS.supports(\`background-image\`, \`image-set(url("x.webp") type("image/webp") 1x)\`)))) ? \`image-set(url("\${${fn}(${o}.avifSrc)}") type("image/avif") 1x, url("\${${fn}(${o}.webpSrc)}") type("image/webp") 1x)\` : \`url("\${${fn}(${o}.webpSrc)}")\`) : null;`; });
if (!n) console.warn('WARN: wallpaper image-set patch not applied (pattern changed in this Navet version)');
for (const f of cssFiles) js = js.split(`/api/navet/static/assets/${f}\``).join(`/api/navet/static/assets/${f}?v=${ver}\``);

// 5) CSS loader (Navet loads its CSS into the panel; old WebView also needs it in the document) + polyfills
const loader = `(()=>{const root="/api/navet/static/assets/";for(const file of ${JSON.stringify(cssFiles)}){if(!document.querySelector('link[data-navet-compat-css="'+file+'"]')){const l=document.createElement("link");l.rel="stylesheet";l.href=root+file+"?v=${ver}";l.setAttribute("data-navet-compat-css",file);document.head.appendChild(l)}}})();`;
const poly = fs.readFileSync(new URL('./polyfills.js', import.meta.url), 'utf8').replace('/*__CQ_CONDS__*/{}', JSON.stringify(conds));
fs.writeFileSync(path.join(ofe, 'navet-panel.js'), poly + '\n' + loader + '\n' + js);

console.log('Built', out, '| css', cssFiles.length, 'files, version', ver, '| image-set patch', n ? 'ok' : 'MISSING');
console.log('CSS stats', stats);
