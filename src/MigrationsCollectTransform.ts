import { Transform } from 'stream';
import { Migration } from './types';

export class MigrationsCollectTransform extends Transform {
  public migrations: Migration[] = [];
  public constructor() {
    super({ objectMode: true });
  }

  public async _transform(
    data: Migration,
    encoding: string,
    callback: (error: Error | null | undefined, data: Migration) => void,
  ): Promise<void> {
    this.migrations.push(data);
    callback(null, data);
  }
}
