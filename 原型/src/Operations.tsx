import { useState } from 'react';
import { Badge, Button, Checkbox, RadioGroup, Select, TextField } from '@radix-ui/themes';
import { ArrowRightIcon, CheckCircledIcon, ExternalLinkIcon } from '@radix-ui/react-icons';
import { useApp } from './state';
import { cleanTracking, clone, ensureFolder, findEmptyFolders, folderDescendants, folderPath, mergeFolder, uid, type Bookmark, type CheckOptions } from './model';
import { BookSummary, CheckRow, Empty, Field, FolderIcon, FolderSelect, InlineMessage, Modal } from './ui';
import { Detail } from './Workspace';
import { Recommendations } from './AI';

function EditBookmark() {
  const app = useApp(); const item = app.data.bookmarks.find(b => b.id === app.dialog?.id);
  const [title, setTitle] = useState(item?.title || '');
  const [url, setUrl] = useState(item?.url || '');
  const [folder, setFolder] = useState(item?.folderId || (app.folder !== 'all' ? app.folder : app.data.folders.at(-1)?.id || ''));
  const [error, setError] = useState('');
  const save = () => {
    if (!title.trim()) { setError('请填写书签标题。'); return; }
    try { const parsed = new URL(url); if (!['http:', 'https:'].includes(parsed.protocol)) throw Error(); } catch { setError('请输入以 http:// 或 https:// 开头的完整网址。'); return; }
    const next = clone(app.data); const target = folder || ensureFolder(next, ['手动添加'], 'HTML');
    if (item) next.bookmarks = next.bookmarks.map(b => b.id === item.id ? { ...b, title: title.trim(), url, folderId: target, ...(url !== item.url ? { checked: false, status: 'pending' as const, analyzed: false } : {}) } : b);
    else next.bookmarks.push({ id: uid('bookmark'), title: title.trim(), url, folderId: target, source: 'HTML', description: '手动添加的书签，等待获取页面信息。', purpose: '', tags: [], analyzed: false, status: 'pending', demoStatus: 'ok', checked: false, contentChecked: false, hue: 'indigo', initial: title[0].toUpperCase() });
    app.commit(next, item ? '修改书签' : '添加书签'); app.setDialog(null);
  };
  return <Modal title={item ? '编辑书签' : '添加书签'} description="保留对你有用的名称，也可以重新调整所在目录。" onClose={() => app.setDialog(null)} footer={<><Button color="gray" variant="soft" onClick={() => app.setDialog(null)}>取消</Button><Button onClick={save}>保存书签</Button></>}>
    <div className="form-stack"><Field label="标题"><TextField.Root autoFocus value={title} onChange={e => { setTitle(e.target.value); setError(''); }} placeholder="输入容易辨认的名称"/></Field><Field label="网址"><TextField.Root value={url} onChange={e => { setUrl(e.target.value); setError(''); }} placeholder="https://example.com"/></Field><Field label="所在目录">{app.data.folders.length ? <FolderSelect value={folder} onChange={setFolder} folders={app.data.folders}/> : <span className="muted">将创建“手动添加”目录</span>}</Field>{error && <InlineMessage tone="warning"><span role="alert">{error}</span></InlineMessage>}</div>
  </Modal>;
}
function EditFolder() {
  const app = useApp(); const item = app.data.folders.find(f => f.id === app.dialog?.id);
  const [name, setName] = useState(item?.name || '');
  const [parent, setParent] = useState(item?.parent || (app.folder === 'all' ? '' : app.folder));
  const [error, setError] = useState('');
  function save() {
    if (!name.trim()) { setError('请填写文件夹名称。'); return; }
    if (app.data.folders.some(f => f.id !== item?.id && f.parent === (parent || null) && f.name === name.trim())) { setError('这个位置已有同名目录，请使用“合并文件夹”。'); return; }
    const next = clone(app.data);
    if (item) next.folders = next.folders.map(f => f.id === item.id ? { ...f, name: name.trim(), parent: parent || null } : f);
    else next.folders.push({ id: uid('folder'), name: name.trim(), parent: parent || null, kind: parent ? 'folder' : 'source', source: app.data.folders.find(f => f.id === parent)?.source || 'HTML' });
    app.commit(next, item ? '修改文件夹' : '创建文件夹'); app.setDialog(null);
  }
  return <Modal title={item ? '修改文件夹' : '新建文件夹'} onClose={() => app.setDialog(null)} footer={<><Button variant="soft" color="gray" onClick={() => app.setDialog(null)}>取消</Button><Button onClick={save}>保存文件夹</Button></>}>
    <div className="form-stack"><Field label="文件夹名称"><TextField.Root autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="例如：设计资源"/></Field><Field label="父级目录"><Select.Root value={parent || 'root'} onValueChange={v => setParent(v === 'root' ? '' : v)}><Select.Trigger aria-label="父级目录"/><Select.Content><Select.Item value="root">工作区根目录</Select.Item>{app.data.folders.filter(f => !item || !folderDescendants(app.data.folders, item.id).has(f.id)).map(f => <Select.Item key={f.id} value={f.id}>{folderPath(app.data.folders, f.id)}</Select.Item>)}</Select.Content></Select.Root></Field>{error && <InlineMessage tone="warning"><span role="alert">{error}</span></InlineMessage>}</div>
  </Modal>;
}
function MoveBookmarks() {
  const app = useApp(); const [target, setTarget] = useState(app.data.folders.at(-1)?.id || '');
  const items = app.data.bookmarks.filter(b => app.selected.has(b.id));
  return <Modal title="移动书签" description={'将选中的 ' + items.length + ' 条书签移动到同一个目录。'} onClose={() => app.setDialog(null)} footer={<><Button variant="soft" color="gray" onClick={() => app.setDialog(null)}>取消</Button><Button disabled={!target || !items.length} onClick={() => { app.commit({ ...clone(app.data), bookmarks: app.data.bookmarks.map(b => app.selected.has(b.id) ? { ...b, folderId: target } : b) }, '移动 ' + items.length + ' 条书签'); app.setDialog(null); }}>移动到此处</Button></>}>
    <Field label="目标文件夹"><FolderSelect value={target} onChange={setTarget} folders={app.data.folders}/></Field><div className="compact-preview">{items.slice(0, 5).map(b => <BookSummary key={b.id} bookmark={b}/>)}{items.length > 5 && <span className="muted">以及其他 {items.length - 5} 条</span>}</div>
  </Modal>;
}
function MergeFolders() {
  const app = useApp(); const available = app.data.folders.filter(f => f.kind !== 'system');
  const [from, setFrom] = useState(app.dialog?.id || available.find(f => f.name === '设计')?.id || available[0]?.id || '');
  const [to, setTo] = useState(available.find(f => f.name === '设计' && f.id !== from)?.id || available.find(f => f.id !== from)?.id || '');
  const [policy, setPolicy] = useState('keep'); const [retain, setRetain] = useState<Set<string>>(new Set());
  const sourceIds = folderDescendants(app.data.folders, from); const targetIds = folderDescendants(app.data.folders, to);
  const sourceItems = app.data.bookmarks.filter(b => sourceIds.has(b.folderId));
  const targetUrls = new Set(app.data.bookmarks.filter(b => targetIds.has(b.folderId)).map(b => b.url));
  const duplicates = sourceItems.filter(b => targetUrls.has(b.url));
  const invalid = !from || !to || sourceIds.has(to);
  return <Modal title="合并文件夹" description="同名子目录会放在一起，不自动重命名；重复书签单独选择处理方式。" width="680px" onClose={() => app.setDialog(null)} footer={<><Button variant="soft" color="gray" onClick={() => app.setDialog(null)}>取消</Button><Button disabled={invalid} onClick={() => { const skipped = new Set(duplicates.filter(b => policy === 'skip' || (policy === 'review' && !retain.has(b.id))).map(b => b.id)); app.commit(mergeFolder(app.data, from, to, skipped), '合并目录', true); app.setFolder('all'); app.setDialog(null); }}>确认合并</Button></>}>
    {available.length < 2 ? <Empty title="至少需要两个文件夹" description="先导入书签或创建要合并的文件夹。"/> : <div className="form-stack"><div className="form-columns"><Field label="来源文件夹"><FolderSelect label="来源文件夹" value={from} onChange={setFrom} folders={available} pathFolders={app.data.folders}/></Field><Field label="合并到"><FolderSelect label="合并到" value={to} onChange={setTo} folders={available} pathFolders={app.data.folders} exclude={sourceIds}/></Field></div>
      <InlineMessage>来源包含 {sourceItems.length} 条书签，与目标有 {duplicates.length} 条相同网址。</InlineMessage>
      <Field label="遇到重复书签时"><RadioGroup.Root value={policy} onValueChange={setPolicy}><RadioGroup.Item value="keep">保留全部</RadioGroup.Item><RadioGroup.Item value="skip">跳过重复，放入回收站</RadioGroup.Item><RadioGroup.Item value="review">逐项决定</RadioGroup.Item></RadioGroup.Root></Field>
      {policy === 'review' && <div className="review-list">{duplicates.length ? duplicates.map(b => <CheckRow key={b.id} label={b.title} detail={folderPath(app.data.folders, b.folderId)} checked={retain.has(b.id)} onChange={v => setRetain(prev => { const next = new Set(prev); v ? next.add(b.id) : next.delete(b.id); return next; })}/>) : <span className="muted">当前没有重复书签。</span>}<p className="small muted">勾选要保留的来源书签，未勾选项进入回收站。</p></div>}
      {invalid && <InlineMessage tone="warning">目标不能是来源本身或它的子目录，请选择其他位置。</InlineMessage>}
    </div>}
  </Modal>;
}
function DeleteItems() {
  const app = useApp(); const folder = app.data.folders.find(f => f.id === app.dialog?.id);
  const folderIds = folder ? folderDescendants(app.data.folders, folder.id) : new Set<string>();
  const items = app.data.bookmarks.filter(b => folder ? folderIds.has(b.folderId) : app.selected.has(b.id));
  return <Modal title={folder ? '删除这个文件夹？' : '将书签移入回收站？'} description={folder ? '目录与包含的 ' + items.length + ' 条书签会一起移入回收站。' : '选中的 ' + items.length + ' 条书签可以在本次会话中恢复。'} onClose={() => app.setDialog(null)} footer={<><Button variant="soft" color="gray" onClick={() => app.setDialog(null)}>取消</Button><Button color="red" onClick={() => {
    if (folder) { app.commit({ ...clone(app.data), bookmarks: app.data.bookmarks.filter(b => !folderIds.has(b.folderId)), trash: [...app.data.trash, ...items], folders: app.data.folders.filter(f => !folderIds.has(f.id)), removedFolders: [...app.data.removedFolders, ...app.data.folders.filter(f => folderIds.has(f.id))] }, '删除目录 ' + folder.name, true); app.setFolder('all'); app.setDialog(null); }
    else app.remove(new Set(items.map(b => b.id)));
  }}>移入回收站</Button></>}>
    <InlineMessage>应用前自动保存一份工作区备份，删除的内容进入回收站。</InlineMessage><div className="compact-preview">{folder && <strong className="inline-icon"><FolderIcon/>{folder.name}</strong>}{items.slice(0, 5).map(b => <BookSummary key={b.id} bookmark={b}/>)}{items.length > 5 && <span className="muted">还有 {items.length - 5} 条书签</span>}</div>
  </Modal>;
}
function CheckSetup() {
  const app = useApp(); const [options, setOptions] = useState<CheckOptions>({ ...app.checkOptions, scope: app.selected.size ? 'selected' : app.folder !== 'all' ? 'folder' : 'all' });
  const set = (key: keyof CheckOptions, value: boolean) => setOptions(prev => ({ ...prev, [key]: value }));
  const valid = options.availability || options.rules || (options.ai && app.aiReady) || options.title || options.favicon || options.tracking;
  return <Modal title="检查书签" description="选择这次需要检查的内容。所有修改都会先生成建议，不会直接删除书签。" width="650px" onClose={() => app.setDialog(null)} footer={<><Button color="gray" variant="soft" onClick={() => app.setDialog(null)}>取消</Button><Button disabled={!valid || !app.data.bookmarks.length} onClick={() => app.startJob({ ...options, ai: options.ai && app.aiReady })}><CheckCircledIcon/>开始检查</Button></>}>
    <div className="form-stack"><Field label="检查范围"><Select.Root value={options.scope} onValueChange={v => setOptions(prev => ({ ...prev, scope: v as CheckOptions['scope'] }))}><Select.Trigger aria-label="检查范围"/><Select.Content><Select.Item value="all">全部书签 · {app.data.bookmarks.length} 条</Select.Item><Select.Item value="selected" disabled={!app.selected.size}>选中的书签 · {app.selected.size} 条</Select.Item><Select.Item value="folder" disabled={app.folder === 'all'}>当前文件夹及子目录</Select.Item></Select.Content></Select.Root></Field>
      <div className="check-group"><CheckRow label="可访问性" detail="快速判断响应、超时、访问受限和重定向。" checked={options.availability} onChange={v => set('availability', v)} badge={<Badge color="green" size="1">快速</Badge>}/>
      <CheckRow label="页面内容规则" detail="识别停站、出售或停放页线索，不使用 AI。" checked={options.rules} onChange={v => set('rules', v)}/>
      <CheckRow label="AI 深度分析" detail="一次分析完成页面判断、用途说明和标签提取。" checked={options.ai && app.aiReady} disabled={!app.aiReady} onChange={v => set('ai', v)} badge={<Badge size="1">可选</Badge>}/>
      {options.ai && app.aiReady && <div className="nested-setting"><RadioGroup.Root value={options.deep ? 'all' : 'suspected'} onValueChange={v => set('deep', v === 'all')}><RadioGroup.Item value="all">全部页面深度检查</RadioGroup.Item><RadioGroup.Item value="suspected">仅复核疑似异常页面</RadioGroup.Item></RadioGroup.Root><p className="small muted">已有有效分析会复用，不分别请求页面判断和标签。</p></div>}</div>
      {!app.aiReady && <InlineMessage>AI 尚未配置，其他检查可以正常使用。<Button size="1" variant="ghost" onClick={() => { app.setDialog(null); app.navigate('settings'); }}>去配置 AI<ArrowRightIcon/></Button></InlineMessage>}
      <div className="check-group"><h3>同时获取修复建议</h3><CheckRow label="网页标题" checked={options.title} onChange={v => set('title', v)}/><CheckRow label="网站图标" checked={options.favicon} onChange={v => set('favicon', v)}/><CheckRow label="明确的跟踪参数" detail="保留未知、业务和签名参数。" checked={options.tracking} onChange={v => set('tracking', v)}/></div>
      <div className="small muted">网络：{app.proxy.mode === 'direct' ? '直连' : app.proxy.mode === 'system' ? '系统代理' : app.proxy.protocol.toUpperCase() + ' 代理'} · 并发 {app.checkSettings.concurrency} · 超时 {app.checkSettings.timeout} 秒</div>
    </div>
  </Modal>;
}
function Repair() {
  const app = useApp(); const [chosen, setChosen] = useState<Set<string> | null>(null);
  const scoped = app.data.bookmarks.filter(b => (!app.selected.size || app.selected.has(b.id)) && b.checked);
  const changes = scoped.flatMap(b => {
    const items: { key: string; id: string; type: 'title' | 'url' | 'favicon'; label: string; from: string; to: string; bookmark: Bookmark }[] = [];
    if (b.suggestedTitle && b.suggestedTitle !== b.title && app.checkOptions.title) items.push({ key: b.id + '-title', id: b.id, type: 'title', label: '标题修复', from: b.title, to: b.suggestedTitle, bookmark: b });
    const url = b.status === 'redirect' && b.suggestedUrl ? b.suggestedUrl : app.checkOptions.tracking ? cleanTracking(b.url) : b.url;
    if (url !== b.url) items.push({ key: b.id + '-url', id: b.id, type: 'url', label: b.status === 'redirect' ? '重定向更新' : '跟踪参数清理', from: b.url, to: url, bookmark: b });
    if (b.faviconMissing && app.checkOptions.favicon) items.push({ key: b.id + '-favicon', id: b.id, type: 'favicon', label: '图标修复', from: '图标缺失', to: '刷新软件内的图标缓存', bookmark: b });
    return items;
  });
  const selected = chosen || new Set(changes.filter(c => c.type !== 'url').map(c => c.key));
  const select = (key: string, value: boolean) => { const next = new Set(selected); value ? next.add(key) : next.delete(key); setChosen(next); };
  const addressChanges = changes.filter(c => c.type === 'url');
  const otherChanges = changes.filter(c => c.type !== 'url');
  const selectedChanges = changes.filter(c => selected.has(c.key));
  const pendingAddresses = addressChanges.filter(c => !selected.has(c.key)).length;
  return <Modal title="预览修复建议" description="地址变更需要逐项复核后勾选。未选择的建议保留原值，应用前自动备份。" width="800px" onClose={() => app.setDialog(null)} footer={<><span className="muted footer-summary">已选择 {selectedChanges.length} 项修改{pendingAddresses > 0 && <span> · {pendingAddresses} 项地址待复核</span>}</span><Button variant="soft" color="gray" onClick={() => app.setDialog(null)}>取消</Button><Button disabled={!selectedChanges.length} onClick={() => {
    const next = clone(app.data);
    selectedChanges.forEach(c => {
      const b = next.bookmarks.find(b => b.id === c.id)!;
      if (c.type === 'title') { b.title = c.to; b.suggestedTitle = undefined; }
      else if (c.type === 'url') { b.url = c.to; b.suggestedUrl = undefined; b.redirectEvidence = undefined; b.status = 'pending'; b.checked = false; b.contentChecked = false; b.analyzed = false; }
      else b.faviconMissing = false;
    });
    if (app.commit(next, '应用 ' + selectedChanges.length + ' 项修复', true)) app.setDialog(null);
  }}>应用所选修复</Button></>}>
    {!changes.length ? <Empty title="当前范围没有修复建议" description="先完成检查，或清除书签选择以查看全部建议。"/> : <div className="repair-groups">
      {addressChanges.length > 0 && <section aria-label="地址变更" className="repair-group"><div className="section-heading"><h2>地址变更</h2><span className="small muted">{addressChanges.length} 项 · 默认不选择</span></div>
        <div className="change-list">{addressChanges.map(c => {
          const evidence = c.bookmark.redirectEvidence;
          const redirect = c.bookmark.status === 'redirect';
          const removedParameters = redirect ? [] : [...new URL(c.from).searchParams.keys()].filter(key => !new URL(c.to).searchParams.has(key));
          return <article className="address-change" key={c.key}>
            <div className="section-heading"><strong>{c.bookmark.title}</strong><Badge color={selected.has(c.key) ? 'green' : 'amber'}>{selected.has(c.key) ? '已确认 · 已选择' : '待复核'}</Badge></div>
            <p className="repair-kind">{c.label}</p>
            <div className="before-after address-comparison"><div><span className="comparison-label">原地址</span><a href={c.from} target="_blank" rel="noreferrer" className="break-url">{c.from}<ExternalLinkIcon aria-label="在浏览器打开原地址"/></a></div><ArrowRightIcon/><div><span className="comparison-label">建议地址</span><a href={c.to} target="_blank" rel="noreferrer" className="break-url">{c.to}<ExternalLinkIcon aria-label="在浏览器打开建议地址"/></a></div></div>
            {redirect ? <div className="repair-evidence"><div className="inline-icon"><Badge color="gray">{evidence ? evidence.statusCode + ' · ' + ([301, 308].includes(evidence.statusCode) ? '永久跳转' : '跳转') : '跳转证据待补充'}</Badge>{evidence && <span>最终响应 {evidence.finalStatus}</span>}<span className="muted">演示证据</span></div>{evidence && <p className="break-url">跳转链：{evidence.chain.join(' → ')}</p>}<p>内容一致性尚未确认。请打开两个地址，核对目标仍是原页面，且没有跳到登录、验证或停放页。</p></div> : <div className="repair-evidence"><p>仅移除已识别的跟踪参数：<strong>{removedParameters.join('、')}</strong>。其他参数保留。</p><p className="muted">请打开建议地址，确认页面及必要功能正常。</p></div>}
            <CheckRow label={redirect ? '已核对原页面与目标页面，确认更新地址' : '已核对清理后的页面，确认移除跟踪参数'} checked={selected.has(c.key)} onChange={value => select(c.key, value)}/>
          </article>;
        })}</div>
      </section>}
      {otherChanges.length > 0 && <section aria-label="标题与图标" className="repair-group"><div className="section-heading"><h2>标题与图标</h2><span className="small muted">{otherChanges.length} 项建议</span></div><div className="change-list">{otherChanges.map(c => <div className="change-row" key={c.key}><Checkbox aria-label={'应用' + c.label + '：' + c.bookmark.title} checked={selected.has(c.key)} onCheckedChange={v => select(c.key, v === true)}/><div><div className="section-heading"><strong>{c.bookmark.title}</strong><Badge color="gray">{c.label}</Badge></div><div className="before-after"><span><small>原值</small>{c.from}</span><ArrowRightIcon/><span><small>建议</small>{c.to}</span></div></div></div>)}</div></section>}
    </div>}
  </Modal>;
}
function EmptyFolders() {
  const app = useApp(); const folders = findEmptyFolders(app.data);
  const [selected, setSelected] = useState(new Set(folders.map(f => f.id)));
  return <Modal title="清理空文件夹" description="仅处理没有书签的目录及空子目录，浏览器系统根目录会保留。" onClose={() => app.setDialog(null)} footer={<><Button variant="soft" color="gray" onClick={() => app.setDialog(null)}>取消</Button><Button disabled={!selected.size} onClick={() => {
    const ids = new Set<string>(); selected.forEach(id => folderDescendants(app.data.folders, id).forEach(child => ids.add(child)));
    const removed = app.data.folders.filter(f => ids.has(f.id) && f.kind === 'folder');
    app.commit({ ...clone(app.data), folders: app.data.folders.filter(f => !removed.some(r => r.id === f.id)), removedFolders: [...app.data.removedFolders, ...removed] }, '清理 ' + removed.length + ' 个空目录', true); app.setDialog(null);
  }}>移入回收站</Button></>}>
    {folders.length ? folders.map(f => <CheckRow key={f.id} label={f.name} detail={folderPath(app.data.folders, f.id)} checked={selected.has(f.id)} onChange={v => setSelected(prev => { const next = new Set(prev); v ? next.add(f.id) : next.delete(f.id); return next; })}/>) : <Empty title="没有空文件夹" description="所有普通目录中都包含书签。"/>}
  </Modal>;
}
function RestoreBackup() {
  const app = useApp(); const item = app.backups.find(b => b.id === app.dialog?.id);
  if (!item) return null;
  const target = app.targets.find(t => t.source === item.target);
  return <Modal title="恢复这份备份？" description={item.name + ' · ' + item.time} onClose={() => app.setDialog(null)} footer={<><Button variant="soft" color="gray" onClick={() => app.setDialog(null)}>取消</Button><Button disabled={item.kind === '浏览器' && !!target?.running} onClick={() => {
    if (item.kind === '工作区') { if (!app.commit(clone(item.data), '恢复工作区备份', true)) return; app.setFolder('all'); app.setSelected(new Set()); app.navigate('workspace'); }
    else { app.setTargets(prev => prev.map(t => t.source === item.target ? { ...t, state: 'idle' } : t)); app.log('恢复 ' + item.target + ' 备份', '浏览器恢复流程演示'); app.notify('已演示恢复浏览器备份，当前工作区不变'); }
    app.setDialog(null);
  }}>确认恢复</Button></>}>
    <InlineMessage tone="warning">{item.kind === '工作区' ? '恢复将替换当前工作区，应用前会备份现有内容。' : '恢复只针对对应浏览器，不会改变当前工作区的内容。'}</InlineMessage>
    <dl className="summary-list"><dt>备份类型</dt><dd>{item.kind}</dd><dt>书签</dt><dd>{item.data.bookmarks.length} 条</dd><dt>文件夹</dt><dd>{item.data.folders.length} 个</dd></dl>
    {item.kind === '浏览器' && target?.running && <InlineMessage tone="warning">目标浏览器仍在运行。<Button size="1" variant="soft" onClick={() => app.setTargets(prev => prev.map(t => t.source === item.target ? { ...t, running: false } : t))}>模拟关闭浏览器</Button></InlineMessage>}
  </Modal>;
}
export function Operations() {
  const app = useApp(); if (!app.dialog) return null;
  switch (app.dialog.type) {
    case 'edit': return <EditBookmark key={app.dialog.id || 'new'}/>;
    case 'folder': return <EditFolder key={app.dialog.id || 'new'}/>;
    case 'move': return <MoveBookmarks/>;
    case 'merge': return <MergeFolders/>;
    case 'delete': return <DeleteItems/>;
    case 'check': return <CheckSetup/>;
    case 'repair': return <Repair/>;
    case 'empty': return <EmptyFolders/>;
    case 'restore': return <RestoreBackup/>;
    case 'recommend': return <Recommendations/>;
    case 'detail': { const b = app.data.bookmarks.find(b => b.id === app.dialog?.id); return b ? <Modal title="书签详情" description={b.title} onClose={() => app.setDialog(null)}><Detail bookmark={b}/></Modal> : null; }
    case 'reset': return <Modal title="结束本次会话？" description={app.dirty ? '还有尚未写回或导出的修改，可以先保存整理结果。' : '下次会话需要重新导入书签，配置在此页面中保留。'} onClose={() => app.setDialog(null)} footer={<><Button variant="soft" color="gray" onClick={() => app.setDialog(null)}>继续整理</Button>{app.dirty && <Button variant="soft" onClick={() => { app.setDialog(null); app.navigate('writeback'); }}>写回浏览器</Button>}{app.dirty && <Button variant="soft" onClick={() => { app.setDialog(null); app.navigate('export'); }}>导出 HTML</Button>}<Button color={app.dirty ? 'red' : 'indigo'} onClick={app.reset}>{app.dirty ? '放弃修改并结束' : '结束会话'}</Button></>}><InlineMessage>结束会话会清空工作区；已保存的备份会保留，下次打开时自动载入列表。</InlineMessage></Modal>;
  }
}
