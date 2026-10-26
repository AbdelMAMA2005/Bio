/** Codes envoyés par e-mail par Supabase (confirmation d'inscription, mot de passe oublié). */

/** 6 chiffres par défaut, jusqu'à 10 selon la configuration du projet. */
export const CODE_MIN_LENGTH = 6;
export const CODE_MAX_LENGTH = 10;
/** Supabase refuse un nouvel envoi pendant 60 secondes. */
export const RESEND_DELAY_SECONDS = 60;

/** Garde uniquement les chiffres : un code collé depuis l'e-mail peut contenir des espaces. */
export function normalizeCode(value: string): string {
  return value.replace(/\D/g, '').slice(0, CODE_MAX_LENGTH);
}
