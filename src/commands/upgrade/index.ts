import { unlink } from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { createCommand } from '@/commands/utils';
import { ActionError, actionErrorHandler } from '@/utils/action';
import { getCommitSha, getRevision } from '@/version' with { type: 'macro' };
import { blue, bold, cyan, gray, green } from 'yoctocolors';
import { version } from '../../../package.json';
import {
  DownloadFailedError,
  ExtractionFailureError,
  MissingBinaryError,
} from './errors';

export function createUpgradeCommand() {
  return createCommand()
    .name('upgrade')
    .description('Upgrade the CLI to the latest version')
    .option('-c, --canary', 'Upgrade to the latest canary version')
    .action(actionErrorHandler(upgrade));
}

export interface UpgradeOptions {
  canary?: boolean;
}

export async function upgrade(options: UpgradeOptions) {
  const xentomBinPath = Bun.which('xentom');
  if (!xentomBinPath) {
    throw MissingBinaryError;
  }

  let tag;
  if (options.canary) {
    const release = await getReleaseDetails('canary');
    if (!release) throw DownloadFailedError;

    const sha = getCommitSha();
    if (sha && release.body.includes(sha)) {
      return console.log(
        `${green('Congratulations!')} You're already on the latest canary version of the Xentom CLI ${gray(`(which is ${getRevision()})`)}`,
      );
    } else {
      console.log(
        `A new canary version of the Xentom CLI is available! You are currently on ${bold(blue(getRevision()))}\nUpgrading to the latest canary version. This may take a few moments...`,
      );
    }

    tag = 'canary';
  } else {
    const release = await getReleaseDetails('latest');
    if (!release) throw DownloadFailedError;

    const number = release.tag_name.replace('v', '');
    if (number === version) {
      return console.log(
        `${green('Congratulations!')} You're already on the latest version of the Xentom CLI ${gray(`(which is v${version})`)}`,
      );
    } else {
      console.log(
        `A new version of the Xentom CLI is available! You are currently on ${bold(blue(`v${version}`))}\nUpgrading to the latest version ${bold(cyan(`v${number}`))}. This may take a few moments...`,
      );
    }

    tag = release.tag_name;
  }

  const zipPath = await download(tag);
  await unzip(zipPath, path.dirname(xentomBinPath));
  await unlink(zipPath);

  console.log(
    `${green('Congratulations!')} The Xentom CLI has been successfully upgraded to the ${options.canary ? 'latest canary' : 'latest'} version`,
  );
}

async function getReleaseDetails(tag: 'latest' | 'canary') {
  const response = await Bun.fetch(
    tag === 'canary'
      ? 'https://api.github.com/repos/xentom/cli/releases/tags/canary'
      : 'https://api.github.com/repos/xentom/cli/releases/latest',
  );

  if (!response.ok) {
    return;
  }

  return (await response.json()) as {
    tag_name: string;
    body: string;
  };
}

async function download(tag: string) {
  const platform = process.platform === 'win32' ? 'windows' : process.platform;
  if (!['darwin', 'linux', 'windows'].includes(platform)) {
    throw new ActionError(
      `Your operating system ${gray(`(${platform})`)} is not supported by the Xentom CLI.`,
    );
  }

  const arch = process.arch;
  if (!['x64', 'arm64'].includes(arch)) {
    throw new ActionError(
      `Your architecture ${gray(`(${arch})`)} is not supported by the Xentom CLI.`,
    );
  }

  try {
    const response = await Bun.fetch(
      `https://github.com/xentom/cli/releases/download/${tag}/xentom-${platform}-${arch}.zip`,
    );

    const zipPath = path.join(os.tmpdir(), 'xentom.zip');
    await Bun.write(zipPath, await response.arrayBuffer());

    return zipPath;
  } catch {
    throw DownloadFailedError;
  }
}

async function unzip(zipPath: string, destPath: string) {
  try {
    switch (process.platform) {
      case 'linux':
      case 'darwin': {
        await Bun.$`unzip -qqo ${zipPath} -d ${destPath} && chmod +x ${destPath}/xentom`;
        break;
      }
      case 'win32': {
        await Bun.$`powershell -Command "
          $$global:ErrorActionPreference = 'Stop';
          $$global:ProgressPreference = 'SilentlyContinue';
          Move-Item -Path '${destPath}\\xentom.exe' -Destination '${destPath}\\xentom.old' -Force;
          Expand-Archive -Path '${zipPath}' -DestinationPath '${destPath}' -Force;
        "`;
        break;
      }
    }
  } catch (err) {
    throw ExtractionFailureError;
  }
}
