import { Command } from 'commander';
import { DEFAULT_CONFIG_FILE } from '../types';
import { loadConfig } from '../migrate';
import { writeFileSync } from 'fs';
import { join } from 'path';

new Command()
  .arguments('<name> [content]')
  .option('-c, --config <path>', 'Path to the configuration file', DEFAULT_CONFIG_FILE)
  .action(async (name: string, content: string, { config }: { config?: string }) => {
    const { directory } = loadConfig(config);
    const file = `${new Date().toISOString()}_${name}.pgsql`;

    writeFileSync(join(directory, file), content);

    console.log(`Created ${file}`);
  })
  .parse(process.argv);
