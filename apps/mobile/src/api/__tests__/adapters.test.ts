import {
  rareteFromBadge,
  serializeConseilsEntretien,
  toFeedPost,
  toGardenClone,
  toHerbariumDiscovery,
  toPlantWithIcon,
  toxiciteFromBackend,
  userFromBackend,
  type BackendCollectionItem,
  type BackendPost,
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
    const serialized = serializeConseilsEntretien({ lumiere: 'Plein soleil', temperature: '18-24°C' });
    const parsed = parseConseilsEntretien(serialized);
    expect(parsed.light).toBe('Plein soleil');
    expect(parsed.temperature).toBe('18-24°C');
  });

  it('falls back to placeholder values when the backend sends null (its current behavior)', () => {
    const parsed = parseConseilsEntretien(serializeConseilsEntretien(null));
    expect(parsed.light).toBe('—');
    expect(parsed.soil).toBe('—');
    expect(parsed.habitat).toBe('—');
  });
});

describe('userFromBackend', () => {
  it('maps nomUtilisateur/experience to the front pseudo/xp fields', () => {
    const backend: BackendUser = { id: 'u1', email: 'a@b.com', nomUtilisateur: 'Djawad', experience: 240, niveau: 3 };
    expect(userFromBackend(backend)).toEqual({ id: 'u1', pseudo: 'Djawad', email: 'a@b.com', niveau: 3, xp: 240 });
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
});

describe('toGardenClone / toHerbariumDiscovery', () => {
  const item: BackendCollectionItem = {
    id: 'col-1',
    idPlante: 'plant-1',
    nomScientifique: 'Lavandula angustifolia',
    nomCommun: 'Lavande vraie',
    badgeRarete: 'Commun',
    toxicite: 'green',
    etatSante: 'red',
    dateAjout: '2026-07-01T00:00:00.000Z',
    urlImage: null,
    latitude: 45.75,
    longitude: 4.85,
  };

  it('preserves the real collection id and maps etatSante red -> malade', () => {
    const clone = toGardenClone(item, 'user-1');
    expect(clone.item.id).toBe('col-1');
    expect(clone.item.idUtilisateur).toBe('user-1');
    expect(clone.item.etatSante).toBe('malade');
    expect(clone.item.type).toBe('owned');
  });

  it('formats coordinates as the place label since the backend does no reverse-geocoding', () => {
    const discovery = toHerbariumDiscovery(item, 'user-1');
    expect(discovery.item.type).toBe('discovered');
    expect(discovery.placeLabel).toBe('45.750, 4.850');
  });

  it('leaves the place label empty when no coordinates were captured', () => {
    const discovery = toHerbariumDiscovery({ ...item, latitude: null, longitude: null }, 'user-1');
    expect(discovery.placeLabel).toBe('');
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
});
