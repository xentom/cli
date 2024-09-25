import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import { resolve } from 'node:path';

export function humanizePath(path: string) {
  const resolvedPath = resolve(path);
  const homedir = os.homedir();
  return resolvedPath.startsWith(homedir)
    ? `~${resolvedPath.slice(homedir.length)}`
    : resolvedPath;
}

export async function isDirectoryEmpty(path: string) {
  try {
    return (await fs.readdir(path)).length === 0;
  } catch {
    return true;
  }
}
