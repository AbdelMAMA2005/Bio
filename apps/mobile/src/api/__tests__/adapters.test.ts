import {
  badgesFromInsignes,
  diagnosisFromBackend,
  rareteFromBadge,
  serializeConseilsEntretien,
  toComment,
  toFeedPost,
  toGardenClone,
  toHerbariumDiscovery,
  toPlantWithIcon,
  toStoryGroup,
  toxiciteFromBackend,
  userFromBackend,
  wateringScheduleFromDate,
  type BackendCollectionItem,
  type BackendComment,
  type BackendDiagnosisResponse,
  type BackendPost,
  type BackendStoryGroup,
  type BackendUser,
} from '../adapters';
import { parseConseilsEntretien } from '@/api/types';

describe('toxiciteFromBackend', () => {
  it('maps the backend "red" level to "toxique"', () => {
    expect(toxiciteFromBackend('red')).toBe('toxique');
  });

  it('maps the backend "orange" level to "incertaine"', () => {
    expect(toxiciteFromBackend('orange')).toBe('incertaine');
  });

  it('maps the backend "green" level to "non_toxique"', () => {
    expect(toxiciteFromBackend('green')).toBe('non_toxique');
  });

  it('falls back to "non_toxique" for a missing value', () => {
    expect(toxiciteFromBackend(undefined)).toBe('non_toxique');
  });
});

describe('rareteFromBadge', () => {
  it('recognizes "Rare" case-insensitively', () => {
    expect(rareteFromBadge('Rare')).toBe('rare');
    expect(rareteFromBadge('rare')).toBe('rare');
  });

  it('recognizes both accented and unaccented "Épique"', () => {
    expect(rareteFromBadge('Épique')).toBe('epique');
    expect(rareteFromBadge('Epique')).toBe('epique');
  });

  it('defaults to "commun" for "Commun", null, or an unknown label', () => {
    expect(rareteFromBadge('Commun')).toBe('commun');
    expect(rareteFromBadge(null)).toBe('commun');
    expect(rareteFromBadge('Legendaire')).toBe('commun');
  });
});

describe('serializeConseilsEntretien', () => {
  it('produces a JSON string parseable by parseConseilsEntretien', () => {
    const serialized = serializeConseilsEntretien({ lumiere: 'Plein soleil', arrosage: 'Modéré' });
    const parsed = parseConseilsEntretien(serialized);
    expect(parsed.light).toBe('Plein soleil');
    expect(parsed.arrosage).toBe('Modéré');
  });

  it('falls back to placeholder values for any care cell the backend does not provide', () => {
    const parsed = parseConseilsEntretien(serializeConseilsEntretien(null));
    expect(parsed.light).toBe('—');
    expect(parsed.soil).toBe('—');
    expect(parsed.arrosage).toBe('—');
    expect(parsed.multiplication).toBe('—');
  });
});

describe('userFromBackend', () => {
  it('maps nomUtilisateur/experience to the front pseudo/xp fields', () => {
    const backend: BackendUser = { id: 'u1', email: 'a@b.com', nomUtilisateur: 'Djawad', experience: 240, niveau: 3, pieces: 50 };
    expect(userFromBackend(backend)).toEqual({ id: 'u1', pseudo: 'Djawad', email: 'a@b.com', niveau: 3, xp: 240, pieces: 50 });
  });

  it('defaults pieces to 0 when the backend omits it (older payload shape)', () => {
    const backend: BackendUser = { id: 'u1', email: 'a@b.com', nomUtilisateur: 'Djawad', experience: 240, niveau: 3 };
    expect(userFromBackend(backend).pieces).toBe(0);
  });
});

describe('toPlantWithIcon', () => {
  it('assembles a front Plante from backend plant fields', () => {
    const plant = toPlantWithIcon('p1', {
      nomScientifique: 'Rosa gallica',
      nomCommun: 'Rose de France',
      famille: 'Rosaceae',
      toxicite: 'green',
      badgeRarete: 'Rare',
    });
    expect(plant.id).toBe('p1');
    expect(plant.toxicite).toBe('non_toxique');
    expect(plant.rarete).toBe('rare');
    expect(plant.icon).toBeTruthy();
  });

  it('carries through the real description and reference photo when Plant.id provides them', () => {
    const plant = toPlantWithIcon('p1', {
      nomScientifique: 'Rosa gallica',
      nomCommun: 'Rose de France',
      famille: 'Rosaceae',
      toxicite: 'green',
      badgeRarete: 'Rare',
      aPropos: 'Arbuste épineux à fleurs roses parfumées.',
      urlImage: 'https://bs.plantnet.org/image/o/rosa-gallica.jpg',
      conseilsEntretien: { lumiere: 'Plein soleil', sol: 'Bien drainé', arrosage: 'Modéré', multiplication: 'Bouturage' },
    });
    expect(plant.aPropos).toBe('Arbuste épineux à fleurs roses parfumées.');
    expect(plant.urlImage).toBe('https://bs.plantnet.org/image/o/rosa-gallica.jpg');
    expect(parseConseilsEntretien(plant.conseilsEntretien)).toEqual({
      light: 'Plein soleil',
      soil: 'Bien drainé',
      arrosage: 'Modéré',
      multiplication: 'Bouturage',
    });
  });

  it('falls back to empty strings when Plant.id has no description or photo for the species', () => {
    const plant = toPlantWithIcon('p1', {
      nomScientifique: 'Rosa gallica',
      nomCommun: 'Rose de France',
      famille: 'Rosaceae',
      toxicite: 'green',
      badgeRarete: 'Rare',
    });
    expect(plant.aPropos).toBe('');
    expect(plant.urlImage).toBe('');
  });
});

