#!/usr/bin/env node

import * as program from 'commander';

program
  .version('3.0.0')
  .name('migrate')
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
  .command('create <name> [content]', 'Create a new migration')
  .command('execute', 'Execute outstanding migrations', { isDefault: true })
  .parse(process.argv);
