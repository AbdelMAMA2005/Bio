// Import direct des 2 sous-modules utilisés plutôt que du barrel `@expo/vector-icons` : ce
// dernier réexporte (et donc évalue, même "lazy") les 18 familles d'icônes du paquet, ce qui
// embarque ~4 Mo de polices dans le bundle alors que l'app n'en affiche que 2 (voir
// OPTIMISATION.md §2 — vérifié via `expo export`, les 16 autres familles n'apparaissaient
// jamais dans theme/icons.ts). Un import par sous-chemin ne tire que le module réellement
// utilisé et sa police associée.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { StyleProp, TextStyle } from 'react-native';

import { IconSets, type IconName } from '@/theme/icons';

type Props = {
  name: IconName;
  size?: number;
  color: string;
  style?: StyleProp<TextStyle>;
};

export function Icon({ name, size = 20, color, style }: Props) {
  const spec = IconSets[name];
  if (spec.set === 'MaterialCommunityIcons') {
    return (
      <MaterialCommunityIcons
        name={spec.name as React.ComponentProps<typeof MaterialCommunityIcons>['name']}
        size={size}
        color={color}
        style={style}
      />
    );
  }
  return (
    <MaterialIcons
      name={spec.name as React.ComponentProps<typeof MaterialIcons>['name']}
      size={size}
      color={color}
      style={style}
    />
  );
}
