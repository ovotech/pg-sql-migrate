import { loadConfig } from '../src';
import { readdirSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';
import { execSync } from 'child_process';

const configFile = join(__dirname, 'cli.config.json');
const { client, directory } = loadConfig(configFile);

let pg: Client;

const deleteMigrations = (dir: string): void =>
  readdirSync(dir)
    .filter(file => file.endsWith('pgsql'))
    .forEach(file => unlinkSync(join(dir, file)));

describe('Cli', () => {
  beforeEach(async () => {
    pg = new Client(client);
    await pg.connect();
    await pg.query('DROP TABLE IF EXISTS cli_testing; DROP TABLE IF EXISTS my_test;');
    deleteMigrations(directory);
  });

  afterEach(async () => {
    deleteMigrations(directory);
    await pg.query('DROP TABLE IF EXISTS cli_testing; DROP TABLE IF EXISTS my_test;');
    await pg.end();
  });

  it('Should use streams to execute migrations', async () => {
    writeFileSync(
      join(directory, '2018-12-31T11:12:39.672Z_test-things.pgsql'),
      'CREATE TABLE my_test (id INTEGER PRIMARY KEY, name VARCHAR)',
    );
    writeFileSync(
      join(directory, '2018-12-31T11:57:10.022Z_test-things2.pgsql'),
      'ALTER TABLE my_test ADD COLUMN additional VARCHAR',
    );

    execSync(`scripts/pg-migrate execute --config ${configFile}`);

    execSync(
      `scripts/pg-migrate create --config ${configFile} new 'ALTER TABLE my_test ADD COLUMN additional_2 VARCHAR;'`,
    );

    execSync(`scripts/pg-migrate execute --config ${configFile}`);

    const finishedMigrations = await pg.query('SELECT id FROM cli_testing');
    const migratedTable = await pg.query('SELECT * FROM my_test');

    expect(finishedMigrations.rows).toMatchObject([
      { id: '2018-12-31T11:12:39.672Z' },
      { id: '2018-12-31T11:57:10.022Z' },
      { id: expect.any(String) },
    ]);

    expect(migratedTable.fields).toMatchObject([
      expect.objectContaining({ name: 'id' }),
      expect.objectContaining({ name: 'name' }),
      expect.objectContaining({ name: 'additional' }),
      expect.objectContaining({ name: 'additional_2' }),
    ]);
  });

  it('Should use not run migrations on dry run', async () => {
    writeFileSync(
      join(directory, '2018-12-31T11:12:39.672Z_test-things.pgsql'),
      'CREATE TABLE my_test (id INTEGER PRIMARY KEY, name VARCHAR)',
    );

    execSync(`scripts/pg-migrate execute --config ${configFile} --dry-run`);

    const finishedMigrations = await pg.query('SELECT id FROM cli_testing');

    expect(finishedMigrations.rows).toHaveLength(0);

    await expect(pg.query('SELECT * FROM my_test')).rejects.toEqual(
      new Error('relation "my_test" does not exist'),
    );
  });

  it('Should handle error in migration', async () => {
    writeFileSync(join(directory, '2018-12-31T11:12:39.672Z_test-things.pgsql'), 'CREATE TABLE');

    expect(() => {
      execSync(`scripts/pg-migrate execute --config ${configFile}`);
    }).toThrowError('syntax error at end of input');
  });
});
