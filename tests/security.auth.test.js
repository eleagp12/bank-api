import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../server.js';

let userToken;
let userId;
let accountId;

beforeAll(async () => {
  const res = await request(app).post('/auth/login').send({
    username: 'vodo',
    pin: 'vodochild',
  });

  userToken = res.body.token;
  userId = res.body.userId || res.body.id;

  const accRes = await request(app)
    .get(`/accounts/user/${userId}`)
    .set('Authorization', `Bearer ${userToken}`);

  accountId = accRes.body.id;
});

describe('Security – authentication enforcement', () => {
  it('rejects request without token', async () => {
    const res = await request(app).get('/accounts/user/some-id');
    expect(res.statusCode).toBe(401);
  });

  it('rejects tampered token', async () => {
    const res = await request(app)
      .get('/accounts/user/some-id')
      .set('Authorization', 'Bearer invalid.token.value');

    expect(res.statusCode).toBe(403);
  });

  it('rejects expired token', async () => {
    const expiredToken = jwt.sign(
      { userId: 'fake', role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '-1s' },
    );

    const res = await request(app)
      .get('/accounts/user/some-id')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.statusCode).toBe(403);
  });

  it('rejects token signed with wrong secret', async () => {
    const badToken = jwt.sign({ userId: 'fake', role: 'user' }, 'WRONG_SECRET');

    const res = await request(app)
      .get('/accounts/user/some-id')
      .set('Authorization', `Bearer ${badToken}`);

    expect(res.statusCode).toBe(403);
  });

  it('prevents normal user from deleting users', async () => {
    const res = await request(app)
      .delete('/accounts/by-username')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ targetUsername: 'su' });

    expect(res.statusCode).toBe(403);
  });

  it('prevents user from accessing another user account', async () => {
    const res = await request(app)
      .get('/accounts/user/another-user-id')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.statusCode).toBe(400);
  });

  it('rejects request without Authorization header', async () => {
    const res = await request(app).get('/accounts/user/some-id');
    expect(res.statusCode).toBe(401);
  });

  it('reject request with invalid JWT', async () => {
    const res = await request(app)
      .get('/accounts/user/another-user-id')
      .set('Authorization', 'Bearer invalid.token');

    expect(res.statusCode).toBe(403);
  });

  it('rejects transfer with negative amount', async () => {
    const res = await request(app)
      .post(`/accounts/${accountId}/transfer`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ toUsername: 'su', amount: -100 });

    expect(res.statusCode).toBe(400);
  });

  it('rejects loan below zero amount', async () => {
    const res = await request(app)
      .post(`/accounts/${accountId}/loan`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ amount: 0 });

    expect(res.statusCode).toBe(400);
  });

  it('blocks non-admin from closing accounts', async () => {
    const res = await request(app)
      .delete('/accounts/by-username')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ targetUsername: 'su' });

    expect(res.statusCode).toBe(403);
  });
});
