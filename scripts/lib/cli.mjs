import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { requireValue, isText } from './utils.mjs';

function parseArguments(args, supported) {
  const options = {};
  let json = false;
  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    if (argument === '--help') return { help: true };
    if (argument === '--json') { json = true; continue; }
    if (argument === '--run' && supported.run) { options.run = true; continue; }
    const selection = argument === '--scope' && supported.scope ? 'scopes'
      : argument === '--gate' && supported.gate ? 'gates' : undefined;
    if (argument === '--root' || argument === '--config' || selection) {
      const value = args[++index];
      requireValue(isText(value) && !value.startsWith('--'), `${argument} cần giá trị.`);
      if (selection) (options[selection] ??= []).push(value);
      else options[argument.slice(2)] = value;
    } else throw new Error(`Tham số không hỗ trợ: ${argument}`);
  }
  return { options, json };
}

function printReport(report, json) {
  if (json) { console.log(JSON.stringify(report, null, 2)); return; }
  for (const result of report.results) {
    console.log(`[${result.status.toUpperCase()}] ${result.check}: ${result.message}`);
    if (result.output) console.log(result.output);
  }
  console.log(`Result: ${report.status}; ${report.results.filter(result => result.status === 'fail').length} lỗi.`);
}

function printHelp(metaUrl, supported) {
  const name = path.basename(fileURLToPath(metaUrl));
  const extras = [supported.run && '[--run]', supported.scope && '[--scope name]', supported.gate && '[--gate name]'].filter(Boolean);
  console.log(`Usage: node scripts/${name} [--root path] [--config relative.json] [--json] ${extras.join(' ')}`);
  if (supported.run) console.log('--run thực thi shell commands của cấu hình đã tin cậy.');
}

export function runCli(metaUrl, runner, supported = {}) {
  if (!process.argv[1] || metaUrl !== pathToFileURL(path.resolve(process.argv[1])).href) return;
  const args = process.argv.slice(2);
  try {
    const parsed = parseArguments(args, supported);
    if (parsed.help) { printHelp(metaUrl, supported); return; }
    const report = runner(parsed.options);
    printReport(report, parsed.json);
    process.exitCode = report.exitCode;
  } catch (error) {
    const report = { status: 'failed', results: [{ status: 'fail', check: 'arguments', message: error.message }], exitCode: 2 };
    printReport(report, args.includes('--json'));
    process.exitCode = 2;
  }
}
