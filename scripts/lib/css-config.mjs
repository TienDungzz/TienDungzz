import { isObject, isText, relativePath, requireValue, textArray } from './utils.mjs';

export function validateCssConfig(css) {
  if (css === undefined) return;
  requireValue(isObject(css) && typeof css.enabled === 'boolean', 'css.enabled phải là boolean.');
  if (!css.enabled) {
    requireValue(isText(css.reason), 'css tắt cần reason.');
    return;
  }
  relativePath(css.variablesFile, 'css.variablesFile');
  requireValue(css.variablesFile.endsWith('.css'), 'css.variablesFile phải là file .css.');
  textArray(css.roots, 'css.roots', true);
  css.roots.forEach(root => relativePath(root, 'css.roots'));
  if (css.properties !== undefined) textArray(css.properties, 'css.properties');
  if (css.allowedValues !== undefined) textArray(css.allowedValues, 'css.allowedValues');
}
