import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { QueryResult } from 'pg';
import { Readable } from 'stream';
import { Migration, PGClient } from './types';

export const nameParts = (name: string): string[] => {
  const [first, ...rest] = name.split('_');
  return [first, rest.join('_')];
};

export class MigrationsReadable extends Readable {
  private current: number = 0;
  private migrationFiles?: string[];
  private pg: PGClient;
  private table: string;
  private directory: string;

  public constructor(pg: PGClient, table: string, directory: string) {
    super({ objectMode: true });
    this.pg = pg;
    this.table = table;
    this.directory = directory;
  }

  private async initialize(): Promise<void> {
    const migrationFiles = readdirSync(this.directory).filter(file => file.endsWith('.pgsql'));
    await this.initState();
    const completed = await this.loadState();

    this.migrationFiles = migrationFiles.filter(file => !completed.includes(nameParts(file)[0]));
  }

  private async next(): Promise<Migration | null> {
    if (!this.migrationFiles) {
      await this.initialize();
    }

    if (this.migrationFiles && this.migrationFiles[this.current]) {
      const file = this.migrationFiles[this.current++];
      const [id, name] = nameParts(file);
      const content = readFileSync(join(this.directory, file)).toString();
      const migration: Migration = { id, name, content };
      return migration;
    } else {
      return null;
    }
  }

  public async _read(): Promise<void> {
    this.push(await this.next());
  }

  private async initState(): Promise<QueryResult> {
    return await this.pg.query(`CREATE TABLE IF NOT EXISTS ${this.table} (id VARCHAR PRIMARY KEY)`);
  }

  private async loadState(): Promise<string[]> {
    return (await this.pg.query(`SELECT id FROM ${this.table}`)).rows.map(row => row.id);
  }
}
