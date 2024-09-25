import { cyan, gray } from 'yoctocolors';

export function cmd(command: string) {
  return `${gray('`')}${cyan(`${command}`)}${gray('`')}`;
}
