#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { isObject, isText, inside, resolveWithin, requireValue, listFiles } from './lib/utils.mjs';
import { runChecks } from './lib/context.mjs';
import { runCli } from './lib/cli.mjs';

const nativeAssets = new Set(['.blend', '.blend1', '.fbx', '.obj', '.psd', '.max', '.ma', '.mb']);
function parseGlb(buffer) {
  requireValue(buffer.length >= 20 && buffer.readUInt32LE(0) === 0x46546c67, 'GLB thiếu header glTF.');
  requireValue(buffer.readUInt32LE(4) === 2 && buffer.readUInt32LE(8) === buffer.length, 'GLB version/length không hợp lệ.');
  let offset = 12;
  let document;
  let binSeen = false;
  while (offset < buffer.length) {
    requireValue(offset + 8 <= buffer.length, 'GLB thiếu chunk header.');
    const length = buffer.readUInt32LE(offset);
    const type = buffer.readUInt32LE(offset + 4);
    requireValue(length % 4 === 0 && offset + 8 + length <= buffer.length, 'GLB chunk length/alignment không hợp lệ.');
    if (offset === 12) requireValue(type === 0x4e4f534a, 'GLB chunk đầu phải là JSON.');
    if (type === 0x4e4f534a) {
      requireValue(document === undefined, 'GLB có nhiều JSON chunk.');
      document = JSON.parse(buffer.subarray(offset + 8, offset + 8 + length).toString('utf8'));
    }
    if (type === 0x004e4942) {
      requireValue(!binSeen && document !== undefined, 'GLB BIN chunk không hợp lệ.');
      binSeen = true;
    }
    offset += 8 + length;
  }
  return document;
}

function validateGltf(document, file, root, runtimeRoots) {
  requireValue(isObject(document) && isObject(document.asset) && document.asset.version === '2.0', 'Chỉ hỗ trợ glTF asset.version 2.0.');
  for (const key of ['buffers', 'images']) {
    if (document[key] === undefined) continue;
    requireValue(Array.isArray(document[key]), `glTF ${key} phải là mảng.`);
    for (const item of document[key]) {
      requireValue(isObject(item), `glTF ${key} entry không hợp lệ.`);
      if (item.uri === undefined) continue; // Embedded BIN/bufferView: semantic validator checks references.
      requireValue(isText(item.uri), 'glTF URI phải là chuỗi không rỗng.');
      if (/^data:/i.test(item.uri)) continue;
      requireValue(!/^[a-z][a-z0-9+.-]*:|^[/\\]|[?#\\]/i.test(item.uri), `glTF chỉ dùng URI local hoặc data: ${item.uri}`);
      const decoded = decodeURIComponent(item.uri);
      requireValue(!/^[a-z][a-z0-9+.-]*:|^[/\\]|[?#\\\0]/i.test(decoded), `glTF URI không hợp lệ: ${item.uri}`);
      const dependency = resolveWithin(root, path.relative(root, path.resolve(path.dirname(file), decoded)));
      requireValue(runtimeRoots.some(runtimeRoot => inside(runtimeRoot, dependency)), `glTF dependency nằm ngoài runtime roots: ${item.uri}`);
      requireValue(fs.existsSync(dependency) && fs.statSync(dependency).isFile(), `glTF thiếu dependency: ${item.uri}`);
      if (key === 'buffers' && Number.isSafeInteger(item.byteLength)) {
        requireValue(fs.statSync(dependency).size >= item.byteLength, `glTF buffer ngắn hơn byteLength: ${item.uri}`);
      }
    }
  }
}

function checkAssetFile(file, bytes, runtimeRoots, context) {
  const { root, settings: { assets }, add } = context;
  const name = path.relative(root, file);
  const extension = path.extname(file).toLowerCase();
  requireValue(!nativeAssets.has(extension) && !assets.forbiddenExtensions.includes(extension), `File nguồn không được đặt trong runtime: ${name}`);
  requireValue(assets.allowedExtensions.includes(extension), `Extension runtime không được phép: ${name}`);
  requireValue(bytes > 0 && bytes <= assets.maxFileBytes, `${name}: ${bytes} bytes, giới hạn 1..${assets.maxFileBytes}`);
  if (extension === '.glb' || extension === '.gltf') {
    const buffer = fs.readFileSync(file);
    const document = extension === '.glb' ? parseGlb(buffer) : JSON.parse(buffer.toString('utf8'));
    validateGltf(document, file, root, runtimeRoots);
  }
  add('pass', 'assets.file', name, { bytes });
}

export function checkAssets(context) {
  const { root, settings, add, attempt } = context;
  if (!settings.assets.enabled) add('skip', 'assets', settings.assets.reason);
  else attempt('assets', () => {
    const assets = settings.assets;
    const runtimeRoots = assets.roots.map(entry => resolveWithin(root, entry));
    const files = new Set();
    for (const runtimeRoot of runtimeRoots) {
      requireValue(fs.existsSync(runtimeRoot) && fs.statSync(runtimeRoot).isDirectory(), `Thiếu runtime root: ${path.relative(root, runtimeRoot)}`);
      for (const file of listFiles(root, runtimeRoot, false)) files.add(file);
    }
    requireValue(files.size > 0, 'Runtime roots đang rỗng.');
    let total = 0;
    for (const file of files) {
      const bytes = fs.statSync(file).size;
      total += bytes;
      attempt('assets.file', () => checkAssetFile(file, bytes, runtimeRoots, context));
    }
    requireValue(total <= assets.maxTotalBytes, `Tổng asset ${total} bytes vượt ${assets.maxTotalBytes} bytes.`);
    add('pass', 'assets.total', `${files.size} file, ${total}/${assets.maxTotalBytes} bytes`, { bytes: total });
  });
}


export function checkRuntimeAssets(options = {}) {
  return runChecks(options, [checkAssets], ["assets"]);
}

runCli(import.meta.url, checkRuntimeAssets);
