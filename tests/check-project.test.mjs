import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { checkProject } from '../scripts/check-project.mjs';

const cliPath = fileURLToPath(new URL('../scripts/check-project.mjs', import.meta.url));

function fixture(t, changes = {}) {
  const root = mkdtempSync(join(tmpdir(), 'project-standards-test-'));
  t.after(() => {
    assert.equal(dirname(resolve(root)), resolve(tmpdir()));
    assert.ok(basename(root).startsWith('project-standards-test-'));
    rmSync(root, { recursive: true, force: true });
  });
  const config = {
    version: 1,
    project: { name: 'Fixture', kind: 'documentation' },
    documentation: { required: ['README.md'], scan: ['README.md'] },
    structure: [],
    quality: { required: [], commands: {} },
    assets: { enabled: false, reason: 'No runtime assets in this fixture.' },
    ...changes,
  };
  const put = (path, contents) => {
    const target = join(root, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, contents);
  };
  put('README.md', '# Fixture\n');
  const check = (options = {}) => {
    put('project-standards.json', JSON.stringify(config, null, 2));
    return checkProject({ root, ...options });
  };
  return { root, config, put, check };
}

function assertFailure(result) {
  assert.notEqual(result.exitCode, 0, JSON.stringify(result));
  assert.ok(result.results.some((entry) => entry.status === 'fail'), JSON.stringify(result));
}

function assetRules(overrides = {}) {
  return {
    enabled: true,
    roots: ['public/models'],
    maxFileBytes: 1024 * 1024,
    maxTotalBytes: 2 * 1024 * 1024,
    allowedExtensions: ['.glb', '.gltf', '.bin', '.png', '.jpg', '.webp', '.ktx2'],
    forbiddenExtensions: ['.blend', '.fbx', '.obj'],
    ...overrides,
  };
}

function glb(json = { asset: { version: '2.0' } }) {
  const source = Buffer.from(typeof json === 'string' ? json : JSON.stringify(json));
  const padded = Buffer.alloc(Math.ceil(source.length / 4) * 4, 0x20);
  source.copy(padded);
  const header = Buffer.alloc(20);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(header.length + padded.length, 8);
  header.writeUInt32LE(padded.length, 12);
  header.writeUInt32LE(0x4e4f534a, 16);
  return Buffer.concat([header, padded]);
}

test('documentation-only project passes when every applicable check completes', (t) => {
  const f = fixture(t);
  const result = f.check();
  assert.equal(result.status, 'passed');
  assert.equal(result.exitCode, 0);
});

test('required documentation cannot be absent', (t) => {
  const f = fixture(t);
  f.config.documentation.required.push('docs/missing.md');
  assertFailure(f.check());
});

test('local Markdown links are checked while examples inside fenced code are ignored', (t) => {
  const f = fixture(t);
  f.put('README.md', '# Fixture\n\n```md\n[example](missing-example.md)\n```\n\n[guide](docs/guide.md)\n');
  f.put('docs/guide.md', '# Guide\n');
  assert.equal(f.check().exitCode, 0);
  f.put('README.md', '[broken](docs/missing.md)\n');
  assertFailure(f.check());
});

test('documentation scan includes nested Markdown files', (t) => {
  const f = fixture(t);
  f.config.documentation.scan.push('docs');
  f.put('docs/nested/guide.md', '[broken](missing.md)\n');
  assertFailure(f.check());
});

test('Markdown links preserve balanced parentheses and reference destinations', (t) => {
  const f = fixture(t);
  f.put('guide(v2).md', '# Guide version 2\n');
  f.put('README.md', '[guide](guide(v2).md)\n\n[reference][guide]\n\n[guide]: guide(v2).md "Guide"\n');
  assert.equal(f.check().exitCode, 0);
  f.put('README.md', '[reference][missing]\n\n[missing]: missing(v2).md\n');
  assertFailure(f.check());
});

test('a broken-link file is not also reported as passing docs.links', (t) => {
  const f = fixture(t);
  f.config.documentation.scan.push('docs');
  f.put('docs/guide.md', '# Guide\n');
  f.put('README.md', '[guide](docs/guide.md)\n[broken](missing.md)\n');
  const result = f.check();
  assertFailure(result);
  const links = result.results.filter((entry) => entry.check === 'docs.links');
  assert.ok(links.some((entry) => entry.status === 'fail' && entry.message.includes('README.md')));
  assert.equal(links.some((entry) => entry.status === 'pass' && entry.message.includes('README.md')), false);
  assert.ok(links.some((entry) => entry.status === 'pass' && entry.message.includes('guide.md')));
});

test('component paths support alternatives and framework file mappings', (t) => {
  const f = fixture(t, {
    structure: [{
      name: 'backend', enabled: true, root: 'src',
      components: [{ name: 'controllers', paths: ['controllers', 'orders.controller.ts'], required: true }],
    }],
  });
  f.put('src/orders.controller.ts', 'export class OrdersController {}\n');
  assert.equal(f.check().exitCode, 0);
});

