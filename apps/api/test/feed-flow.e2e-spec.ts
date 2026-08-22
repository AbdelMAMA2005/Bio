import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import { createE2eApp, uniqueEmail } from './utils/setup-e2e';

/**
 * Rejoue le flux C d'ARCHITECTURE.md : Communauté → nouvelle publication taguée
 * avec une plante du Jardin → like → commentaire → suppression.
 */
describe('Flux Communauté (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let collectionId: string;

  beforeAll(async () => {
    app = await createE2eApp();

    const dataUri = fs
      .readFileSync(path.join(__dirname, 'test-image.txt'), 'utf-8')
      .trim();
    const base64 = dataUri.split(',')[1];
    const testImageBuffer = Buffer.from(base64, 'base64');

    const email = uniqueEmail('feed-flow');
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, username: `feed${Date.now()}`, motDePasse: 'motdepasse' })
      .expect(201);
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, motDePasse: 'motdepasse' })
      .expect(200);
    token = login.body.accessToken;

    const identify = await request(app.getHttpServer())
      .post('/identification')
      .set('Authorization', `Bearer ${token}`)
      .attach('image', testImageBuffer, 'plante.webp')
      .expect(201);

    const collection = await request(app.getHttpServer())
      .post('/collection')
      .set('Authorization', `Bearer ${token}`)
      .send({ plantId: identify.body.plantId, type: 'owned' })
      .expect(201);
    collectionId = collection.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  let postId: string;

  it('POST /feed/posts publie un post taguant une plante du Jardin', async () => {
    const res = await request(app.getHttpServer())
      .post('/feed/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        contenuTexte: 'Trouvée en pleine floraison ce matin !',
        collectionId,
      })
      .expect(201);

    postId = res.body.id;
    expect(res.body.contenuTexte).toBe(
      'Trouvée en pleine floraison ce matin !',
    );
    expect(res.body.plante).toBeDefined();
    expect(res.body.likesCount).toBe(0);
  });

  it('GET /feed renvoie une enveloppe paginée { items, total } contenant le post', async () => {
    const res = await request(app.getHttpServer())
      .get('/feed')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toHaveProperty('items');
    expect(res.body).toHaveProperty('total');
    expect(res.body.items.some((p: any) => p.id === postId)).toBe(true);
  });

  it('POST /feed/posts/:id/like bascule le like (toggle)', async () => {
    const liked = await request(app.getHttpServer())
      .post(`/feed/posts/${postId}/like`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);
    expect(liked.body).toEqual({ liked: true, likesCount: 1 });

    const unliked = await request(app.getHttpServer())
      .post(`/feed/posts/${postId}/like`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);
    expect(unliked.body).toEqual({ liked: false, likesCount: 0 });
  });

  it('POST /feed/posts/:id/comments ajoute un commentaire visible via GET', async () => {
    const created = await request(app.getHttpServer())
      .post(`/feed/posts/${postId}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ contenu: 'Superbe capture !' })
      .expect(201);
    expect(created.body.contenu).toBe('Superbe capture !');

    const comments = await request(app.getHttpServer())
      .get(`/feed/posts/${postId}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(comments.body.some((c: any) => c.id === created.body.id)).toBe(true);
  });

  it('hérite du Geo-Tag de la plante taguée et calcule distanceMetres pour le filtre "Près de moi"', async () => {
    // Paris (48.8566, 2.3522) — la plante est capturée ici avec Geo-Tag accepté.
    const dataUri = fs
      .readFileSync(path.join(__dirname, 'test-image.txt'), 'utf-8')
      .trim();
    const testImageBuffer = Buffer.from(dataUri.split(',')[1], 'base64');

    const identifyRes = await request(app.getHttpServer())
      .post('/identification')
      .set('Authorization', `Bearer ${token}`)
      .attach('image', testImageBuffer, 'plante2.webp')
      .expect(201);

    const geoCollection = await request(app.getHttpServer())
      .post('/collection')
      .set('Authorization', `Bearer ${token}`)
      .send({
        plantId: identifyRes.body.plantId,
        type: 'discovered',
        latitude: 48.8566,
        longitude: 2.3522,
      })
      .expect(201);

    const geoPost = await request(app.getHttpServer())
      .post('/feed/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        contenuTexte: 'Trouvée à Paris !',
        collectionId: geoCollection.body.id,
      })
      .expect(201);

    // Appel à ~8.9 km de Paris (Saint-Denis, 48.9362, 2.3574) : la position du
    // "moi" est fournie en query, le post doit renvoyer une distance réelle
    // (calculée par haversine — voir FeedService.haversineMeters).
    const nearbyFeed = await request(app.getHttpServer())
      .get('/feed')
      .query({ latitude: 48.9362, longitude: 2.3574 })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const item = nearbyFeed.body.items.find(
      (p: any) => p.id === geoPost.body.id,
    );
    expect(item).toBeDefined();
    expect(item.distanceMetres).toEqual(expect.any(Number));
    expect(item.distanceMetres).toBeGreaterThan(8_000);
    expect(item.distanceMetres).toBeLessThan(9_500);
    // Le type réel de la collection taguée (discovered) doit être exposé, pas
    // toujours "owned" par défaut.
    expect(item.typeCollection).toBe('discovered');

    // Sans position fournie, la distance reste honnêtement inconnue (null),
    // jamais une valeur inventée.
    const feedWithoutPosition = await request(app.getHttpServer())
      .get('/feed')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const itemWithoutPosition = feedWithoutPosition.body.items.find(
      (p: any) => p.id === geoPost.body.id,
    );
    expect(itemWithoutPosition.distanceMetres).toBeNull();

    await request(app.getHttpServer())
      .delete(`/feed/posts/${geoPost.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it("DELETE /feed/posts/:id supprime le post (seulement l'auteur)", async () => {
    await request(app.getHttpServer())
      .delete(`/feed/posts/${postId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const feed = await request(app.getHttpServer())
      .get('/feed')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(feed.body.items.some((p: any) => p.id === postId)).toBe(false);
  });
});
