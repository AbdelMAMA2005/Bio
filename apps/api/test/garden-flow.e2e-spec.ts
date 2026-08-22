import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import { createE2eApp, uniqueEmail } from './utils/setup-e2e';

/**
 * Rejoue le flux A/B d'ARCHITECTURE.md de bout en bout via de vrais appels HTTP
 * (MOCK_PLANTID=true / FORCE_MOCK=true en .env — pas de crédits API réels consommés) :
 * Scan → identification → ajout au Jardin → photo de suivi → GET liste →
 * diagnostic santé → rappel J+5.
 */
describe('Flux Jardin (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let testImageBuffer: Buffer;

  beforeAll(async () => {
    app = await createE2eApp();

    const dataUri = fs
      .readFileSync(path.join(__dirname, 'test-image.txt'), 'utf-8')
      .trim();
    const base64 = dataUri.split(',')[1];
    testImageBuffer = Buffer.from(base64, 'base64');

    const email = uniqueEmail('garden-flow');
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        username: `garden${Date.now()}`,
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

  it('POST /identification renvoie une plante identifiée avec toxicité et XP', async () => {
    const res = await request(app.getHttpServer())
      .post('/identification')
      .set('Authorization', `Bearer ${token}`)
      .attach('image', testImageBuffer, 'plante.webp')
      .expect(201);

    expect(res.body.plantId).toEqual(expect.any(String));
    expect(res.body.nomScientifique).toEqual(expect.any(String));
    expect(res.body.xpGagne).toBeGreaterThan(0);
    // Fiche détail (23/07/2026) : description, conseils d'entretien réels et
    // photo de référence, tirés des champs structurés Plant.id (mock inclus).
    expect(res.body.aPropos).toEqual(expect.any(String));
    expect(res.body.conseilsEntretien).toMatchObject({
      lumiere: expect.any(String),
    });
    expect(res.body.urlImage).toEqual(expect.any(String));
  });

  let collectionId: string;
  let plantId: string;

  it('POST /collection ajoute la plante identifiée au Jardin (type=owned)', async () => {
    const identify = await request(app.getHttpServer())
      .post('/identification')
      .set('Authorization', `Bearer ${token}`)
      .attach('image', testImageBuffer, 'plante.webp')
      .expect(201);
    plantId = identify.body.plantId;

    const res = await request(app.getHttpServer())
      .post('/collection')
      .set('Authorization', `Bearer ${token}`)
      .send({ plantId, type: 'owned', latitude: 49.417, longitude: 2.826 })
      .expect(201);

    collectionId = res.body.id;
    expect(res.body.type).toBe('owned');
    expect(res.body.etatSante).toBe('green');
    expect(res.body.latitude).toBe(49.417);
  });

  it("crédite l'XP annoncée par l'identification sur le compte utilisateur (flux A, étape « +XP »)", async () => {
    const before = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const identify = await request(app.getHttpServer())
      .post('/identification')
      .set('Authorization', `Bearer ${token}`)
      .attach('image', testImageBuffer, 'plante.webp')
      .expect(201);

    await request(app.getHttpServer())
      .post('/collection')
      .set('Authorization', `Bearer ${token}`)
      .send({ plantId: identify.body.plantId, type: 'discovered' })
      .expect(201);

    const after = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(after.body.experience).toBe(
      before.body.experience + identify.body.xpGagne,
    );
  });

  it('GET /collection?type=owned liste la plante ajoutée avec ses infos aplaties', async () => {
    const res = await request(app.getHttpServer())
      .get('/collection')
      .query({ type: 'owned' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const item = res.body.find((c: any) => c.id === collectionId);
    expect(item).toBeDefined();
    expect(item.idPlante).toBe(plantId);
  });

  it('POST /collection/:id/photos stocke la photo de suivi', async () => {
    const res = await request(app.getHttpServer())
      .post(`/collection/${collectionId}/photos`)
      .set('Authorization', `Bearer ${token}`)
      .attach('image', testImageBuffer, 'suivi.webp')
      .expect(201);

    expect(res.body.historiquePhotos).toHaveLength(1);
    expect(res.body.historiquePhotos[0]).toContain(
      `/uploads/collections/${collectionId}/`,
    );
  });

  it("POST /collection/:id/diagnosis renvoie un diagnostic et met à jour l'état de santé", async () => {
    const res = await request(app.getHttpServer())
      .post(`/collection/${collectionId}/diagnosis`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    expect(typeof res.body.estSain).toBe('boolean');
    expect(res.body.probabiliteSante).toEqual(expect.any(Number));
    expect(Array.isArray(res.body.suggestions)).toBe(true);

    const updated = await request(app.getHttpServer())
      .get(`/collection/${collectionId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(['green', 'orange', 'red']).toContain(updated.body.etatSante);
  });

  it('POST /reminders programme un rappel J+5 lié à la collection', async () => {
    const dansCinqJours = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

    const res = await request(app.getHttpServer())
      .post('/reminders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        collectionId,
        typeRappel: 'traitement',
        datePlanification: dansCinqJours.toISOString(),
      })
      .expect(201);

    expect(res.body.estNotifie).toBe(false);
    expect(res.body.collectionId).toBe(collectionId);

    const list = await request(app.getHttpServer())
      .get('/reminders')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(list.body.items.some((r: any) => r.id === res.body.id)).toBe(true);
  });

  it("rejette l'accès à une collection appartenant à un autre utilisateur", async () => {
    const otherEmail = uniqueEmail('garden-flow-other');
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: otherEmail,
        username: `other${Date.now()}`,
        motDePasse: 'motdepasse',
      })
      .expect(201);
    const otherLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: otherEmail, motDePasse: 'motdepasse' })
      .expect(200);

    await request(app.getHttpServer())
      .get(`/collection/${collectionId}`)
      .set('Authorization', `Bearer ${otherLogin.body.accessToken}`)
      .expect(404);
  });
});
