import type { Toxicite } from '@planai/shared';

import { ToxicityColors } from '@/theme/colors';
import type { IconName } from '@/theme/icons';

export type ToxicityDisplay = {
  bg: string;
  text: string;
  icon: IconName;
  labelKey: string;
};

const TOXICITY_DISPLAY: Record<Toxicite, ToxicityDisplay> = {
  non_toxique: { ...ToxicityColors.safe, icon: 'health_and_safety', labelKey: 'scan.notToxic' },
  toxique: { ...ToxicityColors.toxic, icon: 'warning', labelKey: 'scan.toxic' },
  incertaine: { ...ToxicityColors.unknown, icon: 'warning', labelKey: 'scan.unknownToxicity' },
};

export function toxicityDisplay(toxicite: Toxicite): ToxicityDisplay {
  return TOXICITY_DISPLAY[toxicite];
}
