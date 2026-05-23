import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database, ChevronRight, Braces, FileJson, Sheet, Settings2, Table2,
  Copy, Check, AlertTriangle, CheckCircle2, Zap, ArrowLeftRight,
  ChevronDown,
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

function ActionBtn({ onClick, icon: Icon, label, disabled }) {
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

function jsonAutoFix(raw) {
  let s = raw.trim();
  if (!s) throw new Error('Input is empty.');
  s = s.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  s = s.replace(/,\s*([\]}])/g, '$1');
  s = s.replace(/'/g, '"');
  s = s.replace(/([{,]\s*)([A-Za-z_$][A-Za-z0-9_$]*)(\s*:)/g, '$1"$2"$3');
  const stack = [];
  const pairs = { '{': '}', '[': ']' };
  const closers = new Set(['}', ']']);
  for (const ch of s) {
    if (pairs[ch]) stack.push(pairs[ch]);
    else if (closers.has(ch) && stack.length && stack[stack.length - 1] === ch) stack.pop();
  }
  while (stack.length) s += stack.pop();
  JSON.parse(s);
  return JSON.stringify(JSON.parse(s), null, 2);
}

function JSONValidator() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [status, setStatus] = useState(null);

  const validate = () => {
    if (!input.trim()) { setStatus({ type: 'error', message: 'Paste some JSON first.' }); return; }
    try {
      setOutput(JSON.stringify(JSON.parse(input), null, 2));
      setStatus({ type: 'success', message: '✓ Valid JSON — formatted successfully.' });
    } catch (e) {
      setStatus({ type: 'error', message: `Invalid JSON: ${e.message}` }); setOutput('');
    }
  };

  const fix = () => {
    if (!input.trim()) { setStatus({ type: 'error', message: 'Paste some JSON to fix.' }); return; }
    try {
      setOutput(jsonAutoFix(input));
      setStatus({ type: 'success', message: '✓ JSON repaired and formatted.' });
    } catch (e) {
      setStatus({ type: 'error', message: `Could not auto-fix: ${e.message}` }); setOutput('');
    }
  };

  return (
    <ToolPanel title="JSON Validator & Fixer" icon={Braces} code="json.validate()" chips={['Auto-repair','Syntax hints','Pretty-print']}>
      <div className="space-y-4 mt-2">
        <Textarea label="Input JSON" value={input} onChange={e => setInput(e.target.value)}
          placeholder={'{\n  "name": "Alice"\n  "age": 30\n  "active": true\n}'} />
        <div className="flex flex-wrap gap-2">
          <ActionBtn onClick={validate} icon={CheckCircle2} label="Validate" disabled={!input.trim()} />
          <ActionBtn onClick={fix}      icon={Zap}          label="Auto-Fix" disabled={!input.trim()} />
        </div>
        {status && <StatusBanner type={status.type} message={status.message} />}
        {output && <Textarea label="Output" value={output} readOnly rows={10} />}
      </div>
    </ToolPanel>
  );
}

function xmlNodeToObj(node) {
  if (node.nodeType === 3) return node.nodeValue.trim() || undefined;
  if (node.nodeType === 8) return undefined;
  const obj = {};
  if (node.attributes && node.attributes.length) {
    obj['@attributes'] = {};
    for (const attr of node.attributes) obj['@attributes'][attr.name] = attr.value;
  }
  const children = Array.from(node.childNodes).filter(c =>
    c.nodeType === 8 ? false : c.nodeType === 3 ? c.nodeValue.trim() !== '' : true
  );
  if (children.length === 1 && children[0].nodeType === 3) {
    const text = children[0].nodeValue.trim();
    if (!obj['@attributes']) return text;
    obj['#text'] = text; return obj;
  }
  for (const child of children) {
    const key = child.nodeName;
    const val = xmlNodeToObj(child);
    if (val === undefined) continue;
    if (obj[key] !== undefined) {
      if (!Array.isArray(obj[key])) obj[key] = [obj[key]];
      obj[key].push(val);
    } else obj[key] = val;
  }
  return Object.keys(obj).length ? obj : '';
}