test('required components need implementation beyond README and .gitkeep', (t) => {
  const f = fixture(t, {
    structure: [{
      name: 'backend', enabled: true, root: 'src',
      components: [{ name: 'controllers', paths: ['controllers'], required: true }],
    }],
  });
  f.put('src/controllers/README.md', '# Placeholder\n');
  f.put('src/controllers/.gitkeep', '');
  assertFailure(f.check());
  f.put('src/controllers/orders.ts', 'export const listOrders = () => [];\n');
  assert.equal(f.check().exitCode, 0);
});

test('optional absent components do not fail the project', (t) => {
  const f = fixture(t, {
    structure: [{
      name: 'backend', enabled: true, root: 'src',
      components: [{ name: 'jobs', paths: ['jobs'], required: false }],
    }],
  });
  f.put('src/app.ts', 'export const app = {};\n');
  assert.equal(f.check().exitCode, 0);
});

test('disabled scopes require a documented reason', (t) => {
  const f = fixture(t, { structure: [{ name: 'backend', enabled: false }] });
  assertFailure(f.check());
  f.config.structure[0].reason = 'Static site without a server.';
  assert.equal(f.check().exitCode, 0);
});

test('component paths and scope roots cannot escape their allowed roots', (t) => {
  const f = fixture(t, {
    structure: [{
      name: 'backend', enabled: true, root: 'src',
      components: [{ name: 'controller', paths: ['../outside.ts'], required: true }],
    }],
  });
  f.put('src/app.ts', 'export const app = {};\n');
  f.put('outside.ts', 'export const outside = true;\n');
  assertFailure(f.check());
  f.config.structure[0].root = '..';
  f.config.structure[0].components[0].paths = ['README.md'];
  assertFailure(f.check());
});

test('disabled runtime assets require a documented reason', (t) => {
  const f = fixture(t, { assets: { enabled: false } });
  const result = f.check();
  assertFailure(result);
  assert.equal(result.exitCode, 2);
  f.config.assets.reason = 'Source models are retained only under art/.';
  assert.equal(f.check().exitCode, 0);
});

test('a required quality gate must define a real command', (t) => {
  const f = fixture(t, { quality: { required: ['lint'], commands: {} } });
  assertFailure(f.check());
});

test('default mode does not execute quality commands and reports incomplete', (t) => {
  const f = fixture(t, { quality: { required: ['test'], commands: { test: 'node gate.cjs' } } });
  f.put('gate.cjs', "require('node:fs').writeFileSync('ran.txt', 'yes');\n");
  const result = f.check();
  assert.equal(result.status, 'incomplete');
  assert.equal(result.exitCode, 0);
  assert.ok(result.results.some((entry) => entry.check === 'quality.command' && entry.executed === false));
  assert.equal(existsSync(join(f.root, 'ran.txt')), false);
});

test('--run captures a failing gate and continues through remaining gates', (t) => {
  const f = fixture(t, {
    quality: { required: ['lint', 'test'], commands: { lint: 'node fail.cjs', test: 'node pass.cjs' } },
  });
  f.put('fail.cjs', 'process.exitCode = 7;\n');
  f.put('pass.cjs', "require('node:fs').writeFileSync('second-gate.txt', 'ran');\n");
  assertFailure(f.check({ run: true }));
  assert.equal(readFileSync(join(f.root, 'second-gate.txt'), 'utf8'), 'ran');
});

test('--run succeeds when the required command succeeds', (t) => {
  const f = fixture(t, { quality: { required: ['test'], commands: { test: 'node pass.cjs' } } });
  f.put('pass.cjs', 'process.exitCode = 0;\n');
  assert.equal(f.check({ run: true }).exitCode, 0);
});

test('quality commands receive the absolute path of the selected custom configuration', (t) => {
  const f = fixture(t);
  const custom = {
    ...f.config,
    quality: { required: ['capture'], commands: { capture: 'node capture-config.cjs' } },
  };
  f.put('custom.json', JSON.stringify(custom));
  f.put('capture-config.cjs', "require('node:fs').writeFileSync('selected-config.txt', process.env.PROJECT_STANDARDS_CONFIG);\n");
  const inheritedConfig = process.env.PROJECT_STANDARDS_CONFIG;
  const result = f.check({ config: 'custom.json', run: true });
  assert.equal(result.exitCode, 0);
  assert.equal(readFileSync(join(f.root, 'selected-config.txt'), 'utf8'), join(f.root, 'custom.json'));
  assert.equal(process.env.PROJECT_STANDARDS_CONFIG, inheritedConfig);
});

