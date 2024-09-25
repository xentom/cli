import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { env } from '@/env';
import { getGlobalConfigPath } from './path';

const XENTOM_AUTH_FILE = path.join(getGlobalConfigPath(), 'auth.json');

export interface AuthConfig {
  token: string;
}

export async function setAuthConfig(config: AuthConfig) {
  await Bun.write(XENTOM_AUTH_FILE, JSON.stringify(config));
}

export async function getAuthConfig() {
  if (env.XENTOM_TOKEN) {
    return { token: env.XENTOM_TOKEN };
  }

  const file = Bun.file(XENTOM_AUTH_FILE);
  if (await file.exists()) {
    return (await file.json()) as AuthConfig;
  }
}

export async function deleteAuthConfig() {
  await fs.unlink(XENTOM_AUTH_FILE);
}
