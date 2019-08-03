import { Transform, TransformCallback } from 'stream';
import { Migration } from './types';

export class MigrationsLogTransform extends Transform {
  public constructor() {
    super({ objectMode: true });
  }

  public _transform(data: Migration, encoding: string, callback: TransformCallback): void {
    console.log(`[${data.id}] ${data.name}`);
    callback(null, data);
  }
}
