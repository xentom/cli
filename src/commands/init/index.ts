import * as path from 'node:path';
import { createCommand } from '@/commands/utils';
import { env } from '@/env';
import { api, type RouterOutput } from '@/lib/trpc';
import { getAuthConfig } from '@/storage/auth';
import { ActionError, actionErrorHandler } from '@/utils/action';
import { cmd } from '@/utils/output';
import { humanizePath, isDirectoryEmpty } from '@/utils/path';
import { getPackageManager, getPackageManagerInstallCommand } from '@/utils/pm';
import { input, select } from '@inquirer/prompts';
import mustache from 'mustache';
import { bold, cyan } from 'yoctocolors';
// @ts-expect-error -- -
import IntegrationLogo from './templates/assets/logo.png' with { type: 'file' };
import { getTypeScriptTemplateFiles } from './templates/typescript' with { type: 'macro' };

export function createInitCommand() {
  return createCommand()
    .name('init')
    .description('Initialize a new integration')
    .argument('[name]', 'The name of the integration')
    .argument('[dir]', 'The directory to create the integration in')
    .option('-f, --force', 'Overwrite the directory if it exists', false)
    .action(actionErrorHandler(init));
}

export interface InitOptions {
  force?: boolean;
}

export async function init(
  name: string,
  dir?: string,
  options: InitOptions = {},
) {
  let organizations: Promise<RouterOutput['organization']['list']> | undefined;
  if (await getAuthConfig()) {
    organizations = api.organization.list.query();
  }

  if (!name) {
    name = await input({
      message: 'Enter the name of the integration',
      required: true,
    });
  }

  let organization = '';
  if (organizations) {
    try {
      const result = await organizations;
      if (result.length === 1) {
        organization = result[0].slug;
      } else if (result.length > 1) {
        organization = await select({
          message: 'Select the organization',
          choices: result.map((organization) => ({
            value: organization.slug,
          })),
        });
      }
    } catch {
      /* */
    }
  }

  const files = renderTemplateFiles(getTypeScriptTemplateFiles(), {
    name,
    organization,
  });

  const integrationPath = path.join(process.cwd(), dir ?? name);
  if (env.NODE_ENV !== 'development') {
    if (!options.force && !(await isDirectoryEmpty(integrationPath))) {
      throw new ActionError(
        `Destination path "${bold(humanizePath(integrationPath))}" already exists and is not an empty directory. You may use ${cmd('--force')} or ${cmd('-f')} to overwrite it.`,
      );
    }

    await Promise.all(
      files.map(([file, content]) => {
        return Bun.write(path.join(integrationPath, file), content);
      }),
    );

    await Bun.write(
      path.join(integrationPath, 'assets/logo.png'),
      Bun.file(IntegrationLogo as string),
    );
  }

  console.log(
    `${cyan('> Success!')} Initialized "${bold(name)}" integration in ${humanizePath(integrationPath)}`,
  );

  const packageManager = await getPackageManager();
  console.log('- Next steps:');
  console.log(`  - ${cyan(`cd ${dir ?? name}`)}`);
  console.log(`  - ${cyan(getPackageManagerInstallCommand(packageManager))}`);
  console.log(`  - ${cyan(`${packageManager} run dev`)}`);
  console.log(`  - ${cyan(`${packageManager} run build`)}`);
  console.log(`  - ${cyan(`${packageManager} run publish`)}`);
}

function renderTemplateFiles(
  files: [string, string][],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>,
) {
  return files.map(([file, content]) => {
    if (!file.endsWith('.tpl')) {
      return [file, content];
    }

    return [file.replace(/\.tpl$/, ''), mustache.render(content, data)];
  });
}
