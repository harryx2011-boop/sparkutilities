// Tiny recursive-descent math expression evaluator. Used by the LaTeX
// Builder's scientific + graphing calculators. Designed to be safe — never
// uses eval() or new Function() — and small enough to leave inline in any
// chunk. Grammar:
//
//   expr     := term (('+'|'-') term)*
//   term     := factor (('*'|'/'|'%') factor)*
//   factor   := unary ('^' factor)?      ← right-associative, like math
//   unary    := ('+'|'-')? primary
//   primary  := NUMBER | NAME | NAME '(' arglist ')' | '(' expr ')' | '|' expr '|'
//   arglist  := expr (',' expr)*
//
// Implicit multiplication is supported: `2x` → `2*x`, `2(x+1)` → `2*(x+1)`,
// and `xy` → `x*y` only when both are single-letter known names.

const FUNCTIONS = {
  sin:   Math.sin,
  cos:   Math.cos,
  tan:   Math.tan,
  asin:  Math.asin,
  acos:  Math.acos,
  atan:  Math.atan,
  atan2: Math.atan2,
  sinh:  Math.sinh,
  cosh:  Math.cosh,
  tanh:  Math.tanh,
  log:   (x) => Math.log10(x),
  log10: Math.log10,
  log2:  Math.log2,
  ln:    Math.log,
  exp:   Math.exp,
  sqrt:  Math.sqrt,
  cbrt:  Math.cbrt,
  abs:   Math.abs,
  floor: Math.floor,
  ceil:  Math.ceil,
  round: Math.round,
  sign:  Math.sign,
  min:   Math.min,
  max:   Math.max,
  pow:   Math.pow,
};

const CONSTANTS = {
  pi:    Math.PI,
  e:     Math.E,
  tau:   Math.PI * 2,
  inf:   Infinity,
  nan:   NaN,
};

// ── Tokeniser ─────────────────────────────────────────────────────────────
function tokenise(src) {
  const tokens = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    // number — digits with optional decimal + exponent
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      if (src[j] === 'e' || src[j] === 'E') {
        j++;
        if (src[j] === '+' || src[j] === '-') j++;
        while (j < src.length && /[0-9]/.test(src[j])) j++;
      }
      const n = parseFloat(src.slice(i, j));
      if (!Number.isFinite(n) && src.slice(i, j) !== 'Infinity') {
        throw new Error(`Bad number near "${src.slice(i, j)}"`);
      }
      tokens.push({ type: 'num', value: n });
      i = j;
      continue;
    }
    // name — letters and underscores
    if (/[a-zA-Z_]/.test(c)) {
      let j = i;
      while (j < src.length && /[a-zA-Z0-9_]/.test(src[j])) j++;
      tokens.push({ type: 'name', value: src.slice(i, j) });
      i = j;
      continue;
    }
    // single-character operators
    if ('+-*/^%(),|'.indexOf(c) >= 0) {
      tokens.push({ type: c });
      i++;
      continue;
    }
    throw new Error(`Unexpected character "${c}" at position ${i}`);
  }
  tokens.push({ type: 'eof' });
  return tokens;
}

