// Text-format converters — no external libraries, all native browser APIs.
// Each pair below is a one-direction transform between text formats.
// Higher-level routing lives in documentConvert.js.

// ── Encoding helpers ─────────────────────────────────────────────────────────
const enc = new TextEncoder();
const dec = new TextDecoder('utf-8');

export const toBytes = (s) => enc.encode(s);
export const fromBytes = (u8) => dec.decode(u8);

// ── CSV parser ───────────────────────────────────────────────────────────────
// Handles quoted fields, embedded commas, doubled quotes, and CRLF/LF newlines.
// Produces an array of arrays (rows of strings).
export function parseCSV(input) {
  const text = String(input).replace(/^﻿/, ''); // strip BOM
  const rows = [];
  let row = [];
  let field = '';
  let i = 0;
  let inQuotes = false;
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += ch; i++; continue;
    }
    if (ch === '"') { inQuotes = true; i++; continue; }
    if (ch === ',') { row.push(field); field = ''; i++; continue; }
    if (ch === '\r') { i++; continue; } // skip — \n will close the row
    if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += ch; i++;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

// Encode any value as a CSV field, quoting and escaping if needed.
export function csvEscape(value) {
  const s = value == null ? '' : String(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function rowsToCSV(rows) {
  return rows.map(r => r.map(csvEscape).join(',')).join('\r\n');
}

// ── CSV ↔ JSON ───────────────────────────────────────────────────────────────
// First row of CSV becomes object keys.
export function csvToJSON(text) {
  const rows = parseCSV(text);
  if (rows.length === 0) return [];
  const [header, ...data] = rows;
  return data.map(r => {
    const obj = {};
    header.forEach((key, idx) => { obj[key] = r[idx] ?? ''; });
    return obj;
  });
}

// JSON array of flat objects → CSV with union-of-keys header.
export function jsonToCSV(value) {
  if (!Array.isArray(value)) {
    if (value && typeof value === 'object') value = [value];
    else return '';
  }
  const keys = new Set();
  for (const row of value) {
    if (row && typeof row === 'object') Object.keys(row).forEach(k => keys.add(k));
  }
  const header = [...keys];
  const rows = value.map(row => header.map(k => {
    const v = row?.[k];
    if (v == null) return '';
    if (typeof v === 'object') return JSON.stringify(v);
    return v;
  }));
  return rowsToCSV([header, ...rows]);
}

// ── XML ↔ JSON (simple) ──────────────────────────────────────────────────────
// XML is tree-shaped; we map attributes onto `@attrs` and children onto keys.
// Repeated child names collapse into arrays. This isn't a full XML model, but
// it handles every spreadsheet/exchange XML you're realistically going to drop.
export function xmlToJSON(text) {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  const errEl = doc.querySelector('parsererror');
  if (errEl) throw new Error('Invalid XML: ' + errEl.textContent.slice(0, 200));
  return { [doc.documentElement.nodeName]: nodeToObj(doc.documentElement) };
}

function nodeToObj(node) {
  const obj = {};
  if (node.attributes && node.attributes.length) {
    obj['@attrs'] = {};
    for (const a of node.attributes) obj['@attrs'][a.name] = a.value;
  }
  let textContent = '';
  for (const child of node.childNodes) {
    if (child.nodeType === Node.TEXT_NODE || child.nodeType === Node.CDATA_SECTION_NODE) {
      textContent += child.nodeValue;
      continue;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) continue;
    const childObj = nodeToObj(child);
    const name = child.nodeName;
    if (obj[name] === undefined) obj[name] = childObj;
    else if (Array.isArray(obj[name])) obj[name].push(childObj);
    else obj[name] = [obj[name], childObj];
  }
  const text = textContent.trim();
  if (text && Object.keys(obj).length === 0) return text;
  if (text) obj['#text'] = text;
  return obj;
}

export function jsonToXML(value, rootName = 'root') {
  const sb = ['<?xml version="1.0" encoding="UTF-8"?>'];
  sb.push(serializeNode(rootName, value));
  return sb.join('\n');
}

function escapeXmlText(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escapeXmlAttr(s) {
  return escapeXmlText(s).replace(/"/g, '&quot;');
}

function serializeNode(name, value) {
  if (value == null) return `<${name}/>`;
  if (typeof value !== 'object') return `<${name}>${escapeXmlText(value)}</${name}>`;
  if (Array.isArray(value)) return value.map(v => serializeNode(name, v)).join('');
  const attrs = value['@attrs'] || {};
  const attrStr = Object.entries(attrs).map(([k, v]) => ` ${k}="${escapeXmlAttr(v)}"`).join('');
  const text = value['#text'];
  const children = Object.entries(value).filter(([k]) => k !== '@attrs' && k !== '#text');
  if (children.length === 0 && text == null) return `<${name}${attrStr}/>`;
  if (children.length === 0) return `<${name}${attrStr}>${escapeXmlText(text)}</${name}>`;
  const inner = children.map(([k, v]) => serializeNode(k, v)).join('');
  const textPart = text != null ? escapeXmlText(text) : '';
  return `<${name}${attrStr}>${textPart}${inner}</${name}>`;
}

// ── HTML ↔ Markdown / Text ───────────────────────────────────────────────────
// Lightweight plain-text and minimal markdown extraction. For richer HTML→MD,
// users can paste through the blog editor's Markdown body — we don't bundle
// turndown to keep the lib footprint small.
export function htmlToText(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  // Drop scripts and styles entirely — no-script renderable text only.
  doc.querySelectorAll('script, style, noscript').forEach(n => n.remove());
  // textContent on body collapses whitespace acceptably for plain output.
  return (doc.body?.textContent || doc.documentElement.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
}

export function htmlToMarkdown(html) {
  // Walk the DOM and emit a small subset of common markdown constructs.
  // This is intentionally simple — covers headings, paragraphs, links, lists,
  // emphasis, code, blockquotes, and horizontal rules. Anything else becomes
  // its inner text.
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script, style, noscript').forEach(n => n.remove());

  function walk(node) {
    if (node.nodeType === Node.TEXT_NODE) return node.nodeValue.replace(/\s+/g, ' ');
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const tag = node.nodeName.toLowerCase();
    const inner = Array.from(node.childNodes).map(walk).join('');
    switch (tag) {
      case 'h1': return `\n# ${inner.trim()}\n\n`;
      case 'h2': return `\n## ${inner.trim()}\n\n`;
      case 'h3': return `\n### ${inner.trim()}\n\n`;
      case 'h4': return `\n#### ${inner.trim()}\n\n`;
      case 'h5': return `\n##### ${inner.trim()}\n\n`;
      case 'h6': return `\n###### ${inner.trim()}\n\n`;
      case 'p': return `\n${inner.trim()}\n\n`;
      case 'br': return '  \n';
      case 'hr': return '\n---\n\n';
      case 'strong': case 'b': return `**${inner}**`;
      case 'em': case 'i': return `*${inner}*`;
      case 'code': return `\`${inner}\``;
      case 'pre': return `\n\`\`\`\n${node.textContent}\n\`\`\`\n\n`;
      case 'blockquote': return inner.split('\n').map(l => `> ${l}`).join('\n') + '\n\n';
      case 'a': {
        const href = node.getAttribute('href') || '';
        return href ? `[${inner}](${href})` : inner;
      }
      case 'img': {
        const alt = node.getAttribute('alt') || '';
        const src = node.getAttribute('src') || '';
        return src ? `![${alt}](${src})` : '';
      }
      case 'ul':
        return '\n' + Array.from(node.children)
          .filter(c => c.nodeName.toLowerCase() === 'li')
          .map(c => `- ${walk(c).trim()}`).join('\n') + '\n\n';
      case 'ol':
        return '\n' + Array.from(node.children)
          .filter(c => c.nodeName.toLowerCase() === 'li')
          .map((c, i) => `${i + 1}. ${walk(c).trim()}`).join('\n') + '\n\n';
      case 'li': return inner;
      case 'table':
      case 'thead':
      case 'tbody':
        return inner;
      case 'tr':
        return inner + '\n';
      case 'th':
      case 'td':
        return `| ${inner.trim()} `;
      default: return inner;
    }
  }
  return (walk(doc.body) || walk(doc.documentElement)).replace(/\n{3,}/g, '\n\n').trim();
}

// Wrap arbitrary text inside a clean HTML document.
export function textToHTML(text, title = 'Document') {
  const escaped = String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${escapeXmlText(title)}</title>
<style>body{font-family:system-ui,sans-serif;max-width:42rem;margin:2rem auto;padding:0 1rem;line-height:1.6}pre{white-space:pre-wrap}</style>
</head>
<body>
<pre>${escaped}</pre>
</body>
</html>`;
}

// Rows (2D array) → HTML table.
export function rowsToHTMLTable(rows, title = 'Table') {
  if (!rows.length) return textToHTML('', title);
  const [header, ...body] = rows;
  const th = header.map(c => `<th>${escapeXmlText(c)}</th>`).join('');
  const trs = body.map(r => '<tr>' + r.map(c => `<td>${escapeXmlText(c)}</td>`).join('') + '</tr>').join('\n');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${escapeXmlText(title)}</title>
<style>body{font-family:system-ui,sans-serif;margin:2rem}table{border-collapse:collapse}th,td{border:1px solid #ccc;padding:.4rem .6rem;text-align:left}th{background:#f5f5f5}</style>
</head>
<body>
<table>
<thead><tr>${th}</tr></thead>
<tbody>
${trs}
</tbody>
</table>
</body>
</html>`;
}
