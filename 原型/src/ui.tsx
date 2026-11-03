import { cloneElement, isValidElement, useId, useState, type ReactElement, type ReactNode } from 'react';
import { Badge, Button, Checkbox, Dialog, IconButton, Select, Tooltip } from '@radix-ui/themes';
import { ArchiveIcon, Cross2Icon, PlusIcon, FileTextIcon } from '@radix-ui/react-icons';
import { domain, folderPath, statusColors, statusLabels, type Bookmark, type Folder, type Source } from './model';

export function FolderIcon({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M2.5 5.5a1.5 1.5 0 0 1 1.5-1.5h4l2 2h6a1.5 1.5 0 0 1 1.5 1.5v7A1.5 1.5 0 0 1 16 16H4a1.5 1.5 0 0 1-1.5-1.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>;
}
export function TipButton({ label, children, onClick, disabled = false, active = false, className = '' }: { label: string; children: ReactNode; onClick?: () => void; disabled?: boolean; active?: boolean; className?: string }) {
  return <Tooltip content={label}><IconButton aria-label={label} title={label} variant={active ? 'soft' : 'ghost'} color={active ? 'indigo' : 'gray'} size="2" disabled={disabled} onClick={onClick} className={className}>{children}</IconButton></Tooltip>;
}
export function PageHeading({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return <div className="page-heading"><div><h1>{title}</h1>{description && <p>{description}</p>}</div>{actions && <div className="heading-actions">{actions}</div>}</div>;
}
export function Empty({ title, description, action, onAction, icon }: { title: string; description: string; action?: string; onAction?: () => void; icon?: ReactNode }) {
  return <div className="empty-state"><div className="empty-icon">{icon || <ArchiveIcon width="26" height="26"/>}</div><h2>{title}</h2><p>{description}</p>{action && <Button onClick={onAction}>{action}</Button>}</div>;
}
export function Field({ label, hint, children, className = '' }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  const id = useId();
  const control = isValidElement(children) && typeof children.type !== 'string'
    ? cloneElement(children as ReactElement<Record<string, unknown>>, { id, 'aria-label': label, 'aria-describedby': hint ? id + '-hint' : undefined })
    : children;
  return <div className={'field ' + className}><label className="field-label" htmlFor={id}>{label}</label>{control}{hint && <span id={id + '-hint'} className="field-hint">{hint}</span>}</div>;
}
export function CheckRow({ label, detail, checked, onChange, disabled, badge }: { label: string; detail?: string; checked: boolean; onChange: (value: boolean) => void; disabled?: boolean; badge?: ReactNode }) {
  return <label className={'check-row' + (disabled ? ' is-disabled' : '')}><Checkbox checked={checked} onCheckedChange={v => onChange(v === true)} disabled={disabled}/><span className="check-copy"><span className="check-title">{label} {badge}</span>{detail && <span className="muted">{detail}</span>}</span></label>;
}
export function StatusPill({ bookmark }: { bookmark: Bookmark }) {
  return <Badge variant="soft" color={statusColors[bookmark.status]} size="1"><span className={'status-dot ' + bookmark.status}/>{statusLabels[bookmark.status]}</Badge>;
}
export function SiteIcon({ bookmark, large = false }: { bookmark: Bookmark; large?: boolean }) {
  return <span className={'site-icon ' + bookmark.hue + (large ? ' large' : '')} aria-hidden="true">{bookmark.faviconMissing ? <FileTextIcon/> : bookmark.initial}</span>;
}
export function BrowserMark({ source }: { source: Source }) {
  return <span className={'browser-mark ' + source.toLowerCase()} aria-hidden="true">{source === 'HTML' ? <FileTextIcon/> : source.slice(0, 1)}</span>;
}
export function Modal({ title, description, open = true, onClose, children, footer, width = '560px' }: { title: string; description?: string; open?: boolean; onClose: () => void; children: ReactNode; footer?: ReactNode; width?: string }) {
  // Controlled dialogs have no Radix Trigger. Remember the invoker before the focus scope mounts.
  const [invoker] = useState(() => {
    const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const menu = focused?.closest('[role="menu"]');
    return menu?.id ? document.querySelector<HTMLElement>('[aria-controls="' + CSS.escape(menu.id) + '"]') || focused : focused;
  });
  return <Dialog.Root open={open} onOpenChange={v => { if (!v) onClose(); }}><Dialog.Content maxWidth={width} className="app-dialog" onCloseAutoFocus={event => {
    event.preventDefault();
    const available = invoker?.isConnected && !invoker.matches(':disabled') && invoker.getClientRects().length;
    const target = available ? invoker : document.getElementById('bookmark-search') || document.querySelector<HTMLElement>('.app-main');
    target?.focus({ preventScroll: true });
  }}>
    <div className="dialog-heading"><Dialog.Title size="5">{title}</Dialog.Title><Dialog.Close><IconButton variant="ghost" color="gray" aria-label="关闭弹窗"><Cross2Icon/></IconButton></Dialog.Close></div>
    <Dialog.Description size="2" className="muted" mb="4">{description || '更改只影响当前演示会话。'}</Dialog.Description>
    <div className="dialog-body">{children}</div>{footer && <div className="dialog-footer">{footer}</div>}
  </Dialog.Content></Dialog.Root>;
}
export function FolderSelect({ value, onChange, folders, pathFolders = folders, label = '目标文件夹', exclude = new Set<string>() }: { value: string; onChange: (value: string) => void; folders: Folder[]; pathFolders?: Folder[]; label?: string; exclude?: Set<string> }) {
  return <Select.Root value={value || undefined} onValueChange={onChange}><Select.Trigger aria-label={label} placeholder="选择文件夹" className="full-width"/><Select.Content position="popper">
    {folders.filter(f => !exclude.has(f.id)).map(f => <Select.Item value={f.id} key={f.id}>{folderPath(pathFolders, f.id)}</Select.Item>)}
  </Select.Content></Select.Root>;
}
export function BookSummary({ bookmark }: { bookmark: Bookmark }) {
  return <div className="book-summary"><SiteIcon bookmark={bookmark}/><div><strong>{bookmark.title}</strong><span>{domain(bookmark.url)}</span></div></div>;
}
export function InlineMessage({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warning' | 'success' }) {
  return <div className={'inline-message ' + tone}>{children}</div>;
}
export function AddButton({ onClick }: { onClick: () => void }) { return <Button variant="soft" onClick={onClick}><PlusIcon/>新建</Button>; }
