import { detect, type PM } from 'detect-package-manager';

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
