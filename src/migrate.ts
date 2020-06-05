import { loadConfigFile } from '@ovotech/config-file';
import { Client } from 'pg';
import { MigrationError } from './';
import {
  Config,
  CONFIG_DEFAULTS,
  DEFAULT_CONFIG_FILE,
  Migration,
  MigrationClient,
  MigrationLogger,
} from './types';
import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

export const filenameParts = (filename: string): { name: string; id: string; filename: string } => {
  const [id, ...name] = filename.split('_');
  return { filename, id, name: name.join('_') };
};

export const readMigrations = ({
  directory,
  executedIds = [],
}: {
  directory: string;
  executedIds?: string[];
}): Migration[] =>
  readdirSync(directory)
    .filter((file) => file.endsWith('.pgsql'))
    .map((file) => filenameParts(file))
    .filter(({ id }) => !executedIds.includes(id))
    .map(({ filename, id, name }) => {
      const content = readFileSync(join(directory, filename)).toString();
      return { id, name, content };
    });

export const readExecutedIds = async ({
  db,
  table,
}: {
  db: MigrationClient;
  table: string;
}): Promise<string[]> => {
  const tableName = db.escapeIdentifier(table);
  await db.query(`CREATE TABLE IF NOT EXISTS ${tableName} (id VARCHAR PRIMARY KEY)`);
  const idsResult = await db.query(`SELECT id FROM ${tableName}`);
  return idsResult.rows.map((row) => row.id);
};

export const isTransactionDisabled = (migration: string): boolean =>
  migration.startsWith('-- pg-sql-migrate: DISABLE TRANSACTION');

export const executeMigrations = async ({
  db,
  table,
  logger,
  migrations,
}: {
  db: MigrationClient;
  table: string;
  logger: MigrationLogger;
  migrations: Migration[];
}): Promise<void> => {
  for (const migration of migrations) {
    try {
      logger.info(`Executing [${migration.id}] ${migration.name}`);
      if (!isTransactionDisabled(migration.content)) {
        await db.query('BEGIN');
      }
      await db.query(migration.content);
      await db.query(`INSERT INTO ${db.escapeIdentifier(table)} VALUES ($1);`, [migration.id]);
      if (!isTransactionDisabled(migration.content)) {
        await db.query('COMMIT');
      }
    } catch (error) {
      try {
        if (!isTransactionDisabled(migration.content)) {
          await db.query('ROLLBACK');
        }
      } finally {
        throw new MigrationError(error.message, migration);
      }
    }
  }
};

export const readNewMigrations = async ({
  db,
  table,
  directory,
}: {
  db: MigrationClient;
  table: string;
  directory: string;
}): Promise<Migration[]> => {
  const executedIds = await readExecutedIds({ db, table });
  return readMigrations({ directory, executedIds });
};

export const loadConfig = (
  file = DEFAULT_CONFIG_FILE,
  env = process.env,
  { client, directory, table }: Partial<Config> = {},
): Config => {
  if (client !== undefined) {
    const loadConfig = existsSync(file)
      ? loadConfigFile<Config>({ file, env, defaults: CONFIG_DEFAULTS, required: ['client'] })
      : CONFIG_DEFAULTS;

    return {
      directory: directory ?? loadConfig.directory,
      table: table ?? loadConfig.table,
      client,
    };
  } else {
    return loadConfigFile<Config>({ file, env, defaults: CONFIG_DEFAULTS, required: ['client'] });
  }
};

export interface RunAndExecuteMigrations {
  db: MigrationClient;
  table: string;
  directory: string;
  logger?: MigrationLogger;
  dryRun?: boolean;
}

export const readAndExecuteMigrations = async ({
  table,
  directory,
  db,
  logger = console,
  dryRun = false,
}: RunAndExecuteMigrations): Promise<void> => {
  try {
    const migrations = await readNewMigrations({ db, table, directory });
    logger.info(
      migrations.length
        ? `Executing ${migrations.length} new migrations`
        : 'No new migrations found',
    );
    if (!dryRun) {
      await executeMigrations({ db, table, migrations, logger });
    }
    logger.info(`Successfully executed ${migrations.length} new migrations`);
  } catch (error) {
    if (error instanceof MigrationError) {
      logger.error(
        `Error executing [${error.migration.id}] ${error.migration.name}: ${error.message}`,
      );
    }
    throw error;
  }
};

export interface Migrate {
  config?: Partial<Config> | string;
  env?: NodeJS.ProcessEnv;
  logger?: MigrationLogger;
  dryRun?: boolean;
}

export const migrate = async ({
  config,
  env = process.env,
  logger = console,
  dryRun = false,
}: Migrate = {}): Promise<void> => {
  const { client, table, directory } =
    typeof config === 'object' ? { ...CONFIG_DEFAULTS, ...config } : loadConfig(config, env);

  const db = new Client(client);
  await db.connect();

  process.on('SIGTERM', async () => {
    logger.info('SIGTERM Encountered, discarding running migration');
    await db.query('ROLLBACK');
    await db.end();
    logger.info('Graceful shutdown successful');
  });

  try {
    await readAndExecuteMigrations({ db, table, directory, logger, dryRun });
  } finally {
    await db.end();
  }
};
