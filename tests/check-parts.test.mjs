import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { checkDocs } from '../scripts/check-docs.mjs';
import { checkProjectStructure } from '../scripts/check-structure.mjs';
import { checkRuntimeAssets } from '../scripts/check-assets.mjs';
import { checkQualityGates } from '../scripts/check-quality.mjs';
import { checkConfiguration } from '../scripts/check-config.mjs';
import { checkProject } from '../scripts/check-project.mjs';
import { checkerDefinitions } from '../scripts/lib/registry.mjs';

function fixture(t, sections = {}) {
  const root = fs.mkdtempSync(path.join(tmpdir(), 'check-parts-test-'));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(root)), path.resolve(tmpdir()));
    assert.ok(path.basename(root).startsWith('check-parts-test-'));
    fs.rmSync(root, { recursive: true, force: true });
  });
  const config = { version: 1, project: { name: 'Parts fixture', kind: 'custom' }, ...sections };
  const put = (name, content) => {
    const target = path.join(root, name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  };
  const save = () => put('project-standards.json', JSON.stringify(config));
  const check = (runner, options = {}) => { save(); return runner({ root, ...options }); };
  const cli = (entry, args = []) => {
    save();
    const script = fileURLToPath(new URL(`../scripts/${entry}.mjs`, import.meta.url));
    const child = spawnSync(process.execPath, [script, '--root', root, '--json', ...args], { encoding: 'utf8' });
    assert.equal(child.error, undefined);
    return { exitCode: child.status, report: JSON.parse(child.stdout) };
  };
  return { root, config, put, check, cli };
}

function isolatedChecker(f, files = {}) {
  const scriptsRoot = fileURLToPath(new URL('../scripts/', import.meta.url));
  f.put('scripts/check-project.mjs', fs.readFileSync(path.join(scriptsRoot, 'check-project.mjs')));
  for (const name of fs.readdirSync(path.join(scriptsRoot, 'lib'))) {
    if (name.endsWith('.mjs')) f.put(`scripts/lib/${name}`, fs.readFileSync(path.join(scriptsRoot, 'lib', name)));
  }
  for (const [name, content] of Object.entries(files)) {
    f.put(`scripts/${name}`, content ?? fs.readFileSync(path.join(scriptsRoot, name)));
  }
  return () => {
    f.put('project-standards.json', JSON.stringify(f.config));
    const child = spawnSync(process.execPath, [path.join(f.root, 'scripts/check-project.mjs'), '--root', f.root, '--json'], { encoding: 'utf8' });
    return { exitCode: child.status, report: JSON.parse(child.stdout) };
  };
}

test('selected checker files run when present and missing files are explicitly skipped', t => {
  const f = fixture(t, {
    checks: ['docs', 'quality'], documentation: { required: ['guide.md'], scan: ['guide.md'] }
  });
  f.put('guide.md', '# Guide\n');
  const run = isolatedChecker(f, { 'check-docs.mjs': null });
  const result = run();
  assert.equal(result.exitCode, 0);
  assert.ok(result.report.results.some(entry => entry.check === 'docs.required' && entry.status === 'pass'));
  assert.ok(result.report.results.some(entry => entry.check === 'checker' && entry.name === 'quality' && entry.status === 'skip'));
  f.put('guide.md', '[missing](missing.md)\n');
  assert.equal(run().exitCode, 1);
});

test('missing checker files are skipped with the default selection too', t => {
  const f = fixture(t, { documentation: { required: [], scan: [] } });
  const result = isolatedChecker(f, { 'check-docs.mjs': null })();
  assert.equal(result.exitCode, 0);
  assert.equal(result.report.results.filter(entry => entry.check === 'checker' && entry.status === 'skip').length, checkerDefinitions.length - 1);
});

test('unselected checker files are never loaded and unrelated config is not required', t => {
  const f = fixture(t, { checks: ['structure'], structure: [], documentation: 'invalid' });
  const result = isolatedChecker(f, {
    'check-docs.mjs': 'throw new Error("Must not be loaded");\n', 'check-structure.mjs': null
  })();
  assert.equal(result.exitCode, 0);
  assert.ok(result.report.results.some(entry => entry.check === 'structure'));
  assert.equal(result.report.results.some(entry => entry.status === 'fail'), false);
});

