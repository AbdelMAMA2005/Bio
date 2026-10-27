import { Alert, Platform } from 'react-native';

import { showDialog } from '../dialogs';

const setOS = (os: typeof Platform.OS) => Object.defineProperty(Platform, 'OS', { get: () => os, configurable: true });

describe('showDialog', () => {
  const original = Platform.OS;
  afterEach(() => {
    setOS(original);
    jest.restoreAllMocks();
  });

  it('utilise Alert.alert sur mobile', () => {
    setOS('android');
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    showDialog('Titre', 'Message');
    expect(alert).toHaveBeenCalledWith('Titre', 'Message', undefined, undefined);
  });

  describe('sur le web', () => {
    beforeEach(() => setOS('web'));

    it('confirme une action avec confirm()', () => {
      const onDelete = jest.fn();
      const onCancel = jest.fn();
      (globalThis as unknown as { window: Window }).window.confirm = jest.fn(() => true);
      showDialog('Supprimer ?', 'Définitif.', [{ text: 'Annuler', style: 'cancel', onPress: onCancel }, { text: 'Supprimer', style: 'destructive', onPress: onDelete }]);
      expect(window.confirm).toHaveBeenCalledWith('Supprimer ?\n\nDéfinitif.');
      expect(onDelete).toHaveBeenCalled();
      expect(onCancel).not.toHaveBeenCalled();
    });

    it('annule quand confirm() est refusé', () => {
      const onDelete = jest.fn();
      const onCancel = jest.fn();
      window.confirm = jest.fn(() => false);
      showDialog('Supprimer ?', undefined, [{ text: 'Annuler', style: 'cancel', onPress: onCancel }, { text: 'Supprimer', onPress: onDelete }]);
      expect(onDelete).not.toHaveBeenCalled();
      expect(onCancel).toHaveBeenCalled();
    });

    it('propose une liste numérotée quand il y a plusieurs choix', () => {
      const first = jest.fn();
      const second = jest.fn();
      window.prompt = jest.fn(() => '2');
      showDialog('Signaler', 'Pourquoi ?', [{ text: 'Annuler', style: 'cancel' }, { text: 'Inapproprié', onPress: first }, { text: 'Spam', onPress: second }]);
      expect(window.prompt).toHaveBeenCalledWith('Signaler\n\nPourquoi ?\n\n1. Inapproprié\n2. Spam', '1');
      expect(second).toHaveBeenCalled();
      expect(first).not.toHaveBeenCalled();
    });

    it('affiche un simple message avec alert()', () => {
      window.alert = jest.fn();
      showDialog('Envoyé');
      expect(window.alert).toHaveBeenCalledWith('Envoyé');
    });
  });
});
