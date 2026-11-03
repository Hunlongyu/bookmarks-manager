import { useRef, useState } from 'react';
import { Badge, Button, Checkbox, Progress, Select, Table, Tabs } from '@radix-ui/themes';
import { ArrowRightIcon, CheckCircledIcon, DownloadIcon, FileTextIcon, InfoCircledIcon, ReloadIcon, UploadIcon } from '@radix-ui/react-icons';
import { useApp } from './state';
import { clone, demoData, download, folderDescendants, parseHTML, statusLabels, timeLabel, toHTML, backupDirectory, type Data, type Source } from './model';
import { BrowserMark, Empty, Field, FolderIcon, InlineMessage, PageHeading } from './ui';

export function ImportView() {
  const app = useApp(); const [tab, setTab] = useState('browser');
  const [sources, setSources] = useState<Set<Source>>(new Set(['Chrome', 'Edge']));
  const [profiles, setProfiles] = useState<Record<string, string>>({ Chrome: '默认用户', Edge: '个人', Firefox: 'default-release' });
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [html, setHTML] = useState<{ name: string; data: Data } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const preview = tab === 'browser' ? demoData([...sources]) : html?.data;
  async function readFile(file?: File) {
    if (!file) return; setError('');
    if (!/\.html?$/i.test(file.name)) { setError('请选择浏览器导出的 HTML 书签文件。'); return; }
    if (file.size > 20 * 1024 * 1024) { setError('这个演示只接收 20 MB 以内的 HTML 文件。'); return; }
    try { const data = parseHTML(await file.text(), file.name); if (!data.bookmarks.length) { setError('没有找到有效的 HTTP 或 HTTPS 书签，请检查文件。'); return; } setHTML({ name: file.name, data }); } catch { setError('无法读取文件，请重新选择。'); }
  }
  function importNow() {
    setBusy(true);
    window.setTimeout(() => {
      if (tab === 'html' && html) app.loadHTML(html.data); else app.loadDemo([...sources], profiles);
      setBusy(false);
    }, 500);
  }
  return <div className="page-content import-page">
    <PageHeading title="导入书签" description="目录和顺序按原样保留，整理完成后可写回或导出。" actions={<Button variant="ghost" color="gray" onClick={() => app.loadDemo()}>查看完整示例<ArrowRightIcon/></Button>}/>
    <Tabs.Root value={tab} onValueChange={setTab}><Tabs.List><Tabs.Trigger value="browser">从浏览器读取</Tabs.Trigger><Tabs.Trigger value="html">导入 HTML 文件</Tabs.Trigger></Tabs.List></Tabs.Root>
    <div className="import-layout"><section className="import-main">
      {tab === 'browser' ? <>
        <div className="section-heading"><h2>选择来源</h2><Badge color="gray" variant="surface">浏览器读取演示</Badge></div>
        <p className="muted section-description">可同时选择多个浏览器，导入后按来源保留目录。</p>
        <div className="browser-options">{(['Chrome', 'Edge', 'Firefox'] as Source[]).map(source => <div className={'browser-option' + (sources.has(source) ? ' selected' : '')} key={source}>
          <label className="browser-choice"><Checkbox aria-label={'导入 ' + source} checked={sources.has(source)} onCheckedChange={v => setSources(prev => { const next = new Set(prev); v ? next.add(source) : next.delete(source); return next; })}/><BrowserMark source={source}/><span><strong>{source}</strong><small>{demoData([source]).bookmarks.length} 条示例书签</small></span></label>
          <Select.Root value={profiles[source]} onValueChange={v => setProfiles(prev => ({ ...prev, [source]: v }))}><Select.Trigger aria-label={source + ' 用户配置'} className="profile-select"/><Select.Content><Select.Item value={source === 'Chrome' ? '默认用户' : source === 'Edge' ? '个人' : 'default-release'}>{source === 'Chrome' ? '默认用户' : source === 'Edge' ? '个人' : 'default-release'}</Select.Item><Select.Item value="工作">工作</Select.Item></Select.Content></Select.Root>
        </div>)}</div>
        <div className="import-note"><InfoCircledIcon/><span>此处展示本机读取流程。原型使用示例数据，不读取你实际的浏览器。</span></div>
      </> : <>
        <div className="section-heading"><h2>选择书签文件</h2><Badge color="gray" variant="surface">HTML</Badge></div>
        <input type="file" accept=".html,.htm" ref={input} className="sr-only" aria-label="选择 HTML 文件" onChange={e => void readFile(e.target.files?.[0])}/>
        <div className="drop-zone" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); void readFile(e.dataTransfer.files[0]); }}><FileTextIcon width="32" height="32"/><strong>{html ? html.name : '将 HTML 文件拖到这里'}</strong><span>支持 Chrome、Edge 和 Firefox 导出的书签</span><Button variant="soft" onClick={() => input.current?.click()}>{html ? '重新选择文件' : '选择 HTML 文件'}</Button></div>
        <p className="small muted">文件只在本页面内解析，不会上传。确认预览后才加入工作区。</p>
      </>}
      {error && <InlineMessage tone="warning"><span role="alert">{error}</span></InlineMessage>}
    </section><aside className="import-preview"><h2>导入预览</h2><div className="preview-count"><strong>{preview?.bookmarks.length || 0}</strong><span>条书签</span><i/><strong>{preview?.folders.length || 0}</strong><span>个文件夹</span></div>
      <div className="preview-tree">{preview?.folders.filter(f => !f.parent || preview.folders.find(p => p.id === f.parent)?.parent === null).map(f => <div className={f.parent ? 'tree-child' : 'tree-source'} key={f.id}><FolderIcon/><span>{f.name}</span>{!f.parent && <small>{preview.bookmarks.filter(b => folderDescendants(preview.folders, f.id).has(b.folderId)).length}</small>}</div>)}</div>
      {!preview?.bookmarks.length && <p className="muted">选择一个来源，在这里预览目录结构。</p>}
      <div className="preview-guarantees"><span><CheckCircledIcon/>保留原目录和顺序</span><span><CheckCircledIcon/>合并与去重稍后决定</span><span><CheckCircledIcon/>导入不修改浏览器</span></div>
    </aside></div>
    <div className="page-actions"><span className="muted">{app.data.bookmarks.length ? '将加入当前会话的 ' + app.data.bookmarks.length + ' 条书签' : '从一个新的整理会话开始'}</span><Button size="3" disabled={busy || !preview?.bookmarks.length} loading={busy} onClick={importNow}>{tab === 'browser' ? '导入选中的书签' : '确认导入 HTML'}<ArrowRightIcon/></Button></div>
  </div>;
}

