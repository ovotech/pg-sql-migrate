import { loadConfig } from '../src';
import { migrate } from '../src/commands/migrate';
import { readdirSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';

const configFile = join(__dirname, 'cli.config.json');
const { client, directory } = loadConfig(configFile);

let pg: Client;

const deleteMigrations = (dir: string): void =>
  readdirSync(dir)
    .filter((file) => file.endsWith('pgsql'))
    .forEach((file) => unlinkSync(join(dir, file)));

describe('Cli', () => {
  beforeEach(async () => {
    pg = new Client(client);
    await pg.connect();
    await pg.query('DROP TABLE IF EXISTS "cli_testing"; DROP TABLE IF EXISTS "my_test2";');
    deleteMigrations(directory);
  });

  afterEach(async () => {
    deleteMigrations(directory);
    await pg.query('DROP TABLE IF EXISTS "cli_testing"; DROP TABLE IF EXISTS "my_test2";');
    await pg.end();
  });

  it('Should use streams to execute migrations', async () => {
    const logger = { info: jest.fn(), error: jest.fn() };

    writeFileSync(
      join(directory, '2018-12-31T11:12:39.672Z_test-things.pgsql'),
      'CREATE TABLE my_test2 (id INTEGER PRIMARY KEY, name VARCHAR)',
    );
    writeFileSync(
      join(directory, '2018-12-31T11:57:10.022Z_test-things2.pgsql'),
      'ALTER TABLE my_test2 ADD COLUMN additional VARCHAR',
    );

    await migrate(logger).parseAsync(['node', 'migrate', 'execute', '--config', configFile]);

    expect(logger.info).toHaveBeenCalledWith(
      `Executing [2018-12-31T11:12:39.672Z] test-things.pgsql`,
    );
    expect(logger.info).toHaveBeenCalledWith(
      `Executing [2018-12-31T11:57:10.022Z] test-things2.pgsql`,
    );

    await migrate(logger).parseAsync([
      'node',
      'migrate',
      'create',
      '--config',
      configFile,
      'new',
      'ALTER TABLE my_test2 ADD COLUMN additional_2 VARCHAR;',
    ]);

    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Created'));

    await migrate(logger).parseAsync(['node', 'migrate', 'execute', '--config', configFile]);

    expect(logger.info).toHaveBeenCalledWith('Executing 1 new migrations');

    const finishedMigrations = await pg.query('SELECT id FROM cli_testing');
    const migratedTable = await pg.query('SELECT * FROM my_test2');

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
    const logger = { info: jest.fn(), error: jest.fn() };

    writeFileSync(
      join(directory, '2018-12-31T11:12:39.672Z_test-things.pgsql'),
      'CREATE TABLE my_test (id INTEGER PRIMARY KEY, name VARCHAR)',
    );

    await migrate(logger).parseAsync([
      'node',
      'migrate',
      'execute',
      '--config',
      configFile,
      '--dry-run',
    ]);

    expect(logger.info).toHaveBeenCalledWith('Executing 1 new migrations');

    const finishedMigrations = await pg.query('SELECT id FROM cli_testing');

    expect(finishedMigrations.rows).toHaveLength(0);

    await expect(pg.query('SELECT * FROM my_test2')).rejects.toEqual(
      new Error('relation "my_test2" does not exist'),
    );
  });

  it('Should handle error in migration', async () => {
    const logger = { info: jest.fn(), error: jest.fn() };
    writeFileSync(join(directory, '2018-12-31T11:12:39.672Z_test-things.pgsql'), 'CREATE TABLE');

    const result = migrate(logger).parseAsync([
      'node',
      'migrate',
      'execute',
      '--config',
      configFile,
    ]);

    await expect(result).rejects.toEqual(new Error('syntax error at end of input'));

    expect(logger.error).toHaveBeenCalledWith(
      'Error executing [2018-12-31T11:12:39.672Z] test-things.pgsql: syntax error at end of input',
    );
  });
});
