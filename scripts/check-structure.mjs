#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { resolveWithin, requireValue, listFiles } from './lib/utils.mjs';
import { runChecks } from './lib/context.mjs';
import { runCli } from './lib/cli.mjs';

const placeholders = new Set(['.gitkeep', '.keep', 'readme.md']);
function hasImplementation(root, target) {
  return listFiles(root, target).some(file => !placeholders.has(path.basename(file).toLowerCase()) && fs.statSync(file).size > 0);
}

export function checkStructure(context) {
  const { root, settings, scopes, add, attempt } = context;
  const selected = new Set(scopes);
  for (const name of selected) {
    if (!settings.structure.some(scope => scope.name === name)) add('fail', 'structure.selection', `Không có scope: ${name}`);
  }
  if (!settings.structure.length && !selected.size) add('skip', 'structure', 'Không khai báo phạm vi mã nguồn.');
  for (const scope of settings.structure) {
    if (selected.size && !selected.has(scope.name)) continue;
    if (!scope.enabled) { add('skip', 'structure', `${scope.name}: ${scope.reason}`); continue; }
    attempt('structure', () => {
      const scopeRoot = resolveWithin(root, scope.root);
      requireValue(fs.existsSync(scopeRoot) && fs.statSync(scopeRoot).isDirectory(), `${scope.name}: thiếu thư mục ${scope.root}`);
      for (const component of scope.components) attempt('structure', () => {
        const targets = component.paths.map(entry => resolveWithin(scopeRoot, entry));
        const existing = targets.filter(target => fs.existsSync(target));
        if (!existing.length && !component.required) {
          add('skip', 'structure', `${scope.name}/${component.name}: không sử dụng`);
          return;
        }
        requireValue(existing.length > 0 && existing.some(target => hasImplementation(root, target)), `${scope.name}/${component.name}: thiếu triển khai (${component.paths.join(' hoặc ')})`);
        add('pass', 'structure', `${scope.name}/${component.name}`);
      });
    });
  }
}


export function checkProjectStructure(options = {}) {
  return runChecks(options, [checkStructure], ["structure"]);
}

runCli(import.meta.url, checkProjectStructure, { scope: true });
