import { collectionPhotoPath, signCollectionPhotos, supabase } from '../supabase';

const legacyUrl = 'https://abc.supabase.co/storage/v1/object/public/collections/user-1/c-1/1.jpg';

describe('collectionPhotoPath', () => {
  it('reads the stored path of current entries', () => {
    expect(collectionPhotoPath({ path: 'user-1/c-1/2.jpg', date: '2026-10-14' })).toBe('user-1/c-1/2.jpg');
  });

  it('extracts the path from legacy public URLs (string or object)', () => {
    expect(collectionPhotoPath(legacyUrl)).toBe('user-1/c-1/1.jpg');
    expect(collectionPhotoPath({ url: legacyUrl, date: '2026-10-14' })).toBe('user-1/c-1/1.jpg');
  });

  it('ignores URLs outside the collections bucket and invalid entries', () => {
    expect(collectionPhotoPath('https://example.com/photo.jpg')).toBeNull();
    expect(collectionPhotoPath(null)).toBeNull();
    expect(collectionPhotoPath({ url: 42 })).toBeNull();
  });
});

describe('signCollectionPhotos', () => {
  afterEach(() => jest.restoreAllMocks());

  it('replaces bucket entries with signed URLs and keeps other entries', async () => {
    const createSignedUrls = jest.fn().mockResolvedValue({
      data: [
        { path: 'user-1/c-1/1.jpg', signedUrl: 'https://signed/1' },
        { path: 'user-1/c-1/2.jpg', signedUrl: 'https://signed/2' },
      ],
      error: null,
    });
    jest.spyOn(supabase.storage, 'from').mockReturnValue({ createSignedUrls } as never);

    const [row] = await signCollectionPhotos([{
      historique_photos: [legacyUrl, { path: 'user-1/c-1/2.jpg', date: '2026-10-14' }, 'https://example.com/x.jpg'],
    }]);

    expect(createSignedUrls).toHaveBeenCalledWith(['user-1/c-1/1.jpg', 'user-1/c-1/2.jpg'], 86400);
    expect(row.historique_photos).toEqual([
      'https://signed/1',
      { url: 'https://signed/2', date: '2026-10-14' },
      'https://example.com/x.jpg',
    ]);
  });

  it('does not call Storage when there is nothing to sign', async () => {
    const from = jest.spyOn(supabase.storage, 'from');
    const rows = [{ historique_photos: null }];
    await expect(signCollectionPhotos(rows)).resolves.toBe(rows);
    expect(from).not.toHaveBeenCalled();
  });
});