function XMLtoJSON() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [status, setStatus] = useState(null);

  const convert = () => {
    if (!input.trim()) { setStatus({ type: 'error', message: 'Paste XML to convert.' }); return; }
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(input.trim(), 'application/xml');
      const err = doc.querySelector('parsererror');
      if (err) throw new Error(err.textContent.split('\n')[0]);
      const root = doc.documentElement;
      setOutput(JSON.stringify({ [root.nodeName]: xmlNodeToObj(root) }, null, 2));
      setStatus({ type: 'success', message: '✓ XML converted to JSON successfully.' });
    } catch (e) {
      setStatus({ type: 'error', message: `Parse error: ${e.message}` }); setOutput('');
    }
  };

  return (
    <ToolPanel title="XML → JSON Converter" icon={FileJson} code="xml.toJson()" chips={['Namespaces','Attributes','Nested nodes']}>
      <div className="space-y-4 mt-2">
        <Textarea label="Input XML" value={input} onChange={e => setInput(e.target.value)}
          placeholder={'<user id="1">\n  <name>Alice</name>\n  <role>admin</role>\n</user>'} />
        <ActionBtn onClick={convert} icon={ArrowLeftRight} label="Convert to JSON" disabled={!input.trim()} />
        {status && <StatusBanner type={status.type} message={status.message} />}
        {output && <Textarea label="Output JSON" value={output} readOnly rows={10} />}
      </div>
    </ToolPanel>
  );
}

