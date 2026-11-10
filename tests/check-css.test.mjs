import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { checkCssVariables } from '../scripts/check-css.mjs';
import { checkProject } from '../scripts/check-project.mjs';

function fixture(t) {
  const root = fs.mkdtempSync(path.join(tmpdir(), 'css-standards-test-'));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(root)), path.resolve(tmpdir()));
    assert.ok(path.basename(root).startsWith('css-standards-test-'));
    fs.rmSync(root, { recursive: true, force: true });
  });
  const config = {
    version: 1, project: { name: 'CSS fixture', kind: 'frontend' }, checks: ['css'],
    css: { enabled: true, variablesFile: 'styles/variables.css', roots: ['styles'] }
  };
  const put = (name, content) => {
    const target = path.join(root, name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  };
  put('styles/variables.css', ':root { --color-text: #111; --space: 1rem; --font: Arial, sans-serif; }');
  put('styles/card.css', '.card { color: var(--color-text, #111); padding: var(--space, 1rem); }');
  const save = () => put('project-standards.json', JSON.stringify(config));
  const check = (runner = checkCssVariables) => { save(); return runner({ root }); };
  return { root, config, put, save, check };
}

test('central variables, theme overrides and nested fallbacks pass standalone and aggregate checks', t => {
  const f = fixture(t);
  f.put('styles/variables.css', ':root { --color-text: #111; --space: 1rem; } :root[data-theme="dark"] { --color-text: #eee; }');
  f.put('styles/card.css', '.card { color: var(--color-text, #111); padding: var(--space, var(--space, 1rem)); margin: calc(var(--space, 1rem) * 2); }');
  assert.equal(f.check().status, 'passed');
  assert.equal(f.check(checkProject).status, 'passed');
});

test('each var call must have a nonempty fallback including nested calls', t => {
  const f = fixture(t);
  for (const value of ['var(--color-text)', 'var(--color-text,)', 'var(--color-text, /* empty */)', 'var(--color-text, var(--space))']) {
    f.put('styles/card.css', `.card { color: ${value}; }`);
    assert.equal(f.check().exitCode, 1, value);
  }
});

test('a fallback does not hide a variable missing from the central root definitions', t => {
  const f = fixture(t);
  f.put('styles/card.css', '.card { color: var(--typo, #111); }');
  assert.equal(f.check().exitCode, 1);
});

test('child CSS cannot declare variables or register properties', t => {
  const f = fixture(t);
  for (const css of ['.card { --local: red; }', '@property --local { syntax: "<color>"; inherits: false; initial-value: red; }']) {
    f.put('styles/card.css', css);
    assert.equal(f.check().exitCode, 1);
  }
});

test('hardcoded design values and literals mixed with tokens fail', t => {
  const f = fixture(t);
  for (const css of ['.card { color: #fff; }', '.card { padding: var(--space, 1rem) 2px; }', '.card { margin: calc(var(--space, 1rem) + 2px); }']) {
    f.put('styles/card.css', css);
    assert.equal(f.check().exitCode, 1);
  }
});

test('structural CSS, approved keywords, zero and commas inside fallbacks remain valid', t => {
  const f = fixture(t);
  f.put('styles/card.css', '.card { display: grid; margin: 0 auto; color: currentColor; font-family: var(--font, Arial, sans-serif); }');
  assert.equal(f.check().exitCode, 0);
});

test('comments and quoted var text are not treated as variable calls', t => {
  const f = fixture(t);
  f.put('styles/card.css', '/* var(--unknown) */ .card::after { content: "var(--unknown)"; }');
  assert.equal(f.check().exitCode, 0);
});

test('theme-only tokens, empty defaults and malformed CSS fail', t => {
  const f = fixture(t);
  for (const css of [':root[data-theme="dark"] { --color-text: white; }', ':root { --color-text: ; }', ':root { --color-text: red;']) {
    f.put('styles/variables.css', css);
    assert.equal(f.check().exitCode, 1);
  }
});

test('theme override names require a base token and central aliases require fallbacks', t => {
  const f = fixture(t);
  f.put('styles/variables.css', ':root { --color-text: #111; } :root[data-theme="dark"] { --only-dark: #eee; }');
  assert.equal(f.check().exitCode, 1);
  f.put('styles/variables.css', ':root { --base: #111; --color-text: var(--base); }');
  assert.equal(f.check().exitCode, 1);
});

test('property selection is configurable without relaxing var or declaration rules', t => {
  const f = fixture(t);
  f.config.css.properties = ['color'];
  f.put('styles/card.css', '.card { padding: 2px; color: var(--color-text, #111); }');
  assert.equal(f.check().exitCode, 0);
  f.put('styles/card.css', '.card { padding: var(--space); }');
  assert.equal(f.check().exitCode, 1);
});

test('invalid CSS config, missing files and paths outside the project fail', t => {
  const f = fixture(t);
  f.config.css.roots = [];
  assert.equal(f.check().exitCode, 2);
  f.config.css.roots = ['styles'];
  f.config.css.variablesFile = '../outside.css';
  assert.equal(f.check().exitCode, 1);
  f.config.css.variablesFile = 'styles/missing.css';
  assert.equal(f.check().exitCode, 1);
});

test('absent or disabled CSS is reported as not applicable', t => {
  const f = fixture(t);
  f.config.css = { enabled: false, reason: 'No CSS in this project' };
  assert.ok(f.check().results.some(entry => entry.check === 'css' && entry.status === 'skip'));
  delete f.config.css;
  assert.equal(f.check().exitCode, 0);
});

test('CSS roots deduplicate files and the CLI supports custom configuration and JSON', t => {
  const f = fixture(t);
  f.config.css.roots = ['styles', 'styles/card.css'];
  assert.equal(f.check().results.filter(entry => entry.check === 'css.file').length, 2);
  f.put('custom.json', JSON.stringify(f.config));
  const script = fileURLToPath(new URL('../scripts/check-css.mjs', import.meta.url));
  const result = spawnSync(process.execPath, [script, '--root', f.root, '--config', 'custom.json', '--json'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(JSON.parse(result.stdout).status, 'passed');
});
