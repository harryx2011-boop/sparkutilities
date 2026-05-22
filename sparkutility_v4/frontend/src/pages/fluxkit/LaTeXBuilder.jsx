import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight, Copy, Download, Check, RotateCcw, Trash2,
  History, Palette, Grid3x3, Eye, EyeOff,
  Plus, Minus, Hash, AlignCenter, Sigma, CheckCircle,
  Calculator, Search, FileImage, FileCode, LineChart,
  ArrowRight, Send,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import FluxBackdrop from '@/components/fluxkit/FluxBackdrop';
import { tryEvaluate, tryCompile } from '@/lib/mathEval';

// ── Design tokens ─────────────────────────────────────────────────────────
const GOLD = '#FACC15';
const FH   = "'Cormorant Garamond', Georgia, serif";
const FB   = "'Montserrat', system-ui, sans-serif";

// ── Symbol palette ─────────────────────────────────────────────────────────
// Each entry has a `name` field used by the search input — when a query is
// active, every group is filtered down to symbols whose name OR latex
// substring-matches the query (case-insensitive). Groups with no matches
// are hidden so the panel stays tight.
const SYMBOL_GROUPS = [
  {
    label: 'Greek', symbols: [
      { sym: 'α', latex: '\\alpha',   name: 'alpha' },     { sym: 'β', latex: '\\beta',   name: 'beta' },
      { sym: 'γ', latex: '\\gamma',   name: 'gamma' },     { sym: 'δ', latex: '\\delta',  name: 'delta' },
      { sym: 'ε', latex: '\\epsilon', name: 'epsilon' },   { sym: 'ζ', latex: '\\zeta',   name: 'zeta' },
      { sym: 'η', latex: '\\eta',     name: 'eta' },       { sym: 'θ', latex: '\\theta',  name: 'theta' },
      { sym: 'ι', latex: '\\iota',    name: 'iota' },      { sym: 'κ', latex: '\\kappa',  name: 'kappa' },
      { sym: 'λ', latex: '\\lambda',  name: 'lambda' },    { sym: 'μ', latex: '\\mu',     name: 'mu' },
      { sym: 'ν', latex: '\\nu',      name: 'nu' },        { sym: 'ξ', latex: '\\xi',     name: 'xi' },
      { sym: 'π', latex: '\\pi',      name: 'pi' },        { sym: 'ρ', latex: '\\rho',    name: 'rho' },
      { sym: 'σ', latex: '\\sigma',   name: 'sigma' },     { sym: 'τ', latex: '\\tau',    name: 'tau' },
      { sym: 'υ', latex: '\\upsilon', name: 'upsilon' },   { sym: 'φ', latex: '\\phi',    name: 'phi' },
      { sym: 'χ', latex: '\\chi',     name: 'chi' },       { sym: 'ψ', latex: '\\psi',    name: 'psi' },
      { sym: 'ω', latex: '\\omega',   name: 'omega' },
      { sym: 'Γ', latex: '\\Gamma',   name: 'Gamma' },     { sym: 'Δ', latex: '\\Delta',  name: 'Delta' },
      { sym: 'Θ', latex: '\\Theta',   name: 'Theta' },     { sym: 'Λ', latex: '\\Lambda', name: 'Lambda' },
      { sym: 'Π', latex: '\\Pi',      name: 'Pi' },        { sym: 'Σ', latex: '\\Sigma',  name: 'Sigma' },
      { sym: 'Φ', latex: '\\Phi',     name: 'Phi' },       { sym: 'Ψ', latex: '\\Psi',    name: 'Psi' },
      { sym: 'Ω', latex: '\\Omega',   name: 'Omega' },
    ],
  },
  {
    label: 'Operators', symbols: [
      { sym: '∑', latex: '\\sum',          name: 'sum' },           { sym: '∏', latex: '\\prod',          name: 'prod product' },
      { sym: '∫', latex: '\\int',          name: 'integral' },      { sym: '∬', latex: '\\iint',          name: 'double integral' },
      { sym: '∭', latex: '\\iiint',        name: 'triple integral' },{ sym: '∂', latex: '\\partial',       name: 'partial derivative' },
      { sym: '∇', latex: '\\nabla',        name: 'nabla del' },     { sym: '√', latex: '\\sqrt{}',         name: 'sqrt root' },
      { sym: '±', latex: '\\pm',           name: 'plus minus' },    { sym: '∓', latex: '\\mp',             name: 'minus plus' },
      { sym: '×', latex: '\\times',        name: 'times multiply' },{ sym: '⋅', latex: '\\cdot',           name: 'cdot dot' },
      { sym: '÷', latex: '\\div',          name: 'divide' },        { sym: '∘', latex: '\\circ',           name: 'circ compose' },
      { sym: '≤', latex: '\\leq',          name: 'leq less or equal' },{ sym: '≥', latex: '\\geq',         name: 'geq greater or equal' },
      { sym: '≠', latex: '\\neq',          name: 'neq not equal' }, { sym: '≈', latex: '\\approx',         name: 'approx' },
      { sym: '≡', latex: '\\equiv',        name: 'equiv equivalent' },{ sym: '∝', latex: '\\propto',        name: 'propto proportional' },
    ],
  },
  {
    label: 'Sets & Logic', symbols: [
      { sym: '∈', latex: '\\in',           name: 'in element' },    { sym: '∉', latex: '\\notin',         name: 'not in' },
      { sym: '⊂', latex: '\\subset',       name: 'subset' },        { sym: '⊆', latex: '\\subseteq',       name: 'subseteq' },
      { sym: '⊃', latex: '\\supset',       name: 'supset' },        { sym: '⊇', latex: '\\supseteq',       name: 'supseteq' },
      { sym: '∪', latex: '\\cup',          name: 'cup union' },     { sym: '∩', latex: '\\cap',           name: 'cap intersection' },
      { sym: '∅', latex: '\\emptyset',     name: 'emptyset' },      { sym: 'ℝ', latex: '\\mathbb{R}',     name: 'real numbers R' },
      { sym: 'ℕ', latex: '\\mathbb{N}',    name: 'natural numbers N' },{ sym: 'ℤ', latex: '\\mathbb{Z}',  name: 'integers Z' },
      { sym: 'ℚ', latex: '\\mathbb{Q}',    name: 'rationals Q' },   { sym: 'ℂ', latex: '\\mathbb{C}',     name: 'complex C' },
      { sym: '∀', latex: '\\forall',       name: 'forall' },        { sym: '∃', latex: '\\exists',        name: 'exists' },
      { sym: '∄', latex: '\\nexists',      name: 'not exists' },    { sym: '¬', latex: '\\lnot',          name: 'lnot not negation' },
      { sym: '∧', latex: '\\land',         name: 'land and' },      { sym: '∨', latex: '\\lor',           name: 'lor or' },
      { sym: '⊕', latex: '\\oplus',        name: 'oplus xor' },     { sym: '⊗', latex: '\\otimes',        name: 'otimes' },
    ],
  },
  {
    label: 'Arrows', symbols: [
      { sym: '→', latex: '\\rightarrow',    name: 'right arrow' },  { sym: '←', latex: '\\leftarrow',     name: 'left arrow' },
      { sym: '↔', latex: '\\leftrightarrow',name: 'left right arrow' },{ sym: '⇒', latex: '\\Rightarrow', name: 'Rightarrow implies' },
      { sym: '⇐', latex: '\\Leftarrow',    name: 'Leftarrow' },     { sym: '⟺', latex: '\\Leftrightarrow', name: 'iff' },
      { sym: '↑', latex: '\\uparrow',      name: 'up arrow' },      { sym: '↓', latex: '\\downarrow',     name: 'down arrow' },
      { sym: '⇑', latex: '\\Uparrow',      name: 'Uparrow' },       { sym: '⇓', latex: '\\Downarrow',     name: 'Downarrow' },
      { sym: '↦', latex: '\\mapsto',       name: 'mapsto' },        { sym: '∞', latex: '\\infty',         name: 'infinity infty' },
    ],
  },
  {
    label: 'Geometry', symbols: [
      { sym: '°', latex: '^{\\circ}',      name: 'degree' },        { sym: '∠', latex: '\\angle',         name: 'angle' },
      { sym: '∡', latex: '\\measuredangle',name: 'measured angle' },{ sym: '⊥', latex: '\\perp',           name: 'perp perpendicular' },
      { sym: '∥', latex: '\\parallel',     name: 'parallel' },      { sym: '△', latex: '\\triangle',       name: 'triangle' },
      { sym: '□', latex: '\\square',       name: 'square box' },    { sym: '◇', latex: '\\diamond',        name: 'diamond' },
      { sym: '⊙', latex: '\\odot',         name: 'odot circle dot' },{ sym: 'π', latex: '\\pi',             name: 'pi' },
    ],
  },
  {
    label: 'Structures', symbols: [
      { sym: 'x²',   latex: '^{2}',                       name: 'squared power 2' },
      { sym: 'xⁿ',   latex: '^{n}',                       name: 'power n' },
      { sym: 'xₙ',   latex: '_{n}',                       name: 'subscript n' },
      { sym: '¹/ₓ',  latex: '\\frac{1}{x}',               name: 'frac fraction' },
      { sym: 'lim',  latex: '\\lim_{x \\to \\infty}',     name: 'lim limit' },
      { sym: 'log',  latex: '\\log',                       name: 'log' },
      { sym: 'log_b',latex: '\\log_{b}',                   name: 'log base' },
      { sym: 'ln',   latex: '\\ln',                        name: 'ln natural log' },
      { sym: 'sin',  latex: '\\sin',                       name: 'sin sine' },
      { sym: 'cos',  latex: '\\cos',                       name: 'cos cosine' },
      { sym: 'tan',  latex: '\\tan',                       name: 'tan tangent' },
      { sym: 'sec',  latex: '\\sec',                       name: 'sec secant' },
      { sym: 'csc',  latex: '\\csc',                       name: 'csc cosecant' },
      { sym: 'cot',  latex: '\\cot',                       name: 'cot cotangent' },
      { sym: '|x|',  latex: '\\left| x \\right|',          name: 'abs absolute value' },
      { sym: '‖x‖',  latex: '\\left\\| x \\right\\|',      name: 'norm' },
      { sym: '⌈x⌉',  latex: '\\lceil x \\rceil',           name: 'ceil ceiling' },
      { sym: '⌊x⌋',  latex: '\\lfloor x \\rfloor',         name: 'floor' },
    ],
  },
];