describe('toGardenClone / toHerbariumDiscovery', () => {
  const item: BackendCollectionItem = {
    id: 'col-1',
    idPlante: 'plant-1',
    nomScientifique: 'Lavandula angustifolia',
    nomCommun: 'Lavande vraie',
    famille: 'Lamiaceae',
    badgeRarete: 'Commun',
    toxicite: 'green',
    etatSante: 'red',
    dateAjout: '2026-07-01T00:00:00.000Z',
    urlImage: null,
    aPropos: null,
    conseilsEntretien: null,
    latitude: 45.75,
    longitude: 4.85,
    prochainArrosage: '2026-07-01T00:00:00.000Z',
  };

  it('preserves the real collection id and maps etatSante red -> malade', () => {
    const clone = toGardenClone(item, 'user-1', 'http://localhost:3000');
    expect(clone.item.id).toBe('col-1');
    expect(clone.item.idUtilisateur).toBe('user-1');
    expect(clone.item.etatSante).toBe('malade');
    expect(clone.item.type).toBe('owned');
    expect(clone.plant.famille).toBe('Lamiaceae');
  });

  it('formats coordinates as the place label since the backend does no reverse-geocoding', () => {
    const discovery = toHerbariumDiscovery(item, 'user-1', 'http://localhost:3000');
    expect(discovery.item.type).toBe('discovered');
    expect(discovery.placeLabel).toBe('45.750, 4.850');
  });

  it('leaves the place label empty when no coordinates were captured', () => {
    const discovery = toHerbariumDiscovery({ ...item, latitude: null, longitude: null }, 'user-1', 'http://localhost:3000');
    expect(discovery.placeLabel).toBe('');
  });

  it('resolves historiquePhotos URLs against the API base URL, falling back to dateAjout per photo', () => {
    const clone = toGardenClone(
      { ...item, historiquePhotos: ['/uploads/collections/col-1/a.jpg'] },
      'user-1',
      'http://localhost:3000',
    );
    expect(clone.item.historiquePhotos).toEqual([
      { url: 'http://localhost:3000/uploads/collections/col-1/a.jpg', date: '2026-07-01T00:00:00.000Z' },
    ]);
  });

  it('returns an empty photo history when the backend sends none', () => {
    const clone = toGardenClone(item, 'user-1', 'http://localhost:3000');
    expect(clone.item.historiquePhotos).toEqual([]);
  });

  describe('nextWatering (real prochainArrosage from the backend, no more hardcoded "today")', () => {
    const isoDaysFromNow = (days: number) => {
      const d = new Date();
      d.setDate(d.getDate() + days);
      return d.toISOString();
    };

    it('flags overdue watering (prochainArrosage in the past) as due today, not a negative count', () => {
      expect(wateringScheduleFromDate(isoDaysFromNow(-3))).toEqual({ key: 'jardin.today' });
    });

    it('flags a due date later today as today', () => {
      expect(wateringScheduleFromDate(isoDaysFromNow(0))).toEqual({ key: 'jardin.today' });
    });

    it('flags tomorrow distinctly from "in N days"', () => {
      expect(wateringScheduleFromDate(isoDaysFromNow(1))).toEqual({ key: 'jardin.tomorrow' });
    });

    it('counts days ahead beyond tomorrow', () => {
      expect(wateringScheduleFromDate(isoDaysFromNow(4))).toEqual({ key: 'jardin.inDays', count: 4 });
    });

    it('toGardenClone derives nextWatering from the real prochainArrosage field, not a fixed value', () => {
      const dueDate = isoDaysFromNow(4);
      const clone = toGardenClone({ ...item, prochainArrosage: dueDate }, 'user-1', 'http://localhost:3000');
      expect(clone.nextWatering).toEqual({ key: 'jardin.inDays', count: 4 });
      expect(clone.item.prochainArrosage).toBe(dueDate);
    });
  });

  describe('dernierDiagnostic -> savedDiagnosis (bouton "Voir le diagnostic")', () => {
    it('is undefined when the plant was never diagnosed', () => {
      const clone = toGardenClone(item, 'user-1', 'http://localhost:3000');
      expect(clone.savedDiagnosis).toBeUndefined();
    });

    it('converts a saved sick diagnosis, joining treatment parts, without inventing a name', () => {
      const clone = toGardenClone(
        {
          ...item,
          dernierDiagnostic: {
            maladieNom: 'Septoriose',
            scoreGlobal: 91,
            traitement: { biologique: 'Retirer les feuilles atteintes.', prevention: "Éviter l'arrosage du feuillage." },
            description: null,
            estSain: false,
            dateDiagnostic: '2026-07-20T09:00:00.000Z',
          },
        },
        'user-1',
        'http://localhost:3000',
      );

      expect(clone.savedDiagnosis).toEqual({
        result: {
          status: 'disease',
          diseaseIcon: 'coronavirus',
          diseaseName: 'Septoriose',
          confidence: 91,
          treatment: "Retirer les feuilles atteintes. Éviter l'arrosage du feuillage.",
        },
        date: '2026-07-20T09:00:00.000Z',
      });
    });

    it('converts a saved healthy diagnosis to the "healthy" status, matching diagnosisFromBackend', () => {
      const clone = toGardenClone(
        {
          ...item,
          dernierDiagnostic: { maladieNom: null, scoreGlobal: 97, traitement: null, description: null, estSain: true, dateDiagnostic: '2026-07-21T09:00:00.000Z' },
        },
        'user-1',
        'http://localhost:3000',
      );

      expect(clone.savedDiagnosis).toEqual({ result: { status: 'healthy', confidence: 97 }, date: '2026-07-21T09:00:00.000Z' });
    });

    it('falls back to the description when no treatment field is provided (never an empty box)', () => {
      const clone = toGardenClone(
        {
          ...item,
          dernierDiagnostic: {
            maladieNom: 'Espèce rare',
            scoreGlobal: 60,
            traitement: null,
            description: 'Analyse détaillée non disponible pour cette maladie.',
            estSain: false,
            dateDiagnostic: '2026-07-22T09:00:00.000Z',
          },
        },
        'user-1',
        'http://localhost:3000',
      );

      expect(clone.savedDiagnosis?.result).toMatchObject({
        status: 'disease',
        treatment: 'Analyse détaillée non disponible pour cette maladie.',
      });
    });
  });
});

