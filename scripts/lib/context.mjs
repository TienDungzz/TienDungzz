import fs from 'node:fs';
import path from 'node:path';
import { validateConfig } from './config.mjs';
import { resolveWithin } from './utils.mjs';

function createReporter() {
  const results = [];
  const add = (status, check, message, extra = {}) => results.push({ status, check, message, ...extra });
  const attempt = (check, callback) => {
    try { callback(); } catch (error) { add('fail', check, error.message); }
  };
  return { results, add, attempt };
}

function projectReport(root, project, results) {
  const failed = results.some(result => result.status === 'fail');
  const incomplete = results.some(result => result.check === 'quality.command' && !result.executed);
  return { status: failed ? 'failed' : incomplete ? 'incomplete' : 'passed', root, project, results, exitCode: failed ? 1 : 0 };
}

export function runChecks(options = {}, checks = [], sections) {
  let { root = process.cwd(), config = 'project-standards.json' } = options;
  let settings;
  let configFile;
  let plan;
  try {
    root = fs.realpathSync(path.resolve(root));
    configFile = resolveWithin(root, config);
    settings = JSON.parse(fs.readFileSync(configFile, 'utf8').replace(/^\uFEFF/, ''));
    plan = typeof checks === 'function' ? checks(settings) : { checks, sections };
    validateConfig(settings, plan.sections);
  } catch (error) {
    return { status: 'failed', root, results: [{ status: 'fail', check: 'config', message: error.message }], exitCode: 2 };
  }
  const context = { root, settings, configFile, run: options.run ?? false,
    scopes: options.scopes ?? [], gates: options.gates ?? [], ...createReporter() };
  for (const check of plan.checks) check(context);
  return projectReport(root, settings.project, context.results);
}
