import { createActionCommand } from './action';
import { createBuildCommand } from './build';
import { createDevCommand } from './dev';
import { createInitCommand } from './init';
import { createLoginCommand } from './login';
import { createLogoutCommand } from './logout';
import { createPinCommand } from './pin';
import { createPublishCommand } from './publish';
import { createStartCommand } from './start';
import { createUpgradeCommand } from './upgrade';
import { createWhoamiCommand } from './whoami';

export const commands = [
  // General commands
  createLoginCommand(),
  createLogoutCommand(),
  createWhoamiCommand(),
  createUpgradeCommand(),

  // Integration commands
  createBuildCommand(),
  createDevCommand(),
  createInitCommand(),
  createPublishCommand(),
  createActionCommand(),
  createPinCommand(),

  // Workflow commands
  createStartCommand(),
];
