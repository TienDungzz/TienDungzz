#!/usr/bin/env node
import { runChecks } from './lib/context.mjs';
import { runCli } from './lib/cli.mjs';
import { planProjectChecks } from './lib/loader.mjs';

export function checkProject(options = {}) {
  return runChecks(options, planProjectChecks);
}

runCli(import.meta.url, checkProject, { run: true });
