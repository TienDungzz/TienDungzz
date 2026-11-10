import { isObject, isText, requireValue, textArray, relativePath } from './utils.mjs';
import { checkerDefinitions } from './registry.mjs';
import { validateCssConfig } from './css-config.mjs';

export function validateCheckSelection(checks) {
  if (checks === undefined) return;
  textArray(checks, 'checks');
  requireValue(new Set(checks).size === checks.length, 'checks không được trùng tên.');
  for (const name of checks) {
    requireValue(checkerDefinitions.some(definition => definition.name === name), `Checker không hợp lệ: ${name}`);
  }
}

function validateScope(scope, scopeNames) {
  requireValue(isObject(scope) && isText(scope.name) && typeof scope.enabled === 'boolean', 'Scope cần name và enabled boolean.');
  requireValue(!scopeNames.has(scope.name), `Scope trùng tên: ${scope.name}`);
  scopeNames.add(scope.name);
  if (!scope.enabled) {
    requireValue(isText(scope.reason), `${scope.name}: scope tắt cần reason.`);
    return;
  }
  relativePath(scope.root, `${scope.name}.root`);
  requireValue(Array.isArray(scope.components) && scope.components.length > 0, `${scope.name}: cần components không rỗng.`);
  const names = new Set();
  for (const component of scope.components) {
    requireValue(isObject(component) && isText(component.name) && typeof component.required === 'boolean', `${scope.name}: component cần name và required boolean.`);
    requireValue(!names.has(component.name), `${scope.name}: component trùng ${component.name}`);
    names.add(component.name);
    textArray(component.paths, `${component.name}.paths`, true);
    component.paths.forEach(value => relativePath(value, `${component.name}.paths`));
  }
}

function validateAssetConfig(assets) {
  requireValue(isObject(assets) && typeof assets.enabled === 'boolean', 'assets cần enabled boolean.');
  if (!assets.enabled) {
    requireValue(isText(assets.reason), 'assets tắt cần reason.');
    return;
  }
  textArray(assets.roots, 'assets.roots', true);
  assets.roots.forEach(value => relativePath(value, 'assets.roots'));
  for (const field of ['maxFileBytes', 'maxTotalBytes']) {
    requireValue(Number.isSafeInteger(assets[field]) && assets[field] > 0, `assets.${field}: cần số nguyên byte dương.`);
  }
  textArray(assets.allowedExtensions, 'assets.allowedExtensions', true);
  textArray(assets.forbiddenExtensions, 'assets.forbiddenExtensions');
  for (const extension of [...assets.allowedExtensions, ...assets.forbiddenExtensions]) {
    requireValue(/^\.[a-z0-9]+$/.test(extension), `Extension không hợp lệ (dùng chữ thường): ${extension}`);
  }
}

function validateCodeConfig(code) {
  if (code === undefined) return;
  requireValue(isObject(code), 'code phải là object.');
  const maxFunctionLines = code.maxFunctionLines === undefined ? 60 : code.maxFunctionLines;
  requireValue(Number.isSafeInteger(maxFunctionLines) && maxFunctionLines > 0, 'code.maxFunctionLines: cần số nguyên dương.');
}

function validateDocumentationConfig(documentation) {
  requireValue(isObject(documentation), 'Missing documentation object.');
  for (const field of ['required', 'scan']) {
    textArray(documentation[field], 'documentation.' + field);
    documentation[field].forEach(value => relativePath(value, 'documentation.' + field));
  }
}

function validateStructureConfig(structure) {
  requireValue(Array.isArray(structure), 'structure must be an array.');
  const names = new Set();
  for (const scope of structure) validateScope(scope, names);
}

function validateQualityConfig(quality) {
  requireValue(isObject(quality) && isObject(quality.commands), 'quality.commands must be an object.');
  textArray(quality.required, 'quality.required');
  requireValue(new Set(quality.required).size === quality.required.length, 'Duplicate quality.required names.');
  for (const [name, command] of Object.entries(quality.commands)) {
    requireValue(isText(name) && isText(command), 'Gate names and commands must not be empty.');
  }
}

const validators = {
  documentation: validateDocumentationConfig, structure: validateStructureConfig,
  quality: validateQualityConfig, assets: validateAssetConfig, code: validateCodeConfig,
  css: validateCssConfig
};

export function validateConfig(config, sections = Object.keys(validators)) {
  requireValue(isObject(config) && config.version === 1, 'Only configuration version 1 is supported.');
  requireValue(isObject(config.project) && isText(config.project.name) && isText(config.project.kind), 'project needs name and kind.');
  validateCheckSelection(config.checks);
  for (const section of sections) validators[section](config[section]);
}
