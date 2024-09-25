import base from '@xentom/eslint-config/base';

/** @type {import('eslint').Linter.Config} */
export default [
  ...base,
  {
    ignores: [
      'dist/**',
      'src/commands/start/banner.js',
      'src/commands/init/templates/**/*',
    ],
  },
  {
    rules: {
      'no-console': 'off',
    },
  },
];
