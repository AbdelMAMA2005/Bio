import { describe, expect, it } from 'vitest';
import {
  apiKeyStatusLabel,
  rareteColors,
  roleLabel,
  statutColors,
  statutLabel,
  toxiciteLabel,
} from './labels';

describe('theme/labels', () => {
  it('traduit chaque rôle backend en libellé français', () => {
    expect(roleLabel('membre')).toBe('Membre');
    expect(roleLabel('moderateur')).toBe('Modérateur');
    expect(roleLabel('admin')).toBe('Admin');
  });

  it('traduit chaque statut utilisateur en libellé + couleur sémantique (jamais codée en dur)', () => {
    expect(statutLabel('actif')).toBe('Actif');
    expect(statutLabel('suspendu')).toBe('Suspendu');
    expect(statutColors('actif').color).toBe('var(--green)');
    expect(statutColors('suspendu').color).toBe('var(--red)');
    expect(statutColors('inactif').color).toBe('var(--gray)');
  });

  it('traduit chaque niveau de toxicité backend (green/orange/red) en libellé français', () => {
    expect(toxiciteLabel('green')).toBe('Non toxique');
    expect(toxiciteLabel('orange')).toBe('Incertaine');
    expect(toxiciteLabel('red')).toBe('Toxique');
  });

  it('attribue une couleur distincte par rareté, et un repli neutre pour une rareté inconnue/absente', () => {
    expect(rareteColors('Rare').color).toBe('var(--blue)');
    expect(rareteColors('Épique').color).toBe('var(--purple)');
    expect(rareteColors('Commun').color).toBe('var(--gray)');
    expect(rareteColors(null).color).toBe('var(--gray)');
  });

  it('traduit le statut des clés API', () => {
    expect(apiKeyStatusLabel('connecte')).toBe('Connecté');
    expect(apiKeyStatusLabel('absent')).toBe('Absent');
    expect(apiKeyStatusLabel('degrade')).toBe('Dégradé');
  });
});
