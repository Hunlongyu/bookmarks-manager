import { useMemo, useState } from 'react';
import { Badge, Button, Checkbox, ContextMenu, DropdownMenu, IconButton, Select, Table, Tabs, TextField } from '@radix-ui/themes';
import { ArrowRightIcon, CheckCircledIcon, DotsHorizontalIcon, DownloadIcon, ExternalLinkIcon, MagicWandIcon, MagnifyingGlassIcon, MixerHorizontalIcon, PlusIcon, ReloadIcon, TrashIcon, Cross2Icon, Link2Icon } from '@radix-ui/react-icons';
import { useApp } from './state';
import { cleanTracking, domain, duplicateGroups, folderDescendants, folderPath, searchItems, statusLabels, type Bookmark } from './model';
import { BookSummary, Empty, FolderIcon, InlineMessage, PageHeading, SiteIcon, StatusPill, TipButton } from './ui';

export function Detail({ bookmark }: { bookmark: Bookmark }) {
  const app = useApp();
  const hasRepair = bookmark.checked && (bookmark.suggestedTitle || bookmark.suggestedUrl || bookmark.faviconMissing || cleanTracking(bookmark.url) !== bookmark.url);
  return <div className="detail-content">
    <div className="detail-brand"><SiteIcon bookmark={bookmark} large/><div><strong>{bookmark.title}</strong><span>{domain(bookmark.url)}</span></div></div>
    <div className="detail-buttons"><Button variant="soft" color="gray" size="2" asChild><a href={bookmark.url} target="_blank" rel="noreferrer"><ExternalLinkIcon/>打开网站</a></Button><Button variant="soft" size="2" onClick={() => app.setDialog({ type: 'edit', id: bookmark.id })}>编辑</Button></div>
    <section><h3>原始书签</h3><dl className="detail-list"><dt>网址</dt><dd className="break-url">{bookmark.url}</dd><dt>所在目录</dt><dd className="folder-path"><FolderIcon/>{folderPath(app.data.folders, bookmark.folderId)}</dd><dt>导入来源</dt><dd>{bookmark.source}</dd></dl></section>
    <section><div className="section-heading"><h3>检查结果</h3><StatusPill bookmark={bookmark}/></div>
      {!bookmark.checked && bookmark.status === 'pending' ? <p className="muted">还没有检查这个书签。</p> : <>
        <p className="detail-explanation">{bookmark.status === 'redirect' ? '检测到永久跳转。确认新地址仍是原来的页面后，可以更新书签。' : bookmark.status === 'restricted' ? '访问受到限制，可能需要登录或人工验证。建议在浏览器中复查。' : bookmark.status === 'timeout' ? '请求超时，可以调整代理或稍后重试。' : bookmark.status === 'dead' ? '返回 404。请复查后决定是否删除。' : bookmark.status === 'parked' ? '页面出现域名出售相关信息，内容可能已经改变。' : '页面能够访问。内容检查与可访问性分别判断。'}</p>
        {bookmark.suggestedUrl && bookmark.checked && <div className="redirect-path"><a href={bookmark.url} target="_blank" rel="noreferrer">{domain(bookmark.url)}</a><span><ArrowRightIcon/>{bookmark.redirectEvidence?.statusCode || '待记录'} 跳转 · 演示</span><a href={bookmark.suggestedUrl} target="_blank" rel="noreferrer">{domain(bookmark.suggestedUrl)}</a><span className="muted">目标内容待人工复核</span></div>}
        <span className="small muted">内容检查：{bookmark.contentChecked ? '已完成（演示）' : '未执行'}</span>
      </>}
      {hasRepair && <Button size="2" variant="soft" className="full-width repair-detail" onClick={() => { app.setSelected(new Set([bookmark.id])); app.setDialog({ type: 'repair' }); }}>查看修复建议<ArrowRightIcon/></Button>}
    </section>
    <section><div className="section-heading"><h3>页面概况</h3><Badge color="gray" variant="surface">SEO</Badge></div><p>{bookmark.description}</p></section>
    <section><div className="section-heading"><h3>AI 用途分析</h3><Badge color={bookmark.analyzed ? 'indigo' : 'gray'} variant="soft">{bookmark.analyzed ? '已缓存' : '待分析'}</Badge></div>
      <p className={bookmark.analyzed ? '' : 'muted'}>{bookmark.analyzed ? bookmark.purpose : '分析后可用于用途搜索和目录整理，同一页面结果会被复用。'}</p>
      <Button variant="soft" className="full-width" onClick={() => app.setDialog({ type: 'recommend', id: bookmark.id })}><MagicWandIcon/>推荐相似网站</Button>
    </section>
  </div>;
}

