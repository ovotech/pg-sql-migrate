import { ClientConfig, ClientBase } from 'pg';

export interface Config {
  client: ClientConfig | string;
  directory: string;
  table: string;
}

export interface MigrationLogger {
  info: (message: string) => unknown;
  error: (message: string) => unknown;
}

export interface Migration {
  id: string;
  name: string;
  content: string;
}

export type MigrationClient = Pick<ClientBase, 'query' | 'escapeIdentifier'>;

export const DEFAULT_CONFIG_FILE = 'migrate.config.json';

export const CONFIG_DEFAULTS = {
  directory: 'migrations',
  table: 'migrations',
};
