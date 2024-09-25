import { spawn } from 'node:child_process';
import * as path from 'node:path';
import { createCommand } from '@/commands/utils';
import { ActionError, actionErrorHandler } from '@/utils/action';
import { cmd } from '@/utils/output';
import { getPackageManager, getPackageManagerInstallCommand } from '@/utils/pm';
import ora from 'ora';
import { gray } from 'yoctocolors';
import { type Integration } from '@xentom/integration';

export function createBuildCommand() {
  return createCommand()
    .name('build')
    .description('Build the integration')
    .option('-w, --watch', 'Watch for changes and rebuild')
    .action(actionErrorHandler(build));
}

export interface BuildOptions {
  watch?: boolean;
}

export async function build(options: BuildOptions) {
  const spinner = ora('Building integration...').start();

  try {
    await Promise.all([
      createIntegrationBuilder({
        ...options,
        onBuildLog(log) {
          const message = log.toString().replaceAll('\n', ' ').trim();
          if (message) {
            spinner.text = `Building integration... ${gray(`(${message})`)}`;
          }
        },
      }),

      // Build the integration definition separately from the main build process.
      // This is necessary because the integration definition relies on Bun being available,
      // and the integration builder might not have direct access to the Bun instance.
      buildIntegrationDefinition(),
    ]);
  } catch (error) {
    spinner.fail('Build failed');
    throw new ActionError(
      error instanceof Error ? error.message : String(error),
    );
  }

  spinner.succeed('Build successful');
}

interface CreateIntegrationBuilderOptions {
  watch?: boolean;
  onBuildLog?: (message: string) => void;
  onBuildError?: (message: string) => void;
  onBuildSuccess?: () => void;
}

type BuilderIpcPayload =
  | {
      event: 'build:active' | 'build:success';
    }
  | {
      event: 'build:error';
      message: string;
    };

export async function createIntegrationBuilder(
  options?: CreateIntegrationBuilderOptions,
) {
  const builderPath = await findIntegrationBuilderPath(
    './node_modules/@xentom/integration/dist/builder/index.js',
  );

  if (!builderPath) {
    const packageManager = await getPackageManager();
    throw new ActionError(
      `Integration builder not found. Ensure that your package.json includes the ${cmd('@xentom/integration')} package and that you have run ${cmd(getPackageManagerInstallCommand(packageManager))} to install dependencies.`,
    );
  }

  // Explicitly check if IPC is required because building with Turbo throws an unexpected error. See issue:
  // https://github.com/nodejs/node/issues/32106
  const isIpcRequired = !!options?.onBuildSuccess || !!options?.onBuildError;
  const args = [options?.watch && '--watch'].filter(Boolean) as string[];
  const builder = spawn('node', [builderPath, ...args], {
    stdio: ['pipe', 'pipe', 'pipe', isIpcRequired ? 'ipc' : undefined],
    cwd: process.cwd(),
  });

  if (options?.onBuildLog) {
    builder.stdout?.on('data', options.onBuildLog);
    builder.stderr?.on('data', options.onBuildLog);
  }

  if (isIpcRequired) {
    builder.on('message', (payload: BuilderIpcPayload) => {
      switch (payload.event) {
        case 'build:active':
          // No action needed for build:active
          break;
        case 'build:success':
          options?.onBuildSuccess?.();
          break;
        case 'build:error':
          options?.onBuildError?.(payload.message);
          break;
      }
    });
  }

  await new Promise<void>((resolve, reject) => {
    builder.on('error', (error) => {
      reject(error);
    });

    builder.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Builder process exited with code ${code}`));
      }
    });
  });

  return builder;
}

async function findIntegrationBuilderPath(
  basePath: string,
  deep = 0,
): Promise<string | undefined> {
  if (await Bun.file(basePath).exists()) {
    return path.resolve(basePath);
  }

  if (deep > 5) {
    return;
  }

  return findIntegrationBuilderPath(`../${basePath}`, deep + 1);
}

async function buildIntegrationDefinition() {
  const source = path.join(process.cwd(), 'src', 'index.ts');
  const { default: integration } = (await import(source)) as {
    default: Integration;
  };

  const definition = JSON.stringify(integration, (key, value) => {
    if (typeof value === 'function') {
      return true;
    }

    if (key === 'icon') {
      return true;
    }

    return value as unknown;
  });

  await Bun.write(
    path.join(process.cwd(), 'dist', 'definition.json'),
    definition,
  );
}
