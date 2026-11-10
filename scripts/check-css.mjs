#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';
import { runCli } from './lib/cli.mjs';
import { runChecks } from './lib/context.mjs';
import { listFiles, requireValue, resolveWithin } from './lib/utils.mjs';
import { inspectCssValue } from './lib/css-policy.mjs';

function baseToken(declaration) {
  if (declaration.parent.type !== 'rule' || !declaration.parent.selector.split(',').some(selector => selector.trim() === ':root')) return false;
  for (let parent = declaration.parent.parent; parent; parent = parent.parent) {
    if (parent.type === 'atrule' && parent.name.toLowerCase() !== 'layer') return false;
  }
  return true;
}

function tokenNames(tree) {
  const names = new Set();
  tree.walkDecls(declaration => {
    if (declaration.prop.startsWith('--') && baseToken(declaration)) {
      requireValue(/^--[A-Za-z_][A-Za-z0-9_-]*$/.test(declaration.prop), `Tên token không hợp lệ: ${declaration.prop}`);
      requireValue(declaration.value.replace(/\/\*[\s\S]*?\*\//g, '').trim().length > 0, `Token rỗng: ${declaration.prop}`);
      names.add(declaration.prop);
    }
  });
  requireValue(names.size > 0, 'File tổng cần khai báo biến trong :root không phụ thuộc điều kiện.');
  return names;
}

function inspectStylesheet(tree, file, variablesFile, names, context) {
  const central = file === variablesFile;
  const { root, settings, add } = context;
  const name = path.relative(root, file);
  const before = context.results.length;
  tree.walkDecls(declaration => {
    const fail = message => add('fail', 'css.value', `${name}:${declaration.source.start.line}: ${message}`);
    if (declaration.prop.startsWith('--')) {
      if (!central) fail(`Chỉ khai báo ${declaration.prop} trong file biến tổng.`);
      if (!names.has(declaration.prop)) fail(`Token không có giá trị gốc :root: ${declaration.prop}`);
      if (!declaration.value.replace(/\/\*[\s\S]*?\*\//g, '').trim()) fail(`Token rỗng: ${declaration.prop}`);
    }
    inspectCssValue(declaration, names, settings.css, fail, central);
  });
  tree.walkAtRules(rule => {
    if (rule.name.toLowerCase() === 'property' && !central) add('fail', 'css.value', `${name}:${rule.source.start.line}: @property chỉ được đặt trong file tổng.`);
  });
  if (context.results.length === before) add('pass', 'css.file', name);
}

export function checkCss(context) {
  const { root, settings: { css }, add, attempt } = context;
  if (!css || !css.enabled) { add('skip', 'css', css?.reason ?? 'Không khai báo CSS.'); return; }
  attempt('css', () => {
    const variablesFile = resolveWithin(root, css.variablesFile);
    const centralTree = postcss.parse(fs.readFileSync(variablesFile, 'utf8'), { from: variablesFile });
    const names = tokenNames(centralTree);
    const files = new Set([variablesFile]);
    for (const entry of css.roots) {
      for (const file of listFiles(root, resolveWithin(root, entry))) {
        if (path.extname(file).toLowerCase() === '.css') files.add(file);
      }
    }
    for (const file of files) attempt('css.file', () => {
      const tree = file === variablesFile ? centralTree : postcss.parse(fs.readFileSync(file, 'utf8'), { from: file });
      inspectStylesheet(tree, file, variablesFile, names, context);
    });
  });
}

export function checkCssVariables(options = {}) {
  return runChecks(options, [checkCss], ['css']);
}

runCli(import.meta.url, checkCssVariables);
