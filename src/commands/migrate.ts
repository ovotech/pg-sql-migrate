import { MigrationLogger } from '../types';
import * as commander from 'commander';
import { migrateCreate } from './migrate-create';
import { migrateExecute } from './migrate-execute';

export const migrate = (logger: MigrationLogger = console): commander.Command =>
  commander
    .createCommand('migrate')
    .version('3.0.0')
    .description(
      `PG Migrate CLI - A very small cli tool for running sql migrations with postgres.

execute (defualt)
  Subcommands for searching and manipulating kafka topics, as well as producing and consuming events from them.
  search, consume, produce, message, create, show, update

create
  Subcommands for getting schema versions of kafka topics.
  search, show

Example:
  migrate create my_migration_name
  migrate
`,
    )
    .addCommand(migrateCreate(logger))
    .addCommand(migrateExecute(logger));