// ── LaTeX template library ─────────────────────────────────────────────────
// These templates were previously slash-commands in the global SparkEngine
// (/sum, /int, /matrix, /frac, /sqrt, /limit, etc.). They live here now and
// surface through the LaTeX-Builder-internal SparkEngine search bar at the
// top of the right column. `cursorBack` lands the caret inside an empty
// {} placeholder so the user can type the contents immediately.
const LATEX_TEMPLATES = [
  { trigger: '/sum',       label: '∑ summation',          latex: '\\sum_{n=1}^{\\infty} ',                                  cursorBack: 0  },
  { trigger: '/int',       label: '∫ integral',           latex: '\\int_{a}^{b} f(x)\\,dx',                                  cursorBack: 0  },
  { trigger: '/iint',      label: '∬ double integral',    latex: '\\iint_{D} f(x,y)\\,dA',                                   cursorBack: 0  },
  { trigger: '/matrix',    label: 'Matrix (2×2)',         latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}',          cursorBack: 0  },
  { trigger: '/frac',      label: 'Fraction',             latex: '\\frac{}{}',                                                cursorBack: 3  },
  { trigger: '/sqrt',      label: 'Square root',          latex: '\\sqrt{}',                                                  cursorBack: 1  },
  { trigger: '/nthroot',   label: 'n-th root',            latex: '\\sqrt[{}]{}',                                              cursorBack: 4  },
  { trigger: '/limit',     label: 'Limit',                latex: '\\lim_{x \\to \\infty} ',                                   cursorBack: 0  },
  { trigger: '/power',     label: 'Power xⁿ',             latex: '^{}',                                                       cursorBack: 1  },
  { trigger: '/sub',       label: 'Subscript xₙ',         latex: '_{}',                                                       cursorBack: 1  },
  { trigger: '/abs',       label: 'Absolute value',       latex: '\\left| {} \\right|',                                       cursorBack: 9  },
  { trigger: '/cases',     label: 'Cases (piecewise)',    latex: '\\begin{cases} a & x < 0 \\\\ b & x \\geq 0 \\end{cases}',  cursorBack: 0  },
  { trigger: '/binom',     label: 'Binomial',             latex: '\\binom{n}{k}',                                             cursorBack: 0  },
  { trigger: '/vec',       label: 'Vector arrow',         latex: '\\vec{}',                                                   cursorBack: 1  },
  { trigger: '/hat',       label: 'Hat',                  latex: '\\hat{}',                                                   cursorBack: 1  },
  { trigger: '/bar',       label: 'Bar / overline',       latex: '\\overline{}',                                              cursorBack: 1  },
  { trigger: '/tilde',     label: 'Tilde',                latex: '\\tilde{}',                                                 cursorBack: 1  },
];

// ── Matrix builder ─────────────────────────────────────────────────────────
// Editable cell grid. Cells default to `a_{ij}` placeholder LaTeX so an empty
// build still inserts something sensible; users can override any cell. The
// row-separator was previously rendered with 4 backslashes (`\\\\` in source)
// which produced an extra blank row in KaTeX — now correctly emits `\\`.
function MatrixBuilder({ onInsert }) {
  const [rows, setRows] = useState(2);
  const [cols, setCols] = useState(2);
  const [type, setType] = useState('pmatrix');
  const [cells, setCells] = useState(() =>
    Array.from({ length: 2 }, () => Array.from({ length: 2 }, () => ''))
  );

  // Resize cell grid when rows/cols change, preserving entered values
  useEffect(() => {
    setCells(prev =>
      Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => prev[r]?.[c] ?? '')
      )
    );
  }, [rows, cols]);

  const setCell = (r, c, v) => {
    setCells(prev => prev.map((row, ri) =>
      ri === r ? row.map((cv, ci) => ci === c ? v : cv) : row
    ));
  };

  const generate = () => {
    const rowArr = cells.map((row, r) =>
      row.map((v, c) => v.trim() || `a_{${r + 1}${c + 1}}`).join(' & ')
    );
    return `\\begin{${type}}\n${rowArr.join(' \\\\\n')}\n\\end{${type}}`;
  };

  return (
    <div className="space-y-3 p-4 rounded-2xl border border-amber-900/30 bg-neutral-950">
      <p className="text-[10px] font-semibold text-amber-400/60 uppercase tracking-widest">Matrix Builder</p>
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-neutral-400">Rows</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setRows(r => Math.max(1, r - 1))} className="w-6 h-6 rounded-lg bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center">
              <Minus className="w-3 h-3 text-neutral-300" />
            </button>
            <span className="w-6 text-center text-xs font-mono text-neutral-200">{rows}</span>
            <button onClick={() => setRows(r => Math.min(6, r + 1))} className="w-6 h-6 rounded-lg bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center">
              <Plus className="w-3 h-3 text-neutral-300" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-neutral-400">Cols</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setCols(c => Math.max(1, c - 1))} className="w-6 h-6 rounded-lg bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center">
              <Minus className="w-3 h-3 text-neutral-300" />
            </button>
            <span className="w-6 text-center text-xs font-mono text-neutral-200">{cols}</span>
            <button onClick={() => setCols(c => Math.min(6, c + 1))} className="w-6 h-6 rounded-lg bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center">
              <Plus className="w-3 h-3 text-neutral-300" />
            </button>
          </div>
        </div>
        <select value={type} onChange={e => setType(e.target.value)}
          className="text-xs bg-neutral-800 border border-neutral-700 text-neutral-200 rounded-lg px-2 py-1.5 outline-none">
          <option value="pmatrix">( ) round</option>
          <option value="bmatrix">[ ] square</option>
          <option value="vmatrix">| | determinant</option>
          <option value="matrix">plain</option>
        </select>
      </div>

      {/* Editable cell grid */}
      <div className="grid gap-1 p-2 bg-neutral-900 rounded-lg border border-amber-900/20"
           style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {cells.map((row, r) =>
          row.map((v, c) => (
            <input
              key={`${r}-${c}`}
              value={v}
              onChange={e => setCell(r, c, e.target.value)}
              spellCheck={false}
              autoComplete="off"
              className="bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs font-mono rounded px-2 py-1.5 outline-none focus:border-amber-500/40 min-w-0"
              placeholder={`a_{${r + 1}${c + 1}}`}
            />
          ))
        )}
      </div>

      <button onClick={() => onInsert(generate())}
        className="w-full py-2 rounded-lg text-xs font-semibold text-black transition-all hover:opacity-90"
        style={{ background: GOLD }}>
        Insert {rows}×{cols} Matrix
      </button>
    </div>
  );
}

