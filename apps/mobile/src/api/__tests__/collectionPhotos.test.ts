import { toGardenClone, toHerbariumDiscovery, type BackendCollectionItem } from '../adapters';

const item: BackendCollectionItem = {
  id: 'collection-1', idPlante: 'plant-1', nomScientifique: 'Monstera deliciosa',
  nomCommun: 'Monstera', famille: 'Araceae', badgeRarete: 'Commun', toxicite: 'orange',
  etatSante: 'green', dateAjout: '2026-09-29T10:00:00Z', urlImage: null,
  aPropos: null, conseilsEntretien: null, latitude: null, longitude: null,
  prochainArrosage: '2026-10-01T10:00:00Z',
};

describe.each([
  ['garden', toGardenClone], ['herbarium', toHerbariumDiscovery],
] as const)('%s photo history', (_name, convert) => {
  it('reads Supabase photo objects and preserves their capture dates', () => {
    const photo = { url: 'https://storage.example/photo.jpg', date: '2026-09-30T12:00:00Z' };
    expect(convert({ ...item, historiquePhotos: [photo] }, 'user-1').item.historiquePhotos)
      .toEqual([photo]);
  });

  it('supports mixed legacy URLs and current objects', () => {
    const photo = { url: 'https://cdn.example/new.jpg', date: '2026-09-30T12:00:00Z' };
    expect(convert({ ...item, historiquePhotos: ['https://cdn.example/old.jpg', photo] }, 'user-1').item.historiquePhotos)
      .toEqual([
        { url: 'https://cdn.example/old.jpg', date: item.dateAjout },
        photo,
      ]);
  });

  it('skips invalid stored entries and falls back to the collection date', () => {
    const historiquePhotos = [null, {}, { url: 123 }, '', { url: 'https://storage.example/photo.jpg' }] as unknown as BackendCollectionItem['historiquePhotos'];
    expect(convert({ ...item, historiquePhotos }, 'user-1').item.historiquePhotos)
      .toEqual([{ url: 'https://storage.example/photo.jpg', date: item.dateAjout }]);
  });

  it('handles missing history', () => {
    expect(convert(item, 'user-1').item.historiquePhotos).toEqual([]);
  });
});
