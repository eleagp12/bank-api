import request from 'supertest';
import app from '../server.js';

describe('Server health', () => {
  it('should respond with 200', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
  });
});
