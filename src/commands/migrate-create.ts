import * as commander from 'commander';
import { DEFAULT_CONFIG_FILE, MigrationLogger } from '../types';
import { loadConfig } from '../migrate';
import { writeFileSync } from 'fs';
import { join } from 'path';

export const migrateCreate = (logger: MigrationLogger = console): commander.Command =>
  commander
    .createCommand('create')
    .arguments('<name> [content]')
    .option('-c, --config <path>', 'Path to the configuration file', DEFAULT_CONFIG_FILE)
    .action(async (name: string, content: string | undefined, { config }: { config?: string }) => {
      const { directory } = loadConfig(config);
      const file = `${new Date().toISOString()}_${name}.pgsql`;

      writeFileSync(join(directory, file), content || '');

      logger.info(`Created ${file}`);
    });
