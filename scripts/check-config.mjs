#!/usr/bin/env node
import { runChecks } from './lib/context.mjs';
import { runCli } from './lib/cli.mjs';

function configurationCheck(context) {
  context.add('pass', 'config', 'Configuration is valid.');
}

export function checkConfiguration(options = {}) {
  return runChecks(options, [configurationCheck]);
}

runCli(import.meta.url, checkConfiguration);
