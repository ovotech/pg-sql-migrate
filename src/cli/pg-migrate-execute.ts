import { Command } from 'commander';
import { DEFAULT_CONFIG_FILE, Migration } from '../types';
import { loadConfig } from '../migrate';
import { MigrationsWritable } from '../MigrationsWritable';
import { MigrationsReadable } from '../MigrationsReadable';
import { Client } from 'pg';
import { pipeline, Transform, Writable } from 'stream';

new Command()
  .option('-d, --dry-run', 'Output results without running the migrations')
  .option('-c, --config <path>', 'Path to the configuration file', DEFAULT_CONFIG_FILE)
  .action(async ({ config, dryRun }: { config?: string; dryRun?: boolean }) => {
    const { client, table, dir } = loadConfig(config);

    const pg = new Client(client);
    await pg.connect();

    const migrations = new MigrationsReadable(pg, table, dir);
    const log = new Transform({
      objectMode: true,
      transform: (data: Migration, encoding, callback) => {
        console.log(`[${data.id}] ${data.name}`);
        callback(null, data);
      },
    });
    const nullSink = new Writable({
      objectMode: true,
      write: (data, encoding, callback) => callback(),
    });

    const sink = dryRun ? nullSink : new MigrationsWritable(pg, table);

    try {
      await new Promise((resolve, reject) =>
        pipeline(migrations, log, sink, error => (error ? reject(error) : resolve())),
      );
      console.log(`Finished`);
      await pg.end();
    } catch (error) {
      console.error(error);
      await pg.end();
      process.exit(1);
    }
  })
  .parse(process.argv);
