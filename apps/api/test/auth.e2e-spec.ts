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
      .send({ email, nomUtilisateur: `user${Date.now()}`, motDePasse: 'motdepasse' })
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
      .send({ email, nomUtilisateur: `${nomUtilisateur}-bis`, motDePasse: 'motdepasse' })
      .expect(409);
  });

  it('POST /auth/login renvoie 401 pour un mauvais mot de passe (format contrat: statusCode/error/message)', async () => {
    const email = uniqueEmail('badlogin');
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, nomUtilisateur: `user${Date.now()}`, motDePasse: 'bon-mot-de-passe' })
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
      .send({ email, nomUtilisateur: `user${Date.now()}`, motDePasse: 'bon-mot-de-passe' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, motDePasse: 'bon-mot-de-passe' })
      .expect(200);

    expect(typeof res.body.accessToken).toBe('string');
    expect(res.body.user.email).toBe(email);
  });

  it('une route protégée (GET /users/me) rejette une requête sans Bearer token (401)', async () => {
    await request(app.getHttpServer()).get('/users/me').expect(401);
  });
});
