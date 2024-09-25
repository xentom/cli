import * as os from 'node:os';
import * as path from 'node:path';
import { env } from '@/env';
import { ActionError, catchError } from '@/utils/action';

export function getGlobalConfigPath() {
  const homedir = os.homedir();
  if (homedir === 'unknown') {
    catchError(
      new ActionError(
        'Unable to determine the home directory. If you are using Turbo, please ensure that you add the --env-mode=loose flag to include the system environment variables.',
      ),
    );
  }

  const { hostname } = new URL(env.XENTOM_ADDRESS);
  if (hostname !== 'xentom.com') {
    return path.join(homedir, '.xentom', hostname);
  }

  return path.join(homedir, '.xentom');
}
