export type Source = 'Chrome' | 'Edge' | 'Firefox' | 'HTML';
export type Status = 'pending' | 'ok' | 'redirect' | 'restricted' | 'timeout' | 'dead' | 'parked';
export type View = 'import' | 'workspace' | 'checks' | 'duplicates' | 'trash' | 'organize' | 'writeback' | 'export' | 'report' | 'settings' | 'backup';
export interface Folder { id: string; name: string; parent: string | null; source: Source; kind: 'source' | 'system' | 'folder' }
export interface Bookmark {
  id: string; title: string; url: string; folderId: string; source: Source;
  description: string; purpose: string; tags: string[]; analyzed: boolean;
  status: Status; demoStatus: Status; checked: boolean; contentChecked: boolean;
  suggestedTitle?: string; suggestedUrl?: string; faviconMissing?: boolean;
  redirectEvidence?: { statusCode: number; finalStatus: number; chain: string[] };
  hue: string; initial: string;
}
export interface Data { bookmarks: Bookmark[]; folders: Folder[]; trash: Bookmark[]; removedFolders: Folder[] }
export interface AIConfig { id: string; name: string; kind: 'online' | 'local'; endpoint: string; model: string; key: string; tested: boolean }
export interface CheckOptions { availability: boolean; rules: boolean; ai: boolean; deep: boolean; title: boolean; favicon: boolean; tracking: boolean; scope: 'all' | 'selected' | 'folder' }
export interface Job { kind: 'check' | 'analysis'; ids: string[]; index: number; state: 'running' | 'paused' | 'cancelled' | 'done'; options: CheckOptions; reused: number; analyzed: number }
export interface Backup { id: string; name: string; time: string; kind: '工作区' | '浏览器'; data: Data; target?: Source }
export const backupDirectory = '%APPDATA%\\BookmarksManager\\backups';
export const backupStorageKey = 'bookmarks-prototype.backups.v1';
export function loadBackups(): { items: Backup[]; error: string } {
  try {
    const raw = localStorage.getItem(backupStorageKey);
    if (!raw) return { items: [], error: '' };
    const parsed = JSON.parse(raw);
    if (parsed.version !== 1 || !Array.isArray(parsed.items) || !parsed.items.every((b: Backup) =>
      typeof b.id === 'string' && typeof b.name === 'string' && typeof b.time === 'string' &&
      ['工作区', '浏览器'].includes(b.kind) && Array.isArray(b.data?.folders) &&
      Array.isArray(b.data?.bookmarks) && Array.isArray(b.data?.trash) && Array.isArray(b.data?.removedFolders)
    )) throw Error();
    return { items: parsed.items, error: '' };
  } catch { return { items: [], error: '无法自动加载演示备份，本地存储可能不可用或数据格式异常。' }; }
}
export interface Activity { id: string; title: string; detail: string; time: string }
export interface Target { source: Source; profile: string; selected: boolean; running: boolean; state: 'idle' | 'ready' | 'writing' | 'success' | 'failed' | 'skipped' }
export const statusLabels: Record<Status, string> = { pending: '待检查', ok: '可访问', redirect: '重定向', restricted: '访问受限', timeout: '请求超时', dead: '疑似失效', parked: '疑似停放页' };
export const statusColors: Record<Status, 'gray' | 'green' | 'amber' | 'orange' | 'red'> = { pending: 'gray', ok: 'green', redirect: 'amber', restricted: 'orange', timeout: 'orange', dead: 'red', parked: 'orange' };
export const defaultChecks: CheckOptions = { availability: true, rules: false, ai: false, deep: true, title: true, favicon: true, tracking: true, scope: 'all' };
export const emptyData = (): Data => ({ bookmarks: [], folders: [], trash: [], removedFolders: [] });
export const clone = <T,>(value: T): T => structuredClone(value);
export const uid = (prefix = 'item') => prefix + '-' + Math.random().toString(36).slice(2, 10);
export const timeLabel = () => new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
export function domain(url: string) { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; } }
export function folderPath(folders: Folder[], id: string): string {
  const names: string[] = []; const seen = new Set<string>(); let item = folders.find(f => f.id === id);
  while (item && !seen.has(item.id)) { names.unshift(item.name); seen.add(item.id); item = folders.find(f => f.id === item!.parent); }
  return names.join(' / ');
}
export function folderDescendants(folders: Folder[], id: string): Set<string> {
  const result = new Set([id]); let changed = true;
  while (changed) { changed = false; for (const f of folders) if (f.parent && result.has(f.parent) && !result.has(f.id)) { result.add(f.id); changed = true; } }
  return result;
}
export function cleanTracking(url: string): string {
  try {
    const parsed = new URL(url);
    if ([...parsed.searchParams.keys()].some(k => /^(signature|sig|token|x-amz-signature)$/i.test(k))) return url;
    let changed = false;
    for (const key of [...parsed.searchParams.keys()]) if (/^(utm_.+|gclid|fbclid)$/i.test(key)) { parsed.searchParams.delete(key); changed = true; }
    return changed ? parsed.toString() : url;
  } catch { return url; }
}
export function duplicateGroups(items: Bookmark[], suspected = false): Bookmark[][] {
  const groups = new Map<string, Bookmark[]>();
  items.forEach(b => { const key = suspected ? cleanTracking(b.checked && b.suggestedUrl ? b.suggestedUrl : b.url) : b.url; groups.set(key, [...(groups.get(key) || []), b]); });
  return [...groups.values()].filter(g => g.length > 1 && (!suspected || new Set(g.map(b => b.url)).size > 1));
}
export function findEmptyFolders(data: Data): Folder[] {
  return data.folders.filter(f => f.kind === 'folder' && !data.bookmarks.some(b => folderDescendants(data.folders, f.id).has(b.folderId)));
}
export function ensureFolder(data: Data, path: string[], source: Source = 'Chrome'): string {
  let parent: string | null = null;
  path.forEach((name, i) => {
    let folder = data.folders.find(f => f.parent === parent && f.name === name);
    if (!folder) { folder = { id: uid('folder'), name, parent, source, kind: i === 0 ? 'source' : 'folder' }; data.folders.push(folder); }
    parent = folder.id;
  });
  return parent!;
}
export function mergeFolder(data: Data, fromId: string, toId: string, skipIds: Set<string>): Data {
  const next = clone(data);
  if (fromId === toId || folderDescendants(next.folders, fromId).has(toId)) return next;
  function move(from: string, to: string) {
    for (const b of [...next.bookmarks.filter(b => b.folderId === from)]) {
      if (skipIds.has(b.id)) { next.trash.push(b); next.bookmarks = next.bookmarks.filter(x => x.id !== b.id); }
      else b.folderId = to;
    }
    for (const child of [...next.folders.filter(f => f.parent === from)]) {
      const same = next.folders.find(f => f.parent === to && f.name === child.name);
      if (same) move(child.id, same.id); else child.parent = to;
    }
    next.folders = next.folders.filter(f => f.id !== from);
  }
  move(fromId, toId); return next;
}
type Seed = [string, string, string, string, string[], Status?, string?, string?];
const seeds: Record<'Chrome' | 'Edge' | 'Firefox', Seed[]> = {
  Chrome: [
    ['Lucide', 'https://lucide.dev/', '设计/图标', '简洁一致的 SVG 图标库，支持多种开发框架。', ['图标', 'icon', 'svg'], 'ok'],
    ['Iconify', 'https://iconify.design/', '设计/图标', '聚合多个图标集，提供搜索和开发集成。', ['图标', 'icon', 'svg'], 'ok'],
    ['iconfont', 'https://www.iconfont.cn/', '设计/图标', '图标搜索与素材管理平台。', ['图标', 'icon', '素材'], 'ok'],
    ['Heroicons', 'https://heroicons.com/', '设计/图标', '适合界面使用的线性与实心 SVG 图标。', ['图标', 'icon', 'svg'], 'ok'],
    ['首页', 'https://www.figma.com/community', '设计/灵感', 'Figma 社区的设计资源与创作分享。', ['设计', '灵感'], 'ok', 'Figma Community'],
    ['Dribbble', 'https://dribbble.com/', '设计/灵感', '设计作品与视觉灵感。', ['设计', '灵感'], 'restricted'],
    ['Mobbin', 'https://mobbin.com/', '设计/灵感', '产品界面与交互模式参考。', ['设计', '灵感'], 'restricted'],
    ['Radix Themes', 'https://www.radix-ui.com/themes', '开发/前端', '带有完整样式的 React UI 组件库。', ['开发', 'react', '组件'], 'ok'],
    ['MDN Web Docs', 'https://developer.mozilla.org/zh-CN/?utm_source=bookmarks', '开发/前端', 'Web 平台技术文档与示例。', ['开发', '文档'], 'ok'],
    ['Vite', 'https://vite.dev/', '开发/前端', '前端开发与生产构建工具。', ['开发', '前端'], 'ok'],
    ['Go 文档', 'https://go.dev/doc/', '开发/后端', 'Go 语言指南与开发文档。', ['开发', 'go', '文档'], 'ok'],
    ['GitHub API 文档（旧）', 'https://developer.github.com/', '开发/后端', 'GitHub API 与平台集成文档。', ['开发', '文档'], 'redirect', 'GitHub Docs', 'https://docs.github.com/'],
    ['Excalidraw', 'https://excalidraw.com/', '效率工具', '绘制草图、流程图与协作白板。', ['工具', '绘图'], 'ok'],
    ['配色工具旧站', 'https://retired.example.test/', '待整理', '演示疑似失效链接的处理流程。', ['设计', '配色'], 'dead'],
    ['设计资源导航', 'https://parked.example.test/', '待整理', '演示页面可以访问但内容疑似停放的情况。', ['设计', '导航'], 'parked'],
    ['资料镜像', 'https://slow.example.test/', '待整理', '演示网络超时，不能直接判定为永久失效。', ['文档'], 'timeout'],
  ],
  Edge: [
    ['Lucide Icons', 'https://lucide.dev/', '设计/图标', '界面 SVG 图标资源。', ['图标', 'icon', 'svg'], 'ok'],
    ['Radix Themes 文档', 'https://www.radix-ui.com/themes', '开发', 'React UI 组件与主题文档。', ['开发', '组件'], 'ok'],
    ['MDN 中文', 'https://developer.mozilla.org/zh-CN/', '开发', 'Web 平台技术参考文档。', ['开发', '文档'], 'ok'],
    ['Tabler Icons', 'https://tabler.io/icons', '设计/图标', '界面图标与 SVG 资源。', ['图标', 'icon', 'svg'], 'ok'],
    ['Coolors', 'https://coolors.co/', '设计/配色', '调色板生成与配色参考。', ['设计', '配色'], 'ok'],
    ['Squoosh', 'https://squoosh.app/', '工具', '在浏览器中压缩和转换图片。', ['工具', '图片'], 'ok'],
    ['GitHub Docs', 'https://docs.github.com/', '开发', 'GitHub 功能与 API 文档。', ['开发', '文档'], 'ok'],
  ],
  Firefox: [
    ['Phosphor Icons', 'https://phosphoricons.com/', '设计资源', '多种粗细风格的界面图标集。', ['图标', 'icon', 'svg'], 'ok'],
    ['Simple Icons', 'https://simpleicons.org/', '设计资源', '品牌标志的 SVG 图标集合。', ['图标', 'icon', '品牌'], 'ok'],
    ['Wails', 'https://wails.io/', '开发文档', '使用 Go 与 Web 技术构建桌面应用。', ['开发', 'go', '文档'], 'ok'],
    ['React', 'https://react.dev/', '开发文档', '用于构建界面的 React 文档。', ['开发', 'react', '文档'], 'ok'],
    ['Can I use', 'https://caniuse.com/', '开发文档', '查询 Web 特性的浏览器兼容情况。', ['开发', '文档'], 'ok'],
  ],
};
const hues = ['indigo', 'cyan', 'violet', 'orange', 'pink', 'blue', 'green'];
export function demoData(sources: Source[] = ['Chrome', 'Edge', 'Firefox']): Data {
  const data = emptyData();
  sources.filter(s => s !== 'HTML').forEach(source => {
    seeds[source as keyof typeof seeds].forEach((seed, i) => {
      const [title, url, path, description, tags, demoStatus = 'ok', suggestedTitle, suggestedUrl] = seed;
      const folderId = ensureFolder(data, [source, source === 'Firefox' ? '书签菜单' : '书签栏', ...path.split('/')], source);
      const system = data.folders.find(f => f.name === (source === 'Firefox' ? '书签菜单' : '书签栏') && f.source === source)!;
      system.kind = 'system';
      data.bookmarks.push({
        id: source + '-' + i, title, url, folderId, source, description, purpose: description, tags,
        analyzed: i % 3 !== 1 && demoStatus === 'ok', status: 'pending', demoStatus, checked: false, contentChecked: false,
        suggestedTitle, suggestedUrl, faviconMissing: i === 2, hue: hues[i % hues.length], initial: title.replace(/[^a-zA-Z]/g, '').slice(0, 1) || 'B',
        redirectEvidence: suggestedUrl ? { statusCode: 301, finalStatus: 200, chain: [url, suggestedUrl] } : undefined,
      });
    });
    ensureFolder(data, [source, source === 'Firefox' ? '书签菜单' : '书签栏', '待整理', '空文件夹'], source);
  });
  return data;
}
export function searchItems(items: Bookmark[], query: string, semantic: boolean) {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  let terms = [q];
  if (semantic) {
    if (/icon|图标|svg/.test(q)) terms = ['图标', 'icon'];
    else if (/代码|开发|编程|文档/.test(q)) terms = ['开发', '文档'];
    else if (/设计|灵感|配色/.test(q)) terms = ['设计'];
    else if (/工具|效率|图片/.test(q)) terms = ['工具', '图片'];
  }
  return items.filter(b => {
    const basic = (b.title + ' ' + b.url).toLowerCase();
    const text = semantic ? (basic + ' ' + b.description + (b.analyzed ? ' ' + b.purpose + ' ' + b.tags.join(' ') : '')).toLowerCase() : basic;
    return terms.some(t => text.includes(t));
  });
}
export function parseHTML(html: string, fileName: string): Data {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const data = emptyData(); const root = ensureFolder(data, [fileName.replace(/\.html?$/i, '') || 'HTML 导入'], 'HTML');
  const folderByHeading = new Map<Element, string>();
  function parentFor(node: Element): string {
    let list = node.closest('dl');
    const chain: Element[] = [];
    while (list) {
      let heading = list.previousElementSibling;
      if (!heading?.matches('h3')) heading = list.parentElement?.matches('dt') ? list.parentElement.querySelector(':scope > h3') : null;
      if (heading?.matches('h3')) chain.unshift(heading);
      list = list.parentElement?.closest('dl') || null;
    }
    let parent = root;
    chain.forEach(h => {
      let id = folderByHeading.get(h);
      if (!id) { id = uid('folder'); data.folders.push({ id, name: h.textContent?.trim() || '未命名目录', parent, source: 'HTML', kind: 'folder' }); folderByHeading.set(h, id); }
      parent = id;
    });
    return parent;
  }
  doc.querySelectorAll('a[href]').forEach((a, i) => {
    const url = a.getAttribute('href') || ''; if (!/^https?:\/\//i.test(url)) return;
    const title = a.textContent?.trim() || domain(url);
    data.bookmarks.push({ id: uid('html'), title, url, folderId: parentFor(a), source: 'HTML', description: '从 HTML 文件导入的书签。', purpose: '', tags: [], analyzed: false, status: 'pending', demoStatus: 'ok', checked: false, contentChecked: false, hue: hues[i % hues.length], initial: title[0]?.toUpperCase() || 'B' });
  });
  return data;
}
const escapeHTML = (text: string) => text.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
export function toHTML(data: Data, ids?: Set<string>): string {
  function render(parent: string | null): string {
    let result = '';
    for (const f of data.folders.filter(f => f.parent === parent)) {
      const descendants = folderDescendants(data.folders, f.id);
      if (ids && !data.bookmarks.some(b => ids.has(b.id) && descendants.has(b.folderId))) continue;
      result += '<DT><H3>' + escapeHTML(f.name) + '</H3>\n<DL><p>\n' + render(f.id) + '</DL><p>\n';
    }
    result += data.bookmarks.filter(b => b.folderId === parent && (!ids || ids.has(b.id))).map(b => '<DT><A HREF="' + escapeHTML(b.url) + '">' + escapeHTML(b.title) + '</A>\n').join('');
    return result;
  }
  return '<!DOCTYPE NETSCAPE-Bookmark-file-1>\n<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n<TITLE>整理后的书签</TITLE>\n<H1>整理后的书签</H1>\n<DL><p>\n' + render(null) + '</DL><p>\n';
}
export function download(name: string, content: string, mime = 'text/html;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
