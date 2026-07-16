import { formatDistance, formatRelativeDate } from '../format';

describe('formatRelativeDate', () => {
  it('formats an ISO date as a strict relative distance from now, in French', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeDate(twoDaysAgo, 'fr')).toBe('il y a 2 jours');
  });

  it('formats an ISO date in English when the language has no date-fns locale mapping', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeDate(threeDaysAgo, 'en')).toBe('3 days ago');
  });

  it('formats an ISO date in Spanish', () => {
    const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeDate(oneDayAgo, 'es')).toBe('hace 1 día');
  });
});

describe('formatDistance', () => {
  const t = ((key: string, opts: { value: string }) =>
    key === 'distance.meters' ? `${opts.value} m` : `${opts.value} km`) as any;

  it('rounds sub-kilometer distances to the nearest 10 meters', () => {
    expect(formatDistance(487, 'fr', t)).toBe('490 m');
  });

  it('formats distances at or above 1000m in kilometers with one decimal', () => {
    expect(formatDistance(2000, 'fr', t)).toBe('2 km');
    expect(formatDistance(4500, 'fr', t)).toBe('4,5 km');
  });
});
