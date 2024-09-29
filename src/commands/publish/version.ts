import { ActionError } from '@/utils/action';

export async function getNextVersion(version: string) {
  const parts = version.split('.');
  parts[parts.length - 1] = String(Number(parts[parts.length - 1]) + 1);
  return parts.join('.');
}

export async function setVersion(version: string) {
  const file = await getVersionSource();
  file.content.version = version;
  await Bun.write(file.source, JSON.stringify(file.content, null, 2));
}

async function getVersionSource() {
  const metadata = await Bun.file('./integration.json').json();
  if (metadata.version) {
    return {
      source: 'integration.json',
      content: metadata as { version: string },
    };
  }

  const packageJson = await Bun.file('./package.json').json();
  if (packageJson.version) {
    return {
      source: 'package.json',
      content: packageJson as { version: string },
    };
  }

  throw new ActionError('No version found in integration.json or package.json');
}
