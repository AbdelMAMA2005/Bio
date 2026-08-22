import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import { createE2eApp, uniqueEmail } from './utils/setup-e2e';

/**
 * Vérifie que GET /quests/daily reflète une PROGRESSION RÉELLE calculée depuis
 * les vraies actions (scan, ajout Jardin, publication, likes reçus) et crédite
 * réellement XP + pièces sur le compte — pas les données fixes précédemment
 * codées en dur côté front (src/api/mock/store.ts, voir rapport.md).
 */
describe('Flux Défis quotidiens / pièces (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let testImageBuffer: Buffer;

  beforeAll(async () => {
    app = await createE2eApp();

    const dataUri = fs
      .readFileSync(path.join(__dirname, 'test-image.txt'), 'utf-8')
      .trim();
    testImageBuffer = Buffer.from(dataUri.split(',')[1], 'base64');

    const email = uniqueEmail('quests-flow');
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        username: `quests${Date.now()}`,
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

  it('renvoie les 4 défis du catalogue, tous à 0/objectif pour un utilisateur neuf', async () => {
    const res = await request(app.getHttpServer())
      .get('/quests/daily')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toHaveLength(4);
    expect(res.body.map((q: any) => q.id).sort()).toEqual(
      ['add-garden', 'get-5-likes', 'publish-tip', 'scan-3'].sort(),
    );
    for (const quest of res.body) {
      expect(quest.progression).toBe(0);
      expect(quest.complete).toBe(false);
      expect(quest.recompense).toEqual({ xp: 0, pieces: 0 });
    }
  });

  it("scanner 2 fois la même espèce (limite du mode MOCK_PLANTID, toujours la même suggestion) ne compte qu'une seule espèce distincte", async () => {
    await request(app.getHttpServer())
      .post('/identification')
      .set('Authorization', `Bearer ${token}`)
      .attach('image', testImageBuffer, 'plante1.webp')
      .expect(201);
    await request(app.getHttpServer())
      .post('/identification')
      .set('Authorization', `Bearer ${token}`)
      .attach('image', testImageBuffer, 'plante2.webp')
      .expect(201);

    const res = await request(app.getHttpServer())
      .get('/quests/daily')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const scanQuest = res.body.find((q: any) => q.id === 'scan-3');
    // Une seule espèce distincte réellement identifiée (Rosa gallica, mock fixe) :
    // la progression reflète la réalité (1), pas le nombre d'appels effectués (2).
    expect(scanQuest.progression).toBe(1);
    expect(scanQuest.complete).toBe(false);
  });

  it("ajouter une plante au Jardin complète 'add-garden' et crédite XP + pièces réellement", async () => {
    const identify = await request(app.getHttpServer())
      .post('/identification')
      .set('Authorization', `Bearer ${token}`)
      .attach('image', testImageBuffer, 'plante.webp')
      .expect(201);

    const before = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app.getHttpServer())
      .post('/collection')
      .set('Authorization', `Bearer ${token}`)
      .send({ plantId: identify.body.plantId, type: 'owned' })
      .expect(201);

    const quests = await request(app.getHttpServer())
      .get('/quests/daily')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const gardenQuest = quests.body.find((q: any) => q.id === 'add-garden');
    expect(gardenQuest.complete).toBe(true);
    expect(gardenQuest.recompense).toEqual({ xp: 20, pieces: 0 });

    const after = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    // +XP de la capture elle-même (identification/collection) + les 20 XP du défi.
    expect(after.body.experience).toBeGreaterThanOrEqual(
      before.body.experience + 20,
    );
  });

  it('re-consulter /quests/daily après complétion ne crédite pas une seconde fois la récompense', async () => {
    const before = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app.getHttpServer())
      .get('/quests/daily')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    await request(app.getHttpServer())
      .get('/quests/daily')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const after = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(after.body.experience).toBe(before.body.experience);
    expect(after.body.pieces).toBe(before.body.pieces);
  });

  it("publier une publication complète 'publish-tip' et crédite pièces réelles", async () => {
    const before = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app.getHttpServer())
      .post('/feed/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ contenuTexte: 'Astuce : arrosez le matin plutôt que le soir.' })
      .expect(201);

    const quests = await request(app.getHttpServer())
      .get('/quests/daily')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const tipQuest = quests.body.find((q: any) => q.id === 'publish-tip');
    expect(tipQuest.complete).toBe(true);
    expect(tipQuest.recompense).toEqual({ xp: 25, pieces: 10 });

    const after = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(after.body.pieces).toBe(before.body.pieces + 10);
    expect(after.body.experience).toBe(before.body.experience + 25);
  });

  it("recevoir 5 likes de 5 utilisateurs différents complète 'get-5-likes' et crédite les pièces", async () => {
    const post = await request(app.getHttpServer())
      .post('/feed/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ contenuTexte: 'Ma collection du jour !' })
      .expect(201);

    for (let i = 0; i < 5; i++) {
      const likerEmail = uniqueEmail(`quests-liker-${i}`);
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: likerEmail,
          username: `liker${i}${Date.now()}`,
          motDePasse: 'motdepasse',
        })
        .expect(201);
      const likerLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: likerEmail, motDePasse: 'motdepasse' })
        .expect(200);

      await request(app.getHttpServer())
        .post(`/feed/posts/${post.body.id}/like`)
        .set('Authorization', `Bearer ${likerLogin.body.accessToken}`)
        .expect(201);
    }

    const before = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const quests = await request(app.getHttpServer())
      .get('/quests/daily')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const likesQuest = quests.body.find((q: any) => q.id === 'get-5-likes');
    expect(likesQuest.progression).toBe(5);
    expect(likesQuest.complete).toBe(true);
    expect(likesQuest.recompense).toEqual({ xp: 0, pieces: 20 });

    const after = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(after.body.pieces).toBe(before.body.pieces + 20);
  });
});
