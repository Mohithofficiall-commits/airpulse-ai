// Creates dist/preview.html: the built app with JS + CSS inlined,
// so it can be served as a single static file (e.g. the Preview tab).
import { readFileSync, writeFileSync } from 'node:fs';

let html = readFileSync('dist/index.html', 'utf8');

const jsPath = html.match(/<script type="module"[^>]*src="\.?\/?(assets\/[^"]+)"/)?.[1];
const cssPath = html.match(/<link rel="stylesheet"[^>]*href="\.?\/?(assets\/[^"]+)"/)?.[1];
if (!jsPath || !cssPath) throw new Error('Built asset references not found in dist/index.html');

const js = readFileSync(`dist/${jsPath}`, 'utf8');
const css = readFileSync(`dist/${cssPath}`, 'utf8');

// Inline the module script. Replace `</script` (which would close the tag early)
// with `\u003C/script` — identical inside JS strings/templates, and can never be
// parsed as an HTML end tag.
const inlinedScript = `<script type="module">${js.replace(/<\/script/g, String.raw`\u003C/script`)}<\/script>`;
html = html.replace(/<script type="module"[^>]*><\/script>/, inlinedScript);

// Inline the stylesheet.
html = html.replace(/<link rel="stylesheet"[^>]*href="\.?\/?assets\/[^"]+"[^>]*>/, `<style>${css}</style>`);

// Drop modulepreload hints (nothing left to preload).
html = html.replace(/<link rel="modulepreload"[^>]*>/g, '');

writeFileSync('dist/preview.html', html);
console.log(`dist/preview.html written (${(html.length / 1024).toFixed(0)} KB, inlined ${jsPath} + ${cssPath})`);