test('a present checker with a missing dependency fails instead of being skipped', t => {
  const f = fixture(t, { checks: ['docs', 'structure'], documentation: { required: [], scan: [] }, structure: [] });
  const result = isolatedChecker(f, {
    'check-docs.mjs': "import './missing-dependency.mjs';\nexport function checkDocumentation() {}\n",
    'check-structure.mjs': null
  })();
  assert.equal(result.exitCode, 1);
  assert.ok(result.report.results.some(entry => entry.check === 'checker.load' && entry.status === 'fail'));
  assert.ok(result.report.results.some(entry => entry.check === 'structure'));
});

test('present checker files with syntax errors or missing handlers fail', t => {
  for (const source of ['export function broken( {', 'export const differentHandler = true;']) {
    const f = fixture(t, { checks: ['docs'], documentation: { required: [], scan: [] } });
    const result = isolatedChecker(f, { 'check-docs.mjs': source })();
    assert.equal(result.exitCode, 1);
    assert.ok(result.report.results.some(entry => entry.check === 'checker.load' && entry.status === 'fail'));
  }
});

test('checker selections reject unknown names, duplicates and invalid types', t => {
  for (const checks of [['unknown'], ['docs', 'docs'], 'docs', null, ['../check-docs.mjs']]) {
    const f = fixture(t, { checks });
    assert.equal(f.check(checkProject).exitCode, 2);
  }
});

test('an explicitly empty selection skips all checker files', t => {
  const f = fixture(t, { checks: [] });
  const result = f.check(checkProject);
  assert.equal(result.exitCode, 0);
  assert.equal(result.results.length, checkerDefinitions.length);
  assert.ok(result.results.every(entry => entry.check === 'checker' && entry.status === 'skip'));
});

test('documentation checker runs independently of unrelated missing or invalid sections', t => {
  const f = fixture(t, { documentation: { required: ['docs/README.md'], scan: ['docs'] }, assets: 'invalid' });
  f.put('docs/README.md', '# Docs\n');
  assert.equal(f.check(checkDocs).status, 'passed');
  assert.equal(f.cli('check-docs').exitCode, 0);
  assert.equal(f.check(checkConfiguration).exitCode, 2);
  f.put('docs/README.md', '[broken](missing.md)\n');
  assert.equal(f.cli('check-docs').exitCode, 1);
});

test('structure checker selects scopes without checking unrelated source trees', t => {
  const component = { name: 'entry', paths: ['index.ts'], required: true };
  const f = fixture(t, { structure: [
    { name: 'frontend', enabled: true, root: 'web', components: [component] },
    { name: 'backend', enabled: true, root: 'api', components: [component] }
  ] });
  f.put('web/index.ts', 'export const app = {};\n');
  assert.equal(f.check(checkProjectStructure, { scopes: ['frontend'] }).status, 'passed');
  assert.equal(f.cli('check-structure', ['--scope', 'frontend']).exitCode, 0);
  assert.equal(f.cli('check-structure', ['--scope', 'frontend', '--scope', 'backend']).exitCode, 1);
  assert.equal(f.check(checkProjectStructure, { scopes: ['unknown'] }).exitCode, 1);
});

test('empty structure is explicitly not applicable and never invents a selected scope', t => {
  const f = fixture(t, { structure: [] });
  const report = f.check(checkProjectStructure);
  assert.ok(report.results.some(result => result.status === 'skip' && result.check === 'structure'));
  assert.equal(f.cli('check-structure', ['--scope', 'backend']).exitCode, 1);
});

test('asset checker enforces its budget without needing documentation or quality configuration', t => {
  const f = fixture(t, { assets: {
    enabled: true, roots: ['models'], maxFileBytes: 120, maxTotalBytes: 200,
    allowedExtensions: ['.gltf'], forbiddenExtensions: []
  } });
  f.put('models/model.gltf', JSON.stringify({ asset: { version: '2.0' } }));
  assert.equal(f.check(checkRuntimeAssets).status, 'passed');
  assert.equal(f.cli('check-assets').exitCode, 0);
  f.config.assets.maxFileBytes = 1;
  assert.equal(f.cli('check-assets').exitCode, 1);
});

