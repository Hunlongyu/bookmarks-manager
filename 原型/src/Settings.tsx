import { useEffect, useState } from 'react';
import { Badge, Button, Progress, RadioGroup, SegmentedControl, Select, Tabs, TextField } from '@radix-ui/themes';
import { ArrowRightIcon, CheckCircledIcon, DownloadIcon, MagicWandIcon, PlusIcon, ReloadIcon, TrashIcon } from '@radix-ui/react-icons';
import { useApp } from './state';
import { uid, type AIConfig } from './model';
import { Field, InlineMessage, Modal, PageHeading, TipButton } from './ui';

export function SettingsView() {
  const app = useApp();
  return <div className="page-content settings-page"><PageHeading title="设置" description="AI 和代理按需配置。你也可以直接开始基础检查。"/>
    <Tabs.Root value={app.settingsTab} onValueChange={app.setSettingsTab}><Tabs.List><Tabs.Trigger value="ai">AI 服务</Tabs.Trigger><Tabs.Trigger value="network">网络代理</Tabs.Trigger><Tabs.Trigger value="checks">检查参数</Tabs.Trigger><Tabs.Trigger value="update">软件更新</Tabs.Trigger></Tabs.List></Tabs.Root>
    {app.settingsTab === 'ai' ? <AISettings/> : app.settingsTab === 'network' ? <NetworkSettings/> : app.settingsTab === 'checks' ? <CheckSettings/> : <UpdateSettings/>}
  </div>;
}
function AISettings() {
  const app = useApp(); const config = app.selectedConfig; const [testing, setTesting] = useState(false); const [error, setError] = useState(''); const [deleteOpen, setDeleteOpen] = useState(false);
  function update(patch: Partial<AIConfig>) { app.setConfigs(prev => prev.map(c => c.id === config.id ? { ...c, ...patch, tested: false } : c)); setError(''); }
  function test() {
    try { const url = new URL(config.endpoint); if (!['http:', 'https:'].includes(url.protocol)) throw Error(); } catch { setError('请填写有效的服务地址。'); return; }
    if (!config.model.trim() || (config.kind === 'online' && !config.key.trim())) { setError('请填写模型和密钥，或点击“填入演示配置”。'); return; }
    setTesting(true); setError('');
    window.setTimeout(() => { app.setConfigs(prev => prev.map(c => c.id === config.id ? { ...c, tested: true } : c)); setTesting(false); app.notify('连接测试通过（演示），AI 功能已可体验'); }, 650);
  }
  function add() { const next: AIConfig = { id: uid('ai'), name: '新配置 ' + (app.configs.length + 1), kind: 'online', endpoint: '', model: '', key: '', tested: false }; app.setConfigs(prev => [...prev, next]); app.setConfigId(next.id); }
  return <div className="settings-layout"><aside className="config-sidebar"><div className="section-heading"><h2>已保存配置</h2><TipButton label="添加 AI 配置" onClick={add}><PlusIcon/></TipButton></div>{app.configs.map(c => <button key={c.id} className={'config-item' + (c.id === config.id ? ' active' : '')} onClick={() => { app.setConfigId(c.id); setError(''); }} aria-pressed={c.id === config.id}><MagicWandIcon/><span><strong>{c.name}</strong><small>{c.kind === 'online' ? '在线 API' : '本地模型'}{c.tested ? ' · 已连接' : ' · 待测试'}</small></span>{c.id === config.id && <CheckCircledIcon/>}</button>)}<p className="small muted">每次任务使用选中的一套配置，已有页面分析继续复用。</p></aside>
    <section className="settings-main"><div className="section-heading"><h2>{config.name}</h2><div className="button-row"><Badge color={config.tested ? 'green' : 'gray'}>{config.tested ? '连接通过 · 演示' : '尚未连接'}</Badge><TipButton label="删除当前 AI 配置" disabled={app.configs.length === 1} onClick={() => setDeleteOpen(true)}><TrashIcon/></TipButton></div></div>
      <div className="form-stack"><Field label="配置名称"><TextField.Root value={config.name} onChange={e => update({ name: e.target.value })}/></Field><Field label="服务类型"><SegmentedControl.Root value={config.kind} onValueChange={v => update({ kind: v as AIConfig['kind'], endpoint: v === 'local' ? 'http://127.0.0.1:11434/v1' : 'https://api.example.test/v1', key: '' })}><SegmentedControl.Item value="online">在线 API</SegmentedControl.Item><SegmentedControl.Item value="local">本地模型</SegmentedControl.Item></SegmentedControl.Root></Field><Field label="服务地址"><TextField.Root value={config.endpoint} onChange={e => update({ endpoint: e.target.value })} placeholder="https://api.example.com/v1"/></Field>
      <div className="form-columns"><Field label="模型名称"><TextField.Root value={config.model} onChange={e => update({ model: e.target.value })} placeholder="输入模型名称"/></Field><Field label={config.kind === 'local' ? '密钥（可选）' : 'API 密钥'} hint="原型中请使用演示密钥。"><TextField.Root type="password" value={config.key} onChange={e => update({ key: e.target.value })} placeholder="演示密钥"/></Field></div>
      {error && <InlineMessage tone="warning"><span role="alert">{error}</span></InlineMessage>}
      <div className="settings-actions"><Button onClick={test} loading={testing} disabled={testing}>测试连接</Button><Button variant="soft" color="gray" onClick={() => { if (!config.name.trim()) { setError('配置名称不能为空。'); return; } app.notify('AI 配置已保存在当前页面'); }}>保存配置</Button><Button variant="ghost" onClick={() => update({ name: config.kind === 'local' ? '本地演示模型' : '演示在线模型', endpoint: config.kind === 'local' ? 'http://127.0.0.1:11434/v1' : 'https://api.example.test/v1', model: 'demo-model', key: config.kind === 'local' ? '' : 'demo-key' })}>填入演示配置</Button></div>
      <InlineMessage>页面判断、用途说明和标签由同一次分析生成。只有主动发起任务时才使用 AI。</InlineMessage>
      <section className="settings-subsection"><div className="section-heading"><h2>可选联网搜索</h2><Badge color={app.searchConfig.tested ? 'green' : 'gray'}>{app.searchConfig.tested ? '已配置 · 演示' : '未配置'}</Badge></div><p className="muted">用于发现未收藏的新网站，基础推荐和已有书签搜索不依赖这项配置。</p><Field label="搜索来源"><Select.Root value={app.searchConfig.kind} onValueChange={v => app.setSearchConfig(prev => ({ ...prev, kind: v, tested: false }))}><Select.Trigger aria-label="搜索来源"/><Select.Content><Select.Item value="builtin">模型服务自带搜索</Select.Item><Select.Item value="separate">独立搜索 API</Select.Item></Select.Content></Select.Root></Field>
        {app.searchConfig.kind === 'separate' && <div className="form-stack"><Field label="搜索 API 地址"><TextField.Root value={app.searchConfig.endpoint} onChange={e => app.setSearchConfig(prev => ({ ...prev, endpoint: e.target.value, tested: false }))}/></Field><Field label="搜索 API 密钥"><TextField.Root type="password" value={app.searchConfig.key} onChange={e => app.setSearchConfig(prev => ({ ...prev, key: e.target.value, tested: false }))} placeholder="使用任意演示密钥"/></Field></div>}
        <Button variant="soft" onClick={() => { if (!app.aiReady) { setError('请先测试 AI 配置连接。'); return; } if (app.searchConfig.kind === 'separate' && (!app.searchConfig.key || !/^https?:\/\//.test(app.searchConfig.endpoint))) { setError('请填写搜索服务地址和演示密钥。'); return; } app.setSearchConfig(prev => ({ ...prev, tested: true })); app.notify('联网搜索能力已验证（演示）'); }}>验证搜索能力</Button>
      </section><p className="small muted">原型不会发送密钥或连接服务，测试结果仅用于演示交互。</p>
      </div>
    </section>
    {deleteOpen && <Modal title="删除这套 AI 配置？" description={config.name} onClose={() => setDeleteOpen(false)} footer={<><Button variant="soft" color="gray" onClick={() => setDeleteOpen(false)}>取消</Button><Button color="red" onClick={() => { const rest = app.configs.filter(c => c.id !== config.id); app.setConfigs(rest); app.setConfigId(rest[0].id); setDeleteOpen(false); }}>删除配置</Button></>}><p>已有页面分析会保留，后续任务可选择其他配置。</p></Modal>}
  </div>;
}
function NetworkSettings() {
  const app = useApp(); const [testing, setTesting] = useState(false); const [error, setError] = useState('');
  const valid = app.proxy.mode !== 'custom' || (!!app.proxy.host.trim() && Number(app.proxy.port) > 0 && Number(app.proxy.port) <= 65535);
  return <section className="settings-single"><h2>网络连接方式</h2><p className="muted">用于网页检查、页面信息、图标和在线 AI。本机模型服务使用本机连接。</p>
    <RadioGroup.Root className="network-choices" value={app.proxy.mode} onValueChange={v => app.setProxy(prev => ({ ...prev, mode: v, tested: false }))}><RadioGroup.Item value="direct">直连</RadioGroup.Item><RadioGroup.Item value="system">使用系统代理</RadioGroup.Item><RadioGroup.Item value="custom">自定义代理</RadioGroup.Item></RadioGroup.Root>
    {app.proxy.mode === 'custom' && <div className="form-stack"><Field label="协议"><Select.Root value={app.proxy.protocol} onValueChange={v => app.setProxy(prev => ({ ...prev, protocol: v, tested: false }))}><Select.Trigger aria-label="代理协议"/><Select.Content><Select.Item value="http">HTTP</Select.Item><Select.Item value="socks5">SOCKS5</Select.Item></Select.Content></Select.Root></Field><div className="form-columns"><Field label="主机"><TextField.Root value={app.proxy.host} onChange={e => app.setProxy(prev => ({ ...prev, host: e.target.value, tested: false }))}/></Field><Field label="端口"><TextField.Root type="number" min={1} max={65535} value={app.proxy.port} onChange={e => app.setProxy(prev => ({ ...prev, port: e.target.value, tested: false }))}/></Field></div></div>}
    {error && <InlineMessage tone="warning"><span role="alert">{error}</span></InlineMessage>}
    <div className="settings-actions"><Button loading={testing} onClick={() => { if (!valid) { setError('请填写主机和 1–65535 范围内的端口。'); return; } setTesting(true); setError(''); window.setTimeout(() => { app.setProxy(prev => ({ ...prev, tested: true })); setTesting(false); }, 650); }}>测试网络连接</Button><Button variant="soft" color="gray" onClick={() => { if (!valid) { setError('代理地址或端口无效。'); return; } app.notify('网络配置已保存在当前页面'); }}>保存网络配置</Button></div>{app.proxy.tested && <InlineMessage tone="success"><CheckCircledIcon/>网络连接通过（演示）。</InlineMessage>}
    <p className="small muted">代理不是必填项。访问受限或超时的结果会保留具体原因。</p>
  </section>;
}
function CheckSettings() {
  const app = useApp(); const [error, setError] = useState('');
  const fields = [{ key: 'concurrency', label: '总并发数', min: 1, max: 64, hint: '同时发出的请求数量。' }, { key: 'domainConcurrency', label: '单域名并发数', min: 1, max: 8, hint: '限制对同一网站的并发请求。' }, { key: 'timeout', label: '请求超时（秒）', min: 1, max: 120, hint: '超过后记录为超时，支持重试。' }, { key: 'retries', label: '失败重试次数', min: 0, max: 3, hint: '只对适合重试的临时失败执行。' }] as const;
  return <section className="settings-single"><h2>检查参数</h2><p className="muted">保存常用配置，在开始任务时选择本次范围和检查项目。</p><div className="form-columns">{fields.map(f => <Field key={f.key} label={f.label} hint={f.hint}><TextField.Root type="number" min={f.min} max={f.max} value={app.checkSettings[f.key]} onChange={e => app.setCheckSettings(prev => ({ ...prev, [f.key]: e.target.value }))}/></Field>)}</div>{error && <InlineMessage tone="warning"><span role="alert">{error}</span></InlineMessage>}<Button onClick={() => { if (fields.some(f => !Number.isInteger(Number(app.checkSettings[f.key])) || Number(app.checkSettings[f.key]) < f.min || Number(app.checkSettings[f.key]) > f.max)) { setError('请按每个输入框的范围填写整数。'); return; } if (Number(app.checkSettings.domainConcurrency) > Number(app.checkSettings.concurrency)) { setError('单域名并发数不能超过总并发数。'); return; } setError(''); app.notify('检查参数已保存'); }}>保存检查参数</Button><InlineMessage>检查期间可以继续浏览和搜索。暂停停止派发新工作，取消保留已经完成的结果。</InlineMessage></section>;
}
function UpdateSettings() {
  const app = useApp(); const [state, setState] = useState<'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'latest'>('idle'); const [progress, setProgress] = useState(0); const [restart, setRestart] = useState(false);
  useEffect(() => { if (state !== 'downloading') return; if (progress >= 100) { setState('ready'); return; } const timer = window.setTimeout(() => setProgress(p => Math.min(100, p + 10)), 140); return () => clearTimeout(timer); }, [state, progress]);
  function finish() { if (app.dirty && !app.backup('软件升级前的工作区备份')) return; app.setVersion('0.2.0'); app.reset(); app.notify('已演示重启至 v0.2.0，配置与备份保留在当前页面'); }
  return <section className="settings-single update-settings"><div className="version-line"><div className="update-mark"><DownloadIcon width="24" height="24"/></div><div><h2>书签管理器</h2><p>当前演示版本 v{app.version}</p></div><Badge color="gray" variant="surface">自升级演示</Badge></div><p className="muted">手动检查新版本，查看说明后再决定下载和重启。</p>
    <Button disabled={state === 'checking' || state === 'downloading'} loading={state === 'checking'} onClick={() => { setState('checking'); window.setTimeout(() => setState(app.version === '0.2.0' ? 'latest' : 'available'), 650); }}><ReloadIcon/>检查新版本</Button>
    {state === 'latest' && <InlineMessage tone="success">已经是最新演示版本。</InlineMessage>}
    {['available', 'downloading', 'ready'].includes(state) && <div className="update-release"><div className="section-heading"><h3>v0.2.0</h3><Badge>演示更新</Badge></div><p className="muted">以下内容用于展示升级流程，不代表实际发布。</p><ul><li>完善书签检查与结果处理体验</li><li>优化多浏览器覆盖写回预览</li><li>改进 AI 分析缓存与搜索提示</li></ul>
      {state === 'available' && <Button onClick={() => { setProgress(0); setState('downloading'); }}><DownloadIcon/>下载演示更新</Button>}
      {state === 'downloading' && <div className="download-progress"><Progress value={progress}/><span>{progress}%</span></div>}
      {state === 'ready' && <><InlineMessage tone="success">下载与校验流程已演示完成，可以重启应用。</InlineMessage><Button disabled={app.job?.state === 'running' || app.job?.state === 'paused'} onClick={() => app.dirty ? setRestart(true) : finish()}>模拟重启完成升级</Button>{(app.job?.state === 'running' || app.job?.state === 'paused') && <p className="muted">请先完成或取消当前检查任务。</p>}</>}
    </div>}
    <p className="small muted">原型不连接发布服务器、不下载程序、不替换实际文件。正式自升级安排在最后一个开发阶段。</p>
    {restart && <Modal title="重启前保存整理结果" description="当前还有尚未保存的修改，可以先写回、导出，或备份当前工作区后继续。" onClose={() => setRestart(false)} footer={<><Button variant="soft" color="gray" onClick={() => setRestart(false)}>取消</Button><Button variant="soft" onClick={() => { setRestart(false); app.navigate('writeback'); }}>写回浏览器</Button><Button variant="soft" onClick={() => { setRestart(false); app.navigate('export'); }}>导出 HTML</Button><Button onClick={finish}>备份并模拟重启</Button></>}><p>新会话会重新开始，当前演示配置与明确保存的备份继续保留。</p></Modal>}
  </section>;
}
