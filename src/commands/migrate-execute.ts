import { DEFAULT_CONFIG_FILE, MigrationLogger } from '../types';
import * as commander from 'commander';
import { migrate } from '../migrate';

export const migrateExecute = (logger: MigrationLogger = console): commander.Command =>
  commander
    .createCommand('execute')
    .option('-d, --dry-run', 'Output results without running the migrations')
    .option('-c, --config <path>', 'Path to the configuration file', DEFAULT_CONFIG_FILE)
    .action(async ({ config, dryRun }: { config?: string; dryRun?: boolean }) => {
      await migrate({ config, logger, dryRun });
    });
