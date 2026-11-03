import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { backupStorageKey, loadBackups, clone, defaultChecks, demoData, emptyData, folderDescendants, timeLabel, uid, type Activity, type AIConfig, type Backup, type Bookmark, type CheckOptions, type Data, type Job, type Source, type Target, type View } from './model';

export type DialogState = { type: 'edit' | 'folder' | 'move' | 'merge' | 'check' | 'delete' | 'repair' | 'recommend' | 'empty' | 'restore' | 'reset' | 'detail'; id?: string } | null;
function useController() {
  const [data, setData] = useState<Data>(emptyData);
  const [view, setView] = useState<View>('workspace');
  const [appearance, setAppearance] = useState<'light' | 'dark'>('light');
  const [folder, setFolder] = useState('all');
  const [active, setActive] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [semantic, setSemantic] = useState(false);
  const [filter, setFilter] = useState('all');
  const [dialog, setDialog] = useState<DialogState>(null);
  const [toast, setToast] = useState('');
  const [dirty, setDirty] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [backupStore, setBackupStore] = useState(loadBackups);
  const backups = backupStore.items;
  const backupError = backupStore.error;
  const backupRef = useRef(backups);
  const [configs, setConfigs] = useState<AIConfig[]>([{ id: 'default', name: '我的 AI 服务', kind: 'online', endpoint: 'https://api.example.test/v1', model: 'demo-model', key: '', tested: false }]);
  const [configId, setConfigId] = useState('default');
  const [settingsTab, setSettingsTab] = useState('ai');
  const [searchConfig, setSearchConfig] = useState({ kind: 'builtin', endpoint: 'https://search.example.test/v1', key: '', tested: false });
  const [proxy, setProxy] = useState({ mode: 'direct', protocol: 'http', host: '127.0.0.1', port: '7890', tested: false });
  const [checkSettings, setCheckSettings] = useState({ concurrency: '12', domainConcurrency: '2', timeout: '10', retries: '1' });
  const [checkOptions, setCheckOptions] = useState<CheckOptions>(defaultChecks);
  const [job, setJob] = useState<Job | null>(null);
  const [targets, setTargets] = useState<Target[]>([
    { source: 'Chrome', profile: '默认用户', selected: true, running: true, state: 'idle' },
    { source: 'Edge', profile: '个人', selected: true, running: false, state: 'idle' },
    { source: 'Firefox', profile: 'default-release', selected: false, running: false, state: 'idle' },
  ]);
  const [outputCount, setOutputCount] = useState(0);
  const [version, setVersion] = useState('0.1.0');
  const selectedConfig = configs.find(c => c.id === configId) || configs[0];
  const aiReady = !!selectedConfig?.tested;
  const current = data.bookmarks.find(b => b.id === active);
  const notify = (text: string) => setToast(text);
  function log(title: string, detail = '') {
    setActivities(prev => [{ id: uid('activity'), title, detail, time: timeLabel() }, ...prev]);
  }
  function backup(name: string, kind: Backup['kind'] = '工作区', target?: Source, snapshot = data) {
    const result: Backup = { id: uid('backup'), name, kind, time: new Date().toLocaleString('zh-CN', { hour12: false }), data: clone(snapshot), target };
    const items = [result, ...backupRef.current];
    try {
      localStorage.setItem(backupStorageKey, JSON.stringify({ version: 1, items }));
      backupRef.current = items; setBackupStore({ items, error: '' }); return result;
    } catch {
      const error = '备份保存失败：浏览器本地存储不可用或空间不足。此次修改未执行。';
      setBackupStore(prev => ({ ...prev, error })); notify(error); return null;
    }
  }
  function commit(next: Data, label: string, risky = false) {
    if (risky && !backup(label + '前')) return false;
    setData(next); setDirty(true);
    setTargets(t => t.map(x => ({ ...x, state: 'idle' })));
    log(label); notify(label); return true;
  }
  function navigate(next: View) {
    setView(next); setQuery(''); setFilter('all');
  }
  function loadDemo(sources: Source[] = ['Chrome', 'Edge', 'Firefox'], profiles: Record<string, string> = {}) {
    const incoming = demoData(sources);
    for (const f of incoming.folders) if (!f.parent && profiles[f.source] === '工作') f.name += ' · 工作';
    incoming.bookmarks = incoming.bookmarks.map(b => ({ ...b, id: b.id + (profiles[b.source] === '工作' ? '-work' : '') }));
    const existing = new Set(data.bookmarks.map(b => b.id));
    incoming.bookmarks = incoming.bookmarks.filter(b => !existing.has(b.id));
    const next = {
      ...data,
      bookmarks: [...data.bookmarks, ...incoming.bookmarks],
      folders: [...data.folders],
    };
    // Source fixtures have regenerated folder IDs; merge their named trees before attaching bookmarks.
    const mapping = new Map<string, string>();
    for (const f of incoming.folders) {
      const parent = f.parent ? mapping.get(f.parent) || f.parent : null;
      const present = next.folders.find(n => n.parent === parent && n.name === f.name);
      if (present) mapping.set(f.id, present.id);
      else { mapping.set(f.id, f.id); next.folders.push({ ...f, parent }); }
    }
    next.bookmarks = next.bookmarks.map(b => incoming.bookmarks.some(i => i.id === b.id) ? { ...b, folderId: mapping.get(b.folderId) || b.folderId } : b);
    commit(next, '导入 ' + incoming.bookmarks.length + ' 条书签');
    setActive(next.bookmarks[0]?.id || ''); setSelected(new Set()); setFolder('all');
    navigate('workspace');
  }
  function loadHTML(incoming: Data) {
    const next = { ...data, bookmarks: [...data.bookmarks, ...incoming.bookmarks], folders: [...data.folders, ...incoming.folders] };
    commit(next, '导入 HTML · ' + incoming.bookmarks.length + ' 条书签');
    setActive(incoming.bookmarks[0]?.id || ''); setFolder('all'); navigate('workspace');
  }
  function remove(ids: Set<string>, label = '移入回收站') {
    const removed = data.bookmarks.filter(b => ids.has(b.id));
    commit({ ...clone(data), bookmarks: data.bookmarks.filter(b => !ids.has(b.id)), trash: [...data.trash, ...removed] }, label + ' ' + removed.length + ' 项', true);
    setSelected(new Set()); setDialog(null);
  }
  function restore(ids: Set<string>) {
    const restored = data.trash.filter(b => ids.has(b.id));
    const needed = new Set<string>();
    if (ids.size === data.trash.length) data.removedFolders.forEach(f => needed.add(f.id));
    for (const b of restored) {
      let cursor = data.removedFolders.find(f => f.id === b.folderId);
      while (cursor && !needed.has(cursor.id)) { needed.add(cursor.id); cursor = data.removedFolders.find(f => f.id === cursor!.parent); }
    }
    const restoredFolders = data.removedFolders.filter(f => needed.has(f.id) && !data.folders.some(n => n.id === f.id));
    commit({ ...clone(data), folders: [...data.folders, ...restoredFolders], removedFolders: data.removedFolders.filter(f => !needed.has(f.id)), bookmarks: [...data.bookmarks, ...restored], trash: data.trash.filter(b => !ids.has(b.id)) }, '恢复 ' + restored.length + ' 条书签与 ' + restoredFolders.length + ' 个目录');
  }
  function startJob(options = checkOptions, kind: Job['kind'] = 'check') {
    if (job?.state === 'running' || job?.state === 'paused') { notify('请先完成或取消当前任务'); return; }
    let scoped = data.bookmarks;
    if (options.scope === 'selected') scoped = scoped.filter(b => selected.has(b.id));
    if (options.scope === 'folder' && folder !== 'all') scoped = scoped.filter(b => folderDescendants(data.folders, folder).has(b.folderId));
    if (!scoped.length) { notify('当前范围没有可检查的书签'); return; }
    if ((kind === 'analysis' || options.ai) && !aiReady) { notify('请先完成 AI 配置和连接测试'); return; }
    setCheckOptions(options); setDialog(null); navigate('checks');
    setJob({ kind, ids: scoped.map(b => b.id), index: 0, state: 'running', options, reused: 0, analyzed: 0 });
    log(kind === 'analysis' ? '开始页面分析' : '开始检查', scoped.length + ' 条书签 · 演示任务');
  }
  function reorder(kind: 'bookmark' | 'folder', id: string, direction: -1 | 1) {
    const next = clone(data);
    const items = kind === 'bookmark' ? next.bookmarks : next.folders;
    const item = items.find(x => x.id === id); if (!item) return;
    const parent = (x: typeof item) => 'folderId' in x ? x.folderId : x.parent;
    const siblings = items.filter(x => parent(x) === parent(item));
    const target = siblings[siblings.findIndex(x => x.id === id) + direction]; if (!target) return;
    const first = items.findIndex(x => x.id === id); const second = items.findIndex(x => x.id === target.id);
    [items[first], items[second]] = [items[second], items[first]];
    commit(next, direction < 0 ? '上移一项' : '下移一项');
  }
  function reset() {
    setData(emptyData()); setSelected(new Set()); setActive(''); setFolder('all'); setQuery(''); setSemantic(false);
    setActivities([]); setJob(null); setOutputCount(0); setDirty(false);
    setTargets(prev => prev.map(t => ({ ...t, state: 'idle' })));
    setDialog(null); navigate('workspace');
  }
  useEffect(() => { if (!toast) return; const id = window.setTimeout(() => setToast(''), 4000); return () => clearTimeout(id); }, [toast]);
  useEffect(() => {
    if (!job || job.state !== 'running') return;
    const timer = window.setTimeout(() => {
      const item = data.bookmarks.find(b => b.id === job.ids[job.index]);
      const analyze = !!item && (job.kind === 'analysis' || (job.options.ai && (job.options.deep || ['parked', 'dead', 'restricted'].includes(item.demoStatus))));
      const cached = !!item && data.bookmarks.some(b => b.url === item.url && b.analyzed);
      setData(prev => ({
        ...prev,
        bookmarks: prev.bookmarks.map(b => b.id === job.ids[job.index] ? {
          ...b,
          checked: b.checked || (job.kind === 'check' && job.options.availability),
          contentChecked: b.contentChecked || job.options.rules || analyze,
          analyzed: b.analyzed || analyze,
          purpose: analyze && !b.purpose ? b.description : b.purpose,
          status: job.kind === 'analysis' ? b.status : job.options.availability
            ? (b.demoStatus === 'parked' && !(job.options.rules || analyze) ? 'ok' : b.demoStatus)
            : ((job.options.rules || analyze) && b.demoStatus === 'parked' ? 'parked' : b.status),
        } : analyze && item && b.url === item.url ? { ...b, analyzed: true, purpose: b.purpose || b.description } : b),
      }));
      const finished = job.index + 1 >= job.ids.length;
      setJob({ ...job, index: job.index + 1, state: finished ? 'done' : 'running', reused: job.reused + (analyze && cached ? 1 : 0), analyzed: job.analyzed + (analyze && !cached ? 1 : 0) });
      if (finished) { log('任务完成', job.ids.length + ' 项 · 结果为原型演示'); notify('检查完成，可以筛选结果并处理建议'); }
    }, 120);
    return () => clearTimeout(timer);
  }, [job, data]);
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); } };
    window.addEventListener('beforeunload', handler); return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);
  return {
    data, setData, view, navigate, appearance, setAppearance, folder, setFolder,
    active, setActive, selected, setSelected, query, setQuery, semantic, setSemantic, filter, setFilter,
    dialog, setDialog, toast, notify, dirty, setDirty, activities, log,
    backups, backupError, backup, configs, setConfigs, configId, setConfigId, selectedConfig, aiReady,
    settingsTab, setSettingsTab, searchConfig, setSearchConfig, proxy, setProxy, checkSettings, setCheckSettings, checkOptions, setCheckOptions,
    job, setJob, targets, setTargets, outputCount, setOutputCount, version, setVersion,
    current, commit, loadDemo, loadHTML, remove, restore, startJob, reorder, reset,
  };
}
const Context = createContext<ReturnType<typeof useController> | null>(null);
export function AppProvider({ children }: { children: ReactNode }) {
  const value = useController(); return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useApp() { const value = useContext(Context); if (!value) throw new Error('AppProvider missing'); return value; }
