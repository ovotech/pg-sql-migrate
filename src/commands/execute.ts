import { DEFAULT_CONFIG_FILE, MigrationLogger } from '../types';
import { Command } from 'commander';
import { migrate } from '../migrate';

export const execute = (command: Command, logger: MigrationLogger = console): Command =>
  command
    .option('-d, --dry-run', 'Output results without running the migrations')
    .option('-c, --config <path>', 'Path to the configuration file', DEFAULT_CONFIG_FILE)
    .action(async ({ config, dryRun }: { config?: string; dryRun?: boolean }) => {
      await migrate({ config, logger, dryRun });
    });