export function OutputView() {
  const app = useApp(); const tab = app.view === 'export' ? 'html' : 'browser'; const [ack, setAck] = useState(false);
  const [message, setMessage] = useState(''); const [writing, setWriting] = useState(false); const [scenario, setScenario] = useState('success');
  const [exportScope, setExportScope] = useState('all');
  const chosen = app.targets.filter(t => t.selected);
  const ready = chosen.length > 0 && chosen.every(t => t.state === 'ready' && !t.running);
  const statuses = { idle: '未检查', ready: '可写入', writing: '写入中', success: '已写回', failed: '写入失败', skipped: '未执行' };
  function preflight() {
    if (!chosen.length) { setMessage('请至少选择一个浏览器用户配置。'); return; }
    if (chosen.some(t => t.running)) { setMessage('目标浏览器仍在运行，请先关闭所有选中的浏览器及后台进程。'); return; }
    app.setTargets(prev => prev.map(t => t.selected ? { ...t, state: 'ready' } : t)); setMessage('预检通过。确认后将先备份每个目标，再逐个覆盖写入。');
  }
  async function write() {
    if (!ready || !ack) return; setWriting(true); setMessage('');
    const originals = chosen.map(t => app.backup(t.source + ' · ' + t.profile + ' · 覆盖前', '浏览器', t.source, demoData([t.source])));
    if (originals.some(b => !b)) { setWriting(false); setMessage('备份未能全部保存，写回未开始。'); return; }
    let failed = false; let completed = 0;
    for (let i = 0; i < chosen.length; i++) {
      const target = chosen[i];
      if (failed) { app.setTargets(prev => prev.map(t => t.source === target.source ? { ...t, state: 'skipped' } : t)); continue; }
      app.setTargets(prev => prev.map(t => t.source === target.source ? { ...t, state: 'writing' } : t));
      await new Promise(resolve => window.setTimeout(resolve, 650));
      failed = scenario === 'failure' && i === Math.min(1, chosen.length - 1);
      app.setTargets(prev => prev.map(t => t.source === target.source ? { ...t, state: failed ? 'failed' : 'success' } : t));
      if (failed) app.log(target.source + ' 写回失败', '演示写入失败；原始备份可恢复，后续目标未执行');
      else { completed++; app.log('覆盖写回 ' + target.source, target.profile + ' · ' + app.data.bookmarks.length + ' 条 · 演示'); }
    }
    app.setOutputCount(n => n + completed); if (!failed) app.setDirty(false);
    setMessage(failed ? '部分目标未完成。成功目标已单独记录，可查看备份并重新预检失败目标。' : '所有选中目标已完成覆盖写回演示，原始备份已保留。');
    setWriting(false); setAck(false);
    if (!failed) app.navigate('report');
  }
  function exportHTML() {
    let ids: Set<string> | undefined;
    if (exportScope === 'selected') ids = app.selected;
    else if (exportScope === 'folder' && app.folder !== 'all') ids = new Set(app.data.bookmarks.filter(b => folderDescendants(app.data.folders, app.folder).has(b.folderId)).map(b => b.id));
    download('整理后的书签.html', toHTML(app.data, ids)); app.log('导出 HTML', (ids?.size ?? app.data.bookmarks.length) + ' 条书签'); app.setOutputCount(n => n + 1); if (exportScope === 'all') app.setDirty(false); app.navigate('report');
  }
  return <div className="page-content output-page"><PageHeading title={tab === 'browser' ? '写回浏览器' : '导出 HTML'} description={tab === 'browser' ? '备份后覆盖目标浏览器的书签，写入前先核对范围。' : '生成浏览器兼容的书签文件，可选择全部或部分书签。'}/>
    {!app.data.bookmarks.length ? <Empty title="还没有书签" description="先导入书签，再选择写回浏览器或导出 HTML。" action="导入书签" onAction={() => app.navigate('import')}/> : <>

    {tab === 'browser' ? <>
      <div className="section-toolbar"><div><h2>选择写回目标</h2><p className="muted">同一份 {app.data.bookmarks.length} 条书签，将覆盖每个选中目标的书签。</p></div><Badge color="gray" variant="surface">写回流程演示</Badge></div>
      <div className="target-list">{app.targets.map(t => <div className={'target-row' + (t.selected ? ' selected' : '')} key={t.source}><Checkbox aria-label={'写回 ' + t.source} checked={t.selected} disabled={writing} onCheckedChange={v => { app.setTargets(prev => prev.map(x => x.source === t.source ? { ...x, selected: v === true, state: 'idle' } : x)); setAck(false); }}/><BrowserMark source={t.source}/><div className="target-name"><strong>{t.source}</strong><Select.Root value={t.profile} disabled={writing} onValueChange={v => app.setTargets(prev => prev.map(x => x.source === t.source ? { ...x, profile: v, state: 'idle' } : x))}><Select.Trigger variant="ghost" aria-label={t.source + ' 写回用户配置'}/><Select.Content><Select.Item value={t.source === 'Chrome' ? '默认用户' : t.source === 'Edge' ? '个人' : 'default-release'}>{t.source === 'Chrome' ? '默认用户' : t.source === 'Edge' ? '个人' : 'default-release'}</Select.Item><Select.Item value="工作">工作</Select.Item></Select.Content></Select.Root></div>
        <Badge color={t.running ? 'orange' : 'gray'} variant="surface">{t.running ? '运行中' : '已关闭'}</Badge><Badge color={t.state === 'success' ? 'green' : t.state === 'failed' ? 'red' : t.state === 'ready' ? 'indigo' : 'gray'}>{statuses[t.state]}</Badge>
      </div>)}</div>
      <div className="output-preflight"><Button variant="soft" disabled={writing || !chosen.length} onClick={preflight}><CheckCircledIcon/>检查写回条件</Button><Button variant="ghost" color="gray" disabled={writing || !chosen.some(t => t.running)} onClick={() => { app.setTargets(prev => prev.map(t => t.selected ? { ...t, running: false, state: 'idle' } : t)); setMessage('已模拟关闭所选浏览器，请再次检查写回条件。'); }}>模拟关闭所选浏览器</Button>{app.targets.some(t => t.state === 'failed' || t.state === 'skipped') && <Button variant="soft" color="gray" disabled={writing} onClick={() => { app.setTargets(prev => prev.map(t => ({ ...t, selected: t.state === 'failed' || t.state === 'skipped' }))); setAck(false); setMessage('只选择了失败或未执行的目标，请重新预检。'); }}>仅选择未完成目标</Button>}<div className="scenario-select"><span className="small muted">演示结果</span><Select.Root value={scenario} onValueChange={setScenario} disabled={writing}><Select.Trigger aria-label="写回演示结果"/><Select.Content><Select.Item value="success">全部成功</Select.Item><Select.Item value="failure">部分失败</Select.Item></Select.Content></Select.Root></div></div>
      {message && <InlineMessage tone={app.targets.some(t => t.state === 'failed') || chosen.some(t => t.running) ? 'warning' : 'info'}><span role="status">{message}</span></InlineMessage>}
      <section className="output-preview"><h2>覆盖范围预览</h2><div className="output-tree">{app.data.folders.filter(f => !f.parent).map(f => <div key={f.id}><FolderIcon/><strong>{f.name}</strong><span className="muted">{app.data.bookmarks.filter(b => folderDescendants(app.data.folders, f.id).has(b.folderId)).length} 条书签</span></div>)}</div>
        <p className="muted">目标中的现有书签将被这份目录树替换。浏览器设置和历史记录不属于覆盖范围。</p><label className="check-row"><Checkbox checked={ack} onCheckedChange={v => setAck(v === true)} disabled={writing}/><span>我已确认目标与覆盖范围，并同意先备份再写入</span></label></section>
      <div className="page-actions"><Button variant="soft" color="gray" onClick={() => app.navigate('backup')} disabled={writing}>查看备份</Button><div className="button-row"><Button loading={writing} disabled={!ready || !ack || writing} onClick={() => void write()}><UploadIcon/>备份并覆盖写回</Button></div></div>
    </> : <div className="html-export"><div className="section-heading"><h2>导出为浏览器书签文件</h2><FileTextIcon/></div><p className="muted">文件保留标题、网址、目录和顺序，可导入 Chrome、Edge 或 Firefox。</p><Field label="导出范围"><Select.Root value={exportScope} onValueChange={setExportScope}><Select.Trigger aria-label="导出范围"/><Select.Content><Select.Item value="all">全部书签 · {app.data.bookmarks.length} 条</Select.Item><Select.Item value="folder" disabled={app.folder === 'all'}>当前文件夹及子目录</Select.Item><Select.Item value="selected" disabled={!app.selected.size}>已选择的 {app.selected.size} 条书签</Select.Item></Select.Content></Select.Root></Field><InlineMessage>SEO 和 AI 分析属于软件缓存，不作为浏览器 HTML 字段导出。</InlineMessage><div className="button-row"><Button size="3" onClick={exportHTML}><DownloadIcon/>下载书签 HTML</Button></div></div>}
    </>}
  </div>;
}

