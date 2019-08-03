import { Writable } from 'stream';
import { MigrationError } from './MigrationError';
import { Migration, PGClient } from './types';

export class MigrationsWritable extends Writable {
  private pg: PGClient;
  private table: string;
  public constructor(pg: PGClient, table: string) {
    super({ objectMode: true });
    this.pg = pg;
    this.table = table;
  }

  public async _write(
    migration: Migration,
    encoding: string,
    callback: (error?: Error | null) => void,
  ): Promise<void> {
    try {
      await this.pg.query(migration.content);
      await this.pg.query(`INSERT INTO ${this.table} VALUES ($1)`, [migration.id]);
      callback(null);
    } catch (error) {
      callback(new MigrationError(error.message, migration));
    }
  }
}
