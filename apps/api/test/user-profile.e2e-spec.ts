import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createE2eApp, uniqueEmail } from './utils/setup-e2e';

describe('Profil utilisateur (e2e)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    app = await createE2eApp();

    const email = uniqueEmail('profile');
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        nomUtilisateur: `profile${Date.now()}`,
        motDePasse: 'motdepasse',
      })
      .expect(201);
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, motDePasse: 'motdepasse' })
      .expect(200);
    token = login.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /users/me renvoie le profil courant avec insignes: []', async () => {
    const res = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.insignes).toEqual([]);
    expect(res.body.niveau).toBe(1);
  });

  it('PATCH /users/me met à jour le pseudo', async () => {
    const nouveauPseudo = `renomme${Date.now()}`;
    const res = await request(app.getHttpServer())
      .patch('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ nomUtilisateur: nouveauPseudo })
      .expect(200);

    expect(res.body.nomUtilisateur).toBe(nouveauPseudo);
  });

  it('POST /users/me/badges ajoute un badge, visible ensuite sur GET /users/me', async () => {
    await request(app.getHttpServer())
      .post('/users/me/badges')
      .set('Authorization', `Bearer ${token}`)
      .send({ badge: 'botaniste-debutant' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.insignes).toContain('botaniste-debutant');
  });

  it('DELETE /users/me rejette un mauvais mot de passe (401)', async () => {
    await request(app.getHttpServer())
      .delete('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ motDePasse: 'mauvais-mot-de-passe' })
      .expect(401);
  });

  it('DELETE /users/me supprime le compte avec le bon mot de passe, puis le login échoue ensuite', async () => {
    const email = uniqueEmail('to-delete');
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        nomUtilisateur: `todelete${Date.now()}`,
        motDePasse: 'motdepasse',
      })
      .expect(201);
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, motDePasse: 'motdepasse' })
      .expect(200);

    await request(app.getHttpServer())
      .delete('/users/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ motDePasse: 'motdepasse' })
      .expect(200);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, motDePasse: 'motdepasse' })
      .expect(401);
  });
});
