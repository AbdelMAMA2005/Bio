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
    aPropos: '',
    urlImage: '',
    conseilsEntretien: '{}',
  },
  nextWatering: { key: 'jardin.inDays', count: 3 },
  lightHint: 'Plein soleil',
};

const sickCloneWithDiagnosis: GardenClone = {
  ...sickClone,
  savedDiagnosis: {
    result: { status: 'disease', diseaseIcon: 'coronavirus', diseaseName: 'Septoriose', confidence: 91, treatment: 'Retirer les feuilles atteintes.' },
    date: new Date().toISOString(),
  },
};

const healthyClone: GardenClone = {
  ...sickClone,
  item: { ...sickClone.item, etatSante: 'sain' },
};

beforeAll(async () => {
  await initI18n();
  await i18n.changeLanguage('fr');
});

function renderCard(
  clone: GardenClone,
  onCheckHealth = jest.fn(),
  onPhotoDeSuivi = jest.fn(),
  onViewDiagnosis = jest.fn(),
  onMarkWatered = jest.fn(),
) {
  return render(
    <AppThemeProvider>
      <CloneCard
        clone={clone}
        onPhotoDeSuivi={onPhotoDeSuivi}
        onCheckHealth={onCheckHealth}
        onViewDiagnosis={onViewDiagnosis}
        onMarkWatered={onMarkWatered}
      />
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

  describe('bouton "Voir le diagnostic"', () => {
    it('is hidden for a healthy plant, even with no diagnosis history', async () => {
      renderCard(healthyClone);

      await screen.findByText('Lavande vraie');
      expect(screen.queryByText('Voir le diagnostic')).toBeNull();
    });

    it('is hidden for a sick plant that has no saved diagnosis (state inconsistency guard)', async () => {
      renderCard(sickClone);

      await screen.findByText('Lavande vraie');
      expect(screen.queryByText('Voir le diagnostic')).toBeNull();
    });

    it('is visible for a sick plant with a saved diagnosis', async () => {
      renderCard(sickCloneWithDiagnosis);

      expect(await screen.findByText('Voir le diagnostic')).toBeTruthy();
    });

    it('calls onViewDiagnosis (no new analysis) when pressed', async () => {
      const onViewDiagnosis = jest.fn();
      renderCard(sickCloneWithDiagnosis, jest.fn(), jest.fn(), onViewDiagnosis);

      fireEvent.press(await screen.findByText('Voir le diagnostic'));

      expect(onViewDiagnosis).toHaveBeenCalledTimes(1);
    });
  });

  describe('bouton "Marquer comme arrosé"', () => {
    it('is hidden when watering is not due today', async () => {
      renderCard(sickClone); // nextWatering: { key: 'jardin.inDays', count: 3 }

      await screen.findByText('Lavande vraie');
      expect(screen.queryByText('Marquer comme arrosé')).toBeNull();
    });

    it('is visible and calls onMarkWatered when watering is due today', async () => {
      const onMarkWatered = jest.fn();
      const cloneDueToday: GardenClone = { ...sickClone, nextWatering: { key: 'jardin.today' } };
      renderCard(cloneDueToday, jest.fn(), jest.fn(), jest.fn(), onMarkWatered);

      fireEvent.press(await screen.findByText('Marquer comme arrosé'));

      expect(onMarkWatered).toHaveBeenCalledTimes(1);
    });
  });
});
