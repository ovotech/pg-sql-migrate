import { Command } from 'commander';
import { DEFAULT_CONFIG_FILE } from '../types';
import { loadConfig } from '../migrate';
import { MigrationsWritable } from '../MigrationsWritable';
import { MigrationsReadable } from '../MigrationsReadable';
import { Client } from 'pg';
import { pipeline, Writable } from 'stream';
import { MigrationsLogTransform } from '../MigrationsLogTransform';
import { promisify } from 'util';

new Command()
  .option('-d, --dry-run', 'Output results without running the migrations')
  .option('-c, --config <path>', 'Path to the configuration file', DEFAULT_CONFIG_FILE)
  .action(async ({ config, dryRun }: { config?: string; dryRun?: boolean }) => {
    const { client, table, directory } = loadConfig(config);

    const pg = new Client(client);
    await pg.connect();

    const read = new MigrationsReadable(pg, table, directory);
    const log = new MigrationsLogTransform();
    const sink = dryRun
      ? new Writable({ objectMode: true, write: (data, encoding, cb) => cb() })
      : new MigrationsWritable(pg, table);

    try {
      await promisify(pipeline)(read, log, sink);
      console.log(`Finished`);
      await pg.end();
    } catch (error) {
      console.error(error);
      await pg.end();
      process.exit(1);
    }
  })
  .parse(process.argv);
