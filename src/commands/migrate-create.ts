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
    .option('--config-directory <path>', 'Specify inline the directory of migrations')
    .action(
      async (
        name: string,
        content: string | undefined,
        { config, configDirectory }: { config?: string; configDirectory?: string },
      ) => {
        const { directory } = loadConfig(config, process.env, { directory: configDirectory });
        const file = `${new Date().toISOString()}_${name}.pgsql`;

        writeFileSync(join(directory, file), content || '');

        logger.info(`Created ${file}`);
      },
    );
