import valueParser from 'postcss-value-parser';

export const tokenProperties = [
  'color', 'background-color', 'border-color', 'border-top-color', 'border-right-color',
  'border-bottom-color', 'border-left-color', 'outline-color', 'fill', 'stroke',
  'box-shadow', 'text-shadow', 'font-family', 'font-size', 'font-weight', 'line-height',
  'letter-spacing', 'border-radius', 'margin', 'margin-top', 'margin-right',
  'margin-bottom', 'margin-left', 'margin-inline', 'margin-block', 'padding',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'padding-inline',
  'padding-block', 'margin-inline-start', 'margin-inline-end', 'margin-block-start',
  'margin-block-end', 'padding-inline-start', 'padding-inline-end', 'padding-block-start',
  'padding-block-end', 'gap', 'row-gap', 'column-gap'
];
export const allowedValues = [
  'inherit', 'initial', 'unset', 'revert', 'revert-layer', 'transparent', 'currentcolor',
  'none', 'auto', 'normal', '0'
];
const meaningful = nodes => nodes.filter(node => !['space', 'comment'].includes(node.type));

function inspectVariable(node, names, fail) {
  const comma = node.nodes.findIndex(child => child.type === 'div' && child.value === ',');
  const argument = meaningful(comma < 0 ? node.nodes : node.nodes.slice(0, comma));
  const name = argument[0]?.value;
  if (argument.length !== 1 || argument[0].type !== 'word' || !/^--[A-Za-z_][A-Za-z0-9_-]*$/.test(name)) {
    fail('var() cần một tên biến CSS ASCII hợp lệ.');
    return;
  }
  if (!names.has(name)) fail(`Biến chưa có giá trị gốc trong file tổng: ${name}`);
  if (comma < 0 || !meaningful(node.nodes.slice(comma + 1)).length) fail(`Thiếu giá trị default: var(${name}, fallback)`);
}

function tokenExpression(nodes, keywords, math = false) {
  return nodes.every(node => {
    if (['space', 'comment'].includes(node.type)) return true;
    if (node.type === 'function') {
      if (node.value.toLowerCase() === 'var') return true;
      return ['calc', 'min', 'max', 'clamp'].includes(node.value.toLowerCase()) && tokenExpression(node.nodes, keywords, true);
    }
    if (node.type === 'div') return node.value === ',' || (math && node.value === '/');
    if (node.type !== 'word') return false;
    if (keywords.has(node.value.toLowerCase())) return true;
    return math && /^(?:[+*-]|[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)$/i.test(node.value);
  });
}

export function inspectCssValue(declaration, names, policy, fail, central) {
  const parsed = valueParser(declaration.value);
  let hasVariable = false;
  parsed.walk(node => {
    if (node.unclosed) fail('Giá trị CSS có function/string chưa đóng.');
    if (node.type === 'function' && node.value.toLowerCase() === 'var') {
      hasVariable = true;
      inspectVariable(node, names, fail);
    }
  });
  const keywords = new Set((policy.allowedValues ?? allowedValues).map(value => value.toLowerCase()));
  const properties = (policy.properties ?? tokenProperties).map(property => property.toLowerCase());
  if (central || declaration.prop.startsWith('--') || !properties.includes(declaration.prop.toLowerCase())) return;
  if (keywords.has(declaration.value.trim().toLowerCase())) return;
  const keywordsOnly = meaningful(parsed.nodes).every(node => node.type === 'word' && keywords.has(node.value.toLowerCase()));
  if ((!hasVariable && !keywordsOnly) || !tokenExpression(parsed.nodes, keywords)) fail(`${declaration.prop}: cần dùng var() thay cho design value viết trực tiếp.`);
}
