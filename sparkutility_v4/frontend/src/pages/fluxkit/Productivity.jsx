import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wrench, ChevronRight, GitCompare, Terminal, Globe,
  FileText, Link2, Copy, Check, ChevronDown, Zap,
  CheckCircle2, AlertTriangle,
} from 'lucide-react';
import FluxBackdrop from '@/components/fluxkit/FluxBackdrop';

const FH  = { fontFamily: '"Cormorant Garamond","Georgia",serif', fontWeight: 700, letterSpacing: '-0.02em' };
const FB  = { fontFamily: '"Montserrat","Inter",sans-serif' };
const FM  = { fontFamily: '"JetBrains Mono",monospace' };
const GOLD = '#FACC15';

function useCopy(timeout = 1800) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback((text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), timeout);
    });
  }, [timeout]);
  return [copied, copy];
}

function ToolPanel({ children, title, icon: Icon, code, chips }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-2xl border overflow-hidden transition-all duration-300"
      style={{ background: '#0a0a0a', borderColor: 'rgba(250,204,21,0.15)', boxShadow: '0 4px 32px rgba(0,0,0,0.4)' }}>
      <div className="h-px w-full" style={{ background: 'linear-gradient(90deg,#FACC15,#92400E 60%,transparent)' }} />
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 px-6 py-5 text-left hover:bg-white/[0.02] transition-colors">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,rgba(250,204,21,0.18),rgba(249,115,22,0.12))', border: '1px solid rgba(250,204,21,0.22)' }}>
          <Icon className="w-5 h-5" style={{ color: GOLD }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span style={{ ...FH, color: '#F5F0E8', fontSize: '1.05rem' }}>{title}</span>
            <span style={{ ...FM, fontSize: '0.65rem', color: GOLD, background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.2)', padding: '2px 8px', borderRadius: '4px' }}>{code}</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {chips.map(c => (
              <span key={c} style={{ ...FM, fontSize: '0.62rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(200,190,170,0.55)' }}>{c}</span>
            ))}
          </div>
        </div>
        <ChevronDown className="w-4 h-4 flex-shrink-0 transition-transform duration-200"
          style={{ color: 'rgba(250,204,21,0.5)', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28, ease: [0.22,1,0.36,1] }}
            style={{ overflow: 'hidden' }}>
            <div className="px-6 pb-7 pt-1 border-t" style={{ borderColor: 'rgba(250,204,21,0.08)' }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Textarea({ label, value, onChange, placeholder, readOnly, rows = 8 }) {
  const [copied, copy] = useCopy();
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span style={{ ...FM, fontSize: '0.68rem', color: 'rgba(200,190,170,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
        {readOnly && value && (
          <button onClick={() => copy(value)}
            className="flex items-center gap-1 text-[11px] transition-colors px-2 py-0.5 rounded"
            style={{ color: copied ? GOLD : 'rgba(200,190,170,0.4)', background: copied ? 'rgba(250,204,21,0.1)' : 'transparent' }}>
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>
      <textarea value={value} onChange={onChange} placeholder={placeholder} readOnly={readOnly} rows={rows}
        spellCheck={false}
        className="w-full resize-y rounded-xl px-4 py-3 text-sm outline-none transition-all duration-200"
        style={{ ...FM, fontSize: '0.8rem', lineHeight: '1.6',
          background: readOnly ? 'rgba(250,204,21,0.025)' : 'rgba(255,255,255,0.03)',
          border: `1px solid ${readOnly ? 'rgba(250,204,21,0.15)' : 'rgba(255,255,255,0.08)'}`,
          color: readOnly ? 'rgba(250,204,21,0.85)' : '#F5F0E8', caretColor: GOLD }}
        onFocus={e => { if (!readOnly) e.target.style.borderColor = 'rgba(250,204,21,0.35)'; }}
        onBlur={e => { if (!readOnly) e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }} />
    </div>
  );
}

function ActionBtn({ onClick, icon: Icon, label, disabled, variant = 'primary' }) {
  if (variant === 'secondary') {
    return (
      <button onClick={onClick} disabled={disabled}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
        style={{ ...FB, border: '1px solid rgba(250,204,21,0.2)', color: 'rgba(200,190,170,0.6)', background: 'transparent', minWidth: '90px', justifyContent: 'center' }}>
        {Icon && <Icon className="w-4 h-4" />} {label}
      </button>
    );
  }
  return (
    <button onClick={onClick} disabled={disabled}
      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-black transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
      style={{ background: 'linear-gradient(135deg,#FACC15,#F97316)', ...FB, minWidth: '120px', justifyContent: 'center' }}>
      {Icon && <Icon className="w-4 h-4" />} {label}
    </button>
  );
}

function StatusBanner({ type, message }) {
  if (!message) return null;
  const cfg = {
    error:   { bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.25)',  color: '#FCA5A5', Icon: AlertTriangle },
    success: { bg: 'rgba(250,204,21,0.06)', border: 'rgba(250,204,21,0.25)', color: GOLD,      Icon: CheckCircle2 },
  };
  const { bg, border, color, Icon } = cfg[type] || cfg.success;
  return (
    <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl" style={{ background: bg, border: `1px solid ${border}` }}>
      <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color }} />
      <p style={{ ...FB, fontSize: '0.78rem', color, lineHeight: '1.55' }}>{message}</p>
    </div>
  );
}

function computeLineDiff(a, b) {
  const al = a.split('\n'), bl = b.split('\n');
  const m = al.length, n = bl.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = al[i-1] === bl[j-1] ? dp[i-1][j-1] + 1 : Math.max(dp[i-1][j], dp[i][j-1]);

  const result = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && al[i-1] === bl[j-1]) {
      result.unshift({ type: 'same', text: al[i-1] }); i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j-1] >= dp[i-1][j])) {
      result.unshift({ type: 'add', text: bl[j-1] }); j--;
    } else {
      result.unshift({ type: 'remove', text: al[i-1] }); i--;
    }
  }
  return result;
}

