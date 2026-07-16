import { fireEvent, render, screen } from '@testing-library/react-native';

import { CloneCard } from '../CloneCard';
import { AppThemeProvider } from '@/theme';
import i18n, { initI18n } from '@/i18n';
import type { GardenClone } from '@/api/types';

const sickClone: GardenClone = {
  item: {
    idUtilisateur: 'user-1',
    idPlante: 'plant-lavande',
    dateAjout: new Date().toISOString(),
    type: 'owned',
    etatSante: 'malade',
  },
  plant: {
    id: 'plant-lavande',
    nomScientifique: 'Lavandula angustifolia',
    nomCommun: 'Lavande vraie',
    famille: 'Lamiaceae',
    toxicite: 'non_toxique',
    rarete: 'commun',
    icon: 'spa',
    conseilsEntretien: '{}',
  },
  nextWatering: { key: 'jardin.inDays', count: 3 },
  lightHint: 'Plein soleil',
};

beforeAll(async () => {
  await initI18n();
  await i18n.changeLanguage('fr');
});

function renderCard(clone: GardenClone, onCheckHealth = jest.fn(), onPhotoDeSuivi = jest.fn()) {
  return render(
    <AppThemeProvider>
      <CloneCard clone={clone} onPhotoDeSuivi={onPhotoDeSuivi} onCheckHealth={onCheckHealth} />
    </AppThemeProvider>,
  );
}

describe('CloneCard', () => {
  it('displays the plant name and its health status', async () => {
    renderCard(sickClone);

    expect(await screen.findByText('Lavande vraie')).toBeTruthy();
    expect(screen.getByText('Maladie détectée')).toBeTruthy();
  });

  it('shows the destructive "check health" styling for a sick clone', async () => {
    renderCard(sickClone);

    expect(await screen.findByText('Vérifier la santé')).toBeTruthy();
  });

  it('calls onCheckHealth when the button is pressed', async () => {
    const onCheckHealth = jest.fn();
    renderCard(sickClone, onCheckHealth);

    fireEvent.press(await screen.findByText('Vérifier la santé'));

    expect(onCheckHealth).toHaveBeenCalledTimes(1);
  });

  it('calls onPhotoDeSuivi when the "photo de suivi" button is pressed', async () => {
    const onPhotoDeSuivi = jest.fn();
    renderCard(sickClone, jest.fn(), onPhotoDeSuivi);

    fireEvent.press(await screen.findByText('Photo de suivi'));

    expect(onPhotoDeSuivi).toHaveBeenCalledTimes(1);
  });

  it('does not render a photo timeline when there is no tracking history', async () => {
    renderCard(sickClone);

    await screen.findByText('Lavande vraie');
    expect(screen.queryByText('Suivi photo')).toBeNull();
  });

  it('renders a photo timeline once tracking photos exist', async () => {
    const cloneWithPhotos: GardenClone = {
      ...sickClone,
      item: { ...sickClone.item, historiquePhotos: [{ url: 'https://example.com/a.jpg', date: new Date().toISOString() }] },
    };
    renderCard(cloneWithPhotos);

    expect(await screen.findByText('Suivi photo')).toBeTruthy();
  });
});