export function BackupView() {
  const app = useApp();
  return <div className="page-content backup-page"><PageHeading title="备份与恢复" description="启动时自动载入已保存的备份，选择一份即可核对并恢复。" actions={<Button disabled={!app.data.bookmarks.length} onClick={() => { if (app.backup('手动工作区备份')) { app.log('创建手动备份'); app.notify('工作区备份已保存，下次打开时自动载入'); } }}><DownloadIcon/>创建备份</Button>}/>
    <section className="backup-location"><FolderIcon/><div><strong>默认备份目录</strong><code>{backupDirectory}</code><span className="small muted">位置固定 · 自动保存与载入 · 无需选择文件</span></div><Badge color="gray" variant="surface">{app.backups.length} 份备份</Badge></section>
    <InlineMessage>原型使用浏览器本地存储模拟此目录，重新打开后自动载入备份列表；不会读取或写入实际 AppData。工作区仍从空白开始，恢复由你选择。</InlineMessage>
    {app.backupError && <InlineMessage tone="warning"><span role="alert">{app.backupError}</span></InlineMessage>}
    {app.backups.length ? <div className="backup-list">{app.backups.map(b => <div className="backup-row" key={b.id}><div className="backup-icon"><ReloadIcon/></div><div className="backup-info"><strong>{b.name}</strong><span>{b.time} · {b.data.bookmarks.length} 条书签 · {b.data.folders.length} 个目录</span></div><Badge color={b.kind === '浏览器' ? 'indigo' : 'gray'}>{b.kind}</Badge><Button size="2" variant="soft" onClick={() => app.setDialog({ type: 'restore', id: b.id })}>恢复</Button></div>)}</div> : <Empty title="默认目录中还没有备份" description="批量清理和覆盖写回前会自动保存，也可以创建一份当前工作区备份。"/>}
  </div>;
}

