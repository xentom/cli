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
import { confirm, input } from '@inquirer/prompts';
import slugify from 'slugify';
import { green } from 'yoctocolors';

export function createPinAddCommand() {
  return createCommand()
    .name('add')
    .description('Add a new pin to the integration configuration')
    .argument('[name]', 'Name of the action pin')
    .option('-f, --force', 'Apply changes without confirmation', false)
    .action(actionErrorHandler(addPin));
}

export interface AddPinOptions {
  force: boolean;
  name?: string;
}

export async function addPin(name: string | undefined, options: AddPinOptions) {
  options.name = name;
  if (!options.name) {
    options.name = await input({
      message: 'What is the name of the action pin?',
      required: true,
    });
  }

  const slug = slugify(options.name);
  const changes: FileChange[] = [
    ...(await getFileChangesForModuleExport({
      path: path.join('src', 'pins', 'index.ts'),
      module: `./${slug}`,
    })),

    ...(await getFileChangesForPinExport(
      path.join('src', 'pins', `${slug}.ts`),
      options.name,
    )),
  ];

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

  console.log(
    `${green('✓')} Action pin ${cmd(options.name)} added successfully`,
  );
}

async function getFileChangesForPinExport(
  pinFilePath: string,
  pinName: string,
): Promise<FileChange[]> {
  if (await Bun.file(pinFilePath).exists()) {
    throw new ActionError(
      `Pin ${cmd(pinName)} already exists in ${cmd(pinFilePath)}`,
    );
  }

  return [
    {
      type: 'insert',
      path: pinFilePath,
      content: `import { pin } from '@xentom/integration';

export const ${pinName} = pin.custom().extend({
  // Define your pin here
});
`,
    },
  ];
}
