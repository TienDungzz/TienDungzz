#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { runChecks } from './lib/context.mjs';
import { runCli } from './lib/cli.mjs';

export function checkQuality(context) {
  const { root, settings, configFile, run, gates, add } = context;
  const selected = new Set(gates);
  const known = new Set([...settings.quality.required, ...Object.keys(settings.quality.commands)]);
  for (const name of selected) {
    if (!known.has(name)) add('fail', 'quality.selection', `Không có quality gate: ${name}`);
  }
  for (const name of settings.quality.required) {
    if (selected.size && !selected.has(name)) continue;
    if (!Object.hasOwn(settings.quality.commands, name)) add('fail', 'quality.required', `Thiếu quality gate: ${name}`);
  }
  for (const [name, command] of Object.entries(settings.quality.commands)) {
    if (selected.size && !selected.has(name)) continue;
    if (!run) { add('skip', 'quality.command', `${name}: chưa chạy; dùng --run`, { name, executed: false }); continue; }
    const child = spawnSync(command, {
      cwd: root, shell: true, windowsHide: true, encoding: 'utf8',
      timeout: 300_000, maxBuffer: 16 * 1024 * 1024,
      env: { ...process.env, FORCE_COLOR: '0', PROJECT_STANDARDS_CONFIG: configFile }
    });
    const passed = child.status === 0 && !child.error;
    add(passed ? 'pass' : 'fail', 'quality.command', `${name}: ${child.error?.message || `exit ${child.status}${child.signal ? ` (${child.signal})` : ''}`}`, {
      name, executed: true, command, output: `${child.stdout || ''}${child.stderr || ''}`.trim()
    });
  }
}


export function checkQualityGates(options = {}) {
  return runChecks(options, [checkQuality], ["quality","code"]);
}

runCli(import.meta.url, checkQualityGates, { run: true, gate: true });
