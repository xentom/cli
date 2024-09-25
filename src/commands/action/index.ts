import { createCommand } from '@/commands/utils';
import { commands } from './commands';

export function createActionCommand() {
  const command = createCommand()
    .name('action')
    .description('Manage integration actions through subcommands');

  commands.forEach((cmd) => command.addCommand(cmd));
  return command;
}
