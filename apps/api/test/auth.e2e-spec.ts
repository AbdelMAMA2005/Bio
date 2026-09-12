import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createE2eApp, uniqueEmail } from './utils/setup-e2e';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createE2eApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /auth/register crée un utilisateur sans accessToken dans la réponse', async () => {
    const email = uniqueEmail('register');

    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        nomUtilisateur: `user${Date.now()}`,
        motDePasse: 'motdepasse',
      })
      .expect(201);

    expect(res.body).not.toHaveProperty('accessToken');
    expect(res.body.email).toBe(email);
    expect(res.body.experience).toBe(0);
    expect(res.body.niveau).toBe(1);
  });

  it('POST /auth/register rejette un email déjà utilisé (409)', async () => {
    const email = uniqueEmail('duplicate');
    const nomUtilisateur = `user${Date.now()}`;

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, nomUtilisateur, motDePasse: 'motdepasse' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        nomUtilisateur: `${nomUtilisateur}-bis`,
        motDePasse: 'motdepasse',
      })
      .expect(409);
  });

  it('POST /auth/login renvoie 401 pour un mauvais mot de passe (format contrat: statusCode/error/message)', async () => {
    const email = uniqueEmail('badlogin');
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        nomUtilisateur: `user${Date.now()}`,
        motDePasse: 'bon-mot-de-passe',
      })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, motDePasse: 'mauvais-mot-de-passe' })
      .expect(401);

    expect(res.body).toMatchObject({ statusCode: 401 });
  });

  it('POST /auth/login renvoie accessToken + user pour de bons identifiants', async () => {
    const email = uniqueEmail('goodlogin');
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        nomUtilisateur: `user${Date.now()}`,
        motDePasse: 'bon-mot-de-passe',
      })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, motDePasse: 'bon-mot-de-passe' })
      .expect(200);

    expect(typeof res.body.accessToken).toBe('string');
    expect(typeof res.body.refreshToken).toBe('string');
    expect(res.body.user.email).toBe(email);
  });

  it('une route protégée (GET /users/me) rejette une requête sans Bearer token (401)', async () => {
    await request(app.getHttpServer()).get('/users/me').expect(401);
  });

  describe('POST /auth/refresh', () => {
    it('rejette un refresh token inconnu (401)', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'token-qui-n-existe-pas' })
        .expect(401);
    });

    it('échange un refresh token valide contre un nouveau couple access/refresh (rotation)', async () => {
      const email = uniqueEmail('refresh');
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email,
          nomUtilisateur: `user${Date.now()}`,
          motDePasse: 'motdepasse',
        })
        .expect(201);
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, motDePasse: 'motdepasse' })
        .expect(200);
      const oldRefreshToken = loginRes.body.refreshToken as string;

      const refreshRes = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: oldRefreshToken })
        .expect(200);

      expect(typeof refreshRes.body.accessToken).toBe('string');
      expect(typeof refreshRes.body.refreshToken).toBe('string');
      expect(refreshRes.body.refreshToken).not.toBe(oldRefreshToken);

      // Le nouvel accessToken fonctionne réellement contre une route protégée.
      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${refreshRes.body.accessToken}`)
        .expect(200);

      // L'ancien refresh token est révoqué par la rotation : le réutiliser doit échouer.
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: oldRefreshToken })
        .expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('révoque le refresh token : il ne peut plus être échangé après', async () => {
      const email = uniqueEmail('logout');
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email,
          nomUtilisateur: `user${Date.now()}`,
          motDePasse: 'motdepasse',
        })
        .expect(201);
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, motDePasse: 'motdepasse' })
        .expect(200);
      const refreshToken = loginRes.body.refreshToken as string;

      await request(app.getHttpServer())
        .post('/auth/logout')
        .send({ refreshToken })
        .expect(204);

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });
  });
});
