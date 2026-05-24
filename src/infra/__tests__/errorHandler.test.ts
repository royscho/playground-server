import { AppError } from '../middleware/errorHandler';

describe('AppError', () => {
  it('sets message, statusCode, code', () => {
    const err = new AppError('Not found', 404, 'NOT_FOUND');
    expect(err.message).toBe('Not found');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err).toBeInstanceOf(Error);
  });

  it('defaults code to undefined', () => {
    const err = new AppError('Bad request', 400);
    expect(err.code).toBeUndefined();
  });
});
