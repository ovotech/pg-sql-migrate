import { readdirSync, unlinkSync, writeFileSync } from 'fs';
import { join, relative } from 'path';
import { Client } from 'pg';
import { exec } from 'child_process';
import { Readable } from 'stream';

const client = 'postgresql://postgres:dev-pass@0.0.0.0:5432/postgres';
const directory = join(__dirname, 'sigterm.migrations');
const root = join(__dirname, '..');

let pg: Client;

const deleteMigrations = (dir: string): void =>
  readdirSync(dir)
    .filter((file) => file.endsWith('pgsql'))
    .forEach((file) => unlinkSync(join(dir, file)));

const waitForText = async (text: string, stdout: Readable): Promise<void> => {
  await new Promise((resolve) => {
    const onMigrationReached = (chunk: string): void => {
      if (chunk.includes(text)) {
        stdout.off('data', onMigrationReached);
        resolve(undefined);
      }
    };

    stdout.on('data', onMigrationReached);
  });
};

describe('Cli', () => {
  beforeEach(async () => {
    pg = new Client(client);
    await pg.connect();
    await pg.query('DROP TABLE IF EXISTS "sigterm_testing"; DROP TABLE IF EXISTS "sigterm_test2";');
    deleteMigrations(directory);
  });

  afterEach(async () => {
    deleteMigrations(directory);
    await pg.query('DROP TABLE IF EXISTS "sigterm_testing"; DROP TABLE IF EXISTS "sigterm_test2";');
    await pg.end();
  });

  it('Should drop all migrations', async () => {
    jest.setTimeout(20000);
    writeFileSync(
      join(directory, '2018-12-31T11:12:39.672Z_test-sigterm1.pgsql'),
      'CREATE TABLE sigterm_test2 (id INTEGER PRIMARY KEY, name VARCHAR)',
    );
    writeFileSync(
      join(directory, '2018-12-31T11:57:10.022Z_test-sigterm2.pgsql'),
      'INSERT INTO sigterm_test2 (id, name) VALUES ' +
        [...Array(1000000).keys()].map((key) => `(${key}, 'test-item-${key}')`).join(','),
    );

    const configDirectory = relative(root, directory);
    const command = `yarn migrate execute --config-client "${client}" --config-directory "${configDirectory}" --config-table "sigterm_testing"`;

    await new Promise(async (commandReosolve) => {
      const commandProcess = exec(command, { cwd: root }, () => commandReosolve(undefined));

      const { stdout, stderr } = commandProcess;

      if (!stdout || !stderr) {
        throw new Error(`Could not start ${command} for testing`);
      }

      await waitForText('test-sigterm2.pgsql', stdout);

      await new Promise((resolve) => setTimeout(resolve, 10));

      commandProcess.kill('SIGTERM');

      await waitForText('Graceful shutdown successful', stdout);
    });
  });
});
