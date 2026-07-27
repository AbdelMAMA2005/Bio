import { translateCareAdvice } from '../careTranslation';
import type { ConseilsEntretien } from '@/api/types';

const baseCare: ConseilsEntretien = {
  light: 'Full sun to partial shade',
  soil: 'Well-drained soil rich in organic matter',
  arrosage: 'Modéré',
  multiplication: 'Stem cuttings, Division',
};

describe('translateCareAdvice', () => {
  it('translates light/soil/multiplication to French when language is "fr"', () => {
    const result = translateCareAdvice(baseCare, 'fr');
    expect(result.light).toBe('Plein soleil à Mi-ombre');
    expect(result.soil).toBe('bien drainé sol riche en matière organique');
    expect(result.multiplication).toBe('Bouturage de tige, Division');
  });

  it('never touches arrosage, already computed in French server-side', () => {
    const result = translateCareAdvice(baseCare, 'fr');
    expect(result.arrosage).toBe('Modéré');
  });

  it('leaves everything untouched for English UI (Plant.id text is already English)', () => {
    const result = translateCareAdvice(baseCare, 'en');
    expect(result).toEqual(baseCare);
  });

  it('leaves everything untouched for Spanish UI (no ES dictionary yet)', () => {
    const result = translateCareAdvice(baseCare, 'es');
    expect(result).toEqual(baseCare);
  });

  it('leaves the placeholder dash untouched', () => {
    const result = translateCareAdvice({ light: '—', soil: '—', arrosage: '—', multiplication: '—' }, 'fr');
    expect(result).toEqual({ light: '—', soil: '—', arrosage: '—', multiplication: '—' });
  });

  it('keeps an unmapped English phrase as-is rather than a partial translation', () => {
    const result = translateCareAdvice({ ...baseCare, light: 'Dappled woodland light' }, 'fr');
    expect(result.light).toBe('Dappled woodland light');
  });
});
