import { levelProgress, levelTitleKey, xpTargetForLevel } from '../levels';

describe('levelTitleKey', () => {
  it('returns beginner below level 5', () => {
    expect(levelTitleKey(1)).toBe('account.levels.beginner');
    expect(levelTitleKey(4)).toBe('account.levels.beginner');
  });

  it('returns apprentice between 5 and 9', () => {
    expect(levelTitleKey(5)).toBe('account.levels.apprentice');
    expect(levelTitleKey(9)).toBe('account.levels.apprentice');
  });

  it('returns explorer between 10 and 14', () => {
    expect(levelTitleKey(10)).toBe('account.levels.explorer');
    expect(levelTitleKey(14)).toBe('account.levels.explorer');
  });

  it('returns confirmed between 15 and 19', () => {
    expect(levelTitleKey(15)).toBe('account.levels.confirmed');
    expect(levelTitleKey(19)).toBe('account.levels.confirmed');
  });

  it('returns expert from level 20', () => {
    expect(levelTitleKey(20)).toBe('account.levels.expert');
    expect(levelTitleKey(99)).toBe('account.levels.expert');
  });
});

describe('xpTargetForLevel', () => {
  it('scales linearly at 250 xp per level', () => {
    expect(xpTargetForLevel(1)).toBe(250);
    expect(xpTargetForLevel(12)).toBe(3000);
  });
});

describe('levelProgress', () => {
  it('computes the fraction of xp reached for the level target', () => {
    expect(levelProgress(1, 125)).toBeCloseTo(0.5);
    expect(levelProgress(12, 2480)).toBeCloseTo(2480 / 3000);
  });

  it('clamps to 1 when xp exceeds the target', () => {
    expect(levelProgress(1, 999999)).toBe(1);
  });

  it('clamps to 0 for negative xp', () => {
    expect(levelProgress(1, -10)).toBe(0);
  });

  it('returns 0 when the level target is 0 or negative', () => {
    expect(levelProgress(0, 100)).toBe(0);
  });
});
