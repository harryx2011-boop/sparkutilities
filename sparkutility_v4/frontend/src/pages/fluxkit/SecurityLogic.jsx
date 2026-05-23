import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight, ShieldCheck, Search, Clock, Lock, Code2,
  Copy, Check, AlertTriangle, CheckCircle2, Zap, ChevronDown,
  RefreshCw, ArrowLeftRight, Eye, EyeOff, Info,
} from 'lucide-react';
import bcrypt from 'bcryptjs';
import FluxBackdrop from '@/components/fluxkit/FluxBackdrop';

const FH   = { fontFamily: '"Cormorant Garamond","Georgia",serif', fontWeight: 700, letterSpacing: '-0.02em' };
const FB   = { fontFamily: '"Montserrat","Inter",sans-serif' };
const FM   = { fontFamily: '"JetBrains Mono",monospace' };
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
    <div className="rounded-2xl border overflow-hidden"
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

function StatusBanner({ type, message }) {
  if (!message) return null;
  const cfg = {
    error:   { bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.25)',  color: '#FCA5A5', Icon: AlertTriangle },
    success: { bg: 'rgba(250,204,21,0.06)', border: 'rgba(250,204,21,0.25)', color: GOLD,      Icon: CheckCircle2 },
    info:    { bg: 'rgba(59,130,246,0.07)', border: 'rgba(59,130,246,0.25)', color: '#93c5fd',  Icon: Info },
  };
  const { bg, border, color, Icon } = cfg[type] || cfg.success;
  return (
    <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl" style={{ background: bg, border: `1px solid ${border}` }}>
      <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color }} />
      <p style={{ ...FB, fontSize: '0.78rem', color, lineHeight: '1.55' }}>{message}</p>
    </div>
  );
}

function CopyBlock({ value, label = 'Output', rows = 6 }) {
  const [copied, copy] = useCopy();
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span style={{ ...FM, fontSize: '0.68rem', color: 'rgba(200,190,170,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
        <button onClick={() => copy(value)}
          className="flex items-center gap-1 text-[11px] transition-colors px-2 py-0.5 rounded"
          style={{ color: copied ? GOLD : 'rgba(200,190,170,0.4)', background: copied ? 'rgba(250,204,21,0.1)' : 'transparent' }}>
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <textarea value={value} readOnly rows={rows} spellCheck={false}
        className="w-full resize-y rounded-xl px-4 py-3 outline-none"
        style={{ ...FM, fontSize: '0.8rem', lineHeight: '1.6', background: 'rgba(250,204,21,0.025)', border: '1px solid rgba(250,204,21,0.15)', color: 'rgba(250,204,21,0.85)' }} />
    </div>
  );
}

function ActionBtn({ onClick, icon: Icon, label, disabled, loading }) {
  return (
    <button onClick={onClick} disabled={disabled || loading}
      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-black transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ background: 'linear-gradient(135deg,#FACC15,#F97316)', ...FB, minWidth: '120px', justifyContent: 'center' }}>
      {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : (Icon && <Icon className="w-4 h-4" />)} {loading ? 'Working…' : label}
    </button>
  );
}

function base64urlDecode(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - b64.length % 4) % 4);
  return atob(padded);
}

