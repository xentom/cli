import { createCommand } from '@/commands/utils';
import { commands } from './commands';

export function createPinCommand() {
  const command = createCommand()
    .name('pin')
    .description('Manage integration pins through subcommands');

  commands.forEach((cmd) => command.addCommand(cmd));
  return command;
}
