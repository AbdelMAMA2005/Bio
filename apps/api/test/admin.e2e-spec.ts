import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import request from 'supertest';
import { createE2eApp, uniqueEmail } from './utils/setup-e2e';
import { User } from '../src/entities/user.entity';
import { Report } from '../src/entities/report.entity';
import { Post } from '../src/entities/posts.entity';
import { Quest } from '../src/entities/quest.entity';

/**
 * Un compte 'membre' ne peut pas se promouvoir admin via l'API (aucun endpoint public ne
 * le permet) : pour tester les routes /admin/*, on enregistre un utilisateur normal via
 * /auth/register puis on élève son rôle DIRECTEMENT en base (repository injecté depuis le
 * conteneur Nest de test), avant de se logger pour obtenir un vrai JWT reflétant ce rôle —
 * jamais de backdoor HTTP pour ça.
 *
 * IMPORTANT — throttle réel sur /auth/* (10 requêtes/min/IP/route, voir auth.controller.ts,
 * une vraie protection anti-bruteforce qu'on ne désactive pas pour les tests) : les
 * fixtures admin/modérateur sont créées UNE SEULE FOIS dans le beforeAll de haut niveau et
 * réutilisées par tous les tests plutôt que recréées à chaque cas, pour rester largement
 * sous la limite malgré le nombre de scénarios couverts.
 */
async function registerAndPromote(
  app: INestApplication,
  userRepo: Repository<User>,
  role: 'admin' | 'moderateur',
): Promise<{ token: string; userId: string; email: string }> {
  const email = uniqueEmail(role);
  const motDePasse = 'motdepasse-solide';
  const registerRes = await request(app.getHttpServer())
    .post('/auth/register')
    .send({
      email,
      nomUtilisateur: `${role}${Date.now()}${Math.round(Math.random() * 1e4)}`,
      motDePasse,
    })
    .expect(201);

  await userRepo.update(
    { id: registerRes.body.id },
    { role, estAdmin: role === 'admin' },
  );

  const loginRes = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, motDePasse })
    .expect(200);

  return {
    token: loginRes.body.accessToken,
    userId: registerRes.body.id,
    email,
  };
}

async function registerMembre(
  app: INestApplication,
): Promise<{ token: string; userId: string; email: string }> {
  const email = uniqueEmail('membre');
  const motDePasse = 'motdepasse-solide';
  const registerRes = await request(app.getHttpServer())
    .post('/auth/register')
    .send({
      email,
      nomUtilisateur: `membre${Date.now()}${Math.round(Math.random() * 1e4)}`,
      motDePasse,
    })
    .expect(201);
  const loginRes = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, motDePasse })
    .expect(200);
  return {
    token: loginRes.body.accessToken,
    userId: registerRes.body.id,
    email,
  };
}

