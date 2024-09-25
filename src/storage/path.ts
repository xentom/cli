import * as os from 'node:os';
import * as path from 'node:path';
import { env } from '@/env';

export function getGlobalConfigPath() {
  const { hostname } = new URL(env.XENTOM_ADDRESS);
  if (hostname !== 'xentom.com') {
    return path.join(os.homedir(), '.xentom', hostname);
  }

  return path.join(os.homedir(), '.xentom');
}
