import { type IntegrationMetadata } from '@xentom/integration';
import { getPackageJson } from './pm';

export async function getIntegrationMetadata(path = './integration.json') {
  const metadata = (await Bun.file(path).json()) as IntegrationMetadata;

  if (!metadata.version) {
    metadata.version = (await getPackageJson()).version;
  }

  return metadata;
}
