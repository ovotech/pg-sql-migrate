import { ClientConfig, ClientBase } from 'pg';

export interface Config {
  client: ClientConfig | string;
  directory: string;
  table: string;
}

export interface Migration {
  id: string;
  name: string;
  content: string;
}

export interface PGClient {
  query: ClientBase['query'];
}

export const DEFAULT_CONFIG_FILE = 'pg-sql-migrate.config.json';

export const CONFIG_DEFAULTS = {
  directory: 'migrations',
  table: 'migrations',
};
