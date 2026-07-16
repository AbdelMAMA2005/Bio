import { render, screen } from '@testing-library/react-native';

import { IdentificationResultCard } from '../IdentificationResultCard';
import { AppThemeProvider } from '@/theme';
import i18n, { initI18n } from '@/i18n';
import type { IdentificationResult } from '@/api/types';

const toxicPlant: IdentificationResult = {
  plant: {
    id: 'plant-monstera',
    nomScientifique: 'Monstera deliciosa',
    nomCommun: 'Monstera Deliciosa',
    famille: 'Araceae',
    toxicite: 'toxique',
    rarete: 'rare',
    icon: 'local_florist',
    conseilsEntretien: '{}',
  },
  confidence: 91,
  xpAwarded: 45,
};

beforeAll(async () => {
  // Force French regardless of the test environment's mocked device locale.
  await initI18n();
  await i18n.changeLanguage('fr');
});

function renderCard(result: IdentificationResult) {
  return render(
    <AppThemeProvider>
      <IdentificationResultCard
        result={result}
        elapsedSeconds={1.4}
        onSelectJardin={jest.fn()}
        onSelectHerbarium={jest.fn()}
        onDismiss={jest.fn()}
      />
    </AppThemeProvider>,
  );
}

describe('IdentificationResultCard', () => {
  it('displays the identified plant name, family and rarity', async () => {
    renderCard(toxicPlant);

    expect(await screen.findByText('Monstera Deliciosa')).toBeTruthy();
    expect(screen.getByText('Monstera deliciosa')).toBeTruthy();
    expect(screen.getByText(/Araceae/)).toBeTruthy();
  });

  it('shows the "toxic" badge for a toxic plant', async () => {
    renderCard(toxicPlant);

    expect(await screen.findByText('Toxique')).toBeTruthy();
  });

  it('shows the "not toxic" badge for a non-toxic plant', async () => {
    renderCard({ ...toxicPlant, plant: { ...toxicPlant.plant, toxicite: 'non_toxique' } });

    expect(await screen.findByText('Non toxique')).toBeTruthy();
  });

  it('shows the "unknown toxicity" badge for an uncertain plant', async () => {
    renderCard({ ...toxicPlant, plant: { ...toxicPlant.plant, toxicite: 'incertaine' } });

    expect(await screen.findByText('Toxicité incertaine')).toBeTruthy();
  });
});
