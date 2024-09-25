import { createCommand } from '@/commands/utils';
import { deleteAuthConfig, getAuthConfig } from '@/storage/auth';
import { ActionError, actionErrorHandler } from '@/utils/action';
import { cmd } from '@/utils/output';
import { cyan } from 'yoctocolors';

export function createLogoutCommand() {
  return createCommand()
    .name('logout')
    .description('Log out of your account')
    .action(actionErrorHandler(logout));
}

export async function logout() {
  if (!(await getAuthConfig())) {
    throw new ActionError(
      `You are not currently logged in, so ${cmd('xentom logout')} had no effect.`,
    );
  }

  await deleteAuthConfig();
  console.log(cyan('Logged out successfully'));
}
