import * as os from 'node:os';
import { getFiles } from '@/embed';

export function getPlaygroundFiles() {
  return getFiles(getPlaygroundDistPath()).map(([path, content]) => {
    return [`/${path.replace(/\\/g, '/')}`, content] as [string, string];
  });
}

function getPlaygroundDistPath() {
  switch (os.platform()) {
    case 'win32':
      return '.\\playground';
    default:
      return './playground';
  }
}