export function Workspace({ checks = false }: { checks?: boolean }) {
  const app = useApp();
  const [detailOpen, setDetailOpen] = useState(true);
  const rows = useMemo(() => {
    let items = app.data.bookmarks;
    if (app.folder !== 'all') { const scope = folderDescendants(app.data.folders, app.folder); items = items.filter(b => scope.has(b.folderId)); }
    items = searchItems(items, app.query, app.semantic && app.aiReady);
    if (app.filter === 'issue') items = items.filter(b => ['dead', 'restricted', 'timeout', 'parked'].includes(b.status));
    else if (app.filter === 'repair') items = items.filter(b => b.checked && (b.suggestedTitle || b.suggestedUrl || b.faviconMissing || cleanTracking(b.url) !== b.url));
    else if (app.filter === 'analyzed') items = items.filter(b => b.analyzed);
    else if (app.filter !== 'all') items = items.filter(b => b.status === app.filter);
    return items;
  }, [app.data, app.folder, app.query, app.semantic, app.aiReady, app.filter]);
  const allChecked = rows.length > 0 && rows.every(b => app.selected.has(b.id));
  const someChecked = rows.some(b => app.selected.has(b.id));
  const toggle = (id: string, value: boolean) => app.setSelected(prev => { const next = new Set(prev); if (value) next.add(id); else next.delete(id); return next; });
  const onMenu = (key: string, b: Bookmark) => {
    app.setActive(b.id);
    if (key === 'recommend') app.setDialog({ type: 'recommend', id: b.id });
    else if (key === 'edit') app.setDialog({ type: 'edit', id: b.id });
    else { app.setSelected(new Set([b.id])); app.setDialog({ type: key === 'move' ? 'move' : 'delete' }); }
  };
  const selectedCount = app.data.bookmarks.filter(b => app.selected.has(b.id)).length;
  const title = checks ? '检查结果' : app.folder !== 'all' ? app.data.folders.find(f => f.id === app.folder)?.name || '全部书签' : '全部书签';
  return <div className="workspace-layout">
    <div className="list-pane">
      <div className="list-scroll" aria-label="书签列表区域" tabIndex={-1}>
      <PageHeading title={title} description={checks ? '先看清问题，再决定如何处理。' : '保留熟悉的目录，让每一条收藏各归其位。'} actions={<>
        <DropdownMenu.Root><DropdownMenu.Trigger><Button variant="soft" color="gray"><PlusIcon/>新建</Button></DropdownMenu.Trigger><DropdownMenu.Content><DropdownMenu.Item onSelect={() => app.setDialog({ type: 'edit' })}>添加书签</DropdownMenu.Item><DropdownMenu.Item onSelect={() => app.setDialog({ type: 'folder' })}>新建文件夹</DropdownMenu.Item></DropdownMenu.Content></DropdownMenu.Root>
        {checks && <Button variant="soft" disabled={!rows.some(b => ['dead', 'restricted', 'timeout', 'parked'].includes(b.status)) || app.job?.state === 'running' || app.job?.state === 'paused'} onClick={() => { app.setSelected(new Set(rows.filter(b => ['dead', 'restricted', 'timeout', 'parked'].includes(b.status)).map(b => b.id))); app.setDialog({ type: 'check' }); }}><ReloadIcon/>重试异常</Button>}
        <Button onClick={() => app.setDialog({ type: 'check' })} disabled={app.data.bookmarks.length === 0 || app.job?.state === 'running' || app.job?.state === 'paused'}><CheckCircledIcon/>检查书签</Button>
      </>}/>
      <div className="search-toolbar">
        <TextField.Root className="search-field" placeholder={app.semantic ? '描述想找的网站，例如：所有 icon 图标网站' : '搜索标题或网址…'} aria-label="搜索书签" value={app.query} onChange={e => app.setQuery(e.target.value)} id="bookmark-search">
          <TextField.Slot><MagnifyingGlassIcon/></TextField.Slot>
          {!app.query && <TextField.Slot side="right" className="search-shortcut"><kbd>Ctrl K</kbd></TextField.Slot>}
          {app.query && <TextField.Slot side="right"><IconButton size="1" variant="ghost" color="gray" aria-label="清空搜索" onClick={() => app.setQuery('')}><Cross2Icon/></IconButton></TextField.Slot>}
        </TextField.Root>
        <Button variant={app.semantic ? 'solid' : 'soft'} size="2" aria-pressed={app.semantic} onClick={() => { if (!app.aiReady) { app.navigate('settings'); app.setSettingsTab('ai'); app.notify('完成连接测试后即可使用 AI 搜索'); } else app.setSemantic(!app.semantic); }}><MagicWandIcon/>AI 搜索</Button>
        <Select.Root value={app.filter} onValueChange={app.setFilter}><Select.Trigger aria-label="筛选书签" className="filter-select"/><Select.Content>
          <Select.Item value="all">全部状态</Select.Item><Select.Item value="pending">待检查</Select.Item><Select.Item value="ok">可访问</Select.Item><Select.Item value="issue">需要复查</Select.Item><Select.Item value="redirect">重定向</Select.Item><Select.Item value="repair">有修复建议</Select.Item><Select.Item value="analyzed">已分析</Select.Item>
        </Select.Content></Select.Root>
      </div>
      {app.semantic && <div className="search-explanation"><MagicWandIcon/><span>搜索当前书签 · 复用 SEO 与已有分析 · {app.data.bookmarks.filter(b => b.analyzed).length}/{app.data.bookmarks.length} 条已分析</span></div>}
      {selectedCount > 0 && <div className="selection-bar"><strong>已选择 {selectedCount} 项</strong><div><Button size="1" variant="ghost" onClick={() => app.setDialog({ type: 'move' })}><FolderIcon/>移动</Button><Button size="1" variant="ghost" onClick={() => app.setDialog({ type: 'repair' })}><MixerHorizontalIcon/>修复</Button><Button size="1" variant="ghost" color="red" onClick={() => app.setDialog({ type: 'delete' })}><TrashIcon/>删除</Button><TipButton label="取消选择" onClick={() => app.setSelected(new Set())}><Cross2Icon/></TipButton></div></div>}
      {rows.length ? <div className="table-scroll"><Table.Root size="2" className="bookmark-table"><Table.Header><Table.Row>
        <Table.ColumnHeaderCell width="42px"><Checkbox aria-label="选择当前结果全部书签" checked={allChecked ? true : someChecked ? 'indeterminate' : false} onCheckedChange={value => app.setSelected(prev => { const next = new Set(prev); rows.forEach(b => value === true ? next.add(b.id) : next.delete(b.id)); return next; })}/></Table.ColumnHeaderCell>
        <Table.ColumnHeaderCell>书签 <span className="table-count">{rows.length}</span></Table.ColumnHeaderCell><Table.ColumnHeaderCell className="path-column">目录</Table.ColumnHeaderCell><Table.ColumnHeaderCell width="116px">状态</Table.ColumnHeaderCell><Table.ColumnHeaderCell width="40px"><span className="sr-only">操作</span></Table.ColumnHeaderCell>
      </Table.Row></Table.Header><Table.Body>{rows.map(b => <ContextMenu.Root key={b.id}><ContextMenu.Trigger><Table.Row className={app.active === b.id ? 'active-row' : ''} onClick={() => app.setActive(b.id)} aria-selected={app.selected.has(b.id)}>
        <Table.Cell onClick={e => e.stopPropagation()}><Checkbox aria-label={'选择 ' + b.title} checked={app.selected.has(b.id)} onCheckedChange={v => toggle(b.id, v === true)}/></Table.Cell>
        <Table.Cell><div className="bookmark-cell"><SiteIcon bookmark={b}/><button className="bookmark-title" title={b.title} onClick={() => { app.setActive(b.id); setDetailOpen(true); }}><strong>{b.title}</strong><span>{app.semantic && app.query ? b.purpose || b.description : domain(b.url)}</span></button>{b.analyzed && <span className="analysis-dot" title="已有 AI 分析缓存" aria-label="已分析"/>}</div></Table.Cell>
        <Table.Cell className="path-column"><span className="path-text" title={folderPath(app.data.folders, b.folderId)}>{folderPath(app.data.folders, b.folderId).split(' / ').slice(-2).join(' / ')}</span></Table.Cell>
        <Table.Cell><StatusPill bookmark={b}/></Table.Cell>
        <Table.Cell onClick={e => e.stopPropagation()}><DropdownMenu.Root><DropdownMenu.Trigger><IconButton size="1" variant="ghost" color="gray" aria-label={b.title + '的操作'}><DotsHorizontalIcon/></IconButton></DropdownMenu.Trigger><DropdownMenu.Content>
          <DropdownMenu.Item onSelect={() => onMenu('edit', b)}>编辑书签</DropdownMenu.Item><DropdownMenu.Item onSelect={() => onMenu('move', b)}>移动到文件夹</DropdownMenu.Item><DropdownMenu.Item onSelect={() => onMenu('recommend', b)}><MagicWandIcon/>推荐相似网站</DropdownMenu.Item><DropdownMenu.Item onSelect={() => { app.setActive(b.id); app.setDialog({ type: 'detail', id: b.id }); }}>查看完整详情</DropdownMenu.Item><DropdownMenu.Separator/><DropdownMenu.Item onSelect={() => app.reorder('bookmark', b.id, -1)}>在目录中上移</DropdownMenu.Item><DropdownMenu.Item onSelect={() => app.reorder('bookmark', b.id, 1)}>在目录中下移</DropdownMenu.Item><DropdownMenu.Separator/><DropdownMenu.Item color="red" onSelect={() => onMenu('delete', b)}>移入回收站</DropdownMenu.Item>
        </DropdownMenu.Content></DropdownMenu.Root></Table.Cell>
      </Table.Row></ContextMenu.Trigger><ContextMenu.Content><ContextMenu.Item onSelect={() => onMenu('edit', b)}>编辑书签</ContextMenu.Item><ContextMenu.Item onSelect={() => onMenu('move', b)}>移动到文件夹</ContextMenu.Item><ContextMenu.Item onSelect={() => onMenu('recommend', b)}><MagicWandIcon/>AI 推荐相似网站</ContextMenu.Item><ContextMenu.Separator/><ContextMenu.Item onSelect={() => app.reorder('bookmark', b.id, -1)}>在目录中上移</ContextMenu.Item><ContextMenu.Item onSelect={() => app.reorder('bookmark', b.id, 1)}>在目录中下移</ContextMenu.Item><ContextMenu.Separator/><ContextMenu.Item color="red" onSelect={() => onMenu('delete', b)}>移入回收站</ContextMenu.Item></ContextMenu.Content></ContextMenu.Root>)}</Table.Body></Table.Root></div>
      : <Empty title={app.data.bookmarks.length ? '没有找到符合条件的书签' : '从导入第一批书签开始'} description={app.data.bookmarks.length ? '试试其他关键词，或清除当前筛选条件。' : '选择浏览器或 HTML 文件，原来的目录和顺序都会保留。'} action={app.data.bookmarks.length ? '清除筛选' : '导入书签'} onAction={() => app.data.bookmarks.length ? (app.setQuery(''), app.setFilter('all'), app.setFolder('all')) : app.navigate('import')}/>}
      </div>
      <div className="list-bottom"><span>{rows.length} 条书签{app.query ? '符合当前搜索' : ''}</span>{app.current && <><Button size="1" variant="ghost" className="inline-detail-toggle" aria-expanded={detailOpen} onClick={() => setDetailOpen(v => !v)}>{detailOpen ? '收起详情' : '展开详情'}</Button><Button size="1" variant="ghost" className="compact-detail-toggle" onClick={() => app.setDialog({ type: 'detail', id: app.current!.id })}>查看详情<ArrowRightIcon/></Button></>}</div>
    </div>
    {app.current && detailOpen && <aside className="detail-panel"><div className="detail-panel-title"><span>书签详情</span><TipButton label="关闭详情栏" onClick={() => setDetailOpen(false)}><Cross2Icon/></TipButton></div><Detail bookmark={app.current}/></aside>}
  </div>;
}

