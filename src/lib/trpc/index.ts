import { env } from '@/env';
import { getAuthConfig } from '@/storage/auth';
import { createTRPCClient, httpBatchLink, loggerLink } from '@trpc/client';
import { type inferRouterOutputs } from '@trpc/server';
import transformer from 'superjson';
import { type AppRouter } from './app-router';

export type * from './app-router';

export type RouterOutput = inferRouterOutputs<AppRouter>;

export const api = createTRPCClient<AppRouter>({
  links: [
    loggerLink({
      enabled() {
        return env.NODE_ENV === 'development';
      },
    }),
    httpBatchLink({
      transformer,
      url: `${env.XENTOM_ADDRESS}/api/trpc`,
      headers: createRequestHeaders,
    }),
  ],
});

export async function createRequestHeaders() {
  const headers: Record<string, string> = {
    'x-trpc-source': 'cli',
  };

  const auth = await getAuthConfig();
  if (auth) {
    headers.Authorization = `Bearer ${auth.token}`;
  }

  return headers;
}