// ── Parser → AST ──────────────────────────────────────────────────────────
function parse(tokens) {
  let pos = 0;
  const peek  = () => tokens[pos];
  const eat   = (t) => { if (peek().type === t) { pos++; return true; } return false; };
  const expect = (t) => {
    if (peek().type !== t) throw new Error(`Expected ${t}, got ${peek().type}`);
    pos++;
  };

  function expr() {
    let left = term();
    while (peek().type === '+' || peek().type === '-') {
      const op = peek().type; pos++;
      left = { kind: 'binop', op, l: left, r: term() };
    }
    return left;
  }

  function term() {
    let left = factor();
    while (peek().type === '*' || peek().type === '/' || peek().type === '%') {
      const op = peek().type; pos++;
      left = { kind: 'binop', op, l: left, r: factor() };
    }
    // Implicit multiplication: number/name followed by name or '(' or '|'
    while (peek().type === 'name' || peek().type === '(' || peek().type === '|' || peek().type === 'num') {
      // Don't fold: `5 5` should error rather than become `5*5` silently
      if (left.kind === 'num' && peek().type === 'num') break;
      left = { kind: 'binop', op: '*', l: left, r: factor() };
    }
    return left;
  }

  function factor() {
    const u = unary();
    if (peek().type === '^') {
      pos++;
      return { kind: 'binop', op: '^', l: u, r: factor() }; // right-assoc
    }
    return u;
  }

  function unary() {
    if (eat('+')) return unary();
    if (eat('-')) return { kind: 'unary', op: '-', x: unary() };
    return primary();
  }

  function primary() {
    if (peek().type === 'num') {
      const n = peek().value; pos++;
      return { kind: 'num', value: n };
    }
    if (peek().type === '(') {
      pos++;
      const e = expr();
      expect(')');
      return e;
    }
    if (peek().type === '|') {
      pos++;
      const e = expr();
      expect('|');
      return { kind: 'call', name: 'abs', args: [e] };
    }
    if (peek().type === 'name') {
      const name = peek().value; pos++;
      if (peek().type === '(') {
        pos++;
        const args = [];
        if (peek().type !== ')') {
          args.push(expr());
          while (eat(',')) args.push(expr());
        }
        expect(')');
        return { kind: 'call', name, args };
      }
      return { kind: 'var', name };
    }
    throw new Error(`Unexpected token ${peek().type}`);
  }

  const root = expr();
  if (peek().type !== 'eof') throw new Error(`Unexpected trailing input`);
  return root;
}

// ── Evaluator ─────────────────────────────────────────────────────────────
function evalNode(node, env) {
  switch (node.kind) {
    case 'num':  return node.value;
    case 'var': {
      if (env && Object.prototype.hasOwnProperty.call(env, node.name)) return env[node.name];
      const c = CONSTANTS[node.name.toLowerCase()];
      if (c !== undefined) return c;
      throw new Error(`Unknown name: ${node.name}`);
    }
    case 'unary': return -evalNode(node.x, env);
    case 'binop': {
      const a = evalNode(node.l, env);
      const b = evalNode(node.r, env);
      switch (node.op) {
        case '+': return a + b;
        case '-': return a - b;
        case '*': return a * b;
        case '/': return a / b;
        case '%': return a % b;
        case '^': return Math.pow(a, b);
        default: throw new Error(`Unknown operator: ${node.op}`);
      }
    }
    case 'call': {
      const fn = FUNCTIONS[node.name.toLowerCase()];
      if (!fn) throw new Error(`Unknown function: ${node.name}`);
      const args = node.args.map(a => evalNode(a, env));
      return fn(...args);
    }
    default: throw new Error(`Unknown node kind: ${node.kind}`);
  }
}

// ── Public API ────────────────────────────────────────────────────────────
// `evaluate(source, env?)` — parses and evaluates `source`, with optional
// variable bindings in `env`. Returns a JS number. Throws Error on bad input.
export function evaluate(source, env) {
  const tokens = tokenise(source);
  const ast    = parse(tokens);
  return evalNode(ast, env);
}

// `compile(source)` — parses once, returns a fast evaluator that takes only
// the env. Used by the graphing calculator to plot many x-values without
// re-parsing the same expression each frame.
export function compile(source) {
  const tokens = tokenise(source);
  const ast    = parse(tokens);
  return (env) => evalNode(ast, env);
}

// `tryEvaluate(source, env?)` — returns { value, error } instead of throwing.
// Convenient inside React render paths.
export function tryEvaluate(source, env) {
  try { return { value: evaluate(source, env), error: null }; }
  catch (e) { return { value: null, error: e.message }; }
}

// `tryCompile(source)` — same convention for the compile path.
export function tryCompile(source) {
  try { return { fn: compile(source), error: null }; }
  catch (e) { return { fn: null, error: e.message }; }
}
