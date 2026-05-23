import {
  toBytes, fromBytes,
  parseCSV, rowsToCSV,
  csvToJSON, jsonToCSV,
  xmlToJSON, jsonToXML,
  htmlToText, htmlToMarkdown,
  textToHTML, rowsToHTMLTable,
} from './textFormats';

// Group inputs/outputs that share a normalized "rows" representation.
const ROW_FORMATS = new Set(['csv', 'xlsx', 'xls']);
// Markdown-ish inputs that decode to plain text first.
const TEXT_INPUTS = new Set(['txt', 'md', 'html', 'htm', 'json', 'xml', 'csv']);

const DOCUMENT_OUTPUT_MIME = {
  pdf:  'application/pdf',
  csv:  'text/csv;charset=utf-8',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls:  'application/vnd.ms-excel',
  json: 'application/json;charset=utf-8',
  xml:  'application/xml;charset=utf-8',
  txt:  'text/plain;charset=utf-8',
  html: 'text/html;charset=utf-8',
  htm:  'text/html;charset=utf-8',
  md:   'text/markdown;charset=utf-8',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc:  'application/msword',
  yaml: 'text/yaml;charset=utf-8',
  yml:  'text/yaml;charset=utf-8',
  rtf:  'application/rtf;charset=utf-8',
  toml: 'text/plain;charset=utf-8',
  ini:  'text/plain;charset=utf-8',
  log:  'text/plain;charset=utf-8',
  js:   'text/javascript;charset=utf-8',
  ts:   'text/typescript;charset=utf-8',
  jsx:  'text/javascript;charset=utf-8',
  tsx:  'text/typescript;charset=utf-8',
  css:  'text/css;charset=utf-8',
};

export function getDocumentMime(ext) {
  return DOCUMENT_OUTPUT_MIME[ext] || 'application/octet-stream';
}

export function isDocumentExt(ext) {
  return ext in DOCUMENT_OUTPUT_MIME;
}

async function getPdfJs() {
  const mod = await import('pdfjs-dist/build/pdf.mjs');
  try {
    const workerUrl = (await import('pdfjs-dist/build/pdf.worker.mjs?url')).default;
    mod.GlobalWorkerOptions.workerSrc = workerUrl;
  } catch {
    mod.GlobalWorkerOptions.workerSrc = '';
  }
  return mod;
}

async function getJsPdf() {
  const mod = await import('jspdf');
  return mod.jsPDF || mod.default;
}

async function pdfExtractText(file) {
  const pdfjs = await getPdfJs();
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    const pageText = tc.items
      .map(it => (typeof it.str === 'string' ? it.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    pages.push(pageText);
    page.cleanup?.();
  }
  doc.destroy?.();
  return pages;
}

async function getMammoth() {
  const mod = await import('mammoth');
  return mod.default || mod;
}

async function docxExtractText(file) {
  const mammoth = await getMammoth();
  const buf = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buf });
  return result.value || '';
}

async function docxToHtml(file) {
  const mammoth = await getMammoth();
  const buf = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer: buf });
  return result.value || '';
}



async function textToPdf(text, compression = null) {
  const JsPDF = await getJsPdf();
  const doc = new JsPDF({ unit: 'pt', format: 'letter' });
  const margin = compression === 'compact' ? 32 : 48;
  const fontSize = compression === 'compact' ? 9 : compression === 'lossless' ? 12 : 11;
  const lineHeight = fontSize * 1.45;
  const usableWidth = doc.internal.pageSize.getWidth() - margin * 2;
  const usableHeight = doc.internal.pageSize.getHeight() - margin * 2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fontSize);

  const wrapped = doc.splitTextToSize(String(text || ''), usableWidth);
  let y = margin;
  for (const line of wrapped) {
    if (y + lineHeight > usableHeight + margin) {
      doc.addPage();
      y = margin;
    }
    doc.text(line, margin, y);
    y += lineHeight;
  }
  const blob = doc.output('blob');
  return new Uint8Array(await blob.arrayBuffer());
}

async function readXlsxRows(file) {
  const mod = await import('read-excel-file/browser');
  const readXlsx = mod.default || mod;
  const rows = await readXlsx(file);
  return rows.map(r => r.map(cell => (cell == null ? '' : String(cell))));
}

async function writeXlsxFromRows(rows) {
  const mod = await import('write-excel-file/browser');
  const writeXlsx = mod.default || mod;
  const data = rows.map((row, rowIdx) =>
    row.map(value => ({
      value: value == null ? '' : (typeof value === 'object' ? JSON.stringify(value) : value),
      type: typeof value === 'number' ? Number : String,
      ...(rowIdx === 0 ? { fontWeight: 'bold' } : {}),
    })),
  );
  const blob = await writeXlsx(data, { fileFormat: 'xlsx' });
  return new Uint8Array(await blob.arrayBuffer());
}