test('runtime asset per-file and aggregate size budgets are enforced', (t) => {
  const bytes = glb();
  const f = fixture(t, { assets: assetRules({ maxFileBytes: bytes.length - 1 }) });
  f.put('public/models/first.glb', bytes);
  assertFailure(f.check());
  f.config.assets.maxFileBytes = bytes.length;
  f.config.assets.maxTotalBytes = bytes.length * 2 - 1;
  f.put('public/models/second.glb', bytes);
  assertFailure(f.check());
  f.config.assets.maxTotalBytes = bytes.length * 2;
  assert.equal(f.check().exitCode, 0);
});

test('forbidden runtime files fail while source art outside runtime roots is exempt', (t) => {
  const f = fixture(t, { assets: assetRules() });
  f.put('public/models/model.glb', glb());
  f.put('art/characters/source.blend', Buffer.alloc(1024));
  assert.equal(f.check().exitCode, 0);
  f.put('public/models/source.blend', Buffer.alloc(32));
  assertFailure(f.check());
});

test('overlapping runtime roots count each asset once in aggregate budgets', (t) => {
  const bytes = glb();
  const f = fixture(t, {
    assets: assetRules({ roots: ['public', 'public/models'], maxTotalBytes: bytes.length }),
  });
  f.put('public/models/model.glb', bytes);
  const result = f.check();
  assert.equal(result.exitCode, 0);
  assert.equal(result.results.find((entry) => entry.check === 'assets.total')?.bytes, bytes.length);
});

test('GLB validation accepts minimal valid JSON and rejects bad headers or malformed JSON', (t) => {
  const f = fixture(t, { assets: assetRules() });
  f.put('public/models/model.glb', glb());
  assert.equal(f.check().exitCode, 0);
  f.put('public/models/model.glb', Buffer.from('not a GLB file'));
  assertFailure(f.check());
  f.put('public/models/model.glb', glb('{broken-json'));
  assertFailure(f.check());
});

test('glTF dependencies must exist inside a configured runtime root', (t) => {
  const f = fixture(t, { assets: assetRules() });
  const model = (uri) => JSON.stringify({
    asset: { version: '2.0' }, buffers: [{ uri, byteLength: 3 }],
  });
  f.put('public/models/model.gltf', model('missing.bin'));
  assertFailure(f.check());
  f.put('public/models/missing.bin', Buffer.from([1, 2, 3]));
  assert.equal(f.check().exitCode, 0);
  f.put('public/models/model.gltf', model('https://example.com/remote.bin'));
  assertFailure(f.check());
  f.put('public/private.bin', Buffer.from([1, 2, 3]));
  f.put('public/models/model.gltf', model('../private.bin'));
  assertFailure(f.check());
  f.put('public/models/model.gltf', model('%2e%2e/private.bin'));
  assertFailure(f.check());
});

test('invalid configuration returns a config failure with exit code 2', (t) => {
  const f = fixture(t);
  f.config.version = 999;
  const result = f.check();
  assert.equal(result.exitCode, 2);
  assert.ok(result.results.some((entry) => entry.check === 'config' && entry.status === 'fail'));
});

test('function length settings accept the default and positive project limits', (t) => {
  const f = fixture(t);
  for (const code of [{}, { maxFunctionLines: 60 }, { maxFunctionLines: 80 }]) {
    f.config.code = code;
    assert.equal(f.check().exitCode, 0);
  }
});

test('function length settings reject malformed code sections', (t) => {
  const f = fixture(t);
  for (const code of [null, [], '60']) {
    f.config.code = code;
    const result = f.check();
    assert.equal(result.exitCode, 2);
    assert.ok(result.results.some((entry) => entry.check === 'config' && entry.status === 'fail'));
  }
});

test('function line limits must be positive safe integers', (t) => {
  const f = fixture(t);
  for (const maxFunctionLines of [0, -1, 1.5, '60', false, Number.MAX_SAFE_INTEGER + 1]) {
    f.config.code = { maxFunctionLines };
    const result = f.check();
    assert.equal(result.exitCode, 2, JSON.stringify(f.config.code));
    assert.ok(result.results.some((entry) => entry.check === 'config' && entry.status === 'fail'));
  }
});

test('CLI supports explicit root/config and machine-readable JSON', (t) => {
  const f = fixture(t);
  f.put('custom.json', JSON.stringify(f.config));
  const result = spawnSync(process.execPath, [cliPath, '--root', f.root, '--config', 'custom.json', '--json'], {
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, 'passed');
  assert.equal(report.exitCode, 0);
});

test('CLI rejects unknown arguments and missing values with JSON exit code 2', (t) => {
  const f = fixture(t);
  for (const args of [['--unknown', '--json'], ['--root', '--json']]) {
    const result = spawnSync(process.execPath, [cliPath, ...args], {
      cwd: f.root, encoding: 'utf8',
    });
    assert.equal(result.status, 2, result.stderr || result.stdout);
    const report = JSON.parse(result.stdout);
    assert.equal(report.status, 'failed');
    assert.equal(report.exitCode, 2);
    assert.ok(report.results.some((entry) => entry.check === 'arguments' && entry.status === 'fail'));
  }
});
