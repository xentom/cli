import { detect, type PM } from 'detect-package-manager';
import { type IntegrationPackageJson } from '@xentom/integration';

export async function getPackageManager() {
  return await detect({
    cwd: process.cwd(),
    includeGlobalBun: true,
  });
}

export function getPackageManagerInstallCommand(pm: PM) {
  switch (pm) {
    case 'npm':
      return 'npm install';
    case 'yarn':
      return 'yarn';
    case 'bun':
      return 'bun install';
    case 'pnpm':
      return 'pnpm install';
    default:
      return 'npm install';
  }
}

export async function getPackageJson(path = './package.json') {
  return (await Bun.file(path).json()) as IntegrationPackageJson;
}
