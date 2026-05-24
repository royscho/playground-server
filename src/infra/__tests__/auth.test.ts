import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate } from '../middleware/auth';

const mockReq = (token?: string) =>
  ({
    headers: token ? { authorization: `Bearer ${token}` } : {},
  }) as unknown as Request;

const mockRes = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const next: NextFunction = jest.fn();

describe('authenticate', () => {
  const secret = 'test-secret';

  it('calls next() with valid token and sets req.user', () => {
    const token = jwt.sign({ id: 1, email: 'a@b.com', isAdmin: false }, secret);
    const req = mockReq(token);
    authenticate(req, mockRes(), next);
    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual({ id: 1, email: 'a@b.com', isAdmin: false });
  });

  it('returns 401 with no token', () => {
    const req = mockReq();
    const res = mockRes();
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 401 with invalid token', () => {
    const req = mockReq('bad.token.here');
    const res = mockRes();
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