describe('toFeedPost', () => {
  const basePost: BackendPost = {
    id: 'post-1',
    idUtilisateur: 'user-1',
    contenuTexte: 'Bonjour le monde',
    dateCreation: '2026-07-01T00:00:00.000Z',
    auteur: { id: 'user-1', nomUtilisateur: 'djawad', urlAvatar: null },
    likesCount: 3,
    commentairesCount: 1,
    estLikedParUtilisateur: true,
    distanceMetres: null,
  };

  it('maps author initial, likes and comments straight through', () => {
    const post = toFeedPost(basePost, 'http://localhost:3000');
    expect(post.authorInitial).toBe('D');
    expect(post.likes).toBe(3);
    expect(post.liked).toBe(true);
    expect(post.plant).toBeUndefined();
    expect(post.distanceMeters).toBeNull();
  });

  it('resolves a relative imageUrl against the API base URL', () => {
    const post = toFeedPost({ ...basePost, imageUrl: '/uploads/collections/abc/photo.jpg' }, 'http://localhost:3000');
    expect(post.imageUri).toBe('http://localhost:3000/uploads/collections/abc/photo.jpg');
  });

  it('leaves an already-absolute imageUrl untouched', () => {
    const post = toFeedPost({ ...basePost, imageUrl: 'https://cdn.example.com/photo.jpg' }, 'http://localhost:3000');
    expect(post.imageUri).toBe('https://cdn.example.com/photo.jpg');
  });

  it('passes through the real distanceMetres computed by the backend, instead of always null', () => {
    const post = toFeedPost({ ...basePost, distanceMetres: 2340 }, 'http://localhost:3000');
    expect(post.distanceMeters).toBe(2340);
  });

  it("maps the tagged collection's real type (discovered), instead of always defaulting to owned", () => {
    const post = toFeedPost(
      {
        ...basePost,
        plante: { id: 'plant-1', nomScientifique: 'Rosa gallica', nomCommun: 'Rose de France', badgeRarete: 'Commun', urlImage: null },
        typeCollection: 'discovered',
      },
      'http://localhost:3000',
    );
    expect(post.tagType).toBe('discovered');
  });

  it('defaults tagType to owned only when the backend omits typeCollection (older payload shape)', () => {
    const post = toFeedPost(
      {
        ...basePost,
        plante: { id: 'plant-1', nomScientifique: 'Rosa gallica', nomCommun: 'Rose de France', badgeRarete: 'Commun', urlImage: null },
      },
      'http://localhost:3000',
    );
    expect(post.tagType).toBe('owned');
  });
});

