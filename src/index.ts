#!/usr/bin/env node
import { name, version } from '../package.json';
import { commands } from './commands';
import { createCommand } from './commands/utils';
import { catchError } from './utils/action';
import { getRevision, getVersion } from './version' with { type: 'macro' };

process.on('uncaughtException', catchError);

if (['-v', '--version'].includes(process.argv[2])) {
  console.log(getVersion());
  process.exit(0);
}

if (['--revision'].includes(process.argv[2])) {
  console.log(getRevision());
  process.exit(0);
}

const program = createCommand().name(name);
commands.forEach((command) => program.addCommand(command));
program.parse(process.argv);
