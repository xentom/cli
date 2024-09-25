import { createCommand } from '@/commands/utils';
import { api } from '@/lib/trpc';
import { getAuthConfig } from '@/storage/auth';
import { cyan } from 'yoctocolors';
import { login } from '../login';

export function createWhoamiCommand() {
  return createCommand()
    .name('whoami')
    .description('Show details of the currently logged-in user')
    .action(whoami);
}

export async function whoami() {
  if (!(await getAuthConfig())) {
    console.log(`No existing credentials found. Please log in:`);
    return await login();
  }

  const user = await api.user.get.query();
  console.log(`You are logged in as ${cyan(user.displayName)} (${user.email})`);
}
