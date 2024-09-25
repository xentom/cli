import { Command } from 'commander';
import { createHelpOption } from '../options/help';

export function createCommand() {
  return new Command()
    .showHelpAfterError()
    .addHelpOption(createHelpOption())
    .helpCommand(false);
}
