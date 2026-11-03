import { useEffect, useState } from 'react';
import { Badge, Button, ContextMenu, DropdownMenu, IconButton, Progress, Theme } from '@radix-ui/themes';
import { ArchiveIcon, ArrowRightIcon, BookmarkIcon, CheckCircledIcon, ChevronDownIcon, ChevronRightIcon, CopyIcon, Cross2Icon, DotsHorizontalIcon, DownloadIcon, GearIcon, MagicWandIcon, MoonIcon, PauseIcon, PlayIcon, PlusIcon, SunIcon, TrashIcon, UploadIcon } from '@radix-ui/react-icons';
import { AppProvider, useApp } from './state';
import { duplicateGroups, folderDescendants, type Folder, type View } from './model';
import { FolderIcon, TipButton } from './ui';
import { Duplicates, Trash, Workspace } from './Workspace';
import { BackupView, ImportView, OutputView, ReportView } from './Flow';
import { SettingsView } from './Settings';
import { OrganizeView } from './AI';
import { Operations } from './Operations';

function FolderActions({ folder, context = false }: { folder: Folder; context?: boolean }) {
  const app = useApp(); const Menu = context ? ContextMenu : DropdownMenu;
  return <>
    <Menu.Item onSelect={() => { app.setFolder(folder.id); app.setDialog({ type: 'folder' }); }}>新建子文件夹</Menu.Item>
    <Menu.Item disabled={folder.kind === 'system'} onSelect={() => app.setDialog({ type: 'folder', id: folder.id })}>重命名或移动</Menu.Item>
    <Menu.Item disabled={folder.kind === 'system'} onSelect={() => app.setDialog({ type: 'merge', id: folder.id })}>合并到其他文件夹</Menu.Item>
    <Menu.Separator/>
    <Menu.Item onSelect={() => app.reorder('folder', folder.id, -1)}>上移</Menu.Item>
    <Menu.Item onSelect={() => app.reorder('folder', folder.id, 1)}>下移</Menu.Item>
    <Menu.Separator/>
    <Menu.Item disabled={folder.kind === 'system'} color="red" onSelect={() => app.setDialog({ type: 'delete', id: folder.id })}>移入回收站</Menu.Item>
  </>;
}
function FolderNode({ folder, level = 0 }: { folder: Folder; level?: number }) {
  const app = useApp(); const [expanded, setExpanded] = useState(level < 2); const children = app.data.folders.filter(f => f.parent === folder.id);
  const descendants = folderDescendants(app.data.folders, folder.id); const count = app.data.bookmarks.filter(b => descendants.has(b.folderId)).length;
  return <div className="folder-node"><ContextMenu.Root><ContextMenu.Trigger><div className={'tree-row' + (app.folder === folder.id && app.view === 'workspace' ? ' active' : '')} style={{ paddingLeft: 10 + level * 14 }}>
    <button className="tree-expand" aria-label={(expanded ? '折叠 ' : '展开 ') + folder.name} aria-expanded={expanded} disabled={!children.length} onClick={() => setExpanded(v => !v)}>{children.length ? expanded ? <ChevronDownIcon/> : <ChevronRightIcon/> : <span/>}</button>
    <button className="tree-label" onClick={() => { app.setFolder(folder.id); app.navigate('workspace'); const first = app.data.bookmarks.find(b => descendants.has(b.folderId)); app.setActive(first?.id || ''); }}><FolderIcon/><span title={folder.name}>{folder.name}</span><small>{count || ''}</small></button>
    <DropdownMenu.Root><DropdownMenu.Trigger><IconButton size="1" variant="ghost" color="gray" className="tree-menu" aria-label={folder.name + '的目录操作'}><DotsHorizontalIcon/></IconButton></DropdownMenu.Trigger><DropdownMenu.Content><FolderActions folder={folder}/></DropdownMenu.Content></DropdownMenu.Root>
  </div></ContextMenu.Trigger><ContextMenu.Content><FolderActions folder={folder} context/></ContextMenu.Content></ContextMenu.Root>
    {expanded && children.map(child => <FolderNode key={child.id} folder={child} level={level + 1}/>)}
  </div>;
}
function Sidebar() {
  const app = useApp();
  const nav: { view: View; title: string; icon: React.ReactNode; count?: number }[] = [
    { view: 'workspace', title: '全部书签', icon: <BookmarkIcon/>, count: app.data.bookmarks.length },
    { view: 'checks', title: '检查结果', icon: <CheckCircledIcon/>, count: app.data.bookmarks.filter(b => b.checked).length },
    { view: 'duplicates', title: '重复项', icon: <CopyIcon/>, count: duplicateGroups(app.data.bookmarks).length },
    { view: 'trash', title: '回收站', icon: <TrashIcon/>, count: app.data.trash.length + app.data.removedFolders.length },
  ];
  return <div className="sidebar-inner"><div className="sidebar-top"><Button className="full-width" variant="soft" onClick={() => app.navigate('import')}><PlusIcon/>导入书签</Button></div><nav className="primary-nav" aria-label="工作区导航">{nav.map(n => <button key={n.view} onClick={() => { if (n.view === 'workspace') app.setFolder('all'); app.navigate(n.view); }} className={'nav-item' + (app.view === n.view && (n.view !== 'workspace' || app.folder === 'all') ? ' active' : '')} aria-current={app.view === n.view && (n.view !== 'workspace' || app.folder === 'all') ? 'page' : undefined}>{n.icon}<span>{n.title}</span><small>{n.count || ''}</small></button>)}</nav>
    <div className="sidebar-section-heading"><span>来源目录</span><DropdownMenu.Root><DropdownMenu.Trigger><Button size="1" variant="ghost" color="gray">目录操作<ChevronDownIcon/></Button></DropdownMenu.Trigger><DropdownMenu.Content><DropdownMenu.Item onSelect={() => app.setDialog({ type: 'folder' })}>新建文件夹</DropdownMenu.Item><DropdownMenu.Separator/><DropdownMenu.Item disabled={!app.data.folders.length} onSelect={() => app.setDialog({ type: 'merge' })}>合并文件夹</DropdownMenu.Item><DropdownMenu.Item disabled={!app.data.folders.length} onSelect={() => app.setDialog({ type: 'empty' })}>清理空文件夹</DropdownMenu.Item></DropdownMenu.Content></DropdownMenu.Root></div>
    <div className="folder-tree" aria-label="文件夹目录">{app.data.folders.length ? app.data.folders.filter(f => !f.parent).map(f => <FolderNode key={f.id} folder={f}/>) : <p className="empty-tree">导入后，原来的目录会出现在这里。</p>}</div>
    <div className="sidebar-bottom"><button className={'nav-item' + (app.view === 'writeback' ? ' active' : '')} onClick={() => app.navigate('writeback')}><UploadIcon/><span>写回浏览器</span></button><button className={'nav-item' + (app.view === 'export' ? ' active' : '')} onClick={() => app.navigate('export')}><DownloadIcon/><span>导出 HTML</span></button><button className={'nav-item' + (app.view === 'organize' ? ' active' : '')} onClick={() => app.navigate('organize')}><MagicWandIcon/><span>AI 目录整理</span></button><button className={'nav-item' + (app.view === 'backup' ? ' active' : '')} onClick={() => app.navigate('backup')}><ArchiveIcon/><span>备份与恢复</span>{app.backups.length > 0 && <small>{app.backups.length}</small>}</button><div className="sidebar-session"><span><i/>本次会话</span><button disabled={!app.activities.length || app.job?.state === 'running' || app.job?.state === 'paused'} onClick={() => app.navigate('report')}>完成整理</button></div></div>
  </div>;
}
function JobStrip() {
  const app = useApp(); if (!app.job) return null;
  const job = app.job; const progress = job.ids.length ? job.index / job.ids.length * 100 : 0; const ended = job.state === 'done' || job.state === 'cancelled';
  if (ended && app.view !== 'workspace' && app.view !== 'checks') return null;
  return <div className={'job-strip ' + (ended ? 'finished' : '')} role="region" aria-label="当前任务"><span className="job-indicator">{ended ? <CheckCircledIcon/> : job.state === 'paused' ? <PauseIcon/> : <span className="working-dot"/>}</span><div className="job-copy"><strong>{job.kind === 'analysis' ? '页面分析' : '书签检查'}{job.state === 'done' ? '已完成' : job.state === 'cancelled' ? '已取消' : job.state === 'paused' ? '已暂停' : '进行中'}</strong><span>{job.index} / {job.ids.length} 项{job.options.ai || job.kind === 'analysis' ? ' · 复用 ' + job.reused + '，新分析 ' + job.analyzed : ' · 演示任务'}</span></div>{!ended && <Progress value={progress} size="1" className="job-progress"/>}<div className="job-actions">{!ended ? <><TipButton label={job.state === 'paused' ? '继续任务' : '暂停任务'} onClick={() => app.setJob({ ...job, state: job.state === 'paused' ? 'running' : 'paused' })}>{job.state === 'paused' ? <PlayIcon/> : <PauseIcon/>}</TipButton><TipButton label="取消任务" onClick={() => { app.setJob({ ...job, state: 'cancelled' }); app.log('取消任务', '保留已完成的 ' + job.index + ' 项'); }}><Cross2Icon/></TipButton></> : <><Button size="1" variant="ghost" onClick={() => { app.navigate('checks'); app.setFilter('repair'); app.setSelected(new Set()); app.setDialog({ type: 'repair' }); }}>处理建议<ArrowRightIcon/></Button><TipButton label="关闭任务提示" onClick={() => app.setJob(null)}><Cross2Icon/></TipButton></>}</div></div>;
}
function Shell() {
  const app = useApp();
  useEffect(() => {
    function keydown(e: KeyboardEvent) {
      if (app.dialog) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); app.navigate('workspace'); window.setTimeout(() => document.getElementById('bookmark-search')?.focus(), 0); }
      const typing = e.target instanceof HTMLElement && (['INPUT', 'TEXTAREA'].includes(e.target.tagName) || e.target.isContentEditable);
      if (typing) return;
      if (e.key === 'Delete' && app.selected.size) { e.preventDefault(); app.setDialog({ type: 'delete' }); }
    }
    window.addEventListener('keydown', keydown); return () => window.removeEventListener('keydown', keydown);
  }, [app]);
  const content = app.view === 'import' ? <ImportView/> : app.view === 'workspace' ? <Workspace/> : app.view === 'checks' ? <Workspace checks/> : app.view === 'duplicates' ? <Duplicates/> : app.view === 'trash' ? <Trash/> : app.view === 'organize' ? <OrganizeView/> : app.view === 'settings' ? <SettingsView/> : app.view === 'writeback' || app.view === 'export' ? <OutputView/> : app.view === 'report' ? <ReportView/> : <BackupView/>;
  return <Theme appearance={app.appearance} accentColor="indigo" grayColor="slate" radius="medium" scaling="100%">
    <div className="application-shell">
      <header className="app-header"><div className="app-brand"><div className="brand-mark"><BookmarkIcon width="20" height="20"/></div><span>书签管理器</span><Badge variant="surface" color="gray" className="prototype-badge">交互原型</Badge></div><div className="header-actions"><TipButton label={app.appearance === 'light' ? '切换深色' : '切换浅色'} onClick={() => app.setAppearance(app.appearance === 'light' ? 'dark' : 'light')}>{app.appearance === 'light' ? <MoonIcon/> : <SunIcon/>}</TipButton><TipButton label="设置" active={app.view === 'settings'} onClick={() => app.navigate('settings')}><GearIcon/></TipButton></div></header>
      <div className="app-body"><aside className="app-sidebar"><Sidebar/></aside><main className="app-main" tabIndex={-1}>

        <JobStrip/><div className="main-view" key={app.view}>{content}</div>
      </main></div>
      <footer className="app-footer"><span className="prototype-note"><span className="status-dot pending"/>演示数据<span className="prototype-detail"> · 浏览器、网络与 AI 操作均为模拟</span></span><span>{app.data.bookmarks.length} 条书签<span className="footer-folder-count"> · {app.data.folders.length} 个文件夹</span>{app.dirty && <span className="unsaved-dot"> · 有未写回或导出的修改</span>}</span></footer>
    </div>
    {app.toast && <div className="toast-message" role="status"><CheckCircledIcon/><span>{app.toast}</span><button aria-label="关闭提示" onClick={() => app.notify('')}><Cross2Icon/></button></div>}
    <Operations/>
  </Theme>;
}
export default function App() { return <AppProvider><Shell/></AppProvider>; }