describe('diagnosisFromBackend', () => {
  it('maps estSain: true to a healthy result carrying scoreGlobal as confidence', () => {
    const backend: BackendDiagnosisResponse = { estSain: true, probabiliteSante: 0.95, suggestions: [], scoreGlobal: 95 };
    expect(diagnosisFromBackend(backend)).toEqual({ status: 'healthy', confidence: 95 });
  });

  it('picks the most probable suggestion as the disease and joins the available treatments', () => {
    const backend: BackendDiagnosisResponse = {
      estSain: false,
      probabiliteSante: 0.3,
      scoreGlobal: 91,
      suggestions: [
        {
          id: 'd1',
          nom: 'Septoriose',
          probabilite: 0.91,
          estNuisible: true,
          traitement: { biologique: 'Fongicide bio.', prevention: "Évitez d'arroser le feuillage." },
        },
      ],
    };

    const result = diagnosisFromBackend(backend);
    expect(result).toMatchObject({ status: 'disease', diseaseName: 'Septoriose', confidence: 91 });
    if (result.status === 'disease') {
      expect(result.treatment).toBe("Fongicide bio. Évitez d'arroser le feuillage.");
    }
  });

  it('falls back to the suggestion description when no treatment field is provided', () => {
    const backend: BackendDiagnosisResponse = {
      estSain: false,
      probabiliteSante: 0.3,
      scoreGlobal: 80,
      suggestions: [{ id: 'd1', nom: 'Carence', probabilite: 0.8, estNuisible: true, description: 'Feuilles jaunies.' }],
    };

    const result = diagnosisFromBackend(backend);
    if (result.status === 'disease') {
      expect(result.treatment).toBe('Feuilles jaunies.');
    }
  });
});

describe('toStoryGroup', () => {
  const backend: BackendStoryGroup = {
    idUtilisateur: 'user-1',
    nomUtilisateur: 'djawad',
    urlAvatar: null,
    estMoi: false,
    entierementVue: false,
    medias: [
      {
        id: 'media-1',
        urlMedia: '/uploads/stories/a.jpg',
        mediaType: 'image',
        dateCreation: '2026-07-24T10:00:00.000Z',
        dateExpiration: '2026-07-25T10:00:00.000Z',
        vuParMoi: false,
        vuesCount: 2,
      },
    ],
  };

  it('resolves each relative media URL against the API base URL, keeping the rest of the fields intact', () => {
    const group = toStoryGroup(backend, 'http://localhost:3000');
    expect(group.idUtilisateur).toBe('user-1');
    expect(group.entierementVue).toBe(false);
    expect(group.medias[0].urlMedia).toBe('http://localhost:3000/uploads/stories/a.jpg');
    expect(group.medias[0].vuesCount).toBe(2);
  });

  it('leaves an already-absolute media URL untouched', () => {
    const group = toStoryGroup(
      { ...backend, medias: [{ ...backend.medias[0], urlMedia: 'https://cdn.example.com/a.jpg' }] },
      'http://localhost:3000',
    );
    expect(group.medias[0].urlMedia).toBe('https://cdn.example.com/a.jpg');
  });
});

describe('toComment', () => {
  it('maps author initial, name, date and text straight through', () => {
    const backend: BackendComment = {
      id: 'comment-1',
      idPost: 'post-1',
      idUtilisateur: 'user-1',
      contenu: 'Belle plante !',
      dateCreation: '2026-07-24T10:00:00.000Z',
      auteur: { id: 'user-1', nomUtilisateur: 'djawad', urlAvatar: null },
    };

    expect(toComment(backend)).toEqual({
      id: 'comment-1',
      authorInitial: 'D',
      authorName: 'djawad',
      createdAt: '2026-07-24T10:00:00.000Z',
      text: 'Belle plante !',
    });
  });
});

describe('badgesFromInsignes', () => {
  const catalog = [
    { id: 'botaniste-debutant', nom: 'Botaniste débutant', description: 'Identifier ta première plante.' },
    { id: 'explorateur', nom: 'Explorateur', description: '10 espèces différentes.' },
  ];

  it('marks catalog entries present in insignes as obtained, others as locked', () => {
    const badges = badgesFromInsignes(['botaniste-debutant'], catalog);
    expect(badges.find((b) => b.id === 'botaniste-debutant')?.obtenuLe).not.toBeNull();
    expect(badges.find((b) => b.id === 'explorateur')?.obtenuLe).toBeNull();
  });

  it('returns every catalog badge as locked when insignes is empty', () => {
    const badges = badgesFromInsignes([], catalog);
    expect(badges.every((b) => b.obtenuLe === null)).toBe(true);
  });
});
