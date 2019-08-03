import { Command } from 'commander';

new Command()
  .command('create <name> [content]', 'Create a new migration')
  .command('execute', 'Execute outstanding migrations')
  .parse(process.argv);