function DiffViewerTool() {
  const [left, setLeft]   = useState('');
  const [right, setRight] = useState('');
  const [diff, setDiff]   = useState(null);
  const [status, setStatus] = useState(null);

  const compare = () => {
    if (!left && !right) { setStatus({ type: 'error', message: 'Paste text into both panels first.' }); return; }
    setDiff(computeLineDiff(left, right));
    const added = computeLineDiff(left, right).filter(d => d.type === 'add').length;
    const removed = computeLineDiff(left, right).filter(d => d.type === 'remove').length;
    setStatus({ type: 'success', message: `✓ Diff complete — ${added} added, ${removed} removed.` });
  };
  const clear = () => { setLeft(''); setRight(''); setDiff(null); setStatus(null); };

  return (
    <ToolPanel title="Diff Viewer" icon={GitCompare} code="diff.compare()" chips={['Line-by-line', 'LCS algorithm', 'Added / Removed / Unchanged']}>
      <div className="space-y-4 mt-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Textarea label="Original (A)" value={left} onChange={e => setLeft(e.target.value)} placeholder="Paste original text here…" rows={8} />
          <Textarea label="Modified (B)" value={right} onChange={e => setRight(e.target.value)} placeholder="Paste modified text here…" rows={8} />
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionBtn onClick={compare} icon={GitCompare} label="Compare" />
          <ActionBtn onClick={clear} label="Clear" variant="secondary" />
        </div>
        {status && <StatusBanner type={status.type} message={status.message} />}
        {diff && (
          <div className="space-y-2">
            <div className="flex gap-4 text-xs" style={FM}>
              <span style={{ color: 'rgb(74,222,128)' }}>+{diff.filter(d => d.type === 'add').length} added</span>
              <span style={{ color: 'rgb(248,113,113)' }}>−{diff.filter(d => d.type === 'remove').length} removed</span>
              <span style={{ color: 'rgba(200,190,170,0.5)' }}>{diff.filter(d => d.type === 'same').length} unchanged</span>
            </div>
            <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'rgba(250,204,21,0.12)' }}>
              {diff.map((line, idx) => (
                <div key={idx} className="flex text-xs"
                  style={{
                    background: line.type === 'add' ? 'rgba(74,222,128,0.06)' : line.type === 'remove' ? 'rgba(248,113,113,0.06)' : 'transparent',
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                  }}>
                  <span className="w-6 flex-shrink-0 text-center py-1 select-none"
                    style={{ color: line.type === 'add' ? 'rgb(74,222,128)' : line.type === 'remove' ? 'rgb(248,113,113)' : 'rgba(200,190,170,0.2)' }}>
                    {line.type === 'add' ? '+' : line.type === 'remove' ? '−' : ' '}
                  </span>
                  <pre className="py-1 px-2 flex-1 overflow-x-auto whitespace-pre-wrap break-words"
                    style={{ ...FM, color: line.type === 'add' ? 'rgb(134,239,172)' : line.type === 'remove' ? 'rgb(252,165,165)' : 'rgba(200,190,170,0.75)' }}>
                    {line.text || ' '}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ToolPanel>
  );
}

const LOG_STYLES = [
  { id: 'styled',  label: 'Styled'  },
  { id: 'table',   label: 'Table'   },
  { id: 'group',   label: 'Group'   },
  { id: 'minimal', label: 'Minimal' },
];

function generateConsoleLog(varName, style, label) {
  const tag = label || varName;
  if (!varName.trim()) return '';
  switch (style) {
    case 'styled':
      return `console.log(\n  '%c[${tag}]',\n  'color: #FACC15; font-weight: bold; background: #1a1a1a; padding: 2px 6px; border-radius: 4px;',\n  ${varName}\n);`;
    case 'table':
      return `console.table(${varName}); // label: ${tag}`;
    case 'group':
      return `console.group('%c${tag}', 'color: #FACC15; font-weight: bold;');\nconsole.log(${varName});\nconsole.groupEnd();`;
    case 'minimal':
      return `console.log('[${tag}]', ${varName});`;
    default:
      return `console.log('[${tag}]', ${varName});`;
  }
}

function ConsoleLogTool() {
  const [varName, setVarName] = useState('');
  const [label, setLabel]     = useState('');
  const [style, setStyle]     = useState('styled');
  const output = generateConsoleLog(varName, style, label);
  const [copied, copy] = useCopy();

  return (
    <ToolPanel title="Console Log Generator" icon={Terminal} code="console.gen()" chips={['Styled', 'Table', 'Group', 'Minimal', 'Custom label']}>
      <div className="space-y-4 mt-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label style={{ ...FM, fontSize: '0.68rem', color: 'rgba(200,190,170,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block' }}>Variable Name</label>
            <input
              value={varName}
              onChange={e => setVarName(e.target.value)}
              placeholder="userData"
              className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all duration-200"
              style={{ ...FM, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#F5F0E8', caretColor: GOLD }}
              onFocus={e => e.target.style.borderColor = 'rgba(250,204,21,0.35)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
            />
          </div>
          <div className="space-y-1.5">
            <label style={{ ...FM, fontSize: '0.68rem', color: 'rgba(200,190,170,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block' }}>Label (optional)</label>
            <input
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="User data check"
              className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all duration-200"
              style={{ ...FM, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#F5F0E8', caretColor: GOLD }}
              onFocus={e => e.target.style.borderColor = 'rgba(250,204,21,0.35)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {LOG_STYLES.map(s => (
            <button key={s.id} onClick={() => setStyle(s.id)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                ...FB,
                background: style === s.id ? 'rgba(250,204,21,0.15)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${style === s.id ? 'rgba(250,204,21,0.4)' : 'rgba(255,255,255,0.08)'}`,
                color: style === s.id ? GOLD : 'rgba(200,190,170,0.6)',
              }}>
              {s.label}
            </button>
          ))}
        </div>
        {output && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span style={{ ...FM, fontSize: '0.68rem', color: 'rgba(200,190,170,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Output</span>
              <button onClick={() => copy(output)}
                className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded transition-colors"
                style={{ color: copied ? GOLD : 'rgba(200,190,170,0.4)', background: copied ? 'rgba(250,204,21,0.1)' : 'transparent' }}>
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="rounded-xl p-4 text-sm overflow-x-auto"
              style={{ ...FM, background: 'rgba(250,204,21,0.025)', border: '1px solid rgba(250,204,21,0.15)', color: 'rgba(250,204,21,0.85)' }}>
              {output}
            </pre>
          </div>
        )}
      </div>
    </ToolPanel>
  );
}

function parseCurl(raw) {
  const src = raw.replace(/\\\n/g, ' ').replace(/\s+/g, ' ').trim();
  const urlMatch = src.match(/curl\s+(?:-[a-zA-Z]+\s+)*['"]?(https?:\/\/[^\s'"]+)['"']?/);
  const url = urlMatch ? urlMatch[1] : '';
  const methodMatch = src.match(/(?:-X|--request)\s+(['"']?)(\w+)\1/);
  const method = methodMatch ? methodMatch[2].toUpperCase() : 'GET';
  const headers = {};
  const headerRe = /(?:-H|--header)\s+['"]([^'"]+)['"]/g;
  let hm;
  while ((hm = headerRe.exec(src)) !== null) {
    const [key, ...rest] = hm[1].split(': ');
    if (key) headers[key.trim()] = rest.join(': ').trim();
  }
  const bodyMatch = src.match(/(?:-d|--data(?:-raw)?)\s+(['"])(['\s\S]*?)\1/);
  const body = bodyMatch ? bodyMatch[2] : '';
  return { url, method, headers, body };
}

function toFetch({ url, method, headers, body }) {
  const opts = [];
  if (method !== 'GET') opts.push(`  method: '${method}'`);
  if (Object.keys(headers).length) {
    const hdrs = Object.entries(headers).map(([k, v]) => `    '${k}': '${v}'`).join(',\n');
    opts.push(`  headers: {\n${hdrs}\n  }`);
  }
  if (body) opts.push(`  body: \`${body}\``);
  return opts.length ? `fetch('${url}', {\n${opts.join(',\n')}\n});` : `fetch('${url}');`;
}

function toAxios({ url, method, headers, body }) {
  const m = method.toLowerCase();
  const cfg = [];
  if (Object.keys(headers).length) {
    const hdrs = Object.entries(headers).map(([k, v]) => `    '${k}': '${v}'`).join(',\n');
    cfg.push(`  headers: {\n${hdrs}\n  }`);
  }
  const cfgStr = cfg.length ? `, {\n${cfg.join(',\n')}\n}` : '';
  if (body && (m === 'post' || m === 'put' || m === 'patch'))
    return `axios.${m}('${url}', \`${body}\`${cfgStr});`;
  return cfgStr ? `axios.${m}('${url}'${cfgStr});` : `axios.${m}('${url}');`;
}

function CurlConverterTool() {
  const [input, setInput]   = useState('');
  const [fetchOut, setFetchOut] = useState('');
  const [axiosOut, setAxiosOut] = useState('');
  const [status, setStatus]     = useState(null);
  const [copiedF, copyF] = useCopy();
  const [copiedA, copyA] = useCopy();

  const convert = () => {
    if (!input.trim()) { setStatus({ type: 'error', message: 'Paste a curl command first.' }); return; }
    try {
      const parsed = parseCurl(input);
      if (!parsed.url) { setStatus({ type: 'error', message: 'Could not extract a URL. Make sure it starts with curl and contains an http/https URL.' }); return; }
      setFetchOut(toFetch(parsed));
      setAxiosOut(toAxios(parsed));
      setStatus({ type: 'success', message: `✓ Converted — ${parsed.method} ${parsed.url}` });
    } catch {
      setStatus({ type: 'error', message: 'Could not parse the curl command. Check the format and try again.' });
    }
  };

  return (
    <ToolPanel title="cURL → Fetch / Axios" icon={Globe} code="curl.toJs()" chips={['-X method', '-H headers', '-d body', 'fetch()', 'axios()']}>
      <div className="space-y-4 mt-2">
        <Textarea label="cURL Command" value={input} onChange={e => setInput(e.target.value)}
          placeholder={`curl 'https://api.example.com/users' -X POST -H 'Content-Type: application/json' -d '{"name":"Harry"}'`} rows={5} />
        <ActionBtn onClick={convert} icon={Globe} label="Convert" disabled={!input.trim()} />
        {status && <StatusBanner type={status.type} message={status.message} />}
        {fetchOut && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span style={{ ...FM, fontSize: '0.68rem', color: 'rgba(200,190,170,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>fetch()</span>
                <button onClick={() => copyF(fetchOut)} className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded transition-colors"
                  style={{ color: copiedF ? GOLD : 'rgba(200,190,170,0.4)', background: copiedF ? 'rgba(250,204,21,0.1)' : 'transparent' }}>
                  {copiedF ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedF ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="rounded-xl p-4 text-sm overflow-x-auto"
                style={{ ...FM, background: 'rgba(250,204,21,0.025)', border: '1px solid rgba(250,204,21,0.15)', color: 'rgba(250,204,21,0.85)' }}>
                {fetchOut}
              </pre>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span style={{ ...FM, fontSize: '0.68rem', color: 'rgba(200,190,170,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>axios()</span>
                <button onClick={() => copyA(axiosOut)} className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded transition-colors"
                  style={{ color: copiedA ? GOLD : 'rgba(200,190,170,0.4)', background: copiedA ? 'rgba(250,204,21,0.1)' : 'transparent' }}>
                  {copiedA ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedA ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="rounded-xl p-4 text-sm overflow-x-auto"
                style={{ ...FM, background: 'rgba(250,204,21,0.025)', border: '1px solid rgba(250,204,21,0.15)', color: 'rgba(250,204,21,0.85)' }}>
                {axiosOut}
              </pre>
            </div>
          </div>
        )}
      </div>
    </ToolPanel>
  );
}

function simpleMarkdown(md) {
  const esc = md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lines = esc.split('\n');
  const out = [];
  let inCodeBlock = false, codeLines = [], inList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('```')) {
      if (!inCodeBlock) { if (inList) { out.push('</ul>'); inList = false; } inCodeBlock = true; codeLines = []; }
      else { inCodeBlock = false; out.push(`<pre style="background:rgba(0,0,0,0.3);padding:12px;border-radius:8px;overflow-x:auto"><code>${codeLines.join('\n')}</code></pre>`); }
      continue;
    }
    if (inCodeBlock) { codeLines.push(line); continue; }
    const h3 = line.match(/^### (.+)$/); if (h3) { if (inList) { out.push('</ul>'); inList = false; } out.push(`<h3 style="font-size:1.15rem;font-weight:700;margin:1rem 0 0.4rem">${mdInline(h3[1])}</h3>`); continue; }
    const h2 = line.match(/^## (.+)$/);  if (h2) { if (inList) { out.push('</ul>'); inList = false; } out.push(`<h2 style="font-size:1.35rem;font-weight:700;margin:1.2rem 0 0.5rem">${mdInline(h2[1])}</h2>`); continue; }
    const h1 = line.match(/^# (.+)$/);   if (h1) { if (inList) { out.push('</ul>'); inList = false; } out.push(`<h1 style="font-size:1.7rem;font-weight:800;margin:1.5rem 0 0.6rem">${mdInline(h1[1])}</h1>`); continue; }
    if (/^-{3,}$/.test(line)) { if (inList) { out.push('</ul>'); inList = false; } out.push('<hr style="border:none;border-top:1px solid rgba(255,255,255,0.15);margin:1rem 0" />'); continue; }
    const li = line.match(/^[-*] (.+)$/) || line.match(/^\d+\. (.+)$/);
    if (li) { if (!inList) { out.push('<ul style="padding-left:1.4rem;margin:0.4rem 0">'); inList = true; } out.push(`<li style="margin:0.2rem 0">${mdInline(li[1])}</li>`); continue; }
    if (inList) { out.push('</ul>'); inList = false; }
    if (!line.trim()) { out.push('<br />'); continue; }
    out.push(`<p style="margin:0.3rem 0;line-height:1.7">${mdInline(line)}</p>`);
  }
  if (inList) out.push('</ul>');
  if (inCodeBlock) out.push(`<pre style="background:rgba(0,0,0,0.3);padding:12px;border-radius:8px"><code>${codeLines.join('\n')}</code></pre>`);
  return out.join('\n');
}

function mdInline(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code style="background:rgba(250,204,21,0.1);padding:1px 5px;border-radius:4px;font-family:monospace">$1</code>')
    .replace(/\[([^\]]+)\]\(((?!javascript:)[^)]+)\)/g, '<a href="$2" style="color:#FACC15;text-decoration:underline" target="_blank" rel="noopener noreferrer">$1</a>');
}

const MD_PLACEHOLDER = `# Hello, FluxKit\n\nThis is a **live** Markdown preview.\n\n## Features\n- Bold and *italic* text\n- \`inline code\`\n- [Links](https://example.com)\n\n\`\`\`js\nconsole.log('code blocks work too');\n\`\`\`\n`;

function MarkdownTool() {
  const [md, setMd] = useState(MD_PLACEHOLDER);
  const htmlOut = simpleMarkdown(md);

  return (
    <ToolPanel title="Markdown → HTML Live Preview" icon={FileText} code="md.preview()" chips={['Headers', 'Bold / Italic', 'Code blocks', 'Lists', 'Links']}>
      <div className="mt-2 space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Textarea label="Markdown" value={md} onChange={e => setMd(e.target.value)} placeholder="# Your markdown here…" rows={14} />
          <div className="flex flex-col gap-1.5">
            <span style={{ ...FM, fontSize: '0.68rem', color: 'rgba(200,190,170,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Preview</span>
            <div
              className="flex-1 rounded-xl p-4 overflow-y-auto text-sm leading-relaxed"
              style={{
                background: 'rgba(250,204,21,0.025)', border: '1px solid rgba(250,204,21,0.15)',
                color: 'rgba(220,210,190,0.9)', minHeight: '14rem', fontFamily: 'Georgia,serif',
              }}
              dangerouslySetInnerHTML={{ __html: htmlOut }}
            />
          </div>
        </div>
      </div>
    </ToolPanel>
  );
}

function parseUrl(raw) {
  try {
    const u = new URL(raw.trim().startsWith('http') ? raw.trim() : `https://${raw.trim()}`);
    const params = [];
    u.searchParams.forEach((v, k) => params.push({ key: k, value: v }));
    return {
      ok: true,
      protocol: u.protocol.replace(':', ''),
      host: u.hostname,
      port: u.port || (u.protocol === 'https:' ? '443' : '80') + ' (default)',
      pathname: u.pathname,
      hash: u.hash || '—',
      params,
    };
  } catch {
    return { ok: false };
  }
}

function UrlParserTool() {
  const [input, setInput] = useState('');
  const parsed = input.trim() ? parseUrl(input) : null;

  const Row = ({ label, value }) => (
    <div className="flex items-start gap-4 py-2.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
      <span className="w-24 flex-shrink-0 text-[11px] uppercase tracking-wider pt-0.5"
        style={{ ...FM, color: 'rgba(200,190,170,0.4)' }}>{label}</span>
      <span className="text-sm break-all" style={{ ...FM, color: '#F5F0E8' }}>{value}</span>
    </div>
  );

  return (
    <ToolPanel title="URL Parser" icon={Link2} code="url.parse()" chips={['Protocol', 'Host', 'Port', 'Path', 'Query params', 'Hash']}>
      <div className="space-y-4 mt-2">
        <div className="space-y-1.5">
          <label style={{ ...FM, fontSize: '0.68rem', color: 'rgba(200,190,170,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block' }}>URL</label>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="https://api.example.com/v2/users?page=1&limit=20#results"
            className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all duration-200"
            style={{ ...FM, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#F5F0E8', caretColor: GOLD }}
            onFocus={e => e.target.style.borderColor = 'rgba(250,204,21,0.35)'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
          />
        </div>
        {parsed && !parsed.ok && <StatusBanner type="error" message="Invalid URL — could not parse." />}
        {parsed && parsed.ok && (
          <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'rgba(250,204,21,0.12)' }}>
            <div className="px-4" style={{ background: '#0d0d0d' }}>
              <Row label="Protocol" value={parsed.protocol} />
              <Row label="Host"     value={parsed.host}     />
              <Row label="Port"     value={parsed.port}     />
              <Row label="Path"     value={parsed.pathname} />
              <Row label="Hash"     value={parsed.hash}     />
            </div>
            {parsed.params.length > 0 && (
              <div className="px-4 pb-2 pt-3" style={{ background: '#0d0d0d', borderTop: '1px solid rgba(250,204,21,0.08)' }}>
                <p style={{ ...FM, fontSize: '0.68rem', color: GOLD, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
                  Query Parameters ({parsed.params.length})
                </p>
                <div className="space-y-1.5">
                  {parsed.params.map(({ key, value }) => (
                    <div key={key} className="flex items-center gap-3 rounded-lg px-3 py-2"
                      style={{ background: 'rgba(250,204,21,0.04)', border: '1px solid rgba(250,204,21,0.1)' }}>
                      <span style={{ ...FM, fontSize: '0.8rem', color: GOLD }}>{key}</span>
                      <span style={{ color: 'rgba(200,190,170,0.4)' }}>=</span>
                      <span style={{ ...FM, fontSize: '0.8rem', color: 'rgba(200,190,170,0.85)' }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </ToolPanel>
  );
}

const TOOLS = [DiffViewerTool, ConsoleLogTool, CurlConverterTool, MarkdownTool, UrlParserTool];

export default function Productivity() {
  return (
    <div style={{ minHeight: 'calc(100vh - 4rem)', background: '#050505' }}>
      <style>{`
        textarea { color-scheme: dark; }
        textarea::placeholder { color: rgba(200,190,170,0.22) !important; }
        input::placeholder { color: rgba(200,190,170,0.22) !important; }
      `}</style>

      <FluxBackdrop />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-20">

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex items-center gap-1.5 mb-10"
          style={{ ...FB, fontSize: '0.75rem', color: 'rgba(200,190,170,0.4)' }}>
          <Zap className="w-3 h-3" style={{ color: GOLD, fill: GOLD }} />
          <span style={{ color: GOLD }}>FluxKit</span>
          <ChevronRight className="w-3 h-3" />
          <span>Productivity Tools</span>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-sm mb-8"
          style={{ background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.25)', ...FM, fontSize: '0.68rem', color: GOLD, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          <Wrench className="w-3 h-3" />
          Productivity Utilities
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          style={{ ...FH, fontSize: 'clamp(2.2rem,6vw,4.5rem)', lineHeight: 1.05, color: '#F5F0E8', marginBottom: '1rem' }}>
          <span style={{ color: GOLD }}>Cut</span> the friction.<br />
          <span>Ship faster.</span>
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
          style={{ ...FB, fontSize: '0.95rem', color: 'rgba(200,190,170,0.6)', lineHeight: '1.7', maxWidth: '520px', marginBottom: '1.75rem' }}>
          Five speed tools for everyday developer friction — diff viewer, styled console log generator,
          cURL→Fetch/Axios converter, live Markdown preview, and URL parser. All 100% in-browser.
        </motion.p>

        <motion.div initial={{ opacity: 0, scaleX: 0 }} animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.5, delay: 0.25 }} className="flex items-center gap-4 mb-12" style={{ transformOrigin: 'left' }}>
          <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg,rgba(250,204,21,0.3),transparent)' }} />
          <span style={{ ...FM, fontSize: '0.65rem', color: 'rgba(250,204,21,0.35)' }}>5 live tools · click panel to expand/collapse</span>
          <div className="h-px w-16" style={{ background: 'rgba(250,204,21,0.1)' }} />
        </motion.div>

        <div className="space-y-4">
          {TOOLS.map((Tool, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}>
              <Tool />
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          transition={{ delay: 0.15 }} className="mt-12 text-center">
          <div className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl"
            style={{ background: 'rgba(250,204,21,0.04)', border: '1px solid rgba(250,204,21,0.13)' }}>
            <CheckCircle2 className="w-4 h-4" style={{ color: 'rgba(250,204,21,0.45)' }} />
            <span style={{ ...FB, fontSize: '0.78rem', color: 'rgba(200,190,170,0.45)' }}>
              All FluxKit tools run 100% in-browser. No data is ever sent to a server.
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
