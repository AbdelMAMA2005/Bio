import { describeWatering } from './watering';

// Valeurs réelles observées via GET /v3/kb/plants (vraie clé Plant.id, 23/07/2026) :
// un cactus (Echinopsis) renvoie watering.min=1/max=1, la tomate/le basilic/le
// muguet renvoient min=2/max=2 — voir rapport.md.
describe('describeWatering', () => {
  it('traduit un cactus (min=max=1) en "Faible"', () => {
    expect(describeWatering({ min: 1, max: 1 })).toBe('Faible');
  });

  it('traduit la tomate (min=max=2) en "Modéré"', () => {
    expect(describeWatering({ min: 2, max: 2 })).toBe('Modéré');
  });

  it('traduit une espèce à besoin élevé (min=max=3) en "Abondant"', () => {
    expect(describeWatering({ min: 3, max: 3 })).toBe('Abondant');
  });

  it('affiche une plage quand min et max diffèrent', () => {
    expect(describeWatering({ min: 1, max: 2 })).toBe('Faible à Modéré');
  });

  it('retombe sur la seule valeur connue si min ou max manque', () => {
    expect(describeWatering({ min: 2 })).toBe('Modéré');
    expect(describeWatering({ max: 3 })).toBe('Abondant');
  });

  it("renvoie undefined en l'absence totale de donnée (Plant.id ne fournit pas toujours watering)", () => {
    expect(describeWatering(null)).toBeUndefined();
    expect(describeWatering(undefined)).toBeUndefined();
    expect(describeWatering({})).toBeUndefined();
  });
});
