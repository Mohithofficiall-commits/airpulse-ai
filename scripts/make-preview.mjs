// Creates dist/preview.html: the built app with JS + CSS inlined,
// so it can be served as a single static file (e.g. the Preview tab).
import { readFileSync, writeFileSync } from 'node:fs';

const html = readFileSync('dist/index.html', 'utf8');

// Find asset paths regardless of base prefix (e.g. "/airpulse-ai/assets/...").
const jsPath = [...html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)]
  .map((m) => m[1])
  .find((src) => src.includes('/assets/') && src.endsWith('.js'));
const cssPath = [...html.matchAll(/<link[^>]*\shref="([^"]+)"/g)]
  .map((m) => m[1])
  .find((href) => href.includes('/assets/') && href.endsWith('.css'));
if (!jsPath || !cssPath) throw new Error('Built asset references not found in dist/index.html');

const js = readFileSync('dist' + jsPath.replace(/^.*\/assets\//, '/assets/'), 'utf8');
const css = readFileSync('dist' + cssPath.replace(/^.*\/assets\//, '/assets/'), 'utf8');

// Inline the module script. Replace `</script` (which would close the tag early)
// with `\u003C/script` — identical inside JS strings, never an HTML end tag.
const inlinedScript = '<script type="module">' + js.replace(/<\/script/g, '\\u003C/script') + '</script>';
const scriptTag = html.match(/<script[^>]*\ssrc="[^"]*assets\/[^"]*\.js"[^>]*><\/script>/)[0];

let out = html.replace(scriptTag, () => inlinedScript);

const cssTag = html.match(/<link[^>]*\shref="[^"]*assets\/[^"]*\.css"[^>]*>/)[0];
out = out.replace(cssTag, () => '<style>' + css + '</style>');
out = out.replace(/<link rel="modulepreload"[^>]*>/g, '');

writeFileSync('dist/preview.html', out);
console.log(`dist/preview.html written (${(out.length / 1024).toFixed(0)} KB, inlined ${jsPath} + ${cssPath})`);
