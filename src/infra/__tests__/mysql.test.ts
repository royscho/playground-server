jest.mock('mysql2/promise', () => ({
  createPool: jest.fn(() => mockPool),
}));

const mockPool = {
  execute: jest.fn(),
  getConnection: jest.fn(),
  end: jest.fn(),
};

import { query, withTransaction } from '../db/mysql';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('query', () => {
  it('executes sql with params and returns rows', async () => {
    const rows = [{ id: 1 }];
    mockPool.execute.mockResolvedValue([rows, []]);
    const result = await query<{ id: number }>('SELECT * FROM users WHERE id = ?', [1]);
    expect(result).toEqual(rows);
    expect(mockPool.execute).toHaveBeenCalledWith('SELECT * FROM users WHERE id = ?', [1]);
  });
});

describe('withTransaction', () => {
  it('commits on success and returns result', async () => {
    const mockConn = {
      beginTransaction: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
      release: jest.fn(),
    };
    mockPool.getConnection.mockResolvedValue(mockConn);
    const result = await withTransaction(async () => 'done');
    expect(mockConn.beginTransaction).toHaveBeenCalled();
    expect(mockConn.commit).toHaveBeenCalled();
    expect(mockConn.rollback).not.toHaveBeenCalled();
    expect(result).toBe('done');
  });

  it('rolls back on error and rethrows', async () => {
    const mockConn = {
      beginTransaction: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
      release: jest.fn(),
    };
    mockPool.getConnection.mockResolvedValue(mockConn);
    await expect(
      withTransaction(async () => {
        throw new Error('fail');
      }),
    ).rejects.toThrow('fail');
    expect(mockConn.rollback).toHaveBeenCalled();
    expect(mockConn.commit).not.toHaveBeenCalled();
  });
});
