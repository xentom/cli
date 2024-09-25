import * as fs from 'node:fs';
import * as path from 'node:path';
import { globSync } from 'glob';

export function getFiles(cwd: string) {
  const files = globSync('**/*.*', {
    ignore: ['node_modules/**', './index.ts'],
    cwd: cwd,
  });

  return files.map((file) => {
    const content = fs.readFileSync(path.join(cwd, file), {
      encoding: 'utf-8',
    });

    return [file, content] as [string, string];
  });
}
