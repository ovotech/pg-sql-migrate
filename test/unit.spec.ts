import { join } from 'path';
import { executeMigrations, MigrationsReadable, MigrationsWritable } from '../src';
import { promisify } from 'util';
import { pipeline } from 'stream';
import { nameParts } from '../src/MigrationsReadable';

describe('Unit test', () => {
  it.each`
    filename                                               | expected
    ${'2020-01-20T14:47:35.151Z_test-name.pgsql'}          | ${['2020-01-20T14:47:35.151Z', 'test-name.pgsql']}
    ${'2020-01-20T14:47:35.151Z_tino_add_user_role.pgsql'} | ${['2020-01-20T14:47:35.151Z', 'tino_add_user_role.pgsql']}
  `('Should parse name parts of %s', ({ filename, expected }) => {
    expect(nameParts(filename)).toEqual(expected);
  });

  it('Should use streams to execute migrations', async () => {
    const pg = { query: jest.fn() };

    pg.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        rows: [{ id: '2018-12-31T11:57:10.022Z' }, { id: '2018-12-31T12:10:49.562Z' }],
      })
      .mockResolvedValue({});

    const readable = new MigrationsReadable(pg, 'test1', join(__dirname, 'migrations'));
    const writable = new MigrationsWritable(pg, 'test1');

    await promisify(pipeline)(readable, writable);

    expect(pg.query).toBeCalledTimes(10);

    expect(pg.query.mock.calls).toEqual([
      ['CREATE TABLE IF NOT EXISTS test1 (id VARCHAR PRIMARY KEY)'],
      ['SELECT id FROM test1'],
      ['BEGIN'],
      ['CREATE TABLE my_test (id INTEGER PRIMARY KEY, name VARCHAR);\n'],
      ['INSERT INTO test1 VALUES ($1)', ['2018-12-31T11:12:39.672Z']],
      ['COMMIT'],
      ['BEGIN'],
      ['ALTER TABLE my_test ADD COLUMN additional_3 VARCHAR;\n'],
      ['INSERT INTO test1 VALUES ($1)', ['2019-01-02T08:36:08.858Z']],
      ['COMMIT'],
    ]);
  });

  it('Should await migrate function to run streams', async () => {
    const pg = { query: jest.fn() };

    pg.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        rows: [{ id: '2018-12-31T12:10:49.562Z' }, { id: '2019-01-02T08:36:08.858Z' }],
      })
      .mockResolvedValue({});

    const result = await executeMigrations(pg, 'testing', join(__dirname, 'migrations'));
    expect(pg.query).toBeCalledTimes(10);

    expect(pg.query.mock.calls).toEqual([
      ['CREATE TABLE IF NOT EXISTS testing (id VARCHAR PRIMARY KEY)'],
      ['SELECT id FROM testing'],
      ['BEGIN'],
      ['CREATE TABLE my_test (id INTEGER PRIMARY KEY, name VARCHAR);\n'],
      ['INSERT INTO testing VALUES ($1)', ['2018-12-31T11:12:39.672Z']],
      ['COMMIT'],
      ['BEGIN'],
      ['ALTER TABLE my_test ADD COLUMN additional VARCHAR;\n'],
      ['INSERT INTO testing VALUES ($1)', ['2018-12-31T11:57:10.022Z']],
      ['COMMIT'],
    ]);

    expect(result).toMatchSnapshot();
  });
});