function parseCSVRaw(raw, delimiter) {
  const rows = [[]]; let cur = '', inQ = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === '"') { if (inQ && raw[i+1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
    else if (!inQ && ch === delimiter) { rows[rows.length-1].push(cur); cur = ''; }
    else if (!inQ && (ch === '\n' || (ch === '\r' && raw[i+1] === '\n'))) {
      rows[rows.length-1].push(cur); cur = '';
      if (ch === '\r') i++;
      if (i < raw.length-1) rows.push([]);
    } else cur += ch;
  }
  rows[rows.length-1].push(cur);
  return rows.filter(r => r.some(c => c !== ''));
}

function infer(v) {
  const t = v.trim();
  if (!t) return null;
  if (t === 'true' || t === 'TRUE') return true;
  if (t === 'false' || t === 'FALSE') return false;
  const n = Number(t);
  if (!isNaN(n)) return n;
  return t;
}

function CSVtoJSON() {
  const [input, setInput] = useState('');
  const [delimiter, setDelimiter] = useState(',');
  const [mode, setMode] = useState('objects');
  const [output, setOutput] = useState('');
  const [status, setStatus] = useState(null);

  const convert = () => {
    if (!input.trim()) { setStatus({ type: 'error', message: 'Paste CSV data first.' }); return; }
    try {
      const delim = delimiter === '\\t' ? '\t' : (delimiter || ',');
      const rows = parseCSVRaw(input.trim(), delim);
      if (!rows.length) throw new Error('No data rows found.');
      let result;
      if (mode === 'objects') {
        const [headers, ...data] = rows;
        if (!data.length) throw new Error('Only a header row found — need at least one data row.');
        result = data.map(row => Object.fromEntries(headers.map((h, i) => [h.trim(), infer(row[i] ?? '')])));
      } else {
        result = rows.map(row => row.map(c => infer(c)));
      }
      setOutput(JSON.stringify(result, null, 2));
      setStatus({ type: 'success', message: `✓ Converted ${result.length} row${result.length !== 1 ? 's' : ''}.` });
    } catch (e) {
      setStatus({ type: 'error', message: e.message }); setOutput('');
    }
  };

  return (
    <ToolPanel title="CSV → JSON / Array" icon={Sheet} code="csv.toArray()" chips={['Custom delimiter','Type inference','Header detection']}>
      <div className="space-y-4 mt-2">
        <Textarea label="Input CSV" value={input} onChange={e => setInput(e.target.value)}
          placeholder={"name,age,active\nAlice,30,true\nBob,25,false"} />
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-1.5">
            <span style={{ ...FM, fontSize: '0.65rem', color: 'rgba(200,190,170,0.45)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Delimiter</span>
            <input value={delimiter} onChange={e => setDelimiter(e.target.value)} placeholder=","
              className="w-20 rounded-lg px-3 py-1.5 text-sm outline-none"
              style={{ ...FM, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#F5F0E8' }} />
          </div>
          <div className="flex flex-col gap-1.5">
            <span style={{ ...FM, fontSize: '0.65rem', color: 'rgba(200,190,170,0.45)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Output mode</span>
            <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
              {['objects','array'].map(m => (
                <button key={m} onClick={() => setMode(m)} className="px-3 py-1.5 text-xs font-semibold transition-all"
                  style={{ ...FB, background: mode === m ? 'rgba(250,204,21,0.15)' : 'rgba(255,255,255,0.02)', color: mode === m ? GOLD : 'rgba(200,190,170,0.5)', borderRight: m === 'objects' ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
        <ActionBtn onClick={convert} icon={ArrowLeftRight} label="Convert" disabled={!input.trim()} />
        {status && <StatusBanner type={status.type} message={status.message} />}
        {output && <Textarea label="Output JSON" value={output} readOnly rows={10} />}
      </div>
    </ToolPanel>
  );
}

function parseYAMLSimple(text) {
  const lines = text.split('\n');
  function pv(v) {
    v = v.trim();
    if (!v || v === 'null' || v === '~') return null;
    if (v === 'true' || v === 'True') return true;
    if (v === 'false' || v === 'False') return false;
    if (/^-?\d+$/.test(v)) return parseInt(v, 10);
    if (/^-?\d*\.\d+$/.test(v)) return parseFloat(v);
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) return v.slice(1,-1);
    return v;
  }
  function indent(l) { return l.match(/^(\s*)/)[1].length; }

  function parseBlock(si, base) {
    let obj = {}, arr = null, i = si;
    while (i < lines.length) {
      const line = lines[i];
      const t = line.trim();
      if (!t || t.startsWith('#')) { i++; continue; }
      const ind = indent(line);
      if (ind < base) break;
      if (ind > base) { i++; continue; }

      if (t.startsWith('- ')) {
        if (!arr) arr = [];
        const rest = t.slice(2).trim();
        if (rest) { arr.push(pv(rest)); i++; }
        else { const [sub, ni] = parseBlock(i+1, ind+2); arr.push(sub); i = ni; }
        continue;
      }
      const ci = t.indexOf(': ');
      const cei = t.endsWith(':') ? t.length-1 : -1;
      if (ci !== -1) {
        const key = t.slice(0, ci), val = t.slice(ci+2).trim();
        if (!val) { const [sub, ni] = parseBlock(i+1, ind+2); obj[key] = sub; i = ni; }
        else { obj[key] = pv(val); i++; }
      } else if (cei !== -1) {
        const key = t.slice(0,-1);
        const [sub, ni] = parseBlock(i+1, ind+2); obj[key] = sub; i = ni;
      } else { i++; }
    }
    return [arr !== null ? arr : (Object.keys(obj).length ? obj : null), i];
  }

  const [r] = parseBlock(0, 0);
  return r;
}

function toYAML(v, ind = 0) {
  const p = '  '.repeat(ind);
  if (v === null) return 'null';
  if (typeof v === 'boolean') return String(v);
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') {
    if (v.includes('\n') || v.includes(':') || v.includes('#') || /^[\[\]{}&*!|>'"@`]/.test(v) || v === '')
      return `"${v.replace(/"/g, '\\"')}"`;
    return v;
  }
  if (Array.isArray(v)) {
    if (!v.length) return '[]';
    return v.map(item => {
      if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
        const sub = toYAML(item, ind+1).trimStart();
        return `${p}- ${sub}`;
      }
      return `${p}- ${toYAML(item, ind)}`;
    }).join('\n');
  }
  return Object.entries(v).map(([k, val]) => {
    if (val !== null && typeof val === 'object')
      return `${p}${k}:\n${toYAML(val, ind+1)}`;
    return `${p}${k}: ${toYAML(val, ind)}`;
  }).join('\n');
}

function YAMLtoJSON() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [dir, setDir] = useState('yaml2json');
  const [status, setStatus] = useState(null);

  const convert = () => {
    if (!input.trim()) { setStatus({ type: 'error', message: 'Paste content to convert.' }); return; }
    try {
      if (dir === 'yaml2json') {
        const parsed = parseYAMLSimple(input.trim());
        if (parsed === null) throw new Error('Could not parse YAML — check indentation and syntax.');
        setOutput(JSON.stringify(parsed, null, 2));
        setStatus({ type: 'success', message: '✓ YAML converted to JSON.' });
      } else {
        const obj = JSON.parse(input.trim());
        setOutput(toYAML(obj));
        setStatus({ type: 'success', message: '✓ JSON converted to YAML.' });
      }
    } catch (e) {
      setStatus({ type: 'error', message: `Error: ${e.message}` }); setOutput('');
    }
  };

  return (
    <ToolPanel title="YAML ↔ JSON" icon={Settings2} code="yaml.convert()" chips={['Bidirectional','Docker/K8s','Type inference']}>
      <div className="space-y-4 mt-2">
        <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid rgba(250,204,21,0.2)', display: 'inline-flex' }}>
          {[{id:'yaml2json',label:'YAML → JSON'},{id:'json2yaml',label:'JSON → YAML'}].map(opt => (
            <button key={opt.id} onClick={() => { setDir(opt.id); setOutput(''); setStatus(null); }}
              className="px-4 py-2 text-xs font-semibold transition-all"
              style={{ ...FB, background: dir === opt.id ? 'rgba(250,204,21,0.18)' : 'transparent', color: dir === opt.id ? GOLD : 'rgba(200,190,170,0.5)', borderRight: opt.id === 'yaml2json' ? '1px solid rgba(250,204,21,0.2)' : 'none' }}>
              {opt.label}
            </button>
          ))}
        </div>
        <Textarea label={dir === 'yaml2json' ? 'Input YAML' : 'Input JSON'} value={input} onChange={e => setInput(e.target.value)}
          placeholder={dir === 'yaml2json' ? 'version: "3.8"\nservices:\n  web:\n    image: nginx\n    ports:\n      - "80:80"' : '{"version":"3.8","services":{"web":{"image":"nginx"}}}'} />
        <ActionBtn onClick={convert} icon={ArrowLeftRight} label="Convert" disabled={!input.trim()} />
        {status && <StatusBanner type={status.type} message={status.message} />}
        {output && <Textarea label={dir === 'yaml2json' ? 'Output JSON' : 'Output YAML'} value={output} readOnly rows={10} />}
      </div>
    </ToolPanel>
  );
}

const MAJOR_KW = ['SELECT','FROM','WHERE','JOIN','LEFT JOIN','RIGHT JOIN','INNER JOIN',
  'FULL OUTER JOIN','FULL JOIN','LEFT OUTER JOIN','CROSS JOIN','ON','ORDER BY','GROUP BY',
  'HAVING','LIMIT','OFFSET','UNION ALL','UNION','INSERT INTO','VALUES','UPDATE','SET',
  'DELETE FROM','DELETE','CREATE TABLE','DROP TABLE','TRUNCATE','WITH','AS','CASE',
  'WHEN','THEN','ELSE','END','BETWEEN','IN','IS NOT NULL','IS NULL','LIKE','ILIKE',
  'DISTINCT','EXISTS','COUNT','SUM','AVG','MIN','MAX','COALESCE','NULLIF','CAST',
  'OVER','PARTITION BY','ROW_NUMBER','RANK','DENSE_RANK','RETURNING','EXCEPT','INTERSECT',
  'ASC','DESC',
].sort((a,b) => b.length - a.length);

const BREAK_KW = new Set(['SELECT','FROM','WHERE','ORDER BY','GROUP BY','HAVING','LIMIT',
  'OFFSET','UNION ALL','UNION','JOIN','LEFT JOIN','RIGHT JOIN','INNER JOIN','FULL JOIN',
  'FULL OUTER JOIN','LEFT OUTER JOIN','CROSS JOIN','ON','SET','VALUES','INSERT INTO',
  'UPDATE','DELETE FROM','DELETE','WITH','RETURNING','EXCEPT','INTERSECT']);

function splitOnComma(s) {
  const parts = []; let d = 0, cur = '';
  for (const ch of s) {
    if (ch === '(') { d++; cur += ch; }
    else if (ch === ')') { d--; cur += ch; }
    else if (ch === ',' && d === 0) { parts.push(cur); cur = ''; }
    else cur += ch;
  }
  if (cur) parts.push(cur);
  return parts;
}

function formatSQL(raw) {
  const strs = [];
  let s = raw.trim().replace(/\r\n/g,'\n');
  s = s.replace(/'(?:[^'\\]|\\.)*'/g, m => { strs.push(m); return `__S${strs.length-1}__`; });
  s = s.replace(/"(?:[^"\\]|\\.)*"/g, m => { strs.push(m); return `__S${strs.length-1}__`; });
  s = s.replace(/\s+/g,' ');

  for (const kw of MAJOR_KW) {
    const re = new RegExp(`(?<![A-Za-z0-9_])(${kw.replace(/ /g,'\\s+')})(?![A-Za-z0-9_])`,'gi');
    s = s.replace(re, kw);
  }
  for (const kw of [...BREAK_KW].sort((a,b) => b.length - a.length)) {
    const re = new RegExp(`(?<![A-Za-z0-9_])(${kw.replace(/ /g,'\\s+')})(?![A-Za-z0-9_])`,'g');
    s = s.replace(re, '\n$1');
  }
  s = s.replace(/\b(AND|OR)\b/g, '\n  $1');

  const lines = s.split('\n').map(l => l.trim()).filter(Boolean);
  const out = [];
  for (const line of lines) {
    if (line.startsWith('SELECT')) {
      const rest = line.slice(6).trim();
      out.push('SELECT');
      if (rest) splitOnComma(rest).forEach((c,i,a) => out.push('  ' + c.trim() + (i < a.length-1 ? ',' : '')));
    } else {
      out.push(line.startsWith('AND') || line.startsWith('OR') ? '  ' + line : line);
    }
  }

  let result = out.join('\n');
  result = result.replace(/__S(\d+)__/g, (_,i) => strs[+i]);
  return result.trim();
}

function SQLFormatter() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [status, setStatus] = useState(null);

  const format = () => {
    if (!input.trim()) { setStatus({ type: 'error', message: 'Paste a SQL query first.' }); return; }
    try {
      setOutput(formatSQL(input));
      setStatus({ type: 'success', message: '✓ SQL formatted with keyword capitalisation and clause alignment.' });
    } catch(e) {
      setStatus({ type: 'error', message: e.message }); setOutput('');
    }
  };

  return (
    <ToolPanel title="SQL Formatter" icon={Table2} code="sql.beautify()" chips={['Keyword casing','Clause alignment','Preserves strings']}>
      <div className="space-y-4 mt-2">
        <Textarea label="Input SQL" value={input} onChange={e => setInput(e.target.value)}
          placeholder={"select u.id,u.name,count(o.id) as orders from users u left join orders o on u.id=o.user_id where u.active=1 group by u.id order by orders desc limit 10"} rows={5} />
        <ActionBtn onClick={format} icon={Zap} label="Format SQL" disabled={!input.trim()} />
        {status && <StatusBanner type={status.type} message={status.message} />}
        {output && <Textarea label="Formatted SQL" value={output} readOnly rows={12} />}
      </div>
    </ToolPanel>
  );
}

export default function DataStructure() {
  return (
    <div style={{ minHeight: 'calc(100vh - 4rem)', background: '#050505' }}>
      <style>{`
        textarea { color-scheme: dark; }
        textarea::placeholder { color: rgba(200,190,170,0.22) !important; }
      `}</style>

      <FluxBackdrop />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-20">

        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
          className="flex items-center gap-1.5 mb-10"
          style={{ ...FB, fontSize:'0.75rem', color:'rgba(200,190,170,0.4)' }}>
          <Zap className="w-3 h-3" style={{ color:GOLD, fill:GOLD }} />
          <span style={{ color:GOLD }}>FluxKit</span>
          <ChevronRight className="w-3 h-3" />
          <span>Data &amp; Structure</span>
        </motion.div>

        <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-sm mb-8"
          style={{ background:'rgba(250,204,21,0.08)', border:'1px solid rgba(250,204,21,0.25)', ...FM, fontSize:'0.68rem', color:GOLD, letterSpacing:'0.12em', textTransform:'uppercase' }}>
          <Database className="w-3 h-3" />
          Data &amp; Structure Utilities
        </motion.div>

        <motion.h1 initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }}
          transition={{ duration:0.6, delay:0.08, ease:[0.22,1,0.36,1] }}
          style={{ ...FH, fontSize:'clamp(2.2rem,6vw,4.5rem)', lineHeight:1.05, color:'#F5F0E8', marginBottom:'1rem' }}>
          <span style={{ color:GOLD }}>Structure</span> your data.<br />
          <span>Ship faster.</span>
        </motion.h1>

        <motion.p initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.18 }}
          style={{ ...FB, fontSize:'0.95rem', color:'rgba(200,190,170,0.6)', lineHeight:'1.7', maxWidth:'520px', marginBottom:'1.75rem' }}>
          Five precision tools for wrangling JSON, XML, CSV, YAML, and SQL.
          Everything runs 100% in-browser — no uploads, no servers.
        </motion.p>

        <motion.div initial={{ opacity:0, scaleX:0 }} animate={{ opacity:1, scaleX:1 }}
          transition={{ duration:0.5, delay:0.25 }} className="flex items-center gap-4 mb-12" style={{ transformOrigin:'left' }}>
          <div className="h-px flex-1" style={{ background:'linear-gradient(90deg,rgba(250,204,21,0.3),transparent)' }} />
          <span style={{ ...FM, fontSize:'0.65rem', color:'rgba(250,204,21,0.35)' }}>5 live tools · click panel to expand/collapse</span>
          <div className="h-px w-16" style={{ background:'rgba(250,204,21,0.1)' }} />
        </motion.div>

        <div className="space-y-4">
          {[JSONValidator, XMLtoJSON, CSVtoJSON, YAMLtoJSON, SQLFormatter].map((Tool, i) => (
            <motion.div key={i}
              initial={{ opacity:0, y:28 }} whileInView={{ opacity:1, y:0 }}
              viewport={{ once:true, margin:'-40px' }}
              transition={{ duration:0.5, delay:i*0.06, ease:[0.22,1,0.36,1] }}>
              <Tool />
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity:0, y:14 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }}
          transition={{ delay:0.15 }} className="mt-12 text-center">
          <div className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl"
            style={{ background:'rgba(250,204,21,0.04)', border:'1px solid rgba(250,204,21,0.13)' }}>
            <CheckCircle2 className="w-4 h-4" style={{ color:'rgba(250,204,21,0.45)' }} />
            <span style={{ ...FB, fontSize:'0.78rem', color:'rgba(200,190,170,0.45)' }}>
              All FluxKit tools run 100% in-browser. No data is ever sent to a server.
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
