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
      DROP TABLE IF EXISTS my_test;
      DROP TABLE IF EXISTS my_test2;
    `);
  });

  afterEach(() => pg.end());

  it('Should run migrate function', async () => {
    const results = await migrate(config);

    const finishedMigrations = await pg.query('SELECT id FROM testing');
    const migratedTable = await pg.query('SELECT * FROM my_test');

    expect(results).toEqual([
      {
        id: '2018-12-31T11:12:39.672Z',
        name: 'test-things.pgsql',
        content: 'CREATE TABLE my_test (id INTEGER PRIMARY KEY, name VARCHAR);\n',
      },
      {
        id: '2018-12-31T11:57:10.022Z',
        name: 'test-things2.pgsql',
        content: 'ALTER TABLE my_test ADD COLUMN additional VARCHAR;\n',
      },
      {
        id: '2018-12-31T12:10:49.562Z',
        name: 'test-other.pgsql',
        content: 'ALTER TABLE my_test ADD COLUMN additional_2 VARCHAR;\n',
      },
      {
        id: '2019-01-02T08:36:08.858Z',
        name: 'test-other-3.pgsql',
        content: 'ALTER TABLE my_test ADD COLUMN additional_3 VARCHAR;\n',
      },
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
    await migrate({
      client: 'postgresql://postgres:dev-pass@0.0.0.0:5432/postgres',
      dir: 'test/migrations2',
      table: 'testing2',
    });

    const finishedMigrations = await pg.query('SELECT id FROM testing2');
    const migratedTable = await pg.query('SELECT * FROM my_test2');

    expect(finishedMigrations.rows).toEqual([{ id: '2018-12-31T11:12:39.672Z' }]);

    expect(migratedTable.fields).toMatchObject([
      expect.objectContaining({ name: 'id' }),
      expect.objectContaining({ name: 'name' }),
    ]);
  });
});
