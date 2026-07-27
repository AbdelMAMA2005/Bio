import { Image, type ImageStyle } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, type StyleProp } from 'react-native';

import { Icon } from '@/components/Icon';
import type { IconName } from '@/theme/icons';

type Props = {
  /** Vraie photo de cet exemplaire (capture au scan / suivi) — priorité 1. */
  ownPhotoUrl?: string;
  /** Photo générique de l'espèce (référentiel Plant.id) — repli si la première échoue/manque. */
  catalogUrl?: string;
  icon: IconName;
  iconSize: number;
  iconColor: string;
  style?: StyleProp<ImageStyle>;
};

/**
 * Cascade ownPhotoUrl -> catalogUrl -> icône générique, avec un vrai repli sur échec de
 * chargement (`onError`), pas seulement sur URL absente. Nécessaire car une URL présente
 * dans `historiquePhotos` peut pointer vers un fichier disparu (ex. régression du
 * 24/07/2026 : fichiers uploadés au mauvais endroit puis perdus lors d'un rebuild) — sans
 * ce repli, l'image reste silencieusement vide au lieu de retomber sur une photo encore
 * valide ou sur l'icône.
 */
export function PlantPhoto({ ownPhotoUrl, catalogUrl, icon, iconSize, iconColor, style }: Props) {
  const [ownFailed, setOwnFailed] = useState(false);
  const [catalogFailed, setCatalogFailed] = useState(false);

  const useOwn = !ownFailed && !!ownPhotoUrl;
  const useCatalog = !useOwn && !catalogFailed && !!catalogUrl;
  const uri = useOwn ? ownPhotoUrl : useCatalog ? catalogUrl : undefined;

  if (!uri) {
    return <Icon name={icon} size={iconSize} color={iconColor} />;
  }

  return (
    <Image
      source={{ uri }}
      style={style ?? StyleSheet.absoluteFill}
      onError={() => (useOwn ? setOwnFailed(true) : setCatalogFailed(true))}
    />
  );
}
