import { loadConfigFile } from '@ovotech/config-file';
import { Client } from 'pg';
import { MigrationsReadable, MigrationsWritable } from './';
import { Config, CONFIG_DEFAULTS, DEFAULT_CONFIG_FILE, Migration, PGClient } from './types';
import { pipeline } from 'stream';
import { promisify } from 'util';
import { MigrationsCollectTransform } from './MigrationsCollectTransform';

export const executeMigrations = async (
  pg: PGClient,
  table: string,
  dir: string,
): Promise<Migration[]> => {
  const read = new MigrationsReadable(pg, table, dir);
  const sink = new MigrationsWritable(pg, table);
  const collect = new MigrationsCollectTransform();

  await promisify(pipeline)(read, collect, sink);
  return collect.migrations;
};

export const loadConfig = (file = DEFAULT_CONFIG_FILE, env = process.env): Config =>
  loadConfigFile<Config>({ file, env, defaults: CONFIG_DEFAULTS, required: ['client'] });

export const migrate = async (
  config?: Config | string,
  env = process.env,
): Promise<Migration[]> => {
  const { client, table, dir } = typeof config === 'object' ? config : loadConfig(config, env);

  const pg = new Client(client);
  await pg.connect();
  const results = await executeMigrations(pg, table, dir);
  await pg.end();
  return results;
};