describe('Admin (e2e)', () => {
  let app: INestApplication;
  let userRepo: Repository<User>;
  let reportRepo: Repository<Report>;
  let postRepo: Repository<Post>;
  let questRepo: Repository<Quest>;

  let adminToken: string;
  let adminUserId: string;
  let modToken: string;
  let modUserId: string;

  beforeAll(async () => {
    app = await createE2eApp();
    userRepo = app.get(getRepositoryToken(User));
    reportRepo = app.get(getRepositoryToken(Report));
    postRepo = app.get(getRepositoryToken(Post));
    questRepo = app.get(getRepositoryToken(Quest));

    // Fixtures partagées par TOUT le fichier (voir avertissement throttle ci-dessus).
    const admin = await registerAndPromote(app, userRepo, 'admin');
    adminToken = admin.token;
    adminUserId = admin.userId;
    const mod = await registerAndPromote(app, userRepo, 'moderateur');
    modToken = mod.token;
    modUserId = mod.userId;
  });

  afterAll(async () => {
    // Nettoyage : les défis créés directement dans `quests` sont une ressource PARTAGÉE
    // avec tout le reste de la suite e2e (base réelle, pas de rollback par fichier) —
    // sans ça, QuestsService#getDailyQuests (qui lit maintenant cette table plutôt que
    // QUEST_CATALOG en dur) renvoyait un défi en trop à quests-flow.e2e-spec.ts.
    await questRepo.delete({ id: createdQuestId });
    await app.close();
  });

  let createdQuestId = '__never_created__';

  const ADMIN_ROUTES: {
    method: 'get' | 'post' | 'patch' | 'delete';
    path: string;
  }[] = [
    { method: 'get', path: '/admin/me' },
    { method: 'get', path: '/admin/stats' },
    { method: 'get', path: '/admin/users' },
    { method: 'get', path: '/admin/plants' },
    { method: 'get', path: '/admin/moderation' },
    { method: 'get', path: '/admin/quests' },
    { method: 'get', path: '/admin/settings/flags' },
    { method: 'get', path: '/admin/settings/api-keys' },
    { method: 'get', path: '/admin/settings/audit-log' },
  ];

  describe("Contrôle d'accès — aucun endpoint admin accessible à un membre", () => {
    it.each(ADMIN_ROUTES)(
      '$method $path renvoie 401 sans token',
      async ({ method, path }) => {
        await request(app.getHttpServer())[method](path).expect(401);
      },
    );

    it("aucune des routes admin n'est accessible à un membre authentifié (403)", async () => {
      const { token } = await registerMembre(app);
      for (const { method, path } of ADMIN_ROUTES) {
        await request(app.getHttpServer())
          [method](path)
          .set('Authorization', `Bearer ${token}`)
          .expect(403);
      }
    });
  });

  describe('Session admin', () => {
    it('GET /admin/me renvoie le rôle admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body).toMatchObject({ id: adminUserId, role: 'admin' });
    });

    it('GET /admin/me fonctionne aussi pour un modérateur', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/me')
        .set('Authorization', `Bearer ${modToken}`)
        .expect(200);
      expect(res.body).toMatchObject({ id: modUserId, role: 'moderateur' });
    });
  });

  describe('Tableau de bord', () => {
    it('GET /admin/stats renvoie une structure cohérente avec de vraies données', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.kpi.utilisateursActifs).toBeGreaterThanOrEqual(1);
      expect(res.body.chart7j).toHaveLength(7);
      expect(Array.isArray(res.body.raretes)).toBe(true);
      expect(res.body.services.length).toBeGreaterThan(0);
    });
  });

  describe('Utilisateurs', () => {
    it('un admin peut lister, changer le rôle, suspendre (effectif immédiatement + login refusé) puis réactiver un utilisateur', async () => {
      const { userId, email, token: membreToken } = await registerMembre(app);
      const motDePasse = 'motdepasse-solide';

      const listRes = await request(app.getHttpServer())
        .get(`/admin/users?q=${email.split('@')[0]}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(
        listRes.body.items.some((u: { id: string }) => u.id === userId),
      ).toBe(true);

      const roleRes = await request(app.getHttpServer())
        .patch(`/admin/users/${userId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'moderateur' })
        .expect(200);
      expect(roleRes.body.role).toBe('moderateur');

      const suspendRes = await request(app.getHttpServer())
        .patch(`/admin/users/${userId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ suspendu: true })
        .expect(200);
      expect(suspendRes.body.statut).toBe('suspendu');

      // Suspension effective immédiatement : le token déjà émis avant la suspension
      // cesse de fonctionner sans attendre son expiration (voir JwtStrategy#validate).
      await request(app.getHttpServer())
        .get('/admin/me')
        .set('Authorization', `Bearer ${membreToken}`)
        .expect(401);

      // Un compte suspendu ne peut pas non plus se reconnecter.
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, motDePasse })
        .expect(403);

      const reactivateRes = await request(app.getHttpServer())
        .patch(`/admin/users/${userId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ suspendu: false })
        .expect(200);
      expect(reactivateRes.body.statut).toBe('actif');

      // Se reconnecte normalement une fois réactivé.
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, motDePasse })
        .expect(200);
    });

    it('un modérateur peut lister mais pas changer un rôle (403)', async () => {
      const { userId } = await registerMembre(app);

      await request(app.getHttpServer())
        .get('/admin/users')
        .set('Authorization', `Bearer ${modToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/admin/users/${userId}/role`)
        .set('Authorization', `Bearer ${modToken}`)
        .send({ role: 'admin' })
        .expect(403);
    });

    it('un admin ne peut pas suspendre ni supprimer son propre compte', async () => {
      await request(app.getHttpServer())
        .patch(`/admin/users/${adminUserId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ suspendu: true })
        .expect(400);

      await request(app.getHttpServer())
        .delete(`/admin/users/${adminUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('DELETE /admin/users/:id anonymise et empêche la reconnexion (RGPD)', async () => {
      const { userId, email } = await registerMembre(app);

      await request(app.getHttpServer())
        .delete(`/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, motDePasse: 'motdepasse-solide' })
        .expect(401);
    });
  });

  describe('Référentiel plantes', () => {
    it('un admin peut créer, modifier puis supprimer une espèce', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/admin/plants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nomScientifique: `Testus plantus ${Date.now()}`,
          nomCommun: 'Plante de test e2e',
          toxicite: 'green',
        })
        .expect(201);
      expect(createRes.body.capturesCount).toBe(0);

      const updateRes = await request(app.getHttpServer())
        .patch(`/admin/plants/${createRes.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ badgeRarete: 'Rare' })
        .expect(200);
      expect(updateRes.body.badgeRarete).toBe('Rare');

      await request(app.getHttpServer())
        .delete(`/admin/plants/${createRes.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it("un modérateur peut consulter le référentiel mais pas créer d'espèce (403)", async () => {
      await request(app.getHttpServer())
        .get('/admin/plants')
        .set('Authorization', `Bearer ${modToken}`)
        .expect(200);
      await request(app.getHttpServer())
        .post('/admin/plants')
        .set('Authorization', `Bearer ${modToken}`)
        .send({ nomScientifique: 'X', nomCommun: 'X', toxicite: 'green' })
        .expect(403);
    });
  });

  describe('Modération', () => {
    it('ignorer un signalement le retire de la file sans toucher au contenu', async () => {
      const post = await postRepo.save(
        postRepo.create({
          userId: modUserId,
          contenuTexte: 'Contenu signalé (e2e)',
        }),
      );
      const report = await reportRepo.save(
        reportRepo.create({
          reporterId: adminUserId,
          targetType: 'post',
          targetId: post.id,
          auteurCible: 'Quelqu-un',
          motif: 'Spam',
          extrait: 'Contenu signalé (e2e)',
        }),
      );

      const listBefore = await request(app.getHttpServer())
        .get('/admin/moderation')
        .set('Authorization', `Bearer ${modToken}`)
        .expect(200);
      expect(
        listBefore.body.items.some((r: { id: string }) => r.id === report.id),
      ).toBe(true);

      await request(app.getHttpServer())
        .post(`/admin/moderation/${report.id}/ignore`)
        .set('Authorization', `Bearer ${modToken}`)
        .expect(201);

      const listAfter = await request(app.getHttpServer())
        .get('/admin/moderation')
        .set('Authorization', `Bearer ${modToken}`)
        .expect(200);
      expect(
        listAfter.body.items.some((r: { id: string }) => r.id === report.id),
      ).toBe(false);

      const stillThere = await postRepo.findOne({ where: { id: post.id } });
      expect(stillThere).not.toBeNull();

      // Nettoyage manuel : "Ignorer" conserve délibérément le contenu (c'est ce qu'on
      // vient de vérifier), donc rien ne le supprime automatiquement.
      await postRepo.delete({ id: post.id });
    });

    it('supprimer un signalement supprime réellement le contenu ciblé', async () => {
      const post = await postRepo.save(
        postRepo.create({
          userId: modUserId,
          contenuTexte: 'Contenu à supprimer (e2e)',
        }),
      );
      const report = await reportRepo.save(
        reportRepo.create({
          reporterId: adminUserId,
          targetType: 'post',
          targetId: post.id,
          auteurCible: 'Quelqu-un',
          motif: 'Contenu dangereux',
          extrait: 'Contenu à supprimer (e2e)',
        }),
      );

      await request(app.getHttpServer())
        .delete(`/admin/moderation/${report.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const deleted = await postRepo.findOne({ where: { id: post.id } });
      expect(deleted).toBeNull();
    });
  });

  describe('Défis', () => {
    it('liste les défis avec un taux de complétion, admin peut créer/modifier, modérateur seulement activer/désactiver', async () => {
      const listRes = await request(app.getHttpServer())
        .get('/admin/quests')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(listRes.body.length).toBeGreaterThan(0);
      expect(listRes.body[0]).toHaveProperty('tauxCompletion');

      const questId = `e2e-quest-${Date.now()}`;
      createdQuestId = questId;
      const createRes = await request(app.getHttpServer())
        .post('/admin/quests')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          id: questId,
          libelle: 'Défi e2e',
          type: 'quotidien',
          objectif: 1,
          recompenseXp: 10,
          recompensePieces: 0,
        })
        .expect(201);
      expect(createRes.body.actif).toBe(true);

      // Un modérateur ne peut PAS modifier le libellé...
      await request(app.getHttpServer())
        .patch(`/admin/quests/${questId}`)
        .set('Authorization', `Bearer ${modToken}`)
        .send({ libelle: 'Triché' })
        .expect(403);

      // ...mais peut basculer `actif` seul.
      const toggleRes = await request(app.getHttpServer())
        .patch(`/admin/quests/${questId}`)
        .set('Authorization', `Bearer ${modToken}`)
        .send({ actif: false })
        .expect(200);
      expect(toggleRes.body.actif).toBe(false);
    });
  });

  describe('Paramètres', () => {
    it('liste les clés API sans jamais exposer leur valeur', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/settings/api-keys')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const serialized = JSON.stringify(res.body);
      expect(serialized).not.toContain(
        process.env.PLANT_ID_API_KEY || '__none__',
      );
      expect(
        res.body.every((k: Record<string, unknown>) => 'status' in k),
      ).toBe(true);
    });

    it("bascule une fonctionnalité et la trace dans le journal d'audit", async () => {
      const flags = await request(app.getHttpServer())
        .get('/admin/settings/flags')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const flag = flags.body[0];

      const toggled = await request(app.getHttpServer())
        .patch(`/admin/settings/flags/${flag.cle}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ actif: !flag.actif })
        .expect(200);
      expect(toggled.body.actif).toBe(!flag.actif);

      const logRes = await request(app.getHttpServer())
        .get('/admin/settings/audit-log')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(logRes.body.length).toBeGreaterThan(0);
      expect(logRes.body[0]).toHaveProperty('adminPseudo');
    });

    it("un modérateur n'a pas accès aux paramètres (403)", async () => {
      await request(app.getHttpServer())
        .get('/admin/settings/flags')
        .set('Authorization', `Bearer ${modToken}`)
        .expect(403);
    });
  });
});