function formatTimestamp(ts) {
  try {
    const d = new Date(ts * 1000);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString()} (${ts})`;
  } catch { return String(ts); }
}

function JWTDebugger() {
  const [token, setToken]   = useState('');
  const [decoded, setDecoded] = useState(null);
  const [error, setError]   = useState(null);

  const decode = () => {
    setError(null); setDecoded(null);
    const t = token.trim();
    if (!t) { setError('Paste a JWT token above.'); return; }
    const parts = t.split('.');
    if (parts.length !== 3) { setError('Invalid JWT — must contain exactly 3 parts separated by dots.'); return; }
    try {
      const header  = JSON.parse(base64urlDecode(parts[0]));
      const payload = JSON.parse(base64urlDecode(parts[1]));
      setDecoded({ header, payload, signature: parts[2] });
    } catch (e) {
      setError(`Decode failed: ${e.message}`);
    }
  };

  const PART_COLORS = { header: '#60a5fa', payload: '#4ade80', signature: '#f87171' };

  const expiredCheck = decoded?.payload?.exp
    ? decoded.payload.exp < Date.now() / 1000
    : null;

  return (
    <ToolPanel title="JWT Debugger" icon={ShieldCheck} code="jwt.decode()" chips={['Header','Payload','Claims','Local only']}>
      <div className="mt-4 space-y-4">
        <StatusBanner type="info" message="This tool decodes tokens entirely in your browser. Your JWT is never transmitted to any server." />

        <div className="flex flex-col gap-1.5">
          <span style={{ ...FM, fontSize: '0.65rem', color: 'rgba(200,190,170,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>JWT Token</span>
          <textarea value={token} onChange={e => setToken(e.target.value)} rows={3}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFsaWNlIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
            spellCheck={false} className="w-full resize-none rounded-xl px-4 py-3 outline-none"
            style={{ ...FM, fontSize: '0.75rem', lineHeight: '1.6', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#F5F0E8', caretColor: GOLD }} />
        </div>

        {token.trim() && (
          <div className="rounded-xl px-4 py-3 overflow-x-auto" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p style={{ ...FM, fontSize: '0.72rem', lineHeight: '1.7', wordBreak: 'break-all' }}>
              {token.trim().split('.').map((part, i) => (
                <span key={i} style={{ color: Object.values(PART_COLORS)[i] }}>
                  {part}{i < 2 ? '.' : ''}
                </span>
              ))}
            </p>
            <div className="flex gap-4 mt-2">
              {Object.entries(PART_COLORS).map(([name, color]) => (
                <span key={name} style={{ ...FM, fontSize: '0.6rem', color, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: color }} />
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}

        <ActionBtn onClick={decode} icon={ShieldCheck} label="Decode Token" disabled={!token.trim()} />
        {error && <StatusBanner type="error" message={error} />}

        {decoded && (
          <div className="space-y-3">
            {expiredCheck !== null && (
              <StatusBanner type={expiredCheck ? 'error' : 'success'}
                message={expiredCheck ? `Token expired on ${formatTimestamp(decoded.payload.exp)}` : `Token valid until ${formatTimestamp(decoded.payload.exp)}`} />
            )}
            {[['Header', decoded.header, PART_COLORS.header], ['Payload', decoded.payload, PART_COLORS.payload]].map(([label, obj, color]) => (
              <div key={label}>
                <p style={{ ...FM, fontSize: '0.65rem', color, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>{label}</p>
                <div className="rounded-xl p-4 overflow-x-auto" style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${color}22` }}>
                  <pre style={{ ...FM, fontSize: '0.78rem', color: '#F5F0E8', margin: 0 }}>
                    {JSON.stringify(obj, null, 2)}
                  </pre>
                </div>
                {label === 'Payload' && (
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      ['iss', decoded.payload.iss, 'Issuer'],
                      ['sub', decoded.payload.sub, 'Subject'],
                      ['aud', Array.isArray(decoded.payload.aud) ? decoded.payload.aud.join(', ') : decoded.payload.aud, 'Audience'],
                      ['iat', decoded.payload.iat ? formatTimestamp(decoded.payload.iat) : null, 'Issued At'],
                      ['exp', decoded.payload.exp ? formatTimestamp(decoded.payload.exp) : null, 'Expires'],
                      ['nbf', decoded.payload.nbf ? formatTimestamp(decoded.payload.nbf) : null, 'Not Before'],
                    ].filter(([, v]) => v != null).map(([key, val, friendly]) => (
                      <div key={key} className="rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <p style={{ ...FM, fontSize: '0.6rem', color: GOLD, marginBottom: '2px' }}>{key} — {friendly}</p>
                        <p style={{ ...FM, fontSize: '0.7rem', color: '#F5F0E8', wordBreak: 'break-all' }}>{String(val)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </ToolPanel>
  );
}

const FLAG_LIST = ['g', 'i', 'm', 's', 'u'];

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildHighlighted(text, matches) {
  if (!matches.length) return null;
  const segs = [];
  let last = 0;
  for (const m of matches) {
    if (m.index > last) segs.push({ text: text.slice(last, m.index), hi: false });
    segs.push({ text: m[0] || '', hi: true });
    last = m.index + (m[0].length || 1);
  }
  if (last < text.length) segs.push({ text: text.slice(last), hi: false });
  return segs;
}

function RegexTester() {
  const [pattern, setPattern] = useState('\\b\\w{5}\\b');
  const [flags, setFlags]     = useState({ g: true, i: false, m: false, s: false, u: false });
  const [testStr, setTestStr] = useState('Hello world — regex testing made simple and fast.');
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState(null);

  const flagStr = FLAG_LIST.filter(f => flags[f]).join('');
  const toggleFlag = f => setFlags(prev => ({ ...prev, [f]: !prev[f] }));

  useEffect(() => {
    if (!pattern) { setResult(null); setError(null); return; }
    if (testStr.length > 10000) { setError('Test string too long — maximum 10,000 characters.'); return; }
    try {
      const re = new RegExp(pattern, flagStr);
      const allMatches = [];
      if (flags.g) {
        let m;
        while ((m = re.exec(testStr)) !== null) {
          allMatches.push({ index: m.index, match: m[0], groups: m.slice(1) });
          if (!m[0]) { re.lastIndex++; } // prevent infinite loop on zero-length match
        }
      } else {
        const m = re.exec(testStr);
        if (m) allMatches.push({ index: m.index, match: m[0], groups: m.slice(1) });
      }
      setResult({ matches: allMatches, re });
      setError(null);
    } catch (e) {
      setError(e.message); setResult(null);
    }
  }, [pattern, flagStr, testStr]);

  const segs = result ? buildHighlighted(testStr, result.matches.map(m => ({ index: m.index, 0: m.match }))) : null;

  return (
    <ToolPanel title="Regex Tester" icon={Search} code="regex.test()" chips={['Real-time match','Capture groups','Flags','Highlighting']}>
      <div className="mt-4 space-y-4">
        <div className="flex flex-col gap-1.5">
          <span style={{ ...FM, fontSize: '0.65rem', color: 'rgba(200,190,170,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Pattern</span>
          <div className="flex items-center rounded-xl overflow-hidden" style={{ border: `1px solid ${error ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.1)'}`, background: 'rgba(255,255,255,0.03)' }}>
            <span style={{ ...FM, fontSize: '0.9rem', color: 'rgba(200,190,170,0.3)', padding: '8px 12px', borderRight: '1px solid rgba(255,255,255,0.07)' }}>/</span>
            <input value={pattern} onChange={e => setPattern(e.target.value)} placeholder="pattern"
              style={{ ...FM, fontSize: '0.85rem', background: 'transparent', border: 'none', color: '#F5F0E8', padding: '8px 10px', flex: 1, outline: 'none', caretColor: GOLD }} />
            <span style={{ ...FM, fontSize: '0.9rem', color: 'rgba(200,190,170,0.3)', padding: '8px 6px', borderLeft: '1px solid rgba(255,255,255,0.07)' }}>/</span>
            <span style={{ ...FM, fontSize: '0.85rem', color: GOLD, padding: '8px 12px', minWidth: '28px' }}>{flagStr || ' '}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {FLAG_LIST.map(f => (
            <button key={f} onClick={() => toggleFlag(f)}
              className="w-8 h-8 rounded-lg text-sm font-semibold transition-all"
              style={{ ...FM, background: flags[f] ? 'rgba(250,204,21,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${flags[f] ? 'rgba(250,204,21,0.4)' : 'rgba(255,255,255,0.08)'}`, color: flags[f] ? GOLD : 'rgba(200,190,170,0.4)' }}>
              {f}
            </button>
          ))}
          <span style={{ ...FM, fontSize: '0.6rem', color: 'rgba(200,190,170,0.3)', alignSelf: 'center', marginLeft: '4px' }}>g=global  i=case-insensitive  m=multiline  s=dotAll  u=unicode</span>
        </div>

        <div className="flex flex-col gap-1.5">
          <span style={{ ...FM, fontSize: '0.65rem', color: 'rgba(200,190,170,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Test String</span>
          <textarea value={testStr} onChange={e => setTestStr(e.target.value)} rows={4} spellCheck={false}
            className="w-full resize-y rounded-xl px-4 py-3 outline-none"
            style={{ ...FM, fontSize: '0.82rem', lineHeight: '1.6', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#F5F0E8', caretColor: GOLD }} />
        </div>

        {error && <StatusBanner type="error" message={`Regex error: ${error}`} />}

        {result && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span style={{ ...FM, fontSize: '0.68rem', color: result.matches.length ? GOLD : 'rgba(200,190,170,0.4)', background: result.matches.length ? 'rgba(250,204,21,0.12)' : 'rgba(255,255,255,0.05)', border: `1px solid ${result.matches.length ? 'rgba(250,204,21,0.3)' : 'rgba(255,255,255,0.1)'}`, padding: '2px 10px', borderRadius: '99px' }}>
                {result.matches.length} match{result.matches.length !== 1 ? 'es' : ''}
              </span>
            </div>

            {segs && (
              <div className="rounded-xl px-4 py-3 leading-relaxed" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', ...FM, fontSize: '0.82rem', color: 'rgba(200,190,170,0.7)', wordBreak: 'break-word' }}>
                {segs.map((seg, i) => (
                  <span key={i} style={seg.hi ? { background: 'rgba(250,204,21,0.25)', color: GOLD, borderRadius: '3px', padding: '0 2px', outline: '1px solid rgba(250,204,21,0.4)' } : {}}>
                    {seg.text}
                  </span>
                ))}
              </div>
            )}

            {result.matches.length > 0 && (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {result.matches.slice(0, 50).map((m, i) => (
                  <div key={i} className="flex items-start gap-3 px-3 py-2 rounded-lg"
                    style={{ background: 'rgba(250,204,21,0.04)', border: '1px solid rgba(250,204,21,0.1)' }}>
                    <span style={{ ...FM, fontSize: '0.6rem', color: 'rgba(200,190,170,0.35)', minWidth: '20px', paddingTop: '1px' }}>#{i + 1}</span>
                    <span style={{ ...FM, fontSize: '0.78rem', color: GOLD, flex: 1, wordBreak: 'break-all' }}>"{m.match}"</span>
                    <span style={{ ...FM, fontSize: '0.6rem', color: 'rgba(200,190,170,0.35)' }}>@{m.index}</span>
                    {m.groups.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {m.groups.map((g, gi) => (
                          <span key={gi} style={{ ...FM, fontSize: '0.6rem', color: '#93c5fd', background: 'rgba(59,130,246,0.1)', padding: '1px 6px', borderRadius: '4px' }}>g{gi + 1}: {g ?? 'undefined'}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {result.matches.length > 50 && (
                  <p style={{ ...FM, fontSize: '0.7rem', color: 'rgba(200,190,170,0.4)', textAlign: 'center', padding: '8px' }}>…and {result.matches.length - 50} more matches</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </ToolPanel>
  );
}

const MONTH_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DOW_FULL   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function ordinal(n) {
  const v = n % 100;
  return n + (['th','st','nd','rd'][(v - 20) % 10] || ['th','st','nd','rd'][v] || 'th');
}

function parseSingleField(field, unitSingular, unitPlural, min, labels) {
  if (field === '*') return null;
  if (/^\*\/\d+$/.test(field)) {
    const s = parseInt(field.slice(2));
    return `every ${s} ${s === 1 ? unitSingular : unitPlural}`;
  }
  if (/^\d+-\d+$/.test(field)) {
    const [a, b] = field.split('-').map(Number);
    const aL = labels ? labels[a - min] : a;
    const bL = labels ? labels[b - min] : b;
    return `from ${aL} to ${bL}`;
  }
  if (field.includes(',')) {
    const vals = field.split(',').map(v => labels ? labels[parseInt(v) - min] : v);
    return vals.length === 1 ? vals[0] : `${vals.slice(0, -1).join(', ')} and ${vals[vals.length - 1]}`;
  }
  const n = parseInt(field);
  if (!isNaN(n)) return labels ? labels[n - min] : `${unitSingular} ${n}`;
  return field;
}

function buildCronDesc(parts) {
  const [minF, hrF, domF, monF, dowF] = parts;
  const allStar = [minF, hrF, domF, monF, dowF].every(f => f === '*');
  if (allStar) return 'Every minute';

  // Time description
  let timeDesc = '';
  if (minF === '0' && hrF === '*') timeDesc = 'at the start of every hour';
  else if (minF === '0' && /^\d+$/.test(hrF)) {
    const h = parseInt(hrF), ampm = h >= 12 ? 'PM' : 'AM', h12 = h % 12 || 12;
    timeDesc = `at ${h12}:00 ${ampm}`;
  } else if (/^\*\/\d+$/.test(minF) && hrF === '*') {
    const s = parseInt(minF.slice(2));
    timeDesc = `every ${s} minute${s !== 1 ? 's' : ''}`;
  } else if (/^\d+$/.test(minF) && /^\d+$/.test(hrF)) {
    const h = parseInt(hrF), m = parseInt(minF);
    const ampm = h >= 12 ? 'PM' : 'AM', h12 = h % 12 || 12;
    timeDesc = `at ${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
  } else if (minF === '*' && hrF === '*') {
    timeDesc = 'every minute';
  } else {
    const minD = parseSingleField(minF, 'minute', 'minutes', 0, null);
    const hrD  = parseSingleField(hrF,  'hour',   'hours',   0, null);
    if (minD && hrD) timeDesc = `${minD} past ${hrD}`;
    else if (hrD)    timeDesc = `every minute of ${hrD}`;
    else if (minD)   timeDesc = `at ${minD} past every hour`;
    else             timeDesc = 'every minute';
  }

  // When description
  const parts2 = [];
  if (dowF !== '*') {
    const d = parseSingleField(dowF, 'weekday', 'weekdays', 0, DOW_FULL);
    if (d) parts2.push(dowF.includes('/') || dowF.includes(',') || dowF.includes('-') ? `on ${d}` : `on ${d}`);
  }
  if (domF !== '*' && dowF === '*') {
    const d = parseSingleField(domF, 'day', 'days', 1, null);
    if (d && /^\d+$/.test(domF)) parts2.push(`on the ${ordinal(parseInt(domF))} of the month`);
    else if (d) parts2.push(`on ${d} of the month`);
  }
  if (monF !== '*') {
    const d = parseSingleField(monF, 'month', 'months', 1, MONTH_FULL);
    if (d) parts2.push(`in ${d}`);
  }

  return parts2.length ? `${timeDesc}, ${parts2.join(', ')}` : timeDesc;
}

const CRON_PRESETS = [
  { label: 'Every minute',          expr: '* * * * *' },
  { label: 'Every 15 min',          expr: '*/15 * * * *' },
  { label: 'Hourly',                 expr: '0 * * * *' },
  { label: 'Daily at midnight',      expr: '0 0 * * *' },
  { label: 'Daily at 9 AM',          expr: '0 9 * * *' },
  { label: 'Weekdays at 9 AM',       expr: '0 9 * * 1-5' },
  { label: 'Every Sunday midnight',  expr: '0 0 * * 0' },
  { label: '1st of each month',      expr: '0 0 1 * *' },
  { label: 'Quarterly',              expr: '0 0 1 1,4,7,10 *' },
];

function CronParser() {
  const [expr, setExpr] = useState('*/15 * * * *');
  const [desc, setDesc] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    const raw = expr.trim();
    if (!raw) { setDesc(''); setError(null); return; }
    let parts = raw.split(/\s+/);
    if (parts.length === 6) parts = parts.slice(1); // strip optional seconds field
    if (parts.length !== 5) { setError('Expected 5 fields: minute  hour  day-of-month  month  day-of-week'); setDesc(''); return; }
    try {
      setDesc(buildCronDesc(parts));
      setError(null);
    } catch (e) {
      setError(e.message); setDesc('');
    }
  }, [expr]);

  return (
    <ToolPanel title="Cron Job Expression Parser" icon={Clock} code="cron.parse()" chips={['5-field','Human-readable','Presets']}>
      <div className="mt-4 space-y-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between">
            <span style={{ ...FM, fontSize: '0.65rem', color: 'rgba(200,190,170,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Cron Expression</span>
            <span style={{ ...FM, fontSize: '0.6rem', color: 'rgba(200,190,170,0.3)' }}>minute · hour · day · month · weekday</span>
          </div>
          <input value={expr} onChange={e => setExpr(e.target.value)} placeholder="*/15 * * * *"
            style={{ ...FM, fontSize: '1.1rem', background: 'rgba(255,255,255,0.04)', border: `1px solid ${error ? 'rgba(239,68,68,0.4)' : 'rgba(250,204,21,0.2)'}`, borderRadius: '12px', padding: '10px 16px', color: '#F5F0E8', outline: 'none', caretColor: GOLD, letterSpacing: '0.08em' }} />
        </div>

        {error && <StatusBanner type="error" message={error} />}

        {desc && !error && (
          <div className="rounded-xl px-5 py-4" style={{ background: 'rgba(250,204,21,0.06)', border: '1px solid rgba(250,204,21,0.2)' }}>
            <p style={{ ...FM, fontSize: '0.65rem', color: 'rgba(250,204,21,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>Translation</p>
            <p style={{ ...FH, fontSize: '1.2rem', color: '#F5F0E8', textTransform: 'capitalize' }}>{desc}</p>
          </div>
        )}

        <div className="grid grid-cols-5 gap-1">
          {['Minute\n0–59', 'Hour\n0–23', 'Day\n1–31', 'Month\n1–12', 'Weekday\n0–6'].map((label, i) => (
            <div key={i} className="rounded-lg p-2 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              {label.split('\n').map((l, j) => (
                <p key={j} style={{ ...FM, fontSize: j === 0 ? '0.62rem' : '0.55rem', color: j === 0 ? 'rgba(200,190,170,0.6)' : 'rgba(200,190,170,0.3)', lineHeight: '1.4' }}>{l}</p>
              ))}
            </div>
          ))}
        </div>

        <div>
          <p style={{ ...FM, fontSize: '0.65rem', color: 'rgba(200,190,170,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Common presets</p>
          <div className="flex flex-wrap gap-2">
            {CRON_PRESETS.map(p => (
              <button key={p.expr} onClick={() => setExpr(p.expr)}
                className="px-3 py-1.5 rounded-lg text-xs transition-all"
                style={{ ...FB, background: expr === p.expr ? 'rgba(250,204,21,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${expr === p.expr ? 'rgba(250,204,21,0.4)' : 'rgba(255,255,255,0.08)'}`, color: expr === p.expr ? GOLD : 'rgba(200,190,170,0.55)' }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Quick reference */}
        <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ ...FM, fontSize: '0.62rem', color: 'rgba(200,190,170,0.4)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Special characters</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1">
            {[['*', 'any value'],['*/n', 'every n units'],['n-m', 'range from n to m'],['n,m', 'n and m']].map(([sym, desc]) => (
              <div key={sym} className="flex gap-2">
                <span style={{ ...FM, fontSize: '0.7rem', color: GOLD, minWidth: '28px' }}>{sym}</span>
                <span style={{ ...FM, fontSize: '0.68rem', color: 'rgba(200,190,170,0.4)' }}>{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ToolPanel>
  );
}

function BcryptTool() {
  const [tab, setTab]       = useState('generate');
  const [password, setPwd]  = useState('');
  const [rounds, setRounds] = useState(10);
  const [hash, setHash]     = useState('');
  const [checkPwd, setCheckPwd] = useState('');
  const [checkHash, setCheckHash] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!password) return;
    setLoading(true); setHash(''); setResult(null);
    try {
      const start = Date.now();
      const h = await bcrypt.hash(password, rounds);
      const elapsed = ((Date.now() - start) / 1000).toFixed(2);
      setHash(h);
      setResult({ type: 'success', message: `✓ Hash generated in ${elapsed}s with ${rounds} rounds (cost factor)` });
    } catch (e) {
      setResult({ type: 'error', message: e.message });
    }
    setLoading(false);
  };

  const verify = async () => {
    if (!checkPwd || !checkHash.trim()) return;
    setLoading(true); setResult(null);
    try {
      const start = Date.now();
      const match = await bcrypt.compare(checkPwd, checkHash.trim());
      const elapsed = ((Date.now() - start) / 1000).toFixed(2);
      setResult({ type: match ? 'success' : 'error', message: match ? `✓ Password matches the hash (verified in ${elapsed}s)` : `✗ Password does NOT match the hash (checked in ${elapsed}s)` });
    } catch (e) {
      setResult({ type: 'error', message: `Invalid hash format: ${e.message}` });
    }
    setLoading(false);
  };

  const [genCopied, genCopy] = useCopy();

  return (
    <ToolPanel title="Bcrypt Hash Generator / Checker" icon={Lock} code="bcrypt.hash()" chips={['bcryptjs','In-browser','Password testing']}>
      <div className="mt-4 space-y-4">
        <StatusBanner type="info" message="Runs 100% in-browser using bcryptjs. Passwords and hashes never leave your device." />

        <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid rgba(250,204,21,0.2)', display: 'inline-flex' }}>
          {[{ id: 'generate', label: 'Generate' }, { id: 'verify', label: 'Verify' }].map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setResult(null); }}
              className="px-5 py-2 text-xs font-semibold transition-all"
              style={{ ...FB, background: tab === t.id ? 'rgba(250,204,21,0.18)' : 'transparent', color: tab === t.id ? GOLD : 'rgba(200,190,170,0.5)', borderRight: t.id === 'generate' ? '1px solid rgba(250,204,21,0.2)' : 'none' }}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'generate' ? (
          <div className="space-y-3">
            <div className="flex flex-col gap-1.5">
              <span style={{ ...FM, fontSize: '0.65rem', color: 'rgba(200,190,170,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Password</span>
              <div className="flex items-center rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
                <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPwd(e.target.value)}
                  placeholder="Enter password to hash"
                  style={{ ...FM, fontSize: '0.85rem', background: 'transparent', border: 'none', color: '#F5F0E8', padding: '10px 14px', flex: 1, outline: 'none', caretColor: GOLD }} />
                <button onClick={() => setShowPwd(v => !v)} className="px-3" style={{ color: 'rgba(200,190,170,0.4)' }}>
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex justify-between">
                <span style={{ ...FM, fontSize: '0.65rem', color: 'rgba(200,190,170,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Cost factor (rounds)</span>
                <span style={{ ...FM, fontSize: '0.72rem', color: GOLD }}>{rounds} — ~{Math.round(Math.pow(2, rounds) / 1000)}k iterations</span>
              </div>
              <input type="range" min={8} max={14} value={rounds} onChange={e => setRounds(Number(e.target.value))} className="fluxkit-range w-full" />
            </div>
            <ActionBtn onClick={generate} icon={Zap} label="Generate Hash" disabled={!password} loading={loading} />
            {result && <StatusBanner type={result.type} message={result.message} />}
            {hash && (
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <span style={{ ...FM, fontSize: '0.65rem', color: 'rgba(200,190,170,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Generated Hash</span>
                  <button onClick={() => genCopy(hash)} className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded"
                    style={{ color: genCopied ? GOLD : 'rgba(200,190,170,0.4)', background: genCopied ? 'rgba(250,204,21,0.1)' : 'transparent' }}>
                    {genCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {genCopied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div className="rounded-xl px-4 py-3 overflow-x-auto" style={{ background: 'rgba(250,204,21,0.025)', border: '1px solid rgba(250,204,21,0.15)' }}>
                  <p style={{ ...FM, fontSize: '0.78rem', color: 'rgba(250,204,21,0.85)', wordBreak: 'break-all' }}>{hash}</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-col gap-1.5">
              <span style={{ ...FM, fontSize: '0.65rem', color: 'rgba(200,190,170,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Password to check</span>
              <input type="password" value={checkPwd} onChange={e => setCheckPwd(e.target.value)}
                placeholder="Enter plaintext password"
                style={{ ...FM, fontSize: '0.85rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '10px 14px', color: '#F5F0E8', outline: 'none', caretColor: GOLD }} />
            </div>
            <div className="flex flex-col gap-1.5">
              <span style={{ ...FM, fontSize: '0.65rem', color: 'rgba(200,190,170,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Bcrypt Hash</span>
              <input type="text" value={checkHash} onChange={e => setCheckHash(e.target.value)}
                placeholder="$2b$10$..."
                style={{ ...FM, fontSize: '0.78rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '10px 14px', color: '#F5F0E8', outline: 'none', caretColor: GOLD }} />
            </div>
            <ActionBtn onClick={verify} icon={ShieldCheck} label="Verify Hash" disabled={!checkPwd || !checkHash} loading={loading} />
            {result && <StatusBanner type={result.type} message={result.message} />}
          </div>
        )}
      </div>
    </ToolPanel>
  );
}

const NAMED_ENTITIES = {
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  '©': '&copy;', '®': '&reg;', '™': '&trade;', '€': '&euro;',
  '£': '&pound;', '¥': '&yen;', '°': '&deg;', '±': '&plusmn;',
  '×': '&times;', '÷': '&divide;', '–': '&ndash;', '—': '&mdash;',
  '…': '&hellip;', '«': '&laquo;', '»': '&raquo;', ' ': '&nbsp;',
};
const ENTITY_RE = new RegExp(`[${Object.keys(NAMED_ENTITIES).join('').replace(/[[\]^\\-]/g, '\\$&')}]`, 'g');

function encodeEntities(str) {
  return str.replace(ENTITY_RE, ch => NAMED_ENTITIES[ch] || ch);
}

const DECODE_MAP = Object.fromEntries(Object.entries(NAMED_ENTITIES).map(([ch, ent]) => [ent, ch]));
function decodeEntities(str) {
  return str
    .replace(/&[a-z]+;/gi, m => DECODE_MAP[m] || m)
    .replace(/&#(\d+);/g,        (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

const ENTITY_QUICK_REF = [
  ['&amp;','&'],['&lt;','<'],['&gt;','>'],['&quot;','"'],['&#39;',"'"],
  ['&copy;','©'],['&reg;','®'],['&trade;','™'],['&euro;','€'],
  ['&nbsp;',' (non-breaking)'],['&ndash;','–'],['&mdash;','—'],
];

function HTMLEntityTool() {
  const [mode, setMode]     = useState('encode');
  const [input, setInput]   = useState('');
  const [output, setOutput] = useState('');
  const [count, setCount]   = useState(0);

  const run = () => {
    if (!input.trim()) return;
    if (mode === 'encode') {
      const out = encodeEntities(input);
      setOutput(out);
      setCount((out.match(/&[#a-z\d]+;/gi) || []).length);
    } else {
      const out = decodeEntities(input);
      setOutput(out);
      setCount((input.match(/&[#a-z\d]+;/gi) || []).length);
    }
  };

  return (
    <ToolPanel title="HTML Entity Encoder / Decoder" icon={Code2} code="html.entities()" chips={['Encode','Decode','Named entities','Numeric']}>
      <div className="mt-4 space-y-4">
        <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid rgba(250,204,21,0.2)', display: 'inline-flex' }}>
          {[{ id: 'encode', label: 'Encode → Entities' }, { id: 'decode', label: 'Decode ← Entities' }].map(t => (
            <button key={t.id} onClick={() => { setMode(t.id); setOutput(''); setCount(0); }}
              className="px-4 py-2 text-xs font-semibold transition-all"
              style={{ ...FB, background: mode === t.id ? 'rgba(250,204,21,0.18)' : 'transparent', color: mode === t.id ? GOLD : 'rgba(200,190,170,0.5)', borderRight: t.id === 'encode' ? '1px solid rgba(250,204,21,0.2)' : 'none' }}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-1.5">
          <span style={{ ...FM, fontSize: '0.65rem', color: 'rgba(200,190,170,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {mode === 'encode' ? 'Plain text input' : 'HTML with entities input'}
          </span>
          <textarea value={input} onChange={e => setInput(e.target.value)} rows={5} spellCheck={false}
            placeholder={mode === 'encode' ? 'Enter text with special characters like <, >, &, © …' : 'Enter HTML like &lt;div class=&quot;hello&quot;&gt;World &amp; more&lt;/div&gt;'}
            className="w-full resize-y rounded-xl px-4 py-3 outline-none"
            style={{ ...FM, fontSize: '0.82rem', lineHeight: '1.6', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#F5F0E8', caretColor: GOLD }} />
        </div>

        <div className="flex items-center gap-3">
          <button onClick={run} disabled={!input.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-black transition-all active:scale-95 disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg,#FACC15,#F97316)', ...FB }}>
            <ArrowLeftRight className="w-4 h-4" /> {mode === 'encode' ? 'Encode' : 'Decode'}
          </button>
          {count > 0 && (
            <span style={{ ...FM, fontSize: '0.7rem', color: GOLD, background: 'rgba(250,204,21,0.1)', border: '1px solid rgba(250,204,21,0.25)', padding: '4px 10px', borderRadius: '99px' }}>
              {count} {mode === 'encode' ? 'entities encoded' : 'entities decoded'}
            </span>
          )}
        </div>

        {output && (
          <CopyBlock value={output} label={mode === 'encode' ? 'Encoded Output' : 'Decoded Output'} rows={5} />
        )}

        {/* Quick reference */}
        <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ ...FM, fontSize: '0.62rem', color: 'rgba(200,190,170,0.4)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Common entities reference</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-1.5 gap-x-4">
            {ENTITY_QUICK_REF.map(([entity, char]) => (
              <div key={entity} className="flex gap-2 items-baseline">
                <span style={{ ...FM, fontSize: '0.72rem', color: GOLD, minWidth: '56px' }}>{entity}</span>
                <span style={{ ...FM, fontSize: '0.68rem', color: 'rgba(200,190,170,0.45)' }}>{char}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ToolPanel>
  );
}

export default function SecurityLogic() {
  return (
    <div style={{ minHeight: 'calc(100vh - 4rem)', background: '#050505' }}>
      <style>{`
        textarea { color-scheme: dark; }
        textarea::placeholder { color: rgba(200,190,170,0.22) !important; }
        .fluxkit-range { -webkit-appearance: none; appearance: none; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; outline: none; }
        .fluxkit-range::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: #FACC15; cursor: pointer; border: 2px solid rgba(0,0,0,0.4); }
        .fluxkit-range::-moz-range-thumb { width: 14px; height: 14px; border-radius: 50%; background: #FACC15; cursor: pointer; border: 2px solid rgba(0,0,0,0.4); }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>

      <FluxBackdrop />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-20">

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex items-center gap-1.5 mb-10"
          style={{ ...FB, fontSize: '0.75rem', color: 'rgba(200,190,170,0.4)' }}>
          <Zap className="w-3 h-3" style={{ color: GOLD, fill: GOLD }} />
          <span style={{ color: GOLD }}>FluxKit</span>
          <ChevronRight className="w-3 h-3" />
          <span>Security &amp; Logic</span>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-sm mb-8"
          style={{ background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.25)', ...FM, fontSize: '0.68rem', color: GOLD, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          <ShieldCheck className="w-3 h-3" />
          Security &amp; Logic
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          style={{ ...FH, fontSize: 'clamp(2.2rem,6vw,4.5rem)', lineHeight: 1.05, color: '#F5F0E8', marginBottom: '1rem' }}>
          <span style={{ color: GOLD }}>Inspect.</span> Test.<br />
          <span>Ship secure code.</span>
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
          style={{ ...FB, fontSize: '0.95rem', color: 'rgba(200,190,170,0.6)', lineHeight: '1.7', maxWidth: '520px', marginBottom: '1.75rem' }}>
          Five security and logic tools — JWT decoding, regex testing, cron parsing, bcrypt hashing, and HTML entity conversion. All local, all private.
        </motion.p>

        <motion.div initial={{ opacity: 0, scaleX: 0 }} animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.5, delay: 0.25 }} className="flex items-center gap-4 mb-12" style={{ transformOrigin: 'left' }}>
          <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg,rgba(250,204,21,0.3),transparent)' }} />
          <span style={{ ...FM, fontSize: '0.65rem', color: 'rgba(250,204,21,0.35)' }}>5 live tools · click panel to expand/collapse</span>
          <div className="h-px w-16" style={{ background: 'rgba(250,204,21,0.1)' }} />
        </motion.div>

        <div className="space-y-4">
          {[JWTDebugger, RegexTester, CronParser, BcryptTool, HTMLEntityTool].map((Tool, i) => (
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
