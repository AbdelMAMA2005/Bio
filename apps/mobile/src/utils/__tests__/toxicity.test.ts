import { toxicityDisplay } from '../toxicity';

describe('toxicityDisplay', () => {
  it('maps "non_toxique" to the safe/green palette', () => {
    const display = toxicityDisplay('non_toxique');
    expect(display.icon).toBe('health_and_safety');
    expect(display.labelKey).toBe('scan.notToxic');
  });

  it('maps "toxique" to the toxic/red palette', () => {
    const display = toxicityDisplay('toxique');
    expect(display.icon).toBe('warning');
    expect(display.labelKey).toBe('scan.toxic');
  });

  it('maps "incertaine" to the unknown/amber palette', () => {
    const display = toxicityDisplay('incertaine');
    expect(display.icon).toBe('warning');
    expect(display.labelKey).toBe('scan.unknownToxicity');
  });

  it('gives each of the three states a visually distinct color pair', () => {
    const colors = (['non_toxique', 'toxique', 'incertaine'] as const).map((t) => toxicityDisplay(t).text);
    expect(new Set(colors).size).toBe(3);
  });
});
