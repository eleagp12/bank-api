import { signToken, verifyToken } from '../utils/jwt.js';

describe('JWT utility functions', () => {
  it('signs a token successfully', () => {
    const payload = { id: 1, role: 'user' };

    const token = signToken(payload);

    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3); // ✅ JWT format
  });

  it('verifies and decodes a valid token', () => {
    const payload = { id: 42, role: 'admin' };

    const token = signToken(payload);
    const decoded = verifyToken(token);

    expect(decoded.id).toBe(payload.id);
    expect(decoded.role).toBe(payload.role);
  });
});
