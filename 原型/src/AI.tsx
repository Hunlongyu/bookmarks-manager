import { useState } from 'react';
import { Badge, Button, Checkbox, Select, Tabs } from '@radix-ui/themes';
import { ArrowRightIcon, ExternalLinkIcon, MagicWandIcon, ReloadIcon } from '@radix-ui/react-icons';
import { useApp } from './state';
import { clone, domain, ensureFolder, folderDescendants, folderPath, uid, type Bookmark } from './model';
import { BookSummary, Empty, Field, FolderIcon, FolderSelect, InlineMessage, Modal, PageHeading } from './ui';

interface Suggestion { bookmark: Bookmark; from: string; path: string[]; reason: string }
interface DestinationNode { name: string; path: string; children: DestinationNode[]; items: Suggestion[]; direct: Suggestion[] }
function OrganizePreview({ suggestions, chosen, onChange }: { suggestions: Suggestion[]; chosen: Set<string>; onChange: (value: Set<string>) => void }) {
  const app = useApp();
  const [activePath, setActivePath] = useState(suggestions[0].path.join(' / '));
  const groups = new Map<string, Suggestion[]>();
  const tree: DestinationNode[] = [];
  for (const suggestion of suggestions) {
    const fullPath = suggestion.path.join(' / ');
    groups.set(fullPath, [...(groups.get(fullPath) || []), suggestion]);
    let children = tree;
    suggestion.path.forEach((name, index) => {
      const path = suggestion.path.slice(0, index + 1).join(' / ');
      let node = children.find(n => n.path === path);
      if (!node) { node = { name, path, children: [], items: [], direct: [] }; children.push(node); }
      node.items.push(suggestion);
      if (index === suggestion.path.length - 1) node.direct.push(suggestion);
      children = node.children;
    });
  }
  const path = groups.has(activePath) ? activePath : suggestions[0].path.join(' / ');
  const items = groups.get(path)!;
  const selectedIn = (rows: Suggestion[]) => rows.filter(s => chosen.has(s.bookmark.id)).length;
  function selectGroup(rows: Suggestion[], checked: boolean) {
    const next = new Set(chosen);
    rows.forEach(s => checked ? next.add(s.bookmark.id) : next.delete(s.bookmark.id));
    onChange(next);
  }
  function branch(node: DestinationNode): React.ReactNode {
    const count = selectedIn(node.items);
    return <li key={node.path}>
      <div className={'destination-row' + (path === node.path ? ' active' : '')}>
        <Checkbox aria-label={'选择目录 ' + node.path + ' 的全部建议'} checked={count === node.items.length ? true : count ? 'indeterminate' : false} onCheckedChange={v => selectGroup(node.items, v === true)}/>
        {node.direct.length ? <button className="destination-name" title={node.path} aria-pressed={path === node.path} aria-controls="organize-group-review" onClick={() => setActivePath(node.path)}><FolderIcon/><span>{node.name}</span></button> : <span className="destination-name" title={node.path}><FolderIcon/><span>{node.name}</span></span>}
        <span className="destination-count" title={'已选 ' + count + ' / ' + node.items.length + ' 条移动建议'}>{count}/{node.items.length}</span>
      </div>
      {node.children.length > 0 && <ul>{node.children.map(branch)}</ul>}
    </li>;
  }
  const existing = app.data.folders.some(f => folderPath(app.data.folders, f.id) === path);
  return <div className="organize-preview">
    <nav className="destination-tree" aria-label="目标目录预览"><h3>目标目录预览</h3><p className="small muted">仅展示涉及移动的目录。勾选目录可批量选择，点击目录查看书签。</p><ul>{tree.map(branch)}</ul><p className="small muted">数字为已选 / 建议移入条数，其他目录保持原样。</p></nav>
    <section className="organize-group-review" id="organize-group-review" aria-label="目录移动建议">
      <div className="section-heading"><h3 className="break-url">{path}</h3><Badge color={existing ? 'gray' : 'indigo'}>{existing ? '已有目录' : '将新建目录'}</Badge></div>
      <div className="organize-group-summary"><span>已选 {selectedIn(items)} / {items.length} 条移入此目录</span><Button size="1" variant="ghost" onClick={() => selectGroup(items, selectedIn(items) !== items.length)}>{selectedIn(items) === items.length ? '取消此目录选择' : '选择此目录全部'}</Button></div>
      <div className="organize-list">{items.map(s => <div className="organize-row" key={s.bookmark.id}><Checkbox aria-label={'应用分类 ' + s.bookmark.title} checked={chosen.has(s.bookmark.id)} onCheckedChange={v => selectGroup([s], v === true)}/><div><BookSummary bookmark={s.bookmark}/><p className="organize-origin">原目录：{s.from}</p><details className="organize-reason"><summary>查看分类依据</summary><p>{s.reason}</p></details></div></div>)}</div>
    </section>
  </div>;
}
export function OrganizeView() {
  const app = useApp(); const [mode, setMode] = useState('existing'); const [scope, setScope] = useState('all');
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null); const [chosen, setChosen] = useState(new Set<string>()); const [busy, setBusy] = useState(false);
  const scoped = app.data.bookmarks.filter(b => scope === 'selected' ? app.selected.has(b.id) : scope === 'folder' && app.folder !== 'all' ? folderDescendants(app.data.folders, app.folder).has(b.folderId) : true);
  const available = scoped.filter(b => b.analyzed);
  function generate() {
    setBusy(true);
    window.setTimeout(() => {
      const plans = available.map(b => {
        const category = b.tags.includes('图标') ? '图标资源' : b.tags.includes('开发') ? '开发文档' : b.tags.includes('设计') ? '设计灵感' : '效率工具';
        let path: string[];
        const currentPath = folderPath(app.data.folders, b.folderId);
        if (mode === 'rebuild') path = [...(scope === 'folder' ? folderPath(app.data.folders, app.folder).split(' / ') : []), '按用途整理', category];
        else if (b.tags.includes('图标') && !currentPath.includes('图标')) {
          const root = app.data.folders.find(f => f.source === b.source && !f.parent);
          const system = app.data.folders.find(f => f.parent === root?.id && f.kind === 'system');
          const existing = app.data.folders.find(f => f.source === b.source && f.name === '图标');
          path = existing ? folderPath(app.data.folders, existing.id).split(' / ') : [...(scope === 'folder' ? folderPath(app.data.folders, app.folder).split(' / ') : system ? folderPath(app.data.folders, system.id).split(' / ') : [root?.name || b.source]), '图标'];
        } else path = currentPath.split(' / ');
        return { bookmark: b, from: currentPath, path, reason: b.purpose || b.description };
      }).filter(s => s.from !== s.path.join(' / '));
      setSuggestions(plans); setChosen(new Set(plans.map(s => s.bookmark.id))); setBusy(false);
    }, 750);
  }
  return <div className="page-content organize-page"><PageHeading title="AI 目录整理" description="复用已经分析过的网站用途，预览整理建议后选择要应用的部分。"/>
    {!app.aiReady && <InlineMessage>先配置 AI 服务并测试连接，再生成分类建议。<Button size="1" variant="soft" onClick={() => app.navigate('settings')}>配置 AI<ArrowRightIcon/></Button></InlineMessage>}
    <div className="organize-options"><Tabs.Root value={mode} onValueChange={v => { setMode(v); setSuggestions(null); }}><Tabs.List><Tabs.Trigger value="existing">沿用现有分类</Tabs.Trigger><Tabs.Trigger value="rebuild">重新规划分类</Tabs.Trigger></Tabs.List></Tabs.Root><p className="muted">{mode === 'existing' ? '优先使用已有目录，必要时建议新增少量分类。' : '按网站用途提出新的目录结构，原位置会在预览中保留。'}</p>
      <div className="organize-controls"><Field label="整理范围"><Select.Root value={scope} onValueChange={v => { setScope(v); setSuggestions(null); }}><Select.Trigger aria-label="AI 整理范围"/><Select.Content><Select.Item value="all">全部书签 · {app.data.bookmarks.length} 条</Select.Item><Select.Item value="selected" disabled={!app.selected.size}>已选择的书签</Select.Item><Select.Item value="folder" disabled={app.folder === 'all'}>当前文件夹及子目录</Select.Item></Select.Content></Select.Root></Field><div className="coverage-caption"><strong>{available.length}<span> / {scoped.length}</span></strong><span>条书签已有分析</span></div><Button variant="soft" disabled={!app.aiReady || !scoped.length || app.job?.state === 'running' || app.job?.state === 'paused'} onClick={() => app.startJob({ ...app.checkOptions, scope: scope as 'all' | 'selected' | 'folder', ai: true, deep: true }, 'analysis')}>分析页面</Button><Button disabled={!app.aiReady || !available.length || busy} loading={busy} onClick={generate}><MagicWandIcon/>生成整理建议</Button></div>
    </div>
    {available.length < scoped.length && <p className="small muted">尚未分析的 {scoped.length - available.length} 条先保留原位。点击“分析页面”可一次补齐状态、用途和标签。</p>}
    {suggestions === null ? <Empty title="先看建议，再移动书签" description="生成后先查看目标目录树，再按目录或逐条选择要移动的书签。" icon={<MagicWandIcon width="26" height="26"/>}/> : !suggestions.length ? <Empty title="当前分类已经适合这些书签" description="本次没有发现需要移动的已分析书签。可以选择重新规划分类，或更换范围。"/> : <>
      <div className="section-toolbar"><h2>{suggestions.length} 条移动建议</h2><Button variant="ghost" onClick={() => setChosen(chosen.size ? new Set() : new Set(suggestions.map(s => s.bookmark.id)))}>{chosen.size ? '取消全选' : '选择全部'}</Button></div>
      <OrganizePreview suggestions={suggestions} chosen={chosen} onChange={setChosen}/>
      <div className="sticky-actions"><span>已选 {chosen.size} 条 · 其余 {app.data.bookmarks.length - chosen.size} 条保留原位<br/><span className="muted">应用前自动备份，之后仍可手动调整。</span></span><Button disabled={!chosen.size} onClick={() => { const next = clone(app.data); let count = 0; suggestions.filter(s => chosen.has(s.bookmark.id)).forEach(s => { const b = next.bookmarks.find(b => b.id === s.bookmark.id); if (b && folderPath(next.folders, b.folderId) === s.from) { b.folderId = ensureFolder(next, s.path, b.source); count++; } }); if (app.commit(next, '应用 AI 分类 · 移动 ' + count + ' 条书签', true)) { setSuggestions(null); app.setFolder('all'); } }}>应用 {chosen.size} 条建议</Button></div>
    </>}
  </div>;
}
const recommendations = [
  { name: 'Lucide', url: 'https://lucide.dev/', description: '风格一致的线性图标，适合产品界面。', reason: '同样围绕 SVG 图标提供资源与开发集成。', verified: true },
  { name: 'Iconoir', url: 'https://iconoir.com/', description: '覆盖多种场景的线性图标库。', reason: '可作为界面图标选型时的另一组候选。', verified: true },
  { name: 'Remix Icon', url: 'https://remixicon.com/', description: '为设计与开发提供统一风格图标。', reason: '包含线性与实心风格，适合比较设计语言。', verified: true },
  { name: 'Tabler Icons', url: 'https://tabler.io/icons', description: '适合 Web 界面的 SVG 图标集合。', reason: '资源用途接近，可以按图标覆盖范围比较。', verified: true },
  { name: 'Bootstrap Icons', url: 'https://icons.getbootstrap.com/', description: '面向界面设计的 SVG 图标集。', reason: '是相似用途候选，具体资源请在网站核实。', verified: false },
];
export function Recommendations() {
  const app = useApp(); const source = app.data.bookmarks.find(b => b.id === app.dialog?.id);
  const [mode, setMode] = useState('basic'); const [busy, setBusy] = useState(false); const [generated, setGenerated] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set()); const [target, setTarget] = useState(source?.folderId || app.data.folders.at(-1)?.id || '');
  const candidates = recommendations.filter(r => r.url !== source?.url).slice(0, mode === 'basic' ? 3 : 5);
  const exists = (url: string) => app.data.bookmarks.some(b => b.url === url);
  const enabled = app.aiReady && (mode === 'basic' || app.searchConfig.tested);
  return <Modal title="推荐相似网站" description={'基于“' + (source?.title || '所选网站') + '”的用途查找候选。此处结果均为图标资源演示。'} width="800px" onClose={() => app.setDialog(null)} footer={generated ? <><Field label="保存到" className="recommend-destination"><FolderSelect value={target} onChange={setTarget} folders={app.data.folders}/></Field><Button disabled={!selected.size || !target} onClick={() => { const next = clone(app.data); const added = candidates.filter(r => selected.has(r.url) && !exists(r.url)); added.forEach(r => next.bookmarks.push({ id: uid('recommended'), title: r.name, url: r.url, folderId: target, source: 'HTML', description: r.description, purpose: '', tags: [], analyzed: false, status: r.verified ? 'ok' : 'restricted', demoStatus: r.verified ? 'ok' : 'restricted', checked: true, contentChecked: false, hue: 'indigo', initial: r.name[0] })); app.commit(next, '收藏 ' + added.length + ' 个推荐网站'); app.setDialog(null); }}>收藏选中的 {selected.size} 个网站</Button></> : undefined}>
    {source && <div className="recommend-source"><BookSummary bookmark={source}/><p>{source.purpose || source.description}</p><Badge color="gray">复用已有页面信息</Badge></div>}
    <Tabs.Root value={mode} onValueChange={v => { if (!busy) { setMode(v); setGenerated(false); setSelected(new Set()); } }}><Tabs.List><Tabs.Trigger value="basic">基础推荐</Tabs.Trigger><Tabs.Trigger value="online">联网推荐</Tabs.Trigger></Tabs.List></Tabs.Root>
    <p className="muted small">{mode === 'basic' ? '从模型已有知识提出候选，再检查网址和用途。没有执行联网搜索。' : '使用已配置的搜索能力寻找候选，再比较用途并核对来源。'}</p>
    {!enabled && <InlineMessage>{!app.aiReady ? '请先配置 AI 服务。' : '联网搜索尚未配置，基础推荐仍可使用。'}<Button size="1" variant="ghost" onClick={() => { app.setDialog(null); app.navigate('settings'); app.setSettingsTab('ai'); }}>去配置<ArrowRightIcon/></Button></InlineMessage>}
    <Button variant="soft" disabled={!enabled || busy} loading={busy} onClick={() => { setBusy(true); window.setTimeout(() => { setGenerated(true); setSelected(new Set(candidates.filter(r => !exists(r.url) && r.verified).map(r => r.url))); setBusy(false); }, 750); }}><MagicWandIcon/>{generated ? '重新推荐' : '查找相似网站'}</Button>
    {generated && <div className="recommend-results">{candidates.map(r => <div className="recommend-row" key={r.url}><Checkbox aria-label={'收藏 ' + r.name} disabled={exists(r.url)} checked={selected.has(r.url)} onCheckedChange={v => setSelected(prev => { const next = new Set(prev); v ? next.add(r.url) : next.delete(r.url); return next; })}/><div className="recommend-info"><div className="section-heading"><a href={r.url} target="_blank" rel="noreferrer"><strong>{r.name}</strong><ExternalLinkIcon/></a><Badge color={exists(r.url) ? 'gray' : r.verified ? 'green' : 'orange'}>{exists(r.url) ? '已收藏' : r.verified ? '可访问 · 演示' : '需复查 · 演示'}</Badge></div><span className="small muted">{domain(r.url)}</span><p>{r.description}</p><p className="small"><strong>相似理由：</strong>{r.reason}</p><span className="small muted">来源：{mode === 'basic' ? '模型候选与网站介绍（演示）' : '搜索结果与网站介绍（演示）'}</span></div></div>)}</div>}
  </Modal>;
}
