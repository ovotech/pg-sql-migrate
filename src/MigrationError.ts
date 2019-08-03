import { Migration } from './types';

export class MigrationError extends Error {
  public migration: Migration;
  public constructor(message: string | undefined, migration: Migration) {
    super(message);
    this.migration = migration;
  }
}