export function ReportView() {
  const app = useApp(); const checked = app.data.bookmarks.filter(b => b.checked).length; const analyzed = app.data.bookmarks.filter(b => b.analyzed).length; const content = app.data.bookmarks.filter(b => b.contentChecked).length;
  return <div className="page-content report-page"><PageHeading title="本次整理报告" description="这次做了什么、还有哪些未完成，在这里一起核对。" actions={<Button variant="soft" color="gray" onClick={() => app.navigate('workspace')}>继续整理</Button>}/>
    {app.dirty && <InlineMessage tone="warning">当前还有尚未写回或导出的修改。<div className="button-row"><Button size="1" variant="soft" onClick={() => app.navigate('writeback')}>写回浏览器</Button><Button size="1" variant="soft" onClick={() => app.navigate('export')}>导出 HTML</Button></div></InlineMessage>}
    <div className="report-summary"><div><span>当前书签</span><strong>{app.data.bookmarks.length}<small>条</small></strong></div><div><span>已检查可访问性</span><strong>{checked}<small>条</small></strong></div><div><span>回收站</span><strong>{app.data.trash.length}<small>条</small></strong></div><div><span>写回 / 导出</span><strong>{app.outputCount}<small>次</small></strong></div></div>
    <section className="report-section"><h2>检查覆盖</h2><div className="coverage-line"><span>可访问性</span><Progress value={app.data.bookmarks.length ? checked / app.data.bookmarks.length * 100 : 0}/><strong>{checked} / {app.data.bookmarks.length}</strong></div><div className="coverage-line"><span>内容检查</span><Progress value={app.data.bookmarks.length ? content / app.data.bookmarks.length * 100 : 0} color="cyan"/><strong>{content} / {app.data.bookmarks.length}</strong></div><div className="coverage-line"><span>AI 分析缓存</span><Progress value={app.data.bookmarks.length ? analyzed / app.data.bookmarks.length * 100 : 0} color="violet"/><strong>{analyzed} / {app.data.bookmarks.length}</strong></div><p className="small muted">未执行的检查没有计入正常结果。页面分析缓存可包含本次导入时已有的分析。</p></section>
    <div className="report-columns"><section className="report-section"><h2>书签当前状态</h2><div className="report-statuses">{Object.entries(statusLabels).map(([status, label]) => { const count = app.data.bookmarks.filter(b => b.status === status).length; return count ? <div key={status}><span><i className={'status-dot ' + status}/>{label}</span><strong>{count}</strong></div> : null; })}{!app.data.bookmarks.length && <p className="muted">当前会话没有书签。</p>}</div></section><section className="report-section"><h2>浏览器写回</h2>{app.targets.filter(t => t.selected || t.state === 'success').map(t => <div className="report-target" key={t.source}><BrowserMark source={t.source}/><span>{t.source}<small>{t.profile}</small></span><Badge color={t.state === 'success' ? 'green' : t.state === 'failed' ? 'red' : 'gray'}>{t.state === 'success' ? '已完成（演示）' : t.state === 'failed' ? '失败，可恢复' : '未执行'}</Badge></div>)}</section></div>
    <section className="report-section"><h2>本次操作</h2>{app.activities.length ? <ol className="activity-list">{[...app.activities].reverse().map(a => <li key={a.id}><time>{a.time}</time><div><strong>{a.title}</strong>{a.detail && <span>{a.detail}</span>}</div></li>)}</ol> : <p className="muted">导入并整理书签后，这里会显示本次操作。</p>}</section>
    <div className="page-actions"><span className="muted">这份报告在整理完成后显示，继续整理可返回工作区。</span><Button onClick={() => app.setDialog({ type: 'reset' })}>结束本次会话</Button></div>
  </div>;
}
