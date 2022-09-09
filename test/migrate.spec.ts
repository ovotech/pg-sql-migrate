import { join } from 'path';
import { Client } from 'pg';
import { migrate, loadConfig } from '../src';

const config = join(__dirname, 'migrate.config.json');
const { client } = loadConfig(config);
let pg: Client;

describe('Migrate', () => {
  beforeEach(async () => {
    pg = new Client(client);
    await pg.connect();
    await pg.query(`
      DROP TABLE IF EXISTS testing;
      DROP TABLE IF EXISTS testing2;
      DROP TABLE IF EXISTS testing3;
      DROP TABLE IF EXISTS my_test;
      DROP TABLE IF EXISTS my_test2;
      DROP TYPE IF EXISTS my_type;
    `);
  });

  afterEach(() => pg.end());

  it('Should run migrate function', async () => {
    const logger = { info: jest.fn(), error: jest.fn() };
    await migrate({ config, logger });

    const finishedMigrations = await pg.query('SELECT id FROM testing');
    const migratedTable = await pg.query('SELECT * FROM my_test');

    expect(logger.info.mock.calls).toEqual([
      ['Executing 4 new migrations'],
      ['Executing [2018-12-31T11:12:39.672Z] test-things.pgsql'],
      ['Executing [2018-12-31T11:57:10.022Z] test-things2.pgsql'],
      ['Executing [2018-12-31T12:10:49.562Z] test-other.pgsql'],
      ['Executing [2019-01-02T08:36:08.858Z] test-other-3.pgsql'],
      ['Successfully executed 4 new migrations'],
    ]);

    expect(finishedMigrations.rows).toEqual([
      { id: '2018-12-31T11:12:39.672Z' },
      { id: '2018-12-31T11:57:10.022Z' },
      { id: '2018-12-31T12:10:49.562Z' },
      { id: '2019-01-02T08:36:08.858Z' },
    ]);

    expect(migratedTable.fields).toMatchObject([
      expect.objectContaining({ name: 'id' }),
      expect.objectContaining({ name: 'name' }),
      expect.objectContaining({ name: 'additional' }),
      expect.objectContaining({ name: 'additional_2' }),
      expect.objectContaining({ name: 'additional_3' }),
    ]);
  });

  it('Should run migrate function with custom config', async () => {
    const logger = { info: jest.fn(), error: jest.fn() };
    await migrate({
      config: {
        client: 'postgresql://postgres:dev-pass@0.0.0.0:5432/postgres',
        directory: 'test/migrations2',
        table: 'testing2',
      },
      logger,
    });

    const finishedMigrations = await pg.query('SELECT id FROM testing2');
    const migratedTable = await pg.query('SELECT * FROM my_test2');

    expect(finishedMigrations.rows).toEqual([{ id: '2018-12-31T11:12:39.672Z' }]);

    expect(migratedTable.fields).toMatchObject([
      expect.objectContaining({ name: 'id' }),
      expect.objectContaining({ name: 'name' }),
    ]);
  });

  it('Should disable transactions for some migrations', async () => {
    const logger = { info: jest.fn(), error: jest.fn() };
    await migrate({
      config: {
        client: 'postgresql://postgres:dev-pass@0.0.0.0:5432/postgres',
        directory: 'test/migrations-with-dsiabled-transactions',
        table: 'testing3',
      },
      logger,
    });

    const finishedMigrations = await pg.query('SELECT id FROM testing3');
    const migratedEnum = await pg.query('SELECT enum_range(NULL::my_type)');

    expect(finishedMigrations.rows).toEqual([
      { id: '2018-12-30T11:12:39.672Z' },
      { id: '2018-12-31T12:12:39.672Z' },
    ]);
    expect(migratedEnum.rows).toEqual([{ enum_range: '{VAL1,VAL2}' }]);
  });

  it('Should run migrate upto a given id', async () => {
    const logger = { info: jest.fn(), error: jest.fn() };
    await migrate({ config, logger, upTo: '2018-12-31T11:57:10.022Z' });

    const finishedMigrations = await pg.query('SELECT id FROM testing');

    expect(logger.info.mock.calls).toEqual([
      ['Executing 2 new migrations'],
      ['Executing [2018-12-31T11:12:39.672Z] test-things.pgsql'],
      ['Executing [2018-12-31T11:57:10.022Z] test-things2.pgsql'],
      ['Successfully executed 2 new migrations'],
    ]);

    expect(finishedMigrations.rows).toEqual([
      { id: '2018-12-31T11:12:39.672Z' },
      { id: '2018-12-31T11:57:10.022Z' },
    ]);
  });
});
