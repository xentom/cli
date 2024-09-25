import * as path from 'node:path';
import { createCommand } from '@/commands/utils';
import {
  applyFileChanges,
  getFileChangesForModuleExport,
  printFileChanges,
  type FileChange,
} from '@/lib/generator';
import { ActionError, actionErrorHandler } from '@/utils/action';
import { cmd } from '@/utils/output';
import { confirm, input, search } from '@inquirer/prompts';
import slugify from 'slugify';
import { green } from 'yoctocolors';

export function createActionAddCommand() {
  return createCommand()
    .name('add')
    .description('Add a new action to the integration configuration')
    .argument('[name]', 'Name of the action')
    .option('-g, --group [GROUP]', 'Group of the action')
    .option('-t, --trigger', 'Add action as a trigger', false)
    .option('-e, --empty', 'Add action without logic', false)
    .option('-f, --force', 'Apply changes without confirmation', false)
    .action(actionErrorHandler(addAction));
}

export interface AddActionOptions {
  force: boolean;
  trigger: boolean;
  empty: boolean;
  name?: string;
  group?: string;
}

export async function addAction(
  name: string | undefined,
  options: AddActionOptions,
) {
  options.name = name;
  if (!options.name) {
    options.name = await input({
      message: 'What is the name of the action?',
      required: true,
    });
  }

  if (!options.group) {
    const glob = new Bun.Glob('**/index.ts');
    const files = await toArray(glob.scan('src/actions')).catch(() => [
      'index.ts',
    ]);

    const choices = files.map((file) => ({
      value: file === 'index.ts' ? 'none' : file.slice(0, -'/index.ts'.length),
    }));

    options.group = await search({
      message: 'To which group does this action belong?',
      source(input) {
        if (!input) {
          return choices;
        }

        const filtered = choices.filter((choice) => {
          return (
            input !== choice.value &&
            choice.value.toLowerCase().startsWith(input.toLowerCase())
          );
        });

        return [{ value: input }, ...filtered];
      },
    });
  }

  const changes: FileChange[] = [];
  const actionsPath = 'src/actions';
  if (!options.group || options.group === 'none') {
    changes.push(
      ...(await getFileChangesForModuleExport({
        path: path.join(actionsPath, 'index.ts'),
        module: `./actions`,
      })),

      ...(await getFileChangesForActionExport(actionsPath, {
        ...options,
        group: '',
      })),
    );
  } else {
    const groups = [
      '.',
      ...options.group
        .split('/')
        .map((group) => slugify(group, { lower: true, strict: true })),
    ];

    await Promise.all(
      groups.map(async (group, index) => {
        const submodule = groups[index + 1];
        const basePath = path.join(actionsPath, ...groups.slice(0, index + 1));

        changes.push(
          ...(await getFileChangesForModuleExport({
            path: path.join(basePath, 'index.ts'),
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            module: `./${submodule ?? group}`,
          })),
        );

        if (!submodule) {
          changes.push(
            ...(await getFileChangesForActionExport(basePath, options)),
          );
        }
      }),
    );
  }

  printFileChanges(changes);

  if (!options.force) {
    const confirmed = await confirm({
      message: 'Do you want to apply these changes?',
    });

    if (!confirmed) {
      console.log('Changes were not applied');
      return;
    }
  }

  await applyFileChanges(changes);
  console.log(`${green('✓')} Action ${cmd(options.name)} added successfully`);
}

async function getFileChangesForActionExport(
  folderPath: string,
  options: AddActionOptions,
): Promise<FileChange[]> {
  const filename = `${path.basename(folderPath)}.ts`;
  const filepath = path.join(folderPath, filename);

  const names = options.name?.split(',').map((name) => name.trim()) ?? [];
  const actions = names
    .map((name) => getActionTemplate(name, options.trigger, options.empty))
    .join('\n');

  if (!(await Bun.file(filepath).exists())) {
    return [
      {
        type: 'insert',
        path: filepath,
        content: `import { createAction, pin } from '@xentom/integration'\n\nconst group = '${options.group}'\n\n${actions}`,
      },
    ];
  }

  const content = await Bun.file(filepath).text();

  names.forEach((name) => {
    const isActionAlreadyExported = content.includes(`export const ${name}`);

    if (isActionAlreadyExported) {
      throw new ActionError(
        `Action ${cmd(name)} already exists in ${cmd(filepath)}`,
      );
    }
  });

  return [
    {
      type: 'update',
      path: filepath,
      content: `${content}\n${actions}`,
      preview: `...\n${actions}`,
    },
  ];
}

function getActionTemplate(name: string, trigger: boolean, empty: boolean) {
  return trigger
    ? `export const ${name} = createAction({
  group,
  outputs: {
    exec: pin.exec(),
  },
  run({ next }) {
    ${empty ? '' : "// Implement the action logic here and invoke 'next' to trigger the connected actions.\n"}
  },
});
`
    : `export const ${name} = createAction({
  group,
  inputs: {
    exec: pin.exec({
      run({ next }) {
        ${empty ? '' : "// Implement the action logic here and invoke 'next' to trigger the connected actions.\n"}
        next('exec');
      },
    }),
  },
  outputs: {
    exec: pin.exec(),
  },
});
`;
}

async function toArray(asyncIterator: AsyncIterableIterator<string>) {
  const arr = [];
  for await (const i of asyncIterator) arr.push(i);
  return arr;
}
