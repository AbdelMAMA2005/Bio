import { classifyToxicity } from './toxicity-classifier';
import { ToxicityLevel } from '../entities/enums/toxicity-level.enum';

// Tous les textes ci-dessous sont de VRAIES réponses Plant.id (v3 kb/plants, vraie
// clé API), capturées le 23/07/2026 en diagnostiquant le badge de toxicité toujours
// faux pour des espèces comestibles très communes (tomate, mangue) — voir rapport.md.
describe('classifyToxicity', () => {
  it("classe la tomate (Solanum lycopersicum) en incertaine : fruit mûr comestible, mais feuilles/tiges toxiques — ni vert ni rouge en bloc ne serait honnête", () => {
    const text =
      'This plant contains toxic compounds called solanine and tomatine, which can be harmful if ingested in large quantities. While the ripe fruit is safe to eat, the leaves, stems, and unripe green fruit are toxic to both humans and animals. Symptoms of poisoning can include nausea, vomiting, and diarrhea.';
    expect(classifyToxicity(text, ['fruit', 'oil', 'seeds'])).toBe(ToxicityLevel.ORANGE);
  });

  it('classe la mangue (Mangifera indica) en non toxique : "generally safe" explicite malgré une mention de toxicité mineure (sève, écorce)', () => {
    const text =
      "This plant is generally safe for humans and animals, but its sap can cause skin irritation in some people. The leaves, bark, and unripe fruit contain compounds that can be toxic if ingested in large quantities.";
    expect(classifyToxicity(text, ['flowers', 'fruit', 'leaves', 'seeds'])).toBe(ToxicityLevel.GREEN);
  });

  it('classe le basilic (Ocimum basilicum) en non toxique : "generally safe", aucun risque substantiel décrit', () => {
    const text =
      'This plant is generally safe for humans and animals when used in typical culinary amounts. However, in large quantities, it can cause mild gastrointestinal upset in pets like cats and dogs.';
    expect(classifyToxicity(text, ['leaves', 'seeds'])).toBe(ToxicityLevel.GREEN);
  });

  it('classe le muguet (Convallaria majalis) en toxique : gravité explicite ("all parts") et aucune partie comestible', () => {
    const text =
      'This plant is highly toxic to both humans and animals. All parts of the plant contain cardiac glycosides, which can cause severe symptoms if ingested, such as nausea, vomiting, abdominal pain, and even heart irregularities.';
    expect(classifyToxicity(text, null)).toBe(ToxicityLevel.RED);
  });

  it("classe la fleur chauve-souris (Tacca chantrieri) en toxique : toxicité affirmée, aucune partie comestible connue", () => {
    const text =
      "This plant is considered toxic to both humans and animals if ingested. It can cause symptoms like nausea, vomiting, and diarrhea. It's important to keep it out of reach of pets and children.";
    expect(classifyToxicity(text, null)).toBe(ToxicityLevel.RED);
  });

  it("classe en incertaine (pas une fausse assurance) quand Plant.id ne renvoie aucun texte de toxicité", () => {
    expect(classifyToxicity(null, null)).toBe(ToxicityLevel.ORANGE);
    expect(classifyToxicity(undefined, undefined)).toBe(ToxicityLevel.ORANGE);
  });

  it('gère la négation française "non toxique" explicite', () => {
    expect(classifyToxicity('Non toxique pour les humains et les animaux domestiques.', null)).toBe(
      ToxicityLevel.GREEN,
    );
  });

  it('gère la négation anglaise "not toxic" explicite', () => {
    expect(classifyToxicity('This plant is not toxic to humans or pets.', ['leaves'])).toBe(ToxicityLevel.GREEN);
  });

  it("reste toxique même avec des parties comestibles si le texte insiste sur une gravité totale (\"toutes les parties\")", () => {
    const text = 'Toutes les parties de cette plante sont hautement toxiques si ingérées.';
    expect(classifyToxicity(text, ['fruit'])).toBe(ToxicityLevel.RED);
  });
});