export function Duplicates() {
  const app = useApp(); const [kind, setKind] = useState('exact'); const [keepMap, setKeepMap] = useState<Record<string, string[]>>({});
  const groups = duplicateGroups(app.data.bookmarks, kind === 'suspected');
  const keepFor = (g: Bookmark[]) => keepMap[g[0].id] || [g[0].id];
  const discarded = new Set(groups.flatMap(g => g.filter(b => !keepFor(g).includes(b.id)).map(b => b.id)));
  return <div className="page-content">
    <PageHeading title="重复项" description="相同的网址放在一起比较，保留哪些由你决定。" actions={<Button variant="soft" color="gray" onClick={() => { setKeepMap({}); app.notify('已按当前书签重新分组'); }}><ReloadIcon/>重新分组</Button>}/>
    <Tabs.Root value={kind} onValueChange={setKind}><Tabs.List><Tabs.Trigger value="exact">完全重复 <Badge color="gray">{duplicateGroups(app.data.bookmarks).length}</Badge></Tabs.Trigger><Tabs.Trigger value="suspected">疑似重复 <Badge color="gray">{duplicateGroups(app.data.bookmarks, true).length}</Badge></Tabs.Trigger></Tabs.List></Tabs.Root>
    <div className="section-toolbar"><span className="muted">{kind === 'exact' ? '按完整 URL 相同分组，默认建议保留每组第一项。' : '跟踪参数或已检查的跳转地址不同，需要逐项复核。'}</span><Button variant="ghost" size="2" onClick={() => setKeepMap(Object.fromEntries(groups.map(g => [g[0].id, g.map(b => b.id)])))}>保留全部</Button></div>
    {groups.length ? <div className="duplicate-groups">{groups.map((g, i) => <section className="duplicate-group" key={g[0].id}><div className="duplicate-group-heading"><div><Link2Icon/><strong>{domain(g[0].url)}</strong><Badge color={kind === 'exact' ? 'gray' : 'amber'}>{g.length} 条{kind === 'exact' ? '相同网址' : '疑似重复'}</Badge></div><span className="muted small">第 {i + 1} 组</span></div>
      {g.map(b => <div className="duplicate-row" key={b.id}><Checkbox aria-label={'保留 ' + b.title} checked={keepFor(g).includes(b.id)} onCheckedChange={v => setKeepMap(prev => { const ids = new Set(keepFor(g)); v ? ids.add(b.id) : ids.delete(b.id); return { ...prev, [g[0].id]: [...ids] }; })}/><div className="duplicate-info"><BookSummary bookmark={b}/><span className="break-url muted small">{b.url}</span><span className="small"><FolderIcon/>{folderPath(app.data.folders, b.folderId)}</span></div><Badge color={keepFor(g).includes(b.id) ? 'green' : 'gray'} variant="soft">{keepFor(g).includes(b.id) ? '保留' : '待移除'}</Badge></div>)}
    </section>)}</div> : <Empty title="没有发现这一类重复项" description="当前目录保持得很好。导入其他来源后可以再次检查。"/>}
    {groups.length > 0 && <div className="sticky-actions"><span>保留 {groups.reduce((n, g) => n + keepFor(g).length, 0)} 条，移入回收站 {discarded.size} 条</span><Button disabled={!discarded.size || groups.some(g => !keepFor(g).length)} onClick={() => app.remove(discarded, '去重 · 移入回收站')}><CheckCircledIcon/>应用保留选择</Button></div>}
  </div>;
}

