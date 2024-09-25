import { Option } from 'commander';

export function createHelpOption() {
  return new Option(
    '-h, --help',
    'Show help information for the specified command',
  );
}
