import { createCommand } from '@/commands/utils';
import { env } from '@/env';
import { createRequestHeaders } from '@/lib/trpc';
import { createZipInMemory } from '@/lib/zip';
import { ActionError, actionErrorHandler } from '@/utils/action';
import { cmd } from '@/utils/output';
import { getPackageJson } from '@/utils/pm';
import ora from 'ora';
import { cyan, red } from 'yoctocolors';
import { ZodError } from 'zod';
import { IntegrationPackageJson } from '@xentom/integration/schema';

export function createPublishCommand() {
  return createCommand()
    .name('publish')
    .description('Publish the integration')
    .option('-i, --increment', 'Increment the version number', false)
    .option('-t, --tag <tag>', 'Publish with a specific tag', 'latest')
    .option(
      '--ignore-duplicates',
      'Skip checking and reporting duplication errors',
      false,
    )
    .action(actionErrorHandler(publish));
}

export interface PublishOptions {
  increment: boolean;
  tag: string;
  ignoreDuplicates: boolean;
}

export async function publish(options: PublishOptions) {
  const spinner = ora('Publishing integration...').start();

  let pkg;
  try {
    pkg = await getPackageJson();
  } catch (error) {
    spinner.clear();
    throw new ActionError(
      `The ${cmd('package.json')} file is missing or invalid. Please make sure the file exists and is valid JSON.`,
    );
  }

  try {
    IntegrationPackageJson.parse(pkg);
  } catch (error) {
    spinner.clear();

    if (!(error instanceof ZodError)) {
      throw new ActionError(`The ${cmd('package.json')} file is invalid.`);
    }

    throw new ActionError(
      `The ${cmd('package.json')} file is invalid. Please fix the following fields:\n${error.errors
        .map((e) => `  - ${red(e.path[0].toString())} (${e.message})`)
        .join('\n')}`,
    );
  }

  if (pkg.logo?.endsWith('.svg')) {
    spinner.clear();
    throw new ActionError(
      `SVG logos are not allowed due to security reasons. Please use a different format for the ${cmd('logo')} in ${cmd('package.json')}.`,
    );
  }

  const [hasServerFile, hasBrowserFile] = await Promise.all([
    Bun.file('./dist/server.js').exists(),
    Bun.file('./dist/browser.js').exists(),
  ]);

  if (!hasBrowserFile || !hasServerFile) {
    spinner.clear();
    throw new ActionError(
      `The integration could not be published because it has not been built yet. Please run the ${cmd('xentom build')} command to build the integration before publishing.`,
    );
  }

  const previousVersion = pkg.version;
  if (options.increment) {
    pkg = await incrementVersion(pkg);
  }

  try {
    await upload(await pack(pkg), options.tag);
  } catch (error) {
    // Revert the version back to the previous one if the upload fails
    if (options.increment) {
      pkg = await setVersion(pkg, previousVersion);
    }

    if (options.ignoreDuplicates) {
      if (
        error instanceof ActionError &&
        error.message.includes(
          'You cannot publish over the previously published versions',
        )
      ) {
        spinner.succeed(
          `The integration version ${cyan(
            `${pkg.name}@${pkg.version}`,
          )} has already been published under the ${cyan(options.tag)} tag.`,
        );

        process.exit(0);
      }
    }

    spinner.clear();
    throw error;
  }

  spinner.succeed(
    `Integration ${cyan(`${pkg.name}@${pkg.version}`)} has been successfully published under the ${cyan(options.tag)} tag.`,
  );
}

async function incrementVersion(pkg: IntegrationPackageJson) {
  const version = pkg.version.split('.');
  version[version.length - 1] = String(Number(version[version.length - 1]) + 1);
  return await setVersion(pkg, version.join('.'));
}

async function setVersion(pkg: IntegrationPackageJson, version: string) {
  const copy = { ...pkg };
  copy.version = version;
  await Bun.write('./package.json', JSON.stringify(copy, null, 2));
  return copy;
}

async function pack(pkg: IntegrationPackageJson) {
  const files = [
    './package.json',
    './CHANGELOG.md',
    './LICENSE.txt',
    './README.md',
    './dist/browser.js',
    './dist/browser.css',
    './dist/declarations.json',
    './dist/definition.json',
    './dist/server.js',
    './dist/index.d.ts',
  ];

  if (pkg.logo) {
    files.push(pkg.logo);
  }

  return await createZipInMemory(files);
}

async function upload(body: Buffer, tag: string) {
  const res = await fetch(
    new Request(
      `${env.XENTOM_ADDRESS}/api/v1/integrations/publish?tag=${tag}`,
      {
        method: 'PUT',
        headers: await createRequestHeaders(),
        body,
      },
    ),
  );

  if (!res.ok) {
    if (res.status === 413) {
      throw new ActionError(
        'The integration exceeds the allowed size limit. Please reduce its size to continue.',
      );
    }

    const json = (await res.json()) as Record<string, string> | undefined;
    throw new ActionError(json?.error ?? 'Unknown error');
  }
}
