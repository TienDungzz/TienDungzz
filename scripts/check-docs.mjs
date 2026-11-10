#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { resolveWithin, requireValue, listFiles } from './lib/utils.mjs';
import { runChecks } from './lib/context.mjs';
import { runCli } from './lib/cli.mjs';

function markdownTargets(source) {
  // File existence only: inline links/images and reference definitions; no anchors or MDX parsing.
  const cleaned = source.replace(/^[ \t]*(`{3,}|~{3,})[^\n]*\n[\s\S]*?^[ \t]*\1[^\n]*$/gm, '').replace(/`+[^`\n]*`+/g, '');
  const inline = [];
  for (const match of cleaned.matchAll(/!?\[[^\]\n]*\]\([ \t]*/g)) {
    let index = match.index + match[0].length;
    if (cleaned[index] === '<') {
      const end = cleaned.indexOf('>', index + 1);
      if (end !== -1 && !cleaned.slice(index, end).includes('\n')) inline.push(cleaned.slice(index + 1, end));
      continue;
    }
    let destination = '';
    let depth = 0;
    for (; index < cleaned.length; index++) {
      const character = cleaned[index];
      if (/\s/.test(character)) break;
      if (character === '\\' && /[()\\]/.test(cleaned[index + 1] || '')) {
        destination += cleaned[++index];
        continue;
      }
      if (character === ')' && depth === 0) break;
      if (character === '(') depth++;
      if (character === ')') depth--;
      destination += character;
    }
    if (destination && depth === 0) inline.push(destination);
  }
  const references = [...cleaned.matchAll(/^[ \t]{0,3}\[[^\]\n]+\]:\s*(?:<([^>]+)>|([^\s]+))/gm)].map(match => match[1] || match[2]);
  return [...inline, ...references];
}

function checkMarkdownFile(file, context) {
  const { root, results, add, attempt } = context;
  const name = path.relative(root, file);
  const before = results.length;
  for (const target of markdownTargets(fs.readFileSync(file, 'utf8'))) {
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(target)) continue;
    attempt('docs.links', () => {
      const local = decodeURIComponent(target.split(/[?#]/)[0]);
      if (!local) return;
      const destination = resolveWithin(root, path.relative(root, path.resolve(path.dirname(file), local)));
      requireValue(fs.existsSync(destination), `${name}: liên kết hỏng ${target}`);
    });
  }
  if (!results.slice(before).some(result => result.status === 'fail')) add('pass', 'docs.links', `Đã đọc liên kết: ${name}`);
}

export function checkDocumentation(context) {
  const { root, settings, add, attempt } = context;
  for (const required of settings.documentation.required) attempt('docs.required', () => {
    const file = resolveWithin(root, required);
    requireValue(fs.existsSync(file) && fs.statSync(file).isFile() && fs.statSync(file).size > 0, `Thiếu tài liệu hoặc file rỗng: ${required}`);
    add('pass', 'docs.required', required);
  });
  const markdownFiles = new Set();
  for (const entry of settings.documentation.scan) attempt('docs.scan', () => {
    for (const file of listFiles(root, resolveWithin(root, entry))) {
      if (path.extname(file).toLowerCase() === '.md') markdownFiles.add(file);
    }
  });
  for (const file of markdownFiles) attempt('docs.links', () => checkMarkdownFile(file, context));
}


export function checkDocs(options = {}) {
  return runChecks(options, [checkDocumentation], ["documentation"]);
}

runCli(import.meta.url, checkDocs);
