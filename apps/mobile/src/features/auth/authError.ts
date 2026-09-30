/** Supabase database errors can be plain objects rather than Error instances. */
export function authErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'message' in error &&
      typeof error.message === 'string' && error.message.trim()) {
    const code = 'code' in error ? error.code : undefined;
    return code ? `${error.message} (${String(code)})` : error.message;
  }
  return fallback;
}
