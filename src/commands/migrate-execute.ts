import { DEFAULT_CONFIG_FILE, MigrationLogger } from '../types';
import * as commander from 'commander';
import { migrate, loadConfig } from '../migrate';

export interface MigrateExecuteArguments {
  config?: string;
  dryRun?: boolean;
  configDirectory?: string;
  configTable?: string;
  configClient?: string;
}

export const migrateExecute = (logger: MigrationLogger = console): commander.Command =>
  commander
    .createCommand('execute')
    .option('-d, --dry-run', 'Output results without running the migrations')
    .option('-c, --config <path>', 'Path to the configuration file', DEFAULT_CONFIG_FILE)
    .option('--config-directory <path>', 'Specify inline the directory of migrations')
    .option('--config-table <path>', 'Specify inline the table used migrations')
    .option('--config-client <path>', 'Specify inline the connection string for the client')
    .action(
      async ({
        config,
        configDirectory,
        configTable,
        configClient,
        dryRun,
      }: MigrateExecuteArguments) => {
        const loadedConfig = loadConfig(config, process.env);
        const modifiedConfig = {
          ...loadedConfig,
          directory: configDirectory ?? loadedConfig.directory,
          table: configTable ?? loadedConfig.table,
          client: configClient ?? loadedConfig.client,
        };

        await migrate({ config: modifiedConfig, logger, dryRun });
      },
    );