test('quality checker only executes selected gates and reports unknown selections', t => {
  const f = fixture(t, { quality: { required: ['lint', 'test'], commands: {
    lint: 'node pass.cjs', test: 'node fail.cjs'
  } } });
  f.put('pass.cjs', "require('node:fs').writeFileSync('ran.txt', 'yes');\n");
  f.put('fail.cjs', 'process.exitCode = 7;\n');
  const passed = f.check(checkQualityGates, { gates: ['lint'], run: true });
  assert.equal(passed.status, 'passed');
  assert.equal(passed.results.filter(result => result.executed).length, 1);
  assert.ok(fs.existsSync(path.join(f.root, 'ran.txt')));
  assert.equal(f.cli('check-quality', ['--gate', 'test', '--run']).exitCode, 1);
  assert.equal(f.cli('check-quality', ['--gate', 'unknown', '--run']).exitCode, 1);
});

test('quality checker preserves dry-run behavior and supports repeated gate flags', t => {
  const f = fixture(t, { quality: { required: ['first', 'second'], commands: {
    first: 'node pass.cjs', second: 'node pass.cjs'
  } } });
  f.put('pass.cjs', 'process.exitCode = 0;\n');
  assert.equal(f.check(checkQualityGates).status, 'incomplete');
  const result = f.cli('check-quality', ['--gate', 'first', '--gate', 'second', '--run']);
  assert.equal(result.report.status, 'passed');
  assert.equal(result.report.results.filter(entry => entry.executed).length, 2);
});

test('a selected required gate still fails if its command is missing', t => {
  const f = fixture(t, { quality: { required: ['security-tests'], commands: {} } });
  const result = f.check(checkQualityGates, { gates: ['security-tests'], run: true });
  assert.equal(result.exitCode, 1);
  assert.ok(result.results.some(entry => entry.check === 'quality.required' && entry.status === 'fail'));
});

test('part CLIs honor custom config paths and reject flags belonging to another checker', t => {
  const f = fixture(t);
  f.put('custom.json', JSON.stringify({ ...f.config, documentation: { required: [], scan: [] } }));
  assert.equal(f.cli('check-docs', ['--config', 'custom.json']).exitCode, 0);
  assert.equal(f.cli('check-docs', ['--gate', 'lint']).exitCode, 2);
  assert.equal(f.cli('check-quality', ['--scope', 'backend']).exitCode, 2);
});

test('configuration CLI checks the entire profile without running quality commands', t => {
  const f = fixture(t, {
    documentation: { required: [], scan: [] }, structure: [],
    assets: { enabled: false, reason: 'No assets' },
    quality: { required: ['test'], commands: { test: 'node should-not-run.cjs' } }
  });
  assert.equal(f.cli('check-config').report.status, 'passed');
  f.config.code = { maxFunctionLines: 0 };
  assert.equal(f.cli('check-config').exitCode, 2);
});

test('aggregate checker continues through independent modules after a structure failure', t => {
  const f = fixture(t, {
    documentation: { required: ['docs/README.md'], scan: ['docs'] },
    structure: [{ name: 'backend', enabled: true, root: 'missing', components: [
      { name: 'controller', paths: ['controller.ts'], required: true }
    ] }],
    assets: { enabled: false, reason: 'No assets' },
    quality: { required: ['test'], commands: { test: 'node pass.cjs' } }
  });
  f.put('docs/README.md', '# Docs\n');
  f.put('pass.cjs', 'process.exitCode = 0;\n');
  const report = f.check(checkProject, { run: true });
  assert.equal(report.status, 'failed');
  for (const check of ['docs.required', 'docs.links', 'structure', 'assets', 'quality.command']) {
    assert.ok(report.results.some(result => result.check === check), `Missing module result: ${check}`);
  }
  assert.ok(report.results.some(result => result.check === 'quality.command' && result.executed && result.status === 'pass'));
});