async function readAsRows(file, sourceExt) {
  if (sourceExt === 'csv') return parseCSV(await file.text());
  if (sourceExt === 'xlsx' || sourceExt === 'xls') return readXlsxRows(file);
  if (sourceExt === 'json') {
    const obj = JSON.parse(await file.text());
    if (Array.isArray(obj) && obj.length && typeof obj[0] === 'object' && obj[0] !== null) {
      const keys = [...new Set(obj.flatMap(o => Object.keys(o || {})))];
      return [keys, ...obj.map(o => keys.map(k => stringify(o?.[k])))];
    }
    // Fallback: single-cell JSON
    return [['value'], [JSON.stringify(obj)]];
  }
  throw new Error(`Cannot read ${sourceExt} as table`);
}

function stringify(v) {
  if (v == null) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

async function readAsText(file, sourceExt) {
  if (sourceExt === 'pdf') {
    const pages = await pdfExtractText(file);
    return pages.join('\n\n');
  }
  // Everything text-shaped (txt, md, html, htm, json, xml, csv) is just utf-8.
  return file.text();
}

function compressText(text, compression) {
  if (compression === 'compact') {
    return text
      .replace(/<!--[\s\S]*?-->/g, '')   // strip HTML comments
      .replace(/\/\*[\s\S]*?\*\//g, '')  // strip block comments
      .replace(/\/\/[^\n]*/g, '')        // strip line comments
      .replace(/\n{3,}/g, '\n\n')        // collapse blank lines
      .replace(/[ \t]+$/gm, '')          // strip trailing spaces
      .trim();
  }
  if (compression === 'lossless') {
    try {
      const parsed = JSON.parse(text);
      return JSON.stringify(parsed, null, 2);
    } catch { /* not JSON — return as-is */ }
  }
  return text;
}

export async function convertDocument(file, sourceExt, targetExt, compression = null) {
  const src = sourceExt.toLowerCase();
  const dst = targetExt.toLowerCase();

  // Same-format passthrough — just return the original bytes.
  if (src === dst) {
    const data = new Uint8Array(await file.arrayBuffer());
    return { data, ext: dst };
  }

  const ct = (s) => compressText(s, compression);
  if (ROW_FORMATS.has(src) || (src === 'json' && ROW_FORMATS.has(dst))) {
    const rows = await readAsRows(file, src);
    if (dst === 'csv') return { data: toBytes(ct(rowsToCSV(rows))), ext: 'csv' };
    if (dst === 'xlsx' || dst === 'xls') return { data: await writeXlsxFromRows(rows), ext: dst };
    if (dst === 'json') {
      const [header, ...body] = rows;
      const out = body.map(r => Object.fromEntries(header.map((k, i) => [k, r[i] ?? ''])));
      const jsonStr = compression === 'compact'
        ? JSON.stringify(out)
        : JSON.stringify(out, null, 2);
      return { data: toBytes(jsonStr), ext: 'json' };
    }
    if (dst === 'html' || dst === 'htm') return { data: toBytes(ct(rowsToHTMLTable(rows, file.name))), ext: 'html' };
    if (dst === 'txt') return { data: toBytes(ct(rows.map(r => r.join('\t')).join('\n'))), ext: 'txt' };
    if (dst === 'md') {
      const [header, ...body] = rows;
      const md = ['| ' + header.join(' | ') + ' |',
                  '| ' + header.map(() => '---').join(' | ') + ' |',
                  ...body.map(r => '| ' + r.join(' | ') + ' |')].join('\n');
      return { data: toBytes(ct(md)), ext: 'md' };
    }
    if (dst === 'xml') {
      const [header, ...body] = rows;
      const obj = body.map(r => Object.fromEntries(header.map((k, i) => [sanitizeXmlName(k), r[i] ?? ''])));
      return { data: toBytes(ct(jsonToXML({ row: obj }, 'rows'))), ext: 'xml' };
    }
    if (dst === 'pdf') {
      const text = rows.map(r => r.join('\t')).join('\n');
      return { data: await textToPdf(text, compression), ext: 'pdf' };
    }
  }

  if (src === 'json') {
    const text = await file.text();
    const obj = JSON.parse(text);
    if (dst === 'xml') return { data: toBytes(ct(jsonToXML(obj, 'root'))), ext: 'xml' };
    if (dst === 'txt') return { data: toBytes(ct(JSON.stringify(obj, null, 2))), ext: 'txt' };
    if (dst === 'html' || dst === 'htm') return { data: toBytes(ct(textToHTML(JSON.stringify(obj, null, 2), file.name))), ext: 'html' };
    if (dst === 'md') return { data: toBytes('```json\n' + JSON.stringify(obj, null, 2) + '\n```\n'), ext: 'md' };
    if (dst === 'pdf') return { data: await textToPdf(JSON.stringify(obj, null, 2), compression), ext: 'pdf' };
    if (dst === 'csv') return { data: toBytes(ct(jsonToCSV(obj))), ext: 'csv' };
  }

  if (src === 'xml') {
    const text = await file.text();
    if (dst === 'json') return { data: toBytes(ct(JSON.stringify(xmlToJSON(text), null, 2))), ext: 'json' };
    if (dst === 'txt') return { data: toBytes(ct(htmlToText(text))), ext: 'txt' };
    if (dst === 'html' || dst === 'htm') return { data: toBytes(ct(textToHTML(text, file.name))), ext: 'html' };
    if (dst === 'md') return { data: toBytes('```xml\n' + text + '\n```\n'), ext: 'md' };
    if (dst === 'pdf') return { data: await textToPdf(text, compression), ext: 'pdf' };
  }

  if (src === 'html' || src === 'htm') {
    const text = await file.text();
    if (dst === 'txt') return { data: toBytes(ct(htmlToText(text))), ext: 'txt' };
    if (dst === 'md') return { data: toBytes(ct(htmlToMarkdown(text))), ext: 'md' };
    if (dst === 'pdf') return { data: await textToPdf(ct(htmlToText(text)), compression), ext: 'pdf' };
    if (dst === 'json') return { data: toBytes(JSON.stringify({ text: ct(htmlToText(text)) }, null, 2)), ext: 'json' };
  }

  if (src === 'md') {
    const text = await file.text();
    if (dst === 'txt') return { data: toBytes(ct(text)), ext: 'txt' };
    if (dst === 'html' || dst === 'htm') return { data: toBytes(ct(textToHTML(text, file.name))), ext: 'html' };
    if (dst === 'pdf') return { data: await textToPdf(text, compression), ext: 'pdf' };
    if (dst === 'json') return { data: toBytes(JSON.stringify({ markdown: ct(text) }, null, 2)), ext: 'json' };
  }

  if (src === 'txt') {
    const text = await file.text();
    if (dst === 'md') return { data: toBytes(ct(text)), ext: 'md' };
    if (dst === 'html' || dst === 'htm') return { data: toBytes(ct(textToHTML(text, file.name))), ext: 'html' };
    if (dst === 'pdf') return { data: await textToPdf(text, compression), ext: 'pdf' };
    if (dst === 'json') return { data: toBytes(JSON.stringify({ text: ct(text) }, null, 2)), ext: 'json' };
    if (dst === 'xml') return { data: toBytes(ct(jsonToXML({ text }, 'root'))), ext: 'xml' };
    if (dst === 'csv') return { data: toBytes(ct(rowsToCSV(parseCSV(text)))), ext: 'csv' };
  }

  if (src === 'pdf') {
    const pages = await pdfExtractText(file);
    const all = pages.join('\n\n');
    if (dst === 'txt') return { data: toBytes(ct(all)), ext: 'txt' };
    if (dst === 'md') {
      const md = pages.map((p, i) => `## Page ${i + 1}\n\n${p}`).join('\n\n');
      return { data: toBytes(ct(md)), ext: 'md' };
    }
    if (dst === 'html' || dst === 'htm') return { data: toBytes(ct(textToHTML(all, file.name))), ext: 'html' };
    if (dst === 'json') return { data: toBytes(JSON.stringify({ pages }, null, 2)), ext: 'json' };
  }


  if (src === 'docx' || src === 'doc') {
    if (dst === 'txt') {
      const text = await docxExtractText(file);
      return { data: toBytes(text), ext: 'txt' };
    }
    if (dst === 'html' || dst === 'htm') {
      const html = await docxToHtml(file);
      return { data: toBytes(html), ext: 'html' };
    }
    if (dst === 'md') {
      const text = await docxExtractText(file);
      return { data: toBytes(text), ext: 'md' };
    }
    if (dst === 'pdf') {
      const text = await docxExtractText(file);
      return { data: await textToPdf(text), ext: 'pdf' };
    }
    if (dst === 'json') {
      const text = await docxExtractText(file);
      return { data: toBytes(JSON.stringify({ text }, null, 2)), ext: 'json' };
    }
  }

  throw new Error(`Document conversion not supported: ${src.toUpperCase()} → ${dst.toUpperCase()}`);
}

export async function convertDocumentExtended(file, sourceExt, targetExt) {
  const src = sourceExt.toLowerCase();
  const dst = targetExt.toLowerCase();

  // Plain-text-ish source formats: forward to text conversion path
  const plainLike = new Set(['yaml', 'yml', 'toml', 'ini', 'log', 'js', 'ts', 'jsx', 'tsx', 'css', 'rtf']);
  if (plainLike.has(src)) {
    const text = await file.text();
    if (dst === 'txt') return { data: toBytes(text), ext: 'txt' };
    if (dst === 'md') return { data: toBytes('```' + src + '\n' + text + '\n```\n'), ext: 'md' };
    if (dst === 'html' || dst === 'htm') return { data: toBytes(textToHTML(text, file.name)), ext: 'html' };
    if (dst === 'pdf') return { data: await textToPdf(text), ext: 'pdf' };
    if (dst === 'json') return { data: toBytes(JSON.stringify({ content: text, source: src }, null, 2)), ext: 'json' };
  }

  // Delegate to core router
  return convertDocument(file, sourceExt, targetExt);
}

// XML element names must start with a letter and only contain letter/digit/-/_/.
function sanitizeXmlName(name) {
  let s = String(name || 'col').replace(/[^A-Za-z0-9_.-]/g, '_');
  if (!/^[A-Za-z_]/.test(s)) s = '_' + s;
  return s;
}
