import { type IntegrationMetadata } from '@xentom/integration';

export async function getIntegrationMetadata(path = './integration.json') {
  return (await Bun.file(path).json()) as IntegrationMetadata;
}
