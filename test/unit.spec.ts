import { join } from 'path';
import { filenameParts, readAndExecuteMigrations } from '../src/migrate';

describe('Unit test', () => {
  it.each`
    filename                                               | expected
    ${'2020-01-20T14:47:35.151Z_test-name.pgsql'}          | ${{ filename: '2020-01-20T14:47:35.151Z_test-name.pgsql', id: '2020-01-20T14:47:35.151Z', name: 'test-name.pgsql' }}
    ${'2020-01-20T14:47:35.151Z_tino_add_user_role.pgsql'} | ${{ filename: '2020-01-20T14:47:35.151Z_tino_add_user_role.pgsql', id: '2020-01-20T14:47:35.151Z', name: 'tino_add_user_role.pgsql' }}
  `('Should parse name parts of $filename', ({ filename, expected }) => {
    expect(filenameParts(filename)).toEqual(expected);
  });

  it('Should use streams to execute migrations', async () => {
    const db = { query: jest.fn(), escapeIdentifier: (str: string): string => str };
    const logger = { info: jest.fn(), error: jest.fn() };

    db.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        rows: [{ id: '2018-12-31T11:57:10.022Z' }, { id: '2018-12-31T12:10:49.562Z' }],
      })
      .mockResolvedValue({});

    await readAndExecuteMigrations({
      db,
      table: 'test1',
      logger,
      directory: join(__dirname, 'migrations'),
    });

    expect(db.query.mock.calls).toEqual([
      ['CREATE TABLE IF NOT EXISTS test1 (id VARCHAR PRIMARY KEY)'],
      ['SELECT id FROM test1'],
      ['BEGIN'],
      ['CREATE TABLE my_test (id INTEGER PRIMARY KEY, name VARCHAR);\n'],
      ['INSERT INTO test1 VALUES ($1);', ['2018-12-31T11:12:39.672Z']],
      ['COMMIT'],
      ['BEGIN'],
      ['ALTER TABLE my_test ADD COLUMN additional_3 VARCHAR;\n'],
      ['INSERT INTO test1 VALUES ($1);', ['2019-01-02T08:36:08.858Z']],
      ['COMMIT'],
    ]);
  });

  it('Should await migrate function to run streams', async () => {
    const db = { query: jest.fn(), escapeIdentifier: (str: string): string => str };
    const logger = { info: jest.fn(), error: jest.fn() };

    db.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        rows: [{ id: '2018-12-31T12:10:49.562Z' }, { id: '2019-01-02T08:36:08.858Z' }],
      })
      .mockResolvedValue({});

    await readAndExecuteMigrations({
      db,
      table: 'testing',
      logger,
      directory: join(__dirname, 'migrations'),
    });

    expect(db.query.mock.calls).toEqual([
      ['CREATE TABLE IF NOT EXISTS testing (id VARCHAR PRIMARY KEY)'],
      ['SELECT id FROM testing'],
      ['BEGIN'],
      ['CREATE TABLE my_test (id INTEGER PRIMARY KEY, name VARCHAR);\n'],
      ['INSERT INTO testing VALUES ($1);', ['2018-12-31T11:12:39.672Z']],
      ['COMMIT'],
      ['BEGIN'],
      ['ALTER TABLE my_test ADD COLUMN additional VARCHAR;\n'],
      ['INSERT INTO testing VALUES ($1);', ['2018-12-31T11:57:10.022Z']],
      ['COMMIT'],
    ]);
  });
});
