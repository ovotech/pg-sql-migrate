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
    .option('-D, --config-directory <path>', 'Specify inline the directory of migrations')
    .option('-P, --config-table <path>', 'Specify inline the table used migrations')
    .option('-C, --config-client <path>', 'Specify inline the connection string for the client')
    .action(
      async ({
        config,
        configDirectory,
        configTable,
        configClient,
        dryRun,
      }: MigrateExecuteArguments) => {
        await migrate({
          config: loadConfig(config, process.env, {
            client: configClient,
            directory: configDirectory,
            table: configTable,
          }),
          logger,
          dryRun,
        });
      },
    );
