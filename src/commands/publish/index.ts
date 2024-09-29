import { createCommand } from '@/commands/utils';
import { env } from '@/env';
import { createRequestHeaders } from '@/lib/trpc';
import { createZipInMemory, type File } from '@/lib/zip';
import { ActionError, actionErrorHandler } from '@/utils/action';
import { getIntegrationMetadata } from '@/utils/metadata';
import { cmd } from '@/utils/output';
import ora from 'ora';
import { cyan, red } from 'yoctocolors';
import { ZodError } from 'zod';
import { IntegrationMetadata } from '@xentom/integration/schema';
import { getNextVersion, setVersion } from './version';

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

  let metadata;
  try {
    metadata = await getIntegrationMetadata();
  } catch (error) {
    spinner.clear();
    throw new ActionError(
      `The ${cmd('integration.json')} file is missing or invalid. Please make sure the file exists and is valid JSON.`,
    );
  }

  try {
    IntegrationMetadata.parse(metadata);
  } catch (error) {
    spinner.clear();

    if (!(error instanceof ZodError)) {
      throw new ActionError(`The ${cmd('integration.json')} file is invalid.`);
    }

    throw new ActionError(
      `The ${cmd('integration.json')} file is invalid. Please fix the following fields:\n${error.errors
        .map((e) => `  - ${red(e.path[0].toString())} (${e.message})`)
        .join('\n')}`,
    );
  }

  if (metadata.logo?.endsWith('.svg')) {
    spinner.clear();
    throw new ActionError(
      `SVG logos are not allowed due to security reasons. Please use a different format for the ${cmd('logo')} in ${cmd('integration.json')}.`,
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

  if (options.increment) {
    metadata.version = await getNextVersion(metadata.version);
  }

  try {
    await upload(await pack(metadata), options.tag);

    if (options.increment) {
      await setVersion(metadata.version);
    }
  } catch (error) {
    if (options.ignoreDuplicates) {
      if (
        error instanceof ActionError &&
        error.message.includes(
          'You cannot publish over the previously published versions',
        )
      ) {
        spinner.succeed(
          `The integration version ${cyan(
            `${metadata.name}@${metadata.version}`,
          )} has already been published under the ${cyan(options.tag)} tag.`,
        );

        process.exit(0);
      }
    }

    spinner.clear();
    throw error;
  }

  spinner.succeed(
    `Integration ${cyan(`${metadata.name}@${metadata.version}`)} has been successfully published under the ${cyan(options.tag)} tag.`,
  );
}

async function pack(metadata: IntegrationMetadata) {
  const files: File[] = [
    { path: './integration.json', content: JSON.stringify(metadata, null, 2) },
    { path: './CHANGELOG.md' },
    { path: './LICENSE.txt' },
    { path: './README.md' },
    { path: './dist/browser.js' },
    { path: './dist/browser.css' },
    { path: './dist/declarations.json' },
    { path: './dist/definition.json' },
    { path: './dist/server.js' },
    { path: './dist/index.d.ts' },
  ];

  if (metadata.logo) {
    files.push({ path: metadata.logo });
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
