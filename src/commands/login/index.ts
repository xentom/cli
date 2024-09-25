import { createCommand } from '@/commands/utils';
import { env } from '@/env';
import { api } from '@/lib/trpc';
import { deleteAuthConfig, setAuthConfig } from '@/storage/auth';
import { ActionError, actionErrorHandler } from '@/utils/action';
import { password } from '@inquirer/prompts';
import { TRPCClientError } from '@trpc/client';
import { cyan } from 'yoctocolors';

export function createLoginCommand() {
  return createCommand()
    .name('login')
    .description('Log into your account')
    .action(actionErrorHandler(login));
}

export async function login() {
  console.log(
    `You can generate an access token from ${env.XENTOM_ADDRESS}/tokens`,
  );

  const token = await password({
    message: 'Enter your access token',
    mask: '*',
    validate(value) {
      if (!value || value.length !== 36) {
        return 'Please enter a valid access token';
      }
      return true;
    },
  });

  await setAuthConfig({ token });

  try {
    const user = await api.user.get.query();
    console.log(
      `${cyan('Congratulations!')} You are now logged in as ${cyan(user.displayName)} (${user.email})`,
    );
  } catch (error) {
    await deleteAuthConfig();

    if (error instanceof TRPCClientError) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (error.data.code === 'UNAUTHORIZED') {
        throw new ActionError(
          'The token you provided is invalid. Please double-check your entry and try again.',
        );
      }
    }

    throw new ActionError(
      'An unexpected error occurred. Please try again later.',
    );
  }
}
