import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const requireFrontend = createRequire(new URL('../../frontend/package.json', import.meta.url));
const { build } = await import(pathToFileURL(requireFrontend.resolve('vite')).href);
await build({ configFile: resolve(root, 'vite.config.ts') });
let html = await readFile(resolve(root, '.build/app.html'), 'utf8');
for (const match of [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g)]) {
  const js = await readFile(resolve(root, '.build', match[1].replace(/^\.?\//, '')), 'utf8');
  html = html.replace(match[0], () => '<script type="module">' + js.replace(/<\/script/gi, '<\\/script') + '</script>');
}
for (const match of [...html.matchAll(/<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"[^>]*>/g)]) {
  const css = await readFile(resolve(root, '.build', match[1].replace(/^\.?\//, '')), 'utf8');
  html = html.replace(match[0], () => '<style>' + css.replace(/<\/style/gi, '<\\/style') + '</style>');
}
html = html.replace(/<link\b[^>]*\brel="modulepreload"[^>]*>/g, '');
html = html.replace(/^[\t ]+$/gm, '');
await writeFile(resolve(root, 'index.html'), html, 'utf8');
console.log('已生成离线原型：' + resolve(root, 'index.html'));
console.log('文件大小：' + (Buffer.byteLength(html) / 1024).toFixed(0) + ' KB');
