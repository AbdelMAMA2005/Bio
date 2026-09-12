jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Reanimated/Worklets v4 : le module natif ne se charge jamais sous Jest (pas d'appareil) —
// setUpTests() remplace les primitives par leur équivalent JS synchrone pour les tests.
// Voir aussi la clé "resolver" dans package.json#jest, qui force la résolution vers
// l'implémentation web de react-native-worklets plutôt que native.
require('react-native-reanimated').setUpTests();
