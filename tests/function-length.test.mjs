import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { Linter } from 'eslint';
import projectConfig, { createCodeRules } from '../eslint.config.mjs';

const ruleName = 'max-lines-per-function';

function functionSource(lines, opening = 'function handler() {', closing = '}') {
  const body = Array.from({ length: lines - 2 }, (_, index) => {
    if (index % 3 === 0) return '';
    return index % 3 === 1 ? '  // The line budget includes comments.' : '  void 0;';
  });
  return [opening, ...body, closing].join('\n');
}

function lint(source, config = projectConfig) {
  return new Linter().verify(source, config, { filename: 'tests/fixture.mjs' });
}

function withLimit(maxFunctionLines) {
  return projectConfig.map((entry) => entry.rules
    ? { ...entry, rules: createCodeRules({ maxFunctionLines }) }
    : entry);
}

test('the project lint configuration enforces its exact inclusive function line budget', () => {
  const configuredRule = projectConfig.find((entry) => entry.rules?.[ruleName]).rules[ruleName];
  const limit = configuredRule[1].max;
  assert.deepEqual(lint(functionSource(limit)), []);
  const errors = lint(functionSource(limit + 1));
  assert.equal(errors.length, 1);
  assert.equal(errors[0].ruleId, ruleName);
  assert.equal(errors[0].severity, 2);
});

test('the shared rule builder defaults to 60 and accepts a project-specific line limit', () => {
  assert.equal(createCodeRules()[ruleName][1].max, 60);
  const adjustedConfig = withLimit(80);
  assert.deepEqual(lint(functionSource(80), adjustedConfig), []);
  assert.equal(lint(functionSource(81), adjustedConfig)[0].ruleId, ruleName);
});

test('the lint configuration consumes the custom config selected by the checker', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'function-length-test-'));
  t.after(() => {
    assert.equal(dirname(resolve(root)), resolve(tmpdir()));
    assert.ok(basename(root).startsWith('function-length-test-'));
    rmSync(root, { recursive: true, force: true });
  });
  const selectedConfig = join(root, 'custom.json');
  writeFileSync(selectedConfig, JSON.stringify({ code: { maxFunctionLines: 80 } }));
  const source = `
    import { Linter } from 'eslint';
    const { default: config } = await import(process.argv[1]);
    const rule = config.find(entry => entry.rules?.['max-lines-per-function']).rules['max-lines-per-function'];
    const linter = new Linter();
    const atLimit = linter.verify(${JSON.stringify(functionSource(80))}, config, { filename: 'tests/fixture.mjs' });
    const tooLong = linter.verify(${JSON.stringify(functionSource(81))}, config, { filename: 'tests/fixture.mjs' });
    console.log(JSON.stringify({ max: rule[1].max, atLimit, tooLong: tooLong.map(entry => entry.ruleId) }));
  `;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', source, new URL('../eslint.config.mjs', import.meta.url).href], {
    cwd: fileURLToPath(new URL('..', import.meta.url)), encoding: 'utf8',
    env: { ...process.env, PROJECT_STANDARDS_CONFIG: selectedConfig },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.deepEqual(JSON.parse(result.stdout), { max: 80, atLimit: [], tooLong: [ruleName] });
});

test('the shared rule builder rejects malformed project limits', () => {
  for (const settings of [null, [], '60', { maxFunctionLines: 0 }, { maxFunctionLines: 1.5 }]) {
    assert.throws(() => createCodeRules(settings));
  }
});

test('project lint covers arrow functions, methods, async handlers, callbacks and IIFEs', () => {
  const variants = [
    functionSource(61, 'const handler = () => {', '};'),
    `class Controller {\n${functionSource(61, '  handle() {', '  }')}\n}`,
    functionSource(61, 'async function handler() {'),
    functionSource(61, 'setTimeout(() => {', '});'),
    functionSource(61, '(() => {', '})();'),
  ];
  for (const source of variants) {
    const errors = lint(source, withLimit(60));
    assert.ok(errors.some((entry) => entry.ruleId === ruleName), JSON.stringify(errors));
    assert.equal(errors.some((entry) => entry.fatal), false);
  }
});

test('nested function lines count toward their enclosing handler', () => {
  const source = functionSource(61).replace('  void 0;', '  function child() { return 1; }');
  const errors = lint(source, withLimit(60));
  assert.equal(errors.length, 1);
  assert.equal(errors[0].ruleId, ruleName);
  assert.match(errors[0].message, /handler/);
});

test('inline ESLint directives cannot disable the required function line gate', () => {
  const source = `/* eslint-disable ${ruleName} */\n${functionSource(61)}`;
  assert.ok(lint(source, withLimit(60)).some((entry) => entry.ruleId === ruleName));
});