// ── Scientific Calculator ─────────────────────────────────────────────────
// A real, evaluating calculator. The display shows the current expression
// and the most recent computed result. Buttons append tokens to the
// expression string (numbers, operators, function-call openers like 'sin(').
// Pressing = parses the expression with mathEval and displays the answer.
// Pressing "Send to LaTeX" pushes the rendered LaTeX into the parent editor.
function ScientificCalculator({ onSendToEditor }) {
  const [expr, setExpr]       = useState('');
  const [result, setResult]   = useState('');
  const [error, setError]     = useState('');
  const [history, setHistory] = useState([]);

  const append = useCallback((s) => {
    setExpr(e => e + s);
    setError('');
  }, []);

  const back = useCallback(() => {
    setExpr(e => e.slice(0, -1));
    setError('');
  }, []);

  const clear = useCallback(() => {
    setExpr(''); setResult(''); setError('');
  }, []);

  const compute = useCallback(() => {
    if (!expr.trim()) return;
    const r = tryEvaluate(expr);
    if (r.error) { setError(r.error); return; }
    if (!Number.isFinite(r.value)) {
      setError(Number.isNaN(r.value) ? 'Not a number' : 'Infinity');
      return;
    }
    const formatted = formatResult(r.value);
    setResult(formatted);
    setHistory(h => [{ expr, result: formatted, ts: Date.now() }, ...h].slice(0, 8));
  }, [expr]);

  // Derived live result — shows a faint preview while typing if the
  // expression is currently parseable. Cleared on parse failure.
  const livePreview = useMemo(() => {
    if (!expr.trim() || expr === result) return '';
    const r = tryEvaluate(expr);
    if (r.error || !Number.isFinite(r.value)) return '';
    return formatResult(r.value);
  }, [expr, result]);

  const sendToEditor = () => {
    if (!onSendToEditor) return;
    const latex = exprToLatex(expr) + (result ? ` = ${result}` : '');
    onSendToEditor(latex);
  };

  const numBtn = 'h-11 rounded-lg text-base font-mono font-semibold bg-neutral-900 hover:bg-amber-900/30 text-neutral-100 hover:text-amber-300 border border-amber-900/20 hover:border-amber-500/40 transition-colors';
  const opBtn  = 'h-11 rounded-lg text-base font-mono font-semibold bg-amber-900/20 hover:bg-amber-900/40 text-amber-300 border border-amber-900/30 hover:border-amber-500/40 transition-colors';
  const fnBtn  = 'h-9 rounded-lg text-xs font-mono font-semibold bg-neutral-900 hover:bg-amber-900/30 text-neutral-200 hover:text-amber-300 border border-amber-900/20 hover:border-amber-500/40 transition-colors';
  const eqBtn  = 'h-11 rounded-lg text-base font-bold bg-amber-500 hover:bg-amber-400 text-black border border-amber-400 transition-colors';
  const ctlBtn = 'h-11 rounded-lg text-sm font-mono font-semibold bg-red-950/30 hover:bg-red-900/40 text-red-300 border border-red-900/30 hover:border-red-500/40 transition-colors';

  return (
    <div className="rounded-2xl border border-amber-900/30 bg-neutral-950 overflow-hidden">
      {/* Display */}
      <div className="px-4 py-3 border-b border-amber-900/20" style={{ background: 'rgba(250,204,21,0.04)' }}>
        <p className="text-[10px] uppercase tracking-widest text-amber-400/60 font-mono mb-1">Expression</p>
        <p className="text-base font-mono text-neutral-100 break-all min-h-[1.5rem]">{expr || <span className="text-neutral-600">type or tap…</span>}</p>
        <div className="flex items-baseline justify-between gap-3 mt-2">
          <p className="text-[10px] uppercase tracking-widest text-amber-400/60 font-mono">Result</p>
          {error
            ? <p className="text-xs font-mono text-red-400 truncate" title={error}>{error}</p>
            : result
              ? <p className="text-2xl font-mono font-bold text-amber-300 break-all">{result}</p>
              : livePreview
                ? <p className="text-base font-mono text-neutral-500 break-all">≈ {livePreview}</p>
                : <p className="text-base font-mono text-neutral-600">—</p>
          }
        </div>
      </div>

      <div className="p-3 space-y-1.5">
        {/* Function row 1: trig + log */}
        <div className="grid grid-cols-5 gap-1.5">
          {[
            { l: 'sin', i: 'sin(' }, { l: 'cos', i: 'cos(' }, { l: 'tan', i: 'tan(' },
            { l: 'log', i: 'log(' }, { l: 'ln',  i: 'ln('  },
          ].map(b => <button key={b.l} onClick={() => append(b.i)} className={fnBtn}>{b.l}</button>)}
        </div>
        {/* Function row 2: roots, constants, parens */}
        <div className="grid grid-cols-5 gap-1.5">
          {[
            { l: '√', i: 'sqrt(' }, { l: 'x²', i: '^2' }, { l: 'xⁿ', i: '^' },
            { l: 'π', i: 'pi'    }, { l: 'e', i: 'e' },
          ].map(b => <button key={b.l} onClick={() => append(b.i)} className={fnBtn}>{b.l}</button>)}
        </div>
        {/* Numeric keypad — 4 rows × 5 cols */}
        <div className="grid grid-cols-5 gap-1.5 pt-1">
          <button onClick={() => append('7')} className={numBtn}>7</button>
          <button onClick={() => append('8')} className={numBtn}>8</button>
          <button onClick={() => append('9')} className={numBtn}>9</button>
          <button onClick={() => append('/')} className={opBtn}>÷</button>
          <button onClick={clear}             className={ctlBtn}>C</button>

          <button onClick={() => append('4')} className={numBtn}>4</button>
          <button onClick={() => append('5')} className={numBtn}>5</button>
          <button onClick={() => append('6')} className={numBtn}>6</button>
          <button onClick={() => append('*')} className={opBtn}>×</button>
          <button onClick={back}              className={ctlBtn}>⌫</button>

          <button onClick={() => append('1')} className={numBtn}>1</button>
          <button onClick={() => append('2')} className={numBtn}>2</button>
          <button onClick={() => append('3')} className={numBtn}>3</button>
          <button onClick={() => append('-')} className={opBtn}>−</button>
          <button onClick={() => append('(')} className={fnBtn}>(</button>

          <button onClick={() => append('0')} className={numBtn}>0</button>
          <button onClick={() => append('.')} className={numBtn}>.</button>
          <button onClick={compute}            className={eqBtn}>=</button>
          <button onClick={() => append('+')} className={opBtn}>+</button>
          <button onClick={() => append(')')} className={fnBtn}>)</button>
        </div>

        {/* Action row */}
        <div className="flex gap-1.5 pt-2">
          <button onClick={sendToEditor} disabled={!expr.trim()}
            className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-xs font-semibold border border-amber-900/40 hover:border-amber-500/40 text-amber-400 hover:text-amber-300 disabled:opacity-40 transition-colors">
            <Send className="w-3 h-3" />
            Drop into LaTeX editor
          </button>
        </div>

        {/* Mini history */}
        {history.length > 0 && (
          <div className="pt-2 border-t border-amber-900/20 mt-2 space-y-1 max-h-28 overflow-y-auto">
            <p className="text-[10px] uppercase tracking-widest text-amber-400/60 font-mono px-1">Recent</p>
            {history.map(h => (
              <button key={h.ts} onClick={() => { setExpr(h.expr); setResult(h.result); setError(''); }}
                className="w-full text-left px-2 py-1 rounded hover:bg-amber-900/15 transition-colors flex items-baseline justify-between gap-2 group">
                <span className="text-xs font-mono text-neutral-400 truncate group-hover:text-amber-300">{h.expr}</span>
                <span className="text-xs font-mono text-amber-300 flex-shrink-0">= {h.result}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Format a JS number for calculator display. Integer → no decimals.
// Float → up to 10 significant figures (round-tripped to drop float jitter
// like 0.1+0.2=0.30000000000000004 → 0.3). Very small/very large numbers
// render in exponential.
function formatResult(n) {
  if (Number.isInteger(n)) return String(n);
  if (Math.abs(n) < 1e-6 || Math.abs(n) >= 1e15) return n.toExponential(6);
  return parseFloat(n.toPrecision(10)).toString();
}

// Best-effort plain-text → LaTeX conversion for the "drop into editor" path.
// Handles the common cases: function calls become \name{...}, ^ stays as ^,
// * becomes \cdot, / becomes \frac when both sides are bracketed terms,
// pi/e remain identifiers (KaTeX renders them correctly).
function exprToLatex(s) {
  let out = s;
  out = out.replace(/sqrt\(([^()]*)\)/g, '\\sqrt{$1}');
  out = out.replace(/(sin|cos|tan|asin|acos|atan|log|ln|exp|abs)\(([^()]*)\)/g,
                    (_, fn, arg) => `\\${fn === 'ln' ? 'ln' : fn}{${arg}}`);
  out = out.replace(/\bpi\b/g, '\\pi');
  out = out.replace(/\*/g, ' \\cdot ');
  out = out.replace(/(\([^()]+\)|\b\w+)\s*\/\s*(\([^()]+\)|\b\w+)/g, '\\frac{$1}{$2}');
  return out;
}

// ── Graphing Calculator ───────────────────────────────────────────────────
// Multi-equation plotter with a single 2D canvas. Each equation has its own
// f(x) string compiled once via mathEval.tryCompile, then sampled across
// the x window. The user adds, removes, toggles visibility, and recolors
// each equation; the canvas redraws on any state change.
const PLOT_COLORS = ['#FACC15', '#22D3EE', '#A78BFA', '#F472B6', '#34D399', '#FB7185'];

function GraphingCalculator() {
  const [equations, setEquations] = useState([
    { id: 1, expr: 'sin(x)',    color: PLOT_COLORS[0], visible: true },
    { id: 2, expr: 'x^2 / 10',  color: PLOT_COLORS[1], visible: true },
  ]);
  const [xMin, setXMin] = useState(-10);
  const [xMax, setXMax] = useState(10);
  const [yMin, setYMin] = useState(-5);
  const [yMax, setYMax] = useState(5);
  const [hoverPt, setHoverPt] = useState(null);
  const canvasRef = useRef(null);
  const wrapRef   = useRef(null);

  const addEquation = () => {
    const id = Date.now();
    const color = PLOT_COLORS[equations.length % PLOT_COLORS.length];
    setEquations(eqs => [...eqs, { id, expr: '', color, visible: true }]);
  };
  const updateEq    = (id, patch) => setEquations(eqs => eqs.map(e => e.id === id ? { ...e, ...patch } : e));
  const removeEq    = (id)        => setEquations(eqs => eqs.filter(e => e.id !== id));
  const toggleEq    = (id)        => updateEq(id, { visible: !equations.find(e => e.id === id)?.visible });

  // Compile each equation once per render (only re-compiles when expr changes,
  // because tryCompile is pure and we wrap in useMemo).
  const compiled = useMemo(() => equations.map(eq => ({
    ...eq,
    ...tryCompile(eq.expr || '0'),
  })), [equations]);

  // Redraw on any change to compiled equations or the viewport.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const wrap = wrapRef.current;
    const W = wrap ? wrap.clientWidth : 480;
    const H = 320;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawPlot(ctx, W, H, xMin, xMax, yMin, yMax, compiled);
  }, [compiled, xMin, xMax, yMin, yMax]);

  // Mouse hover → display the (x, y) under the cursor for the first valid eq.
  const handleMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const x = xMin + (px / rect.width) * (xMax - xMin);
    const y = yMax - (py / rect.height) * (yMax - yMin);
    setHoverPt({ x, y, px, py });
  };
  const handleLeave = () => setHoverPt(null);

  const zoom = (factor) => {
    const cx = (xMin + xMax) / 2;
    const cy = (yMin + yMax) / 2;
    const xR = (xMax - xMin) / 2 * factor;
    const yR = (yMax - yMin) / 2 * factor;
    setXMin(cx - xR); setXMax(cx + xR);
    setYMin(cy - yR); setYMax(cy + yR);
  };
  const reset = () => { setXMin(-10); setXMax(10); setYMin(-5); setYMax(5); };

  return (
    <div className="rounded-2xl border border-amber-900/30 bg-neutral-950 overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-amber-900/20"
        style={{ background: 'rgba(250,204,21,0.04)' }}>
        <div className="flex items-center gap-2">
          <LineChart className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[11px] font-mono text-amber-400 uppercase tracking-wider">Graph y = f(x)</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => zoom(0.7)} className="px-2 py-1 rounded text-[10px] font-mono text-amber-400 hover:bg-amber-900/20" title="Zoom in">+</button>
          <button onClick={() => zoom(1.4)} className="px-2 py-1 rounded text-[10px] font-mono text-amber-400 hover:bg-amber-900/20" title="Zoom out">−</button>
          <button onClick={reset} className="px-2 py-1 rounded text-[10px] font-mono text-amber-400 hover:bg-amber-900/20" title="Reset view">⟲</button>
        </div>
      </div>

      {/* Canvas */}
      <div ref={wrapRef} className="relative">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMove}
          onMouseLeave={handleLeave}
          className="block w-full"
        />
        {hoverPt && (
          <div className="absolute pointer-events-none rounded px-2 py-1 text-[10px] font-mono"
            style={{ background: 'rgba(0,0,0,0.7)', color: '#FACC15', left: hoverPt.px + 8, top: hoverPt.py + 8 }}>
            x = {hoverPt.x.toFixed(3)}, y = {hoverPt.y.toFixed(3)}
          </div>
        )}
      </div>

      {/* Equation list */}
      <div className="p-3 space-y-1.5 border-t border-amber-900/20">
        {equations.map(eq => {
          const compiledOne = compiled.find(c => c.id === eq.id);
          const eqError = compiledOne?.error;
          return (
            <div key={eq.id} className="flex items-center gap-1.5">
              <button onClick={() => toggleEq(eq.id)}
                className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 border"
                style={{
                  background: eq.visible ? eq.color : 'transparent',
                  borderColor: eq.color,
                }}
                title={eq.visible ? 'Hide' : 'Show'}>
                {eq.visible && <Check className="w-3 h-3 text-black" />}
              </button>
              <span className="text-xs font-mono text-neutral-400 flex-shrink-0">y =</span>
              <input
                value={eq.expr}
                onChange={e => updateEq(eq.id, { expr: e.target.value })}
                spellCheck={false} autoComplete="off"
                placeholder="sin(x)"
                className={`flex-1 bg-neutral-900 border text-neutral-200 text-xs font-mono rounded px-2 py-1.5 outline-none focus:border-amber-500/40 ${eqError ? 'border-red-700/50' : 'border-neutral-800'}`}
                title={eqError || ''}
              />
              <button onClick={() => removeEq(eq.id)}
                className="p-1 rounded text-neutral-600 hover:text-red-400 transition-colors"
                title="Remove">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          );
        })}
        <button onClick={addEquation}
          className="w-full mt-1 py-1.5 rounded-lg text-[11px] font-semibold border border-dashed border-amber-900/40 hover:border-amber-500/60 hover:bg-amber-900/10 text-amber-400/80 hover:text-amber-300 transition-colors">
          + Add equation
        </button>

        {/* Window controls */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-amber-900/20 mt-2">
          {[
            { l: 'x min', v: xMin, setter: setXMin },
            { l: 'x max', v: xMax, setter: setXMax },
            { l: 'y min', v: yMin, setter: setYMin },
            { l: 'y max', v: yMax, setter: setYMax },
          ].map(c => (
            <label key={c.l} className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest text-amber-400/60 font-mono w-12">{c.l}</span>
              <input type="number" value={c.v}
                onChange={e => c.setter(parseFloat(e.target.value) || 0)}
                className="flex-1 bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs font-mono rounded px-2 py-1 outline-none focus:border-amber-500/40 min-w-0" />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

// Render the plot. Pure drawing function; takes a 2D context and the active
// viewport. Pulls major-grid spacing automatically so 0–1 ranges still get
// useful gridlines.
function drawPlot(ctx, W, H, xMin, xMax, yMin, yMax, compiled) {
  ctx.fillStyle = '#050505';
  ctx.fillRect(0, 0, W, H);

  const xToPx = (x) => ((x - xMin) / (xMax - xMin)) * W;
  const yToPx = (y) => H - ((y - yMin) / (yMax - yMin)) * H;

  // Auto-compute a sensible major-tick spacing for the current range
  const tickSpacing = (range) => {
    const raw = range / 10;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag;
    const step = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
    return step * mag;
  };
  const xStep = tickSpacing(xMax - xMin);
  const yStep = tickSpacing(yMax - yMin);

  // Grid lines
  ctx.strokeStyle = 'rgba(250,204,21,0.07)';
  ctx.lineWidth = 1;
  for (let x = Math.ceil(xMin / xStep) * xStep; x <= xMax; x += xStep) {
    const px = xToPx(x);
    ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, H); ctx.stroke();
  }
  for (let y = Math.ceil(yMin / yStep) * yStep; y <= yMax; y += yStep) {
    const py = yToPx(y);
    ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(W, py); ctx.stroke();
  }

  // Axes
  ctx.strokeStyle = 'rgba(250,204,21,0.35)';
  ctx.lineWidth = 1.5;
  if (xMin <= 0 && xMax >= 0) {
    const px = xToPx(0);
    ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, H); ctx.stroke();
  }
  if (yMin <= 0 && yMax >= 0) {
    const py = yToPx(0);
    ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(W, py); ctx.stroke();
  }

  // Tick labels
  ctx.fillStyle = 'rgba(200,190,170,0.55)';
  ctx.font = '10px ui-monospace,monospace';
  ctx.textBaseline = 'top';
  for (let x = Math.ceil(xMin / xStep) * xStep; x <= xMax; x += xStep) {
    if (Math.abs(x) < xStep / 2) continue;
    ctx.fillText(formatTick(x), xToPx(x) + 2, yToPx(0) + 3);
  }
  ctx.textBaseline = 'middle';
  for (let y = Math.ceil(yMin / yStep) * yStep; y <= yMax; y += yStep) {
    if (Math.abs(y) < yStep / 2) continue;
    ctx.fillText(formatTick(y), xToPx(0) + 3, yToPx(y));
  }

  // Plot each visible equation
  for (const eq of compiled) {
    if (!eq.visible || !eq.fn) continue;
    ctx.strokeStyle = eq.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    let started = false;
    let prevY = null;
    for (let px = 0; px <= W; px++) {
      const x = xMin + (px / W) * (xMax - xMin);
      let y;
      try { y = eq.fn({ x }); } catch { y = NaN; }
      if (!Number.isFinite(y)) { started = false; prevY = null; continue; }
      // Clip jumps that span the entire viewport (asymptotes like tan)
      if (prevY !== null && Math.abs(y - prevY) > (yMax - yMin) * 5) { started = false; }
      const py = yToPx(y);
      if (!started) { ctx.moveTo(px, py); started = true; }
      else ctx.lineTo(px, py);
      prevY = y;
    }
    ctx.stroke();
  }
}

function formatTick(n) {
  if (Number.isInteger(n)) return String(n);
  return parseFloat(n.toPrecision(4)).toString();
}

// ── SparkEngine internal search ───────────────────────────────────────────
// LaTeX-Builder-local search bar. Filters across the symbol library and the
// LaTeX template library; each result inserts at the editor cursor when
// clicked. Branded as "SparkEngine" per user direction (the LaTeX-related
// commands previously surfaced through the global SparkEngine moved here).
function SparkEngineSearch({ symbolGroups, templates, onPick }) {
  const [query, setQuery] = useState('');
  const [open, setOpen]   = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const wrapRef  = useRef(null);

  // Flatten symbols + templates into a unified search corpus
  const corpus = useMemo(() => {
    const items = [];
    for (const g of symbolGroups) {
      for (const s of g.symbols) {
        items.push({
          kind: 'symbol',
          group: g.label,
          name: s.name || '',
          latex: s.latex,
          sym: s.sym,
          insert: s.latex,
          cursorBack: 0,
        });
      }
    }
    for (const t of templates) {
      items.push({
        kind: 'template',
        group: 'Templates',
        name: t.label.toLowerCase(),
        trigger: t.trigger,
        latex: t.latex,
        insert: t.latex,
        cursorBack: t.cursorBack || 0,
        sym: t.label,
      });
    }
    return items;
  }, [symbolGroups, templates]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return corpus.filter(item =>
      item.name.toLowerCase().includes(q) ||
      item.latex.toLowerCase().includes(q) ||
      item.sym.toLowerCase().includes(q) ||
      (item.trigger && item.trigger.toLowerCase().includes(q))
    ).slice(0, 12);
  }, [corpus, query]);

  useEffect(() => { setActive(0); }, [query]);

  // Click-outside close
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const pick = (item) => {
    onPick(item.insert, item.cursorBack);
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape')      { setOpen(false); inputRef.current?.blur(); return; }
    if (results.length === 0)    return;
    if (e.key === 'ArrowDown')   { e.preventDefault(); setActive(i => Math.min(i + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')     { e.preventDefault(); setActive(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter')       { e.preventDefault(); pick(results[active]); }
  };

  return (
    <div ref={wrapRef} className="relative">
      <div className="rounded-2xl border border-amber-900/30 bg-neutral-950 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-amber-900/20"
          style={{ background: 'rgba(250,204,21,0.04)' }}>
          <Search className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[11px] font-mono text-amber-400 uppercase tracking-wider flex-1">SparkEngine</span>
          <kbd className="text-[9px] px-1.5 py-0.5 rounded bg-neutral-900 border border-amber-900/30 text-amber-400/70 font-mono">/</kbd>
        </div>
        <div className="px-3 py-2.5">
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder="Search symbols or type /sum, /int, /frac…"
            spellCheck={false}
            autoComplete="off"
            className="w-full bg-neutral-900 border border-neutral-800 text-neutral-200 text-sm rounded-lg px-3 py-2 outline-none focus:border-amber-500/40 placeholder:text-neutral-600"
          />
        </div>
      </div>

      {open && query.trim() && (
        <div className="absolute left-0 right-0 top-full mt-2 z-30 rounded-2xl border border-amber-900/40 bg-neutral-950 shadow-xl shadow-black/50 overflow-hidden max-h-96 overflow-y-auto">
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-neutral-500">
              No matches for "<span className="text-amber-400">{query}</span>"
            </div>
          ) : (
            results.map((item, idx) => {
              const isActive = idx === active;
              return (
                <button key={`${item.kind}-${idx}`}
                  onMouseEnter={() => setActive(idx)}
                  onClick={() => pick(item)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-b border-amber-900/20 last:border-0 ${
                    isActive ? 'bg-amber-900/15' : 'hover:bg-amber-900/10'
                  }`}>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-base font-mono ${
                    isActive ? 'bg-amber-500/20 text-amber-300' : 'bg-neutral-900 text-neutral-300'
                  }`}>
                    {item.sym}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      {item.trigger && (
                        <code className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          isActive ? 'bg-amber-500/20 text-amber-300' : 'bg-neutral-900 text-neutral-500'
                        }`}>{item.trigger}</code>
                      )}
                      <p className={`text-xs font-semibold ${isActive ? 'text-amber-300' : 'text-neutral-200'}`}>
                        {item.kind === 'template' ? item.sym : (item.name || item.latex)}
                      </p>
                    </div>
                    <p className="text-[10px] font-mono text-neutral-500 truncate mt-0.5">{item.latex}</p>
                  </div>
                  <span className="text-[9px] uppercase tracking-widest text-neutral-600 flex-shrink-0">
                    {item.kind}
                  </span>
                  {isActive && <ArrowRight className="w-3 h-3 text-amber-400 flex-shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ── History item with KaTeX preview thumbnail ──────────────────────────────
function HistoryItem({ entry, onSelect, onDelete, katexReady }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!katexReady || !ref.current || !window.katex) return;
    try {
      window.katex.render(entry.latex, ref.current, {
        displayMode: false,
        throwOnError: false,
        errorColor: '#ef4444',
        maxSize: 12,
      });
    } catch {}
  }, [entry.latex, katexReady]);

  return (
    <div className="px-4 py-3 hover:bg-amber-900/10 transition-colors group flex items-start gap-2">
      <button onClick={() => onSelect(entry)} className="flex-1 min-w-0 text-left">
        <div ref={ref} className="text-neutral-200 text-sm overflow-hidden mb-1.5 max-h-10" />
        <p className="text-[10px] font-mono text-neutral-500 truncate">{entry.latex}</p>
        <p className="text-[10px] text-neutral-600 mt-0.5 group-hover:text-amber-400/50 transition-colors">
          {new Date(entry.ts).toLocaleString()}
        </p>
      </button>
      <button onClick={() => onDelete(entry.ts)}
        className="opacity-0 group-hover:opacity-100 p-1 rounded text-neutral-600 hover:text-red-400 transition-all"
        title="Remove from history">
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}

// ── Export dropdown menu ───────────────────────────────────────────────────
function ExportMenu({ getElement, getLatex }) {
  const [open, setOpen]   = useState(false);
  const [busy, setBusy]   = useState('');
  const [msg, setMsg]     = useState('');
  const wrapRef           = useRef(null);

  // Click-outside to close
  useEffect(() => {
    if (!open) return;
    const onDoc = e => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const flash = (text) => {
    setMsg(text);
    setTimeout(() => setMsg(''), 2200);
  };

  const exportPNG = async (transparent = true) => {
    const el = getElement();
    if (!el) return;
    setBusy('png');
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(el, {
        backgroundColor: transparent ? null : '#ffffff',
        scale: 3,
      });
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = 'equation.png';
      a.click();
      flash('PNG saved');
    } catch {
      flash('PNG export failed');
    }
    setBusy('');
    setOpen(false);
  };

  const exportSVG = () => {
    if (!window.katex) { flash('KaTeX not ready'); return; }
    setBusy('svg');
    try {
      const wrap = document.createElement('div');
      window.katex.render(getLatex(), wrap, {
        displayMode: true,
        throwOnError: false,
        output: 'html',
      });
      const svgSrc = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xhtml="http://www.w3.org/1999/xhtml" width="800" height="200"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="font-family:KaTeX_Main,serif;color:#000;background:#fff;padding:20px;font-size:24px">${wrap.innerHTML}</div></foreignObject></svg>`;
      const blob = new Blob([svgSrc], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'equation.svg'; a.click();
      URL.revokeObjectURL(url);
      flash('SVG saved');
    } catch {
      flash('SVG export failed');
    }
    setBusy('');
    setOpen(false);
  };

  const copyImage = async () => {
    const el = getElement();
    if (!el) return;
    setBusy('clip');
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(el, { backgroundColor: '#ffffff', scale: 3 });
      const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
      if (!blob) throw new Error('blob failed');
      if (!navigator.clipboard?.write || typeof window.ClipboardItem === 'undefined') {
        throw new Error('Clipboard image API not supported');
      }
      await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })]);
      flash('Copied to clipboard');
    } catch (e) {
      flash(e?.message?.includes('Clipboard') ? 'Clipboard image not supported' : 'Copy failed');
    }
    setBusy('');
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all border border-amber-900/40 hover:border-amber-500/40 text-amber-400 hover:text-amber-300">
        <Download className="w-3.5 h-3.5" />
        {msg || 'Export'}
        <ChevronRight className={`w-3 h-3 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 z-20 min-w-[220px] rounded-xl border border-amber-900/40 bg-neutral-950 shadow-xl shadow-black/40 overflow-hidden">
          <button onClick={() => exportPNG(true)} disabled={!!busy}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-left text-neutral-200 hover:bg-amber-900/20 hover:text-amber-300 transition-colors disabled:opacity-50">
            <FileImage className="w-3.5 h-3.5 text-amber-400" />
            <div className="flex-1">PNG (transparent)</div>
          </button>
          <button onClick={() => exportPNG(false)} disabled={!!busy}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-left text-neutral-200 hover:bg-amber-900/20 hover:text-amber-300 transition-colors disabled:opacity-50 border-t border-amber-900/20">
            <FileImage className="w-3.5 h-3.5 text-amber-400" />
            <div className="flex-1">PNG (white background)</div>
          </button>
          <button onClick={exportSVG} disabled={!!busy}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-left text-neutral-200 hover:bg-amber-900/20 hover:text-amber-300 transition-colors disabled:opacity-50 border-t border-amber-900/20">
            <FileCode className="w-3.5 h-3.5 text-amber-400" />
            <div className="flex-1">SVG (vector)</div>
          </button>
          <button onClick={copyImage} disabled={!!busy}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-left text-neutral-200 hover:bg-amber-900/20 hover:text-amber-300 transition-colors disabled:opacity-50 border-t border-amber-900/20">
            <Copy className="w-3.5 h-3.5 text-amber-400" />
            <div className="flex-1">Copy image to clipboard</div>
          </button>
        </div>
      )}
    </div>
  );
}

// ── Alt-text generator ─────────────────────────────────────────────────────
function altText(latex) {
  if (!latex.trim()) return '';
  let t = latex
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1) divided by ($2)')
    .replace(/\\sqrt\{([^}]+)\}/g, 'the square root of ($1)')
    .replace(/\\sum_\{([^}]+)\}\^\{([^}]+)\}/g, 'the sum from $1 to $2')
    .replace(/\\int_\{([^}]+)\}\^\{([^}]+)\}/g, 'the integral from $1 to $2')
    .replace(/\\lim_\{([^}]+)\}/g, 'the limit as $1')
    .replace(/\^{([^}]+)}/g, ' to the power of $1')
    .replace(/_{([^}]+)}/g, ' subscript $1')
    .replace(/\\alpha/g,'alpha').replace(/\\beta/g,'beta').replace(/\\gamma/g,'gamma')
    .replace(/\\delta/g,'delta').replace(/\\epsilon/g,'epsilon').replace(/\\theta/g,'theta')
    .replace(/\\lambda/g,'lambda').replace(/\\mu/g,'mu').replace(/\\pi/g,'pi')
    .replace(/\\sigma/g,'sigma').replace(/\\omega/g,'omega').replace(/\\infty/g,'infinity')
    .replace(/\\times/g,'times').replace(/\\div/g,'divided by').replace(/\\pm/g,'plus or minus')
    .replace(/\\leq/g,'less than or equal to').replace(/\\geq/g,'greater than or equal to')
    .replace(/\\neq/g,'not equal to').replace(/\\approx/g,'approximately equal to')
    .replace(/\\rightarrow/g,'approaches').replace(/\\Rightarrow/g,'implies')
    .replace(/\\sin/g,'sine').replace(/\\cos/g,'cosine').replace(/\\tan/g,'tangent')
    .replace(/\\log/g,'log').replace(/\\ln/g,'natural log')
    .replace(/\\\\/g,' ').replace(/[{}\\]/g,' ').replace(/\s+/g,' ').trim();
  return t || 'Mathematical expression';
}

// ── History item ───────────────────────────────────────────────────────────
const MAX_HISTORY = 20;
const HISTORY_KEY = 'sparkutility_latex_history';

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
}
function saveHistory(h) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, MAX_HISTORY))); } catch {}
}

// ── Main component ─────────────────────────────────────────────────────────
export default function LaTeXBuilder() {
  const [code, setCode]             = useState('\\int_{a}^{b} f(x)\\,dx');
  const [preview, setPreview]       = useState(true);
  const [copied, setCopied]         = useState(false);
  const [altCopied, setAltCopied]   = useState(false);
  const [activeTab, setActiveTab]   = useState('calculator'); // calculator | graph | symbols | matrix | annotation | history
  const [history, setHistory]       = useState(loadHistory);
  const [colorTarget, setColorTarget] = useState('');
  const [colorPick, setColorPick]   = useState('#ef4444');
  const [annotText, setAnnotText]   = useState('');
  const [katexReady, setKatexReady] = useState(() => typeof window !== 'undefined' && !!window.katex);
  const textareaRef                 = useRef(null);
  const previewRef                  = useRef(null);

  // ── Load KaTeX ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!document.getElementById('katex-css')) {
      const link = document.createElement('link');
      link.id   = 'katex-css';
      link.rel  = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
      document.head.appendChild(link);
    }
    if (window.katex) {
      setKatexReady(true);
      return;
    }
    const existing = document.getElementById('katex-script');
    const onReady = () => setKatexReady(true);
    if (existing) {
      existing.addEventListener('load', onReady, { once: true });
      return () => existing.removeEventListener('load', onReady);
    }
    const script = document.createElement('script');
    script.id  = 'katex-script';
    script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js';
    script.addEventListener('load', onReady, { once: true });
    document.head.appendChild(script);
    return () => script.removeEventListener('load', onReady);
  }, []);

  // ── Render preview ────────────────────────────────────────────────────────
  const renderPreview = useCallback(() => {
    const el = previewRef.current;
    if (!el || !window.katex) return;
    try {
      window.katex.render(code || '\\text{start typing…}', el, {
        displayMode: true,
        throwOnError: false,
        errorColor: '#ef4444',
      });
    } catch {}
  }, [code]);

  useEffect(() => { renderPreview(); }, [renderPreview, katexReady]);

  // ── Insert at cursor ──────────────────────────────────────────────────────
  // cursorBack > 0 lands the caret N chars before the end of the inserted text
  // — e.g. inserting `\sqrt{}` with cursorBack=1 places the caret inside `{}`
  // so the user can immediately type the radicand.
  const insertAtCursor = useCallback((text, cursorBack = 0) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart ?? code.length;
    const end   = ta.selectionEnd   ?? code.length;
    const next  = code.slice(0, start) + text + code.slice(end);
    setCode(next);
    setTimeout(() => {
      ta.focus();
      const pos = start + text.length - cursorBack;
      ta.selectionStart = ta.selectionEnd = pos;
    }, 0);
  }, [code]);

  // ── Save to history ───────────────────────────────────────────────────────
  const pushHistory = useCallback((latex) => {
    if (!latex.trim()) return;
    setHistory(prev => {
      const next = [{ latex, ts: Date.now() }, ...prev.filter(h => h.latex !== latex)].slice(0, MAX_HISTORY);
      saveHistory(next);
      return next;
    });
  }, []);

  // ── Remove single history item ────────────────────────────────────────────
  const removeHistoryItem = useCallback((ts) => {
    setHistory(prev => {
      const next = prev.filter(h => h.ts !== ts);
      saveHistory(next);
      return next;
    });
  }, []);

  // ── Copy LaTeX ────────────────────────────────────────────────────────────
  const copyLatex = async () => {
    await navigator.clipboard?.writeText(code).catch(() => {});
    pushHistory(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  // ── Copy alt text ─────────────────────────────────────────────────────────
  const copyAlt = async () => {
    await navigator.clipboard?.writeText(altText(code)).catch(() => {});
    setAltCopied(true);
    setTimeout(() => setAltCopied(false), 1800);
  };

  // ── Color wrap ────────────────────────────────────────────────────────────
  const wrapColor = () => {
    if (!colorTarget.trim()) return;
    insertAtCursor(`\\color{${colorPick.replace('#','')}}{${colorTarget}}`);
  };

  // ── Annotation wrap ───────────────────────────────────────────────────────
  const wrapAnnot = () => {
    if (!colorTarget.trim() || !annotText.trim()) return;
    insertAtCursor(`\\underbrace{${colorTarget}}_{\\text{${annotText}}}`);
  };

  const displayAlt = altText(code);

  return (
    <div style={{ minHeight: 'calc(100vh - 4rem)', background: '#050505' }}>
      <FluxBackdrop />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">

      {/* ── Breadcrumb ── */}
      <nav className="flex items-center gap-1.5 pt-8 pb-4 text-[11px] text-neutral-500 font-mono select-none">
        <Link to="/fluxkit" className="hover:text-amber-400 transition-colors">FluxKit</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-amber-400">LaTeX Builder</span>
      </nav>

      {/* ── Hero ── */}
      <div className="mb-8">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold mb-4"
          style={{ background: 'rgba(250,204,21,0.12)', border: '1px solid rgba(250,204,21,0.25)', color: GOLD, fontFamily: FB, letterSpacing: '0.04em' }}>
          <Hash className="w-3 h-3" />
          FluxKit › Math
        </motion.div>
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="mb-3 leading-[1.05]"
          style={{ fontFamily: FH, color: '#F5F0E8', fontSize: 'clamp(2.2rem, 5vw, 4rem)', letterSpacing: '-0.02em' }}>
          <span style={{ color: GOLD }}>LaTeX</span> Builder
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
          className="text-sm max-w-2xl" style={{ fontFamily: FB, color: 'rgba(200,190,170,0.6)', lineHeight: 1.7 }}>
          Build equations visually, preview in real-time with KaTeX, generate accessible alt-text, export as PNG, and save to history. Type <code className="text-amber-400 bg-amber-900/20 px-1 rounded">/sum</code> etc. in SparkEngine to drop templates.
        </motion.p>
        <div className="h-px mt-6 w-full" style={{ background: `linear-gradient(90deg, ${GOLD}, transparent)` }} />
      </div>

      {/* ── Main layout ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">

        {/* ── Left: editor + preview ── */}
        <div className="space-y-4">

          {/* Code editor */}
          <div className="rounded-2xl overflow-hidden border border-amber-900/30 bg-neutral-950">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-amber-900/20"
              style={{ background: 'rgba(250,204,21,0.06)' }}>
              <span className="text-[11px] font-mono text-amber-400 uppercase tracking-wider">LaTeX Code</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setCode('')} title="Clear"
                  className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-500 hover:text-neutral-300 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setCode(code)} title="Reset"
                  className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-500 hover:text-neutral-300 transition-colors">
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <textarea
              ref={textareaRef}
              value={code}
              onChange={e => setCode(e.target.value)}
              className="w-full h-40 px-4 py-3 text-sm font-mono bg-transparent text-neutral-100 outline-none resize-none"
              placeholder="Type or build your LaTeX here…"
              spellCheck={false}
              autoComplete="off"
            />
          </div>

          {/* Preview */}
          <div className="rounded-2xl border border-amber-900/30 bg-neutral-950 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-amber-900/20"
              style={{ background: 'rgba(250,204,21,0.06)' }}>
              <span className="text-[11px] font-mono text-amber-400 uppercase tracking-wider">Live Preview</span>
              <button onClick={() => setPreview(p => !p)} className="text-neutral-500 hover:text-neutral-300 transition-colors p-1.5 rounded-lg hover:bg-neutral-800">
                {preview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <AnimatePresence>
              {preview && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                  <div className="px-6 py-8 min-h-[80px] flex items-center justify-center">
                    <div ref={previewRef} className="text-white overflow-x-auto" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Alt-text */}
          {displayAlt && (
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 flex items-start gap-3">
              <AlignCenter className="w-4 h-4 text-neutral-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-1">Accessible Alt-Text</p>
                <p className="text-xs text-neutral-300 leading-relaxed">{displayAlt}</p>
              </div>
              <button onClick={copyAlt}
                className="flex-shrink-0 p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-500 hover:text-neutral-300 transition-colors"
                title="Copy alt text">
                {altCopied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}

          {/* Action row */}
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={copyLatex}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-black transition-all hover:opacity-90"
              style={{ background: GOLD }}>
              {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy LaTeX'}
            </button>
            <ExportMenu
              getElement={() => previewRef.current}
              getLatex={() => code}
            />
          </div>
        </div>

        {/* ── Right: toolbox ── */}
        <div className="space-y-4">

          {/* SparkEngine internal search */}
          <SparkEngineSearch
            symbolGroups={SYMBOL_GROUPS}
            templates={LATEX_TEMPLATES}
            onPick={(latex, cursorBack) => insertAtCursor(latex, cursorBack)}
          />

          {/* Tab bar — calculator + graph promoted to first-class tabs */}
          <div className="grid grid-cols-6 gap-1 p-1 rounded-xl bg-neutral-900 border border-amber-900/20">
            {[
              { id: 'calculator', label: 'Calc',     Icon: Calculator },
              { id: 'graph',      label: 'Graph',    Icon: LineChart },
              { id: 'symbols',    label: 'Symbols',  Icon: Sigma },
              { id: 'matrix',     label: 'Matrix',   Icon: Grid3x3 },
              { id: 'annotation', label: 'Annotate', Icon: Palette },
              { id: 'history',    label: 'History',  Icon: History },
            ].map(({ id, label, Icon }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`flex items-center justify-center gap-1 py-2 rounded-lg text-[10px] font-semibold transition-colors ${
                  activeTab === id ? 'text-black' : 'text-neutral-500 hover:text-neutral-300'
                }`}
                style={activeTab === id ? { background: GOLD } : {}}>
                <Icon className="w-3 h-3" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* Calculator panel (computes) */}
          {activeTab === 'calculator' && (
            <ScientificCalculator onSendToEditor={(text) => insertAtCursor(text, 0)} />
          )}

          {/* Graphing panel */}
          {activeTab === 'graph' && (
            <GraphingCalculator />
          )}

          {/* Symbols panel — full grouped grid; quick search lives in the
              SparkEngine bar at the top */}
          {activeTab === 'symbols' && (
            <div className="rounded-2xl border border-amber-900/30 bg-neutral-950 overflow-hidden">
              <div className="max-h-[60vh] overflow-y-auto">
                {SYMBOL_GROUPS.map(group => (
                  <div key={group.label} className="border-b border-amber-900/20 last:border-0">
                    <p className="px-4 pt-3 pb-1.5 text-[10px] font-semibold text-amber-400/60 uppercase tracking-widest">{group.label}</p>
                    <div className="grid grid-cols-6 gap-1 px-3 pb-3">
                      {group.symbols.map(s => (
                        <button key={s.latex + s.sym} onClick={() => insertAtCursor(s.latex)} title={`${s.name || ''}  ${s.latex}`}
                          className="h-9 rounded-lg bg-neutral-800 hover:bg-amber-900/30 hover:text-amber-300 text-neutral-200 text-sm transition-colors font-mono border border-transparent hover:border-amber-900/40">
                          {s.sym}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Matrix panel */}
          {activeTab === 'matrix' && (
            <MatrixBuilder onInsert={insertAtCursor} />
          )}

          {/* Annotation panel */}
          {activeTab === 'annotation' && (
            <div className="rounded-2xl border border-amber-900/30 bg-neutral-950 p-4 space-y-4">
              <div>
                <p className="text-[10px] font-semibold text-amber-400/60 uppercase tracking-widest mb-2">Target expression</p>
                <input value={colorTarget} onChange={e => setColorTarget(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 text-neutral-200 text-sm font-mono rounded-xl px-3 py-2.5 outline-none focus:border-amber-500/40"
                  placeholder="e.g.  x^2 + y^2" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-amber-400/60 uppercase tracking-widest mb-2">Color highlight</p>
                <div className="flex gap-2 items-center">
                  <input type="color" value={colorPick} onChange={e => setColorPick(e.target.value)}
                    className="w-10 h-9 rounded-lg cursor-pointer border-0 bg-transparent" />
                  {['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#a855f7'].map(c => (
                    <button key={c} onClick={() => setColorPick(c)}
                      className="w-6 h-6 rounded-full border-2 transition-all"
                      style={{ background: c, borderColor: colorPick === c ? '#fff' : 'transparent' }} />
                  ))}
                </div>
                <button onClick={wrapColor}
                  className="mt-2 w-full py-2 rounded-lg text-xs font-semibold text-black hover:opacity-90"
                  style={{ background: GOLD }}>
                  Wrap with \color
                </button>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-amber-400/60 uppercase tracking-widest mb-2">Underbrace label</p>
                <input value={annotText} onChange={e => setAnnotText(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 text-neutral-200 text-sm rounded-xl px-3 py-2.5 outline-none focus:border-amber-500/40 mb-2"
                  placeholder="Label text" />
                <button onClick={wrapAnnot}
                  className="w-full py-2 rounded-lg text-xs font-semibold border border-amber-900/40 text-amber-400 hover:text-amber-300 hover:border-amber-500/40 transition-colors">
                  Insert \underbrace
                </button>
              </div>
            </div>
          )}

          {/* History panel */}
          {activeTab === 'history' && (
            <div className="rounded-2xl border border-amber-900/30 bg-neutral-950 overflow-hidden">
              {history.length === 0 ? (
                <div className="py-10 text-center text-neutral-500 text-xs">No history yet — copy LaTeX to save.</div>
              ) : (
                <div>
                  <div className="divide-y divide-amber-900/20 max-h-[60vh] overflow-y-auto">
                    {history.map(h => (
                      <HistoryItem
                        key={h.ts}
                        entry={h}
                        onSelect={(e) => setCode(e.latex)}
                        onDelete={removeHistoryItem}
                        katexReady={katexReady}
                      />
                    ))}
                  </div>
                  <button onClick={() => { setHistory([]); saveHistory([]); }}
                    className="w-full py-2.5 text-[11px] text-neutral-600 hover:text-red-400 transition-colors flex items-center justify-center gap-1.5 border-t border-amber-900/20">
                    <Trash2 className="w-3 h-3" /> Clear history
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Footer note */}
          <p className="text-[10px] text-neutral-600 text-center" style={{ fontFamily: FB }}>
            All LaTeX Builder tools run 100% in-browser.
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}