export function Trash() {
  const app = useApp();
  return <div className="page-content"><PageHeading title="回收站" description="本次会话删除的书签和目录，可在这里恢复。" actions={<Button disabled={!app.data.trash.length && !app.data.removedFolders.length} onClick={() => app.restore(new Set(app.data.trash.map(b => b.id)))}><ReloadIcon/>全部恢复</Button>}/>
    <InlineMessage>回收站与本次会话一起结束。需要以后恢复的内容，请另存备份。</InlineMessage>
    {app.data.removedFolders.length > 0 && <div className="removed-folders"><h3>已删除的目录</h3>{app.data.removedFolders.map(f => <span key={f.id}><FolderIcon/>{f.name}</span>)}</div>}
    {app.data.trash.length ? <div className="simple-list">{app.data.trash.map(b => <div className="simple-row" key={b.id}><BookSummary bookmark={b}/><span className="muted path-text">{folderPath([...app.data.folders, ...app.data.removedFolders], b.folderId)}</span><Button size="2" variant="soft" onClick={() => app.restore(new Set([b.id]))}>恢复</Button></div>)}</div> : <Empty title="回收站中没有书签" description={app.data.removedFolders.length ? '可以使用“全部恢复”找回已删除的空目录。' : '删除的书签会先保留在这里，方便随时找回。'}/>}
  </div>;
}
