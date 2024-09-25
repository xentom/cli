import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

export const env = createEnv({
  server: {
    NODE_ENV: z.string().optional(),
    XENTOM_TOKEN: z.string().optional(),
    XENTOM_ADDRESS: z.string().url().optional().default('https://xentom.com'),
  },

  runtimeEnv: {
    ...process.env,
    XENTOM_TOKEN: process.env.XENTOM_TOKEN || process.env.XEN_TOKEN,
    XENTOM_ADDRESS: process.env.XENTOM_ADDRESS || process.env.XEN_ADDRESS,
  },

  emptyStringAsUndefined: true,
});
