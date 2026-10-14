/**
 * Inter pour l'interface, Source Serif 4 pour les titres (`display`) et les noms latins
 * (`latin`, italique) : l'esprit d'une planche d'herbier.
 */
export const FontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  display: 'SourceSerif4_600SemiBold',
  latin: 'SourceSerif4_400Regular_Italic',
  numeric: 'Inter_600SemiBold',
  numericBold: 'Inter_700Bold',
} as const;

export const FontsToLoad = {
  Inter_400Regular: require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf'),
  Inter_500Medium: require('@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf'),
  Inter_600SemiBold: require('@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf'),
  Inter_700Bold: require('@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf'),
  SourceSerif4_600SemiBold: require('@expo-google-fonts/source-serif-4/600SemiBold/SourceSerif4_600SemiBold.ttf'),
  SourceSerif4_400Regular_Italic: require('@expo-google-fonts/source-serif-4/400Regular_Italic/SourceSerif4_400Regular_Italic.ttf'),
};
