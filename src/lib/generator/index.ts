import indentString from 'indent-string';
import { bold, gray, green, yellow } from 'yoctocolors';

export type FileChange = {
  path: string;
  content: string;
} & (
  | {
      type: 'insert';
    }
  | {
      type: 'update';
      preview: string;
    }
);

export function printFileChanges(changes: FileChange[]) {
  console.log(bold(gray('\nThe following changes will be made:')));

  changes.forEach((change) => {
    switch (change.type) {
      case 'insert': {
        console.log(
          gray(`+ ${change.path}`),
          `\n${green(indentString(change.content, 1, { indent: '  + ' }))}\n`,
        );

        break;
      }

      case 'update': {
        console.log(
          gray(`~ ${change.path}`),
          `\n${yellow(indentString(change.preview, 1, { indent: '  ~ ' }))}\n`,
        );

        break;
      }
    }
  });
}

export async function applyFileChanges(changes: FileChange[]) {
  await Promise.all(
    changes.map(async (change) => {
      await Bun.write(change.path, change.content);
    }),
  );
}

export interface GetFileChangesForModuleExportOptions {
  path: string;
  module: string;
}

export async function getFileChangesForModuleExport(
  options: GetFileChangesForModuleExportOptions,
): Promise<FileChange[]> {
  if (!(await Bun.file(options.path).exists())) {
    return [
      {
        type: 'insert',
        path: options.path,
        content: `export * from '${options.module}'`,
      },
    ];
  }

  const content = await Bun.file(options.path).text();
  const isModuleAlreadyExported = new RegExp(
    `export.*from.*('|")${options.module}('|")`,
  ).test(content);

  if (!isModuleAlreadyExported) {
    const append = `export * from '${options.module}'`;
    return [
      {
        type: 'update',
        path: options.path,
        content: `${content}\n${append}`,
        preview: `...\n${append}`,
      },
    ];
  }

  return [];
}
