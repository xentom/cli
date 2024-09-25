import { env } from '@/env';
import { TRPCClientError } from '@trpc/client';
import { red } from 'yoctocolors';
import { cmd } from './output';

export class ActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ActionError';
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function actionErrorHandler(
  action: (...args: any[]) => Promise<void> | void,
) {
  return async (...args: any[]) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      return await action(...args);
    } catch (error) {
      catchError(error);
    }
  };
}

export function catchError(error: unknown): never {
  if ((error as Error).name === 'ExitPromptError') {
    process.exit(0);
  }

  if (error instanceof ActionError) {
    console.error(`${red('!')} ${error.message}`);
    process.exit(1);
  }

  if (error instanceof TRPCClientError) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (error.data.code === 'UNAUTHORIZED') {
      console.log(
        `${red('!')} You are not currently logged in. Please run ${cmd('xentom login')} to log in.`,
      );
      process.exit(1);
    }
  }

  if (env.NODE_ENV === 'development') {
    console.log(error);
  } else {
    console.log(error);
    console.error(red('An unexpected error occurred. Please try again later.'));
  }

  process.exit(1);
}
