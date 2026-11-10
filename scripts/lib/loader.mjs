import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { checkerDefinitions } from './registry.mjs';
import { validateCheckSelection } from './config.mjs';
import { resolveWithin, requireValue } from './utils.mjs';

const require = createRequire(import.meta.url);
const scriptsRoot = fileURLToPath(new URL('../', import.meta.url));

function loadChecker(definition, file, context) {
  context.attempt('checker.load', () => {
    requireValue(fs.statSync(file).isFile(), `Checker không phải file: ${definition.file}`);
    const handler = require(file)[definition.handler];
    requireValue(typeof handler === 'function', `Checker thiếu export ${definition.handler}: ${definition.file}`);
    handler(context);
  });
}

function checkerStep(definition, selected, file, exists) {
  return context => {
    if (!selected || !exists) {
      const reason = selected ? 'không có file' : 'không được chọn';
      context.add('skip', 'checker', `${definition.file}: ${reason}`, { name: definition.name, file: definition.file });
      return;
    }
    loadChecker(definition, file, context);
  };
}

export function planProjectChecks(settings) {
  validateCheckSelection(settings.checks);
  const selected = new Set(settings.checks ?? checkerDefinitions.map(definition => definition.name));
  const sections = new Set();
  const checks = checkerDefinitions.map(definition => {
    const enabled = selected.has(definition.name);
    const file = enabled ? resolveWithin(scriptsRoot, definition.file) : undefined;
    const exists = enabled && fs.lstatSync(file, { throwIfNoEntry: false }) !== undefined;
    if (exists) for (const section of definition.sections) sections.add(section);
    return checkerStep(definition, enabled, file, exists);
  });
  return { checks, sections: [...sections] };
}
