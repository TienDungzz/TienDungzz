import fs from 'node:fs';
import path from 'node:path';

const ignored = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', '.next', '.nuxt']);
export const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export const isText = value => typeof value === 'string' && value.trim().length > 0;
export const inside = (root, target) => {
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative));
};

export function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}

export function textArray(value, name, nonempty = false) {
  requireValue(Array.isArray(value) && value.every(isText) && (!nonempty || value.length > 0), `${name}: cần mảng chuỗi${nonempty ? ' không rỗng' : ''}.`);
}

export function relativePath(value, name) {
  requireValue(isText(value) && !path.isAbsolute(value) && !/^[a-z]:|^[/\\]|\0|[*?]/i.test(value), `${name}: cần đường dẫn tương đối, không dùng glob.`);
}

// Reject symlinks at every level, including missing children beneath a symlink.

export function resolveWithin(root, relative) {
  relativePath(relative, 'path');
  const target = path.resolve(root, relative);
  requireValue(inside(root, target), `Đường dẫn ra ngoài phạm vi: ${relative}`);
  const parts = path.relative(root, target).split(path.sep).filter(Boolean);
  let current = root;
  for (const part of parts) {
    current = path.join(current, part);
    const stat = fs.lstatSync(current, { throwIfNoEntry: false });
    if (stat) requireValue(!stat.isSymbolicLink(), `Không hỗ trợ symlink: ${relative}`);
  }
  return target;
}

export function listFiles(root, target, skipGenerated = true) {
  requireValue(inside(root, target), 'Đường dẫn scan ra ngoài root.');
  const stat = fs.lstatSync(target);
  requireValue(!stat.isSymbolicLink(), `Không hỗ trợ symlink: ${path.relative(root, target)}`);
  if (stat.isFile()) return [target];
  requireValue(stat.isDirectory(), `Không phải file hoặc thư mục: ${target}`);
  return fs.readdirSync(target).flatMap(name => {
    if (skipGenerated && ignored.has(name)) return [];
    return listFiles(root, path.join(target, name), skipGenerated);
  });
}
