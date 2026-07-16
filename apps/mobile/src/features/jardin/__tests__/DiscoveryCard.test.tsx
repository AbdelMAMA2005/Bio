import { fireEvent, render, screen } from '@testing-library/react-native';

import { DiscoveryCard } from '../DiscoveryCard';
import { AppThemeProvider } from '@/theme';
import i18n, { initI18n } from '@/i18n';
import type { HerbariumDiscovery } from '@/api/types';

const discovery: HerbariumDiscovery = {
  item: {
    idUtilisateur: 'user-1',
    idPlante: 'plant-orchidee-sauvage',
    dateAjout: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    type: 'discovered',
    latitude: 49.4172,
    longitude: 2.9022,
  },
  plant: {
    id: 'plant-orchidee-sauvage',
    nomScientifique: 'Orchis mascula',
    nomCommun: 'Orchidée sauvage',
    famille: 'Orchidaceae',
    toxicite: 'non_toxique',
    rarete: 'rare',
    icon: 'spa',
    conseilsEntretien: '{}',
  },
  placeLabel: 'Forêt de Compiègne',
};

beforeAll(async () => {
  await initI18n();
  await i18n.changeLanguage('fr');
});

describe('DiscoveryCard', () => {
  it('displays the plant name, rarity badge, place and relative date', async () => {
    render(
      <AppThemeProvider>
        <DiscoveryCard discovery={discovery} onPress={jest.fn()} />
      </AppThemeProvider>,
    );

    expect(await screen.findByText('Orchidée sauvage')).toBeTruthy();
    expect(screen.getByText('Rare')).toBeTruthy();
    expect(screen.getByText('Forêt de Compiègne')).toBeTruthy();
    expect(screen.getByText('il y a 3 jours')).toBeTruthy();
  });

  it('calls onPress when tapped', async () => {
    const onPress = jest.fn();
    render(
      <AppThemeProvider>
        <DiscoveryCard discovery={discovery} onPress={onPress} />
      </AppThemeProvider>,
    );

    fireEvent.press(await screen.findByText('Orchidée sauvage'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
