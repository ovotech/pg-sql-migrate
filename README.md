# Postgres migration tool with plain sql

A very small library for running sql migrations with postgres. It differs from the numerous other libs in this domain by being very minimal, using only raw timestamped sql files. No "down" migrations are provided by design, as that is usually a bad idea in production anyway.

## Using with CLI

```bash
yarn add @ovotech/pg-sql-migrate
```

add a configuration file, which by default is `./pg-sql-migrate.config.json` to configure the connection:

```json
{
  "client": "postgresql://postgres:dev-pass@0.0.0.0:5432/postgres",
  "directory": "migrations"
  "table" "migrations"
}
```

The default values for "directory" and "table" configuration is `migrations` but you can override that if you need to.

Instead of a string you can use an object. This is passed directly to pg https://node-postgres.com/features/connecting

```json
{
  "client": {
    "user": "postgres",
    "password": "dev-pass",
    "host": "0.0.0.0",
    "database": "postgres",
    "port": 5432
  }
}
```

To create new migrations in the designated directory you can run:

```bash
yarn pg-migrate create my_migration
```

This will create a file `migrations/<timestamp>_my_migration.pgsql` that you can place raw sql into. After that, you can run the migration(s) by calling

```bash
yarn pg-migrate execute
```

Then in your code you can:

```typescript
import { migrate } from '@ovotech/pg-sql-migrate';

const results = await migrate();
```

## Environment variables

In your config file you can use environment variables.

For example, if you have the env var `PG_USER_PASS` setup, you can access it with:

```json
{
  "client": "postgresql://postgres:${PG_USER_PASS}@0.0.0.0:5432/postgres",
  "directory": "migrations"
  "table" "migrations"
}
```

## Using the library

You can choose a different location for the config file, or to just input its contents directly:

```typescript
import { migrate } from '@ovotech/pg-sql-migrate';

const results = await migrate();

const results = await migrate('custom-config.json');

const results = await migrate({
  client: 'postgresql://postgres:dev-pass@0.0.0.0:5432/postgres',
  // Custom table location
  table: 'my_table',
  // Custom directory for migration files
  directory: 'migrations_dir',
});
```

## Low level node streams

If you want to use the underlying streams themselves you can do so:

```typescript
import { MigrationsReadable, MigrationsWritable } from '@ovotech/pg-sql-migrate';
import { Client } from 'pg';

const pg = new Client('postgresql://postgres:dev-pass@0.0.0.0:5432/postgres');

// Read the migration files and stream the migrations that have not yet run.
const migrations = new MigrationsReadable(pg, 'migrations_table', 'migrations_dir');

// Execute the migrations with the pg client, and save their status to the migrations table
const sink = new MigrationsWritable(pg, 'migrations_table');

migrations.pipe(sink).on('finish', () => console.log('Finished'));
```

## Running the tests

You can run the tests with:

```bash
yarn test
```

### Coding style (linting, etc) tests

Style is maintained with prettier and eslint

```
yarn lint
```

## Deployment

Deployment is preferment by circleci automatically on merge / push to master, but you'll need to bump the package version numbers yourself.

## Contributing

Have a bug? File an issue with a simple example that reproduces this so we can take a look & confirm.

Want to make a change? Submit a PR, explain why it's useful, and make sure you've updated the docs (this file) and the tests (see [test folder](test)).

## License

This project is licensed under Apache 2 - see the [LICENSE](LICENSE) file for details
