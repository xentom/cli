import { createCommand } from '@/commands/utils';
import { env } from '@/env';
import { createRequestHeaders } from '@/lib/trpc';
import { ActionError, actionErrorHandler } from '@/utils/action';
import { cmd } from '@/utils/output';
import { getPackageJson } from '@/utils/pm';
import JSZip from 'jszip';
import ora from 'ora';
import { cyan } from 'yoctocolors';
import { type IntegrationPackageJson } from '@xentom/integration';

export function createPublishCommand() {
  return createCommand()
    .name('publish')
    .description('Publish the integration')
    .option('-i, --increment', 'Increment the version number', false)
    .option('-t, --tag <tag>', 'Publish with a specific tag', 'latest')
    .action(actionErrorHandler(publish));
}

export interface PublishOptions {
  increment: boolean;
  tag: string;
}

export async function publish(options: PublishOptions) {
  const spinner = ora('Publishing integration...').start();
  let pkg = await getPackageJson();

  for (const key of ['name', 'version', 'organization'] as const) {
    if (!pkg[key]) {
      spinner.fail('Publish failed');
      throw new ActionError(
        `The ${cmd('package.json')} file is missing the required ${cmd(key)} field. Please add this field before publishing.`,
      );
    }
  }

  if (pkg.logo?.endsWith('.svg')) {
    spinner.fail('Publish failed');
    throw new ActionError(
      `SVG logos are not allowed due to security reasons. Please use a different format for the ${cmd('logo')} in ${cmd('package.json')}.`,
    );
  }

  const [hasServerFile, hasBrowserFile] = await Promise.all([
    Bun.file('./dist/server.js').exists(),
    Bun.file('./dist/browser.js').exists(),
  ]);

  if (!hasBrowserFile || !hasServerFile) {
    spinner.fail('Publish failed');
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
    if (options.increment) {
      pkg = await setVersion(pkg, previousVersion);
    }

    spinner.fail('Publish failed');
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
  const include = [
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
    pkg.logo,
  ];

  const zip = new JSZip();
  await Promise.allSettled(
    include.map(async (path) => {
      if (!path) return;
      zip.file(path, await Bun.file(path).arrayBuffer());
    }),
  );

  return await zip.generateAsync({
    type: 'arraybuffer',
    compression: 'DEFLATE',
    compressionOptions: {
      level: 5,
    },
  });
}

async function upload(pack: ArrayBuffer, tag: string) {
  const res = await fetch(
    new Request(
      `${env.XENTOM_ADDRESS}/api/v1/integrations/publish?tag=${tag}`,
      {
        method: 'PUT',
        headers: await createRequestHeaders(),
        body: pack,
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
