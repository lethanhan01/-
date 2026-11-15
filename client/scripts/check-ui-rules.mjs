import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT_DIR = path.resolve(import.meta.dirname, '..', 'src');
const ALLOWED_GLOBAL_SELECTORS = new Set(['body', '.app-tabular', '.app-main-content']);

const LEGACY_APP_VAR_RE = /--app-(?:border-subtle|bg-canvas|bg-surface|text-muted)\b/g;
const NUMERIC_SHADE_RE = /--mantine-color-[a-z-]+-\d\b/g;
const HEX_COLOR_RE = /#[0-9a-fA-F]{3,8}\b/g;
const CSS_COLOR_FN_RE = /\b(?:rgb|rgba|hsl|hsla)\s*\(/g;
const PHYSICAL_COLOR_WORDS_RE =
  /['"](?:teal|amber|red|gray|blue|indigo|cyan|green|lime|orange|pink|grape|violet|yellow|white|black)['"]/g;
const PHYSICAL_COLOR_OBJ_RE =
  /\bcolor\s*:\s*['"](?:teal|amber|red|gray|blue|indigo|cyan|green|lime|orange|pink|grape|violet|yellow|white|black)['"]/g;
const RAW_HTML_TAG_RE =
  /<(?:div|span|p|h[1-6]|button|a|form|input|select|textarea|ul|ol|li|table|hr|img|svg)\b/g;
const FORBIDDEN_JSX_PROP_RE = /\b(?:bd|bdrs)=|\bstyle=\{\{/g;
const PX_PROP_RE = /\b[a-zA-Z]+=['"][^'"]*\d+px['"]/g;

function walkFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(fullPath));
    } else if (/\.(ts|tsx|css)$/.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

function stripCommentsPreserveLines(content) {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, (match) => match.replace(/[^\n]/g, ' '))
    .replace(
      /(^|[^:])\/\/.*$/gm,
      (match, prefix) => `${prefix}${' '.repeat(match.length - prefix.length)}`
    );
}

function getLineNumber(text, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (text[i] === '\n') {
      line += 1;
    }
  }
  return line;
}

function findJsxOpeningTags(text, tagNames) {
  const results = [];
  const startRe = new RegExp(`<(${tagNames.join('|')})\\b`, 'g');
  let match;

  while ((match = startRe.exec(text)) !== null) {
    const tagName = match[1];
    let i = match.index + match[0].length;
    let braceDepth = 0;
    let quote = null;

    while (i < text.length) {
      const ch = text[i];
      if (quote) {
        if (ch === '\\') {
          i += 2;
          continue;
        }
        if (ch === quote) {
          quote = null;
        }
      } else if (ch === '"' || ch === "'" || ch === '`') {
        quote = ch;
      } else if (ch === '{') {
        braceDepth += 1;
      } else if (ch === '}') {
        braceDepth = Math.max(0, braceDepth - 1);
      } else if (ch === '>' && braceDepth === 0) {
        results.push({
          tagName,
          index: match.index,
          attrs: text.slice(match.index + match[0].length, i),
        });
        break;
      }
      i += 1;
    }
  }

  return results;
}

function extractColorPropValues(attrs) {
  const results = [];
  const propRe = /\b(color|c|bg)\s*=\s*/g;
  let match;
  while ((match = propRe.exec(attrs)) !== null) {
    let i = match.index + match[0].length;
    const ch = attrs[i];
    if (ch === '"' || ch === "'") {
      const end = attrs.indexOf(ch, i + 1);
      if (end !== -1) {
        results.push({ prop: match[1], value: attrs.slice(i, end + 1) });
      }
    } else if (ch === '{') {
      let depth = 1;
      let j = i + 1;
      let quote = null;
      while (j < attrs.length && depth > 0) {
        const c = attrs[j];
        if (quote) {
          if (c === '\\') {
            j += 2;
            continue;
          }
          if (c === quote) {
            quote = null;
          }
        } else if (c === '"' || c === "'" || c === '`') {
          quote = c;
        } else if (c === '{') {
          depth += 1;
        } else if (c === '}') {
          depth -= 1;
        }
        j += 1;
      }
      results.push({ prop: match[1], value: attrs.slice(i, j) });
    }
  }
  return results;
}

function reportMatches(violations, relPath, rawText, cleanText, regex, ruleName) {
  regex.lastIndex = 0;
  let match;
  while ((match = regex.exec(cleanText)) !== null) {
    const line = getLineNumber(rawText, match.index);
    violations.push(`${relPath}:${line} [${ruleName}] -> ${match[0].trim()}`);
  }
}

function checkCssFile(violations, relPath, rawText, cleanText) {
  reportMatches(violations, relPath, rawText, cleanText, LEGACY_APP_VAR_RE, 'no-legacy-app-vars');
  reportMatches(violations, relPath, rawText, cleanText, NUMERIC_SHADE_RE, 'no-numeric-shade-var');
  reportMatches(violations, relPath, rawText, cleanText, HEX_COLOR_RE, 'no-hex-color');
  reportMatches(violations, relPath, rawText, cleanText, CSS_COLOR_FN_RE, 'no-rgb-hsl-fn');

  const lines = cleanText.split('\n');
  lines.forEach((lineText, idx) => {
    const stripped = lineText
      .replace(/\b(?:rem|em)\([^)]*\)/g, '')
      .replace(/\bborder(?:-(?:top|right|bottom|left))?\s*:\s*1px\s+solid\b/g, '');
    if (/\b\d+(?:\.\d+)?px\b/.test(stripped)) {
      violations.push(`${relPath}:${idx + 1} [no-raw-px] -> ${lineText.trim()}`);
    }
  });

  if (relPath === 'styles/global.css') {
    const selectorLines = cleanText.split('\n');
    selectorLines.forEach((lineText, idx) => {
      const trimmed = lineText.trim();
      if (!trimmed || trimmed.startsWith('@') || trimmed === '}' || trimmed.includes(':')) {
        return;
      }
      if (trimmed.endsWith('{') || trimmed.endsWith(',')) {
        const selector = trimmed.replace(/[{,]\s*$/, '').trim();
        if (selector && !ALLOWED_GLOBAL_SELECTORS.has(selector)) {
          violations.push(
            `${relPath}:${idx + 1} [global-css-isolation] -> move "${selector}" into a *.module.css file`
          );
        }
      }
    });
  }
}

function checkTsFile(violations, relPath, rawText, cleanText) {
  const isTheme = relPath === 'theme.ts';
  const isSeedData = relPath === 'data/seedData.ts';
  const isTest = /\.test\.(ts|tsx)$/.test(relPath);

  if (isTheme || isSeedData || isTest) {
    return;
  }

  reportMatches(violations, relPath, rawText, cleanText, LEGACY_APP_VAR_RE, 'no-legacy-app-vars');
  reportMatches(violations, relPath, rawText, cleanText, NUMERIC_SHADE_RE, 'no-numeric-shade-var');
  reportMatches(violations, relPath, rawText, cleanText, HEX_COLOR_RE, 'no-hex-color');
  reportMatches(violations, relPath, rawText, cleanText, CSS_COLOR_FN_RE, 'no-rgb-hsl-fn');
  reportMatches(
    violations,
    relPath,
    rawText,
    cleanText,
    PHYSICAL_COLOR_OBJ_RE,
    'semantic-colors-only'
  );

  if (!relPath.endsWith('.tsx')) {
    return;
  }

  reportMatches(violations, relPath, rawText, cleanText, RAW_HTML_TAG_RE, 'no-raw-html');
  reportMatches(violations, relPath, rawText, cleanText, FORBIDDEN_JSX_PROP_RE, 'no-bd-bdrs-style');
  reportMatches(violations, relPath, rawText, cleanText, PX_PROP_RE, 'no-px-prop');

  for (const tag of findJsxOpeningTags(cleanText, [
    'Box',
    'Paper',
    'Card',
    'Text',
    'Group',
    'Stack',
  ])) {
    if (/\bonClick\s*=/.test(tag.attrs)) {
      const line = getLineNumber(rawText, tag.index);
      violations.push(
        `${relPath}:${line} [no-non-semantic-onclick] -> <${tag.tagName} onClick={...}> is forbidden`
      );
    }
  }

  for (const tag of findJsxOpeningTags(cleanText, ['ActionIcon', 'CloseButton'])) {
    if (!/\baria-label\s*=/.test(tag.attrs)) {
      const line = getLineNumber(rawText, tag.index);
      violations.push(
        `${relPath}:${line} [a11y-aria-label] -> <${tag.tagName}> requires aria-label`
      );
    }
  }

  for (const tag of findJsxOpeningTags(cleanText, ['[A-Z][A-Za-z0-9.]*'])) {
    for (const { prop, value } of extractColorPropValues(tag.attrs)) {
      PHYSICAL_COLOR_WORDS_RE.lastIndex = 0;
      const bad = PHYSICAL_COLOR_WORDS_RE.exec(value);
      if (bad) {
        const line = getLineNumber(rawText, tag.index);
        violations.push(
          `${relPath}:${line} [semantic-colors-only] -> ${prop}=${bad[0]} must use a semantic role`
        );
      }
    }
  }
}

const files = walkFiles(ROOT_DIR);
const violations = [];

for (const filePath of files) {
  const relPath = path.relative(ROOT_DIR, filePath).replaceAll('\\', '/');
  const rawText = fs.readFileSync(filePath, 'utf8');
  const cleanText = stripCommentsPreserveLines(rawText);

  if (relPath.endsWith('.css')) {
    checkCssFile(violations, relPath, rawText, cleanText);
  } else {
    checkTsFile(violations, relPath, rawText, cleanText);
  }
}

if (violations.length > 0) {
  console.error(`UI rule lint failed with ${violations.length} violation(s):\n`);
  for (const v of violations) {
    console.error(`  - ${v}`);
  }
  process.exit(1);
}

console.log(`UI rule lint passed (${files.length} files checked).`);
